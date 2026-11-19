# soron: capture the conversation around a personal mention, edits and deletions included

20 November 2026. Issue #197.

Status: spec. Nothing in it is built yet. It reads `main` at `43c0f35b`: `python/discordApi/engine.py` (`watch_of`), `src/inbox/watch`, `src/inbox/pending`, and the judge in #189 and #190.

## The problem

The Discord watcher keeps only what is addressed to the owner. `watch_of` drops every gateway event that isn't `MESSAGE_CREATE`, and the inbox pushes a server message only when it mentions the owner or replies to him (`to_me`). So:

- the rest of a conversation the owner is pulled into is never stored, because only the lines that name him are;
- an edit (`MESSAGE_UPDATE`) or a deletion (`MESSAGE_DELETE`, `MESSAGE_DELETE_BULK`) is never seen, so an edited or deleted message is lost the moment it changes;
- once the owner loses access to a channel (a ban, a kick, a removed role), nothing more can be read, and what wasn't stored is gone.

On 19 Nov all three happened in one argument (#197).

## What soron does

When someone personally mentions the owner in a shared channel, the account's one watcher opens a **capture** of that channel. It stores the conversation around the mention while the conversation involving the owner goes on, keeps every edit and deletion inside it, then closes. Agent sessions never run it. They read the capture from log.db like any other message.

### What opens a capture

A message in a server channel, thread, forum post or group DM that is:

- an @mention of the owner's own user id (`mentions[].id == me`), or
- a reply to one of the owner's messages (`referenced_message.author.id == me`), or
- a message from the owner himself in a channel with no open capture, when it is a reply to someone or mentions someone.

Not `@everyone`, `@here`, role mentions or the owner's name typed in text. One-to-one DMs are stored in full already and never need a capture.

### What it records

1. **Before:** the last `CAPTURE_BEFORE` messages of the channel (default 30), read once over REST (`GET /channels/{id}/messages?before=<mention id>&limit=30`) when the capture opens, so the start of the argument is there too.
2. **During:** every message in the channel while the capture is open, live from the gateway.
3. **Edits:** each `MESSAGE_UPDATE` for a message in the capture adds a row to its history: the new text, and the time.
4. **Deletions:** each `MESSAGE_DELETE` and `MESSAGE_DELETE_BULK` for a message in the capture sets `deletedAt` and keeps the last text log saw. Discord doesn't say who deleted it, so log doesn't guess.
5. **Media:** images and files in the capture are saved (the existing `with_visuals` path) while they can still be fetched, because a deleted message's attachment URL stops working.

The whole channel is never stored: only the window.

### Stored on arrival, judged on arrival

The message that decided the 19 Nov ban was sent and deleted within moments, so a capture can't wait for a session to read the channel.

- **Write first.** Inside a capture, each `MESSAGE_CREATE` is written to log.db the moment the gateway pushes it, before media is fetched, before it is judged and before it reaches a session. A message deleted a second later is still kept: text, author, time and attachment metadata.
- **Judge on arrival.** The judge (#189, #190) runs on each captured message as it is stored, in the watcher. Its verdict (`clean`, `suspect`, `held`), the rules or model that fired and the score are saved on the row (`judgeVerdict`, `judgeHits`, `judgedAt`). It is never run again later, so the record shows what the judge saw at the time.
- **Quick deletes.** A captured message deleted within `QUICK_DELETE` of being sent (default 120 seconds) is marked `deletedQuickly`. If the judge also flagged it, the owner is told at once: "<who> sent and deleted a message the judge flagged in <server #channel>; it's kept in capture <id>". A message sent and then quickly removed is how a bait is used, so the pattern is worth a line on its own.
- **The order of the record.** `captureExport` lists quick deletes first: message id, author, sent and deleted times, the text as it arrived and the judge's verdict. Then it gives the full window.

### When it closes

The capture stays open while the conversation involves the owner, and closes when either:

- **quiet:** nobody in the capture's participants (the owner, whoever mentioned him, and anyone who replied into that chain) has written for `CAPTURE_QUIET` (default 15 minutes), or
- **cap:** it has been open for `CAPTURE_MAX` (default 6 hours) or holds `CAPTURE_MAX_MESSAGES` (default 1,000).

A new personal mention while it is open extends it. A mention after it closes opens a new one, linked to the last.

Edits and deletions keep being recorded for a capture's messages for `CAPTURE_TAIL` after it closes (default 24 hours), since that is when people tidy up.

### Seeing the channel live

A user account's gateway connection doesn't push every message of every large server. When a capture opens, the watcher subscribes to that channel's events (the gateway's guild channel subscription, as Discord's own client does when you open the channel) and drops the subscription when the capture closes. If the subscription isn't granted, the watcher reads the channel over REST every 20 seconds while the capture is open, inside the account's governor.

This has to be checked against a live account before it is built (open question 1).

### Losing access

When a read or a subscription answers `Missing Access` (50001) or `Unknown Channel` (10003) during a capture, the capture closes with reason `lostAccess` and everything stored so far stays. The inbox tells the owner once: "you lost access to <server #channel>; the conversation up to then is kept as capture <id>".

## Storage (log.db)

- `captures`: `id`, `platform`, `account`, `channelId`, `serverId`, `openedBy` (message id), `openedAt`, `lastActivityAt`, `closedAt`, `closeReason` (`quiet`, `cap`, `lostAccess`, `owner`), `participants` (json), `previousId`.
- `messages` gains `captureId` (nullable), `deletedAt` (nullable), `firstText` (the text when first seen), `deletedQuickly`, and the judge's verdict on arrival: `judgeVerdict`, `judgeHits`, `judgedAt`.
- `messageEdits`: `messageId`, `at`, `text`.

Captured messages are ordinary rows in `messages`, so `search`, `discordRead`, `voice` and the judge see them with no change. A capture is kept for `CAPTURE_KEEP` (default 90 days) unless the owner pins it.

## How it's read

- **Inbox push:** "CAPTURED: <who> mentioned you in <server #channel>; capturing the conversation around it". One line, then nothing more until it closes. On close: how many messages, edits and deletions it holds.
- **`captureRead` { id | channel }:** the window oldest first. Edited messages show `(edited 3 times, first: "...")`, and deleted ones `(deleted 19:24, last text: "...")`.
- **`captureExport` { id }:** a markdown record with message ids, authors, UTC times, the edit history and deletions, for an appeal or a report. Read-only; it sends nothing.
- **Report view (#196):** a capture is drawn as a timeline, with edits and deletions marked.

## The judge and privacy

- Every captured message goes through the judge (#189, #190) like any pushed message. A held capture is stored but withheld from sessions the same way.
- Only channels the owner's account is in, only the window around his own mentions, and never forwarded anywhere. Exports are files on this machine.
- Nothing is posted, reacted to or reported by a capture. It only records.

## Other platforms

The same capture fits every watcher that has a channel and a mention:

- **Slack:** channel `message` events with `<@U…>`, plus `message_changed` and `message_deleted`, which the websocket already sends.
- **X:** replies and quotes that mention the account, along with the reply chain. X sends no delete event, so a deleted reply is marked when a later read can't find it.

Discord is first, since that's where it happened.

## Tests

| Case | Expect |
| --- | --- |
| an @mention of the owner in a server channel | a capture opens, with the 30 messages before it |
| `@everyone`, a role mention or his name in plain text | no capture |
| an edit, then a delete, of a captured message | its history has both and `deletedAt` is set; the first text is kept |
| 15 quiet minutes among the participants | the capture closes with `quiet` |
| `Missing Access` mid-capture | it closes with `lostAccess`, and every stored message stays readable |
| a second watcher for the account | refused (rule 105); the one watcher holds the captures |
| a capture holding a stealer paste | the judge holds it; it is stored but not shown |
| a message sent then deleted 5 seconds later | stored with its text before the delete arrives, marked `deletedQuickly` |
| a flagged message sent then deleted quickly | the owner gets the one-line alert, and `captureExport` lists it first |
| the judge's verdict on a captured message | saved on the row when it arrives, and the same when read a day later |

All of them run against a recorded gateway stream (fixtures), never a live server.

## Order

1. Store `MESSAGE_UPDATE` and `MESSAGE_DELETE` for messages log already has, in every channel. This is small and would have kept the edits on 19 Nov.
2. Captures: open, record, close, write each message on arrival, judge it there, and the `captures` and `messageEdits` tables.
3. The REST read of the messages before the mention.
4. The channel subscription, after a live check (open question 1).
5. `captureRead`, `captureExport` and the inbox lines.
6. The view in #196.
7. Slack, then X.

## Open questions

1. Does the user gateway grant a per-channel subscription for a large server, and is the REST read the only fallback? Check on one server with a live account before step 4.
2. Should a capture also open on the owner's name typed in text, not only on @mentions? This spec says no: the owner asked for personal mentions.
3. `CAPTURE_QUIET` of 15 minutes: long enough for an argument that pauses, short enough not to record an evening of a channel. Tune it on real captures.
