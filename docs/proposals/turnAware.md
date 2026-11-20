# Turn awareness, tool health, the morning debrief and selling on calls

20 November 2026.

Status: spec. Part 1 is built for Discord (the PR that adds this file) and for Slack (the next one); X Chat typing and the rest are not. It reads `main` at `43c0f35b` and the soron branch (#198).

Four things the owner has said log should do, what is already there for each, and what is left.

## 1. Typing: know whose turn it is

**The ask.** "get typing back so that we're able to be turn aware". A multi-line send already stops when they write back. It doesn't know they are writing, so it sends the next line over the top of a reply that is half typed.

**What exists.**

- The Discord send splits a message into lines with a gap between them, and after each gap reads what came in (`incomingSince`). A message from them stops the rest (`interrupted`), and a message before the first line stops it all (`movedOn`).
- Discord's gateway sends `TYPING_START` (a user started typing in a channel; it lasts about 10 seconds unless sent again). The watcher (`watch_of` in `python/discordApi/engine.py`) drops it, keeping only `MESSAGE_CREATE`.
- Slack's websocket sends `user_typing`. The Slack engine already listens for it (`WATCHED`), and nothing reads it.

**What to build.**

1. The watcher keeps typing: each `TYPING_START` in a DM or group from someone else is written to log.db (`typing`: platform, account, conversation, user, `untilAt` 10 seconds on). Their next message clears it.
2. Before each line of a send, the sender reads whether they are typing in that chat. While they are, it waits (checking every second, up to `TYPING_HOLD_MS`, 20 seconds), then:
   - they sent something: the rest is held, as an interruption today;
   - they stopped without sending: the line goes out;
   - they are still typing at the limit: the rest is held, and the owner is told they were still typing.
3. Slack the same way from `user_typing` (built): the engine marks each one `fromMe`, the watcher keeps it for DMs and groups (`D` and `G` chats, as the inbox does) with `slackTypingOf`, and `log slack send` waits it out before each line, one-line sends included. X Chat is next; log's X watcher reads no typing event yet, so it needs that first.

**Tests.** Typing stored and cleared by their message; typing that stops lets the line go; typing that turns into a message holds the rest; typing past the limit holds the rest; someone typing in another chat changes nothing.

## 2. Tool health: which tools are used, which fail, which went stale

**The ask.** "tool usage analytics… for ones that dont really get used itll outline why and if things go stale so its a self healing skill".

**What exists.** Every log tool call is already a row in log.db's `spans` (tool, time, ms, ok, attrs), the router ranks plays and tools by meaning (#193), and `toolScaffold` turns a one-off into a tool.

**What to build.**

1. `toolHealth` { days }: per tool, calls, failures and the commonest failure code, p50 and p95, the last time it was used, and how often the router offered it and it wasn't picked.
2. Three flags, each with its evidence:
   - **unused**: never called in `days`, while the router offered it N times;
   - **failing**: over 20% of calls failed, with the codes;
   - **stale**: a play or guide whose tools have changed since it was written (the tool's input changed after the guide's last edit).
3. A weekly line in the inbox when something is flagged, and a report view (#196). It suggests a fix (a guide edit, a tool merged into another, a play retired) and never changes code on its own.

## 3. The morning debrief

**The ask.** "i wanna set up a daily debrief on my convos like when i wake up".

**What exists.** The `assistant-check` skill reads every account's inbox and reports what needs the owner. Hermes runs scheduled jobs (`cronjob`) and delivers to Telegram.

**What to build.**

1. A Hermes cron at the owner's wake time (to ask him), delivered to this chat.
2. What it says, in order: who is waiting on him and for how long; promises and money he owes (rule 108: reported, never sent); what the judge held overnight; captures that opened (#198); accounts behind or logged out; disk space.
3. Each line points to the chat, so "reply to <name>" works straight from it.

No code in log is needed; it is a cron prompt and the existing tools.

## 4. Selling on calls

**The ask.** "make the voice cloning so good so that it can sell on every social media platform over call".

**What exists.** `cloneVoice` and `cloneSpeak` make his voice from his recordings; voice notes go out on Discord, Instagram, Slack and X; every voice note in is transcribed.

**What is left, and why it is the last of the four.**

1. A live call needs speech in (streaming transcription), a reply drafted in his voice while they talk, and speech out in his cloned voice in under a second. log has none of the live loop.
2. Discord calls are the first place it could work (a voice gateway is a websocket like the one log already holds). X, Instagram and Slack calls have no open way in.
3. A call is a send: it needs the owner's yes per call, the voice gate on every line before it is spoken, and the person told they are talking to an agent. That rule comes first.

The near step is voice notes that answer in his cloned voice in DMs, with the voice gate on the words. Calls follow once that works.

## Order

1. Typing on Discord (built here), then Slack and X.
2. The morning debrief (a cron, once he names a time).
3. `toolHealth`.
4. Voice-note replies in his voice, then calls.
