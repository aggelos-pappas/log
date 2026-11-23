---
title: "Storage"
---

# Storage

How log keeps what it reads and does: one SQLite database, `~/.logCli/log.db`, with every message entering as an event and the typed tables built from those events. The order of work and the reasons, from Designing Data-Intensive Applications, are in `docs/storageAgainstTheBook.md`. Issues #96 and #97.

## Time and identity of a message

### REQ-STORAGE-01: Every time is stored as integer milliseconds, normalised once

`msOf` (`src/storage/platform/helpers/time.ts`) turns every shape a platform or log has written (`…Z`, `…+00:00` with any number of fraction digits, epoch seconds or milliseconds, Slack's `1699999999.123456`) into UTC milliseconds, and gives null for anything else. `messages.sentAtMs`, `messages.receivedAtMs`, `interactions.atMs`, `chats.lastMessageAtMs`, `ledger.atMs`, `events.sourceAtMs` and `events.receivedAtMs` hold it, written where the row is written. `messageTimeOf` records in `timeSource` whether a message's time came from the platform or fell back to when log received it. Readers order a chat by `(sentAtMs, seq)` through `messagesByChatTime`, and a person by `messagesBySenderTime`. A catch-up keeps a message only when `afterGap` finds its instant later than the gap's start, never by comparing text.

Checked by: code and SubQ

### REQ-STORAGE-02: One stable key per message

A message's key is `platform:account:conversation:platformMessageId` (`messageKeyOf`), the same in `events.messageKey` and `messages.messageKey`. `events.messageKey` is unique where set (`eventsByMessageKey`), so the same message from the live watch, a catch-up and a read is stored once, and two different messages with the same time and text are kept apart. `eventIdOf` derives the event id from the key when there is one, and only a message with no platform id falls back to its instant (not its time text) plus its text. Every watcher's inbox message carries the platform's id (X Chat's event id, Discord's message id, Slack's ts, Instagram's item id), and both catch-ups pass it on. When a keyed message meets an older copy of itself stored without a key, `adoptUnkeyed` stores no second copy: it leaves the old event as it is and appends an `attachmentsSeen` event that gives the old copy's message its platform id and any attachments.

Checked by: code and SubQ

### REQ-STORAGE-03: Old rows are filled in batches that resume

Migration 6 only adds the columns and indexes. `runBackfill` (`src/storage/schema/helpers/backfill.ts`) fills old rows after every migrate, in transactions of `BACKFILL_BATCH` rows. The column being filled is its own progress mark, set in the same transaction, so a crash resumes at the next unfilled row and a finished backfill costs only its checks. Only the first event of a message keeps the key; later copies stay unkeyed.

Checked by: code and SubQ

## The events are the record

### REQ-STORAGE-04: Every typed row comes from an event

`insertEventRow` (`src/storage/platform/client.ts`) is the one way a row enters `events`, and it derives the typed rows (messages, attachments, chats, identities, memberships, interactions) from that event in the same transaction. `appendEvent`, the conversation import (`saveConversationRows`, `writeConversation`) and every read, catch-up and backfill go through it, so nothing writes a typed row without an event. A change is a new event, never an edit of an old one: attachments seen later are `attachmentsSeen` (`addToPayload`, `adoptUnkeyed`), a text a read finds changed is `messageEdited`, and a conversation's box and members are `conversationSeen`. Chats are read back from the typed tables (`chatMessages`), so what those events add is seen.

Checked by: code and SubQ

### REQ-STORAGE-05: Nothing a replay needs is cut or looked up again

A payload longer than `PAYLOAD_INLINE_LIMIT` is kept whole, gzip-compressed, in `blobs` (`putBlob`), with `events.rawHash` pointing at it, and a replay reads it back (`readBlob`, `eventInputOf`). A blob of a kind in `RAW_BLOB_KINDS` (`avatar`) is stored as its bytes, codec `raw`, never gzipped (`blobCodecOf`), and `readBlobBytes` hands its bytes back unchanged. The account's own id is written into `events.ownerId` when the event is appended, from a per-database tally of its conversation pairs (`notePairConversation`), so a replay never guesses it again. Each derived message and interaction records the `EXTENDER_VERSION` that made it.

Checked by: code and SubQ

### REQ-STORAGE-06: The typed tables can be rebuilt and verified from the events

`rebuildDerived` clears the typed tables and replays every event in `seq` order in one transaction. `verifyDerived` does the same on a scratch copy and compares each table's rows (`derivedFingerprint`) with the live ones. `log storage verify` and `log storage rebuild --apply` (MCP `storageVerify`, `storageRebuild`) run them. Before the first rebuild, the backfill gives every typed row with no event an `import` event carrying its original key (`eventsForTypedRows`), records any text changed in place as `messageEdited` (`editsForChangedText`), and types any event older code left untyped (`untypedEvents`, `events.typedAt`). The steps that read every row run once (`once`).

Checked by: code and SubQ

## Who is who

### REQ-STORAGE-07: People and accounts have stable ids, and names live in one place

`accounts (platform, account, userId)` holds each account's own real id, learned from its session check: `recordPlatformSession` and `recordTwitterSession` call `identifyAccount`, which appends an `accountIdentified` event once per id. Deriving it moves the account's own messages from `self:<account>` to that id, only in that account's chats (`rekeyIdentity`). `handleAliases (platform, handle, userId)` maps each handle, lower-cased, to the id behind it, from `identityLearned` events (`rememberPerson`, whenever an event carries both a sender id and a handle). Deriving one re-keys every row keyed by `@handle` (messages, memberships, interactions, identities) to the real id and logs it in `identityMerges`. Later messages from that handle are keyed by the id (`userIdOfHandle`). Reads (`storeRead`) keep the sender's id (`fromId`, `senderId` or `userId`) so ids are learned from every read and catch-up. A name is read through `identities` (`personOf`, `handleOfIdentity`, the join in `chatMessages`), and `people` is no longer read or written: its rows were imported once as `identityLearned` events (`peopleToAliases`). Every id is stored as text.

Checked by: code and SubQ

### REQ-STORAGE-18: Profile fields the engines already return are kept once, per person, and rebuilt from events

`identityProfiles (platform, userId, bio, avatarHash, followerCount, verified, extra, fetchedAt)`, keyed by platform and user id, comes from migration 19 (`IDENTITY_PROFILE_TABLES`). It is a derived table (`DERIVED_TABLES`): every row comes from an event, so `rebuildDerived` clears it and replays it like the others and `derivedFingerprint` compares it. Two kinds of event feed it. A `profileSeen` event (`profileSeenEvent`, `src/storage/platform/helpers/derivedEvents.ts`) carries the fields of one sighting; its id is the platform, user id and fields, so the same profile seen again appends nothing. An X `notification` carries the follower count of who acted, and the X extender reads it (`toProfile`, `twitterNotificationProfile`). Each sighting is merged into the row by `writeIdentityProfile`: a field the sighting has replaces the stored one, a field it lacks keeps the stored one, `extra` is merged key by key, and `fetchedAt` is the latest sighting.

The writers append only what an engine already answered, with no new platform call: `recordPlatformSession` and `recordTwitterSession` pass the session check's answer through `sessionProfileOf`, and `log twitter followers` passes each follower through `twitterFollowerProfile`, both into `rememberProfiles`; X's DM and notification reads pass the people their own answers carry through `avatarSightingOf` (`src/inbox/store/client.ts`), which also appends `identityLearned` for the handle and display name. Per platform today:

| Platform | From | Kept |
| --- | --- | --- |
| X | session check | handle and display name (`identities`), no profile row |
| X | `log twitter followers` | bio, follower count; `extra`: `location`, `followingCount`, `postCount`, `canDm`, `protected`, `joinedAt`, `pictureUrl` (the engine's `follower_of` passes twikit's `profile_image_url` through) |
| X | notifications | follower count |
| Discord | session check (`/users/@me`) | handle, global name as display name; `verified`, which on Discord means the account's email is verified; `extra.pictureUrl` built from the answer's avatar hash (`discordAvatarUrl`) |
| LinkedIn | session check (`/voyager/api/me`) | handle, name; `extra`: `premium` |
| Slack, Instagram, Reddit | session check | nothing: their answers carry no profile field. Slack's engine reads `users.info` for names and keeps only one label, so its profile fields never reach TypeScript |

`extra` is JSON (checked with `json_valid`) and holds only the keys in `IDENTITY_PROFILE_EXTRA_KEYS`: `pictureUrl`, `location`, `followingCount`, `postCount`, `canDm`, `protected`, `joinedAt`, `premium`, `headline`. `profileExtraOf` drops any other key, so it never becomes a convenience column. `avatarHash` points at a `blobs` row of kind `avatar`. When the engine answer carries a link in `extra.pictureUrl`, `saveProfileAvatars` fetches that link, checks the image bytes, stores them in `blobs` of kind `avatar`, and appends a `profileSeen` event with `avatarHash`; the derived `identityProfiles` row then holds the hash. A failed or non-image fetch changes nothing, and an avatar already stored is never fetched again. `backfillProfileAvatars` does the same for picture URLs kept before this writer existed. The view never loads the link itself (its CSP has no resource domains). `readIdentityProfile` (`src/inbox/profiles/client.ts`) reads one person by user id or handle (through `handleAliases`, then `identities`), joined to `identities` for the name, with the avatar as a data URI.

Checked by: code and SubQ

## One owner at a time

### REQ-STORAGE-08: A replaced owner's writes are refused by the database, not by its own good behaviour

When a watcher wins ownership (`claimWatcher`) it holds that generation as its fence (`holdFence`). Everything the owner itself writes (the events its push channel brings, its catch-up, its positions and gaps) runs inside its owner scope (`asOwner`, from `ownOrAttach`), and `appendEvent`, `recordPosition`, `openGap` and `markGap` check, in the same `BEGIN IMMEDIATE` as the write, that `owners` still names this process with that generation (`checkFence`). A replaced owner gets `OwnerFencedError` on every write after that. It raises one `ownerFenced` alert and writes nothing more. Writes the same process makes outside the owner scope (an ordinary read or send) aren't affected. A pid that refuses a liveness probe with EPERM counts as alive. An owner is stopped only after two stale readings at least `STALE_CONFIRM_MS` apart (`staleSeenAt`, cleared by any heartbeat). If its pid now belongs to a process with a different start time (`pidStartedAt`, `processStartedAt`), nothing is killed and `ownerPidReused` is alerted. A heartbeat that meets a busy database is retried rather than dropped.

Checked by: code and SubQ

### REQ-STORAGE-09: A gap is never closed over a newer drop

An account has at most one open gap (`gapsOneOpen`, a partial unique index; migration 9 closes any extra into the oldest). When the socket drops again while a gap is open, `openGap` raises its `drops` counter. The catch-up runner closes the gap only if `drops` is still what it was when the catch-up started (`markGap` with `expectDrops`). Otherwise the gap goes back to open, and the next run catches up again.

Checked by: code and SubQ

### REQ-STORAGE-10: Each part of a send is fenced by its claim

A send takes its chat's claim (`guardSend`), then a send lease inside the claim with an operation id of its own (`claims.sendingOp`). A second call in the same process that tries to send into that chat meanwhile is refused (`A SEND IS ALREADY GOING OUT`), though the session's earlier `inboxClaim` still counts as its own. Before each part, one transaction (`part`) checks that the claim still names this holder and generation, hasn't expired and still carries this operation id; renews it; and records an `intent` action with the operation id, part number and text hash. After the platform answers, `partSent` records the send the same way. A part whose claim was lost is held (`lost`, `chatClaimLost`). Before the first part, a message in that chat after the `seq` the voice gate read up to (`readUpTo`, taken just before the gate) stops the send (`movedOn`, `chatMovedOn`), naming what they wrote. A part whose text was intended by an earlier operation that never recorded its send, and whose echo is already in the chat as the account's own message, is not sent again (`alreadySent`, `echoedBefore`). The Discord, Slack, X DM, X queue, Instagram and voice-note sends all go through it.

Checked by: code and SubQ

## Short and compatible

### REQ-STORAGE-11: Bulk work is short and resumable, and old and new code share the file

Bulk writes commit in batches of about 1,000 rows. `saveConversationRows` groups conversations into transactions of `CONVERSATION_BATCH_MESSAGES` messages. `importOldLedgers` writes each old file in `inBatches` of `BACKFILL_BATCH` lines, recording how many lines it has done in `imports` in the same transaction (`importing`), so a crash resumes after them and nothing is imported twice. Migrations only change the schema: migration 3's data move is gone, and its work is done by the batched `untypedEvents` step. Migrations only add tables, columns and indexes. `meta.minReaderVersion` (`MIN_READER_VERSION`) says the oldest code that can read the file, and only a breaking migration raises it. Code meets a newer file by opening it as it is. It's refused (`SchemaTooNewError`) only when `minReaderVersionOf` is above its own version. Events that older code appended without typed rows are typed by `untypedEvents` on every open, and by each owner every `RECHECK_GAP_MS` (`sweepUntyped`, at most `SWEEP_LIMIT` at a time).

Checked by: code and SubQ

### REQ-STORAGE-19: A create-only migration another branch skipped is repaired, never re-run blind

`migrate` runs every migration above the file's `user_version`, so two branches that both number a migration 19 leave the second one's 19 unapplied: the file is already at 19. A migration that only creates tables and indexes, with `CREATE ... IF NOT EXISTS`, declares them in `creates`. After the version loop, `repairSkipped` checks each declared migration at or below the file's version, and when any declared object is missing from `sqlite_master` (`missingObjectsOf`) it runs that migration again inside `BEGIN IMMEDIATE` and returns it with `repaired` naming what was missing. `user_version` never changes, a migration without `creates` is never run again, and a file newer than the code is left as it is (or refused, as in REQ-STORAGE-11). Migrations 8, 12, 13, 15, 16, 18, 19, 22, 23, 24 and 25 declare `creates`. A migration that adds a column, fills or rewrites rows, or makes a table a later migration alters or drops does not. `src/storage/schema/repair.test.ts` keeps the versions unique and rising by one, and every declared migration to `CREATE ... IF NOT EXISTS` of exactly its declared objects, none of them altered or dropped later.

A list a shipped migration runs (`INBOX_TABLES` for migration 1, `PLATFORM_TABLES` for migration 2) is never appended to, because a file already past that version never runs it again. A new table, index or column comes in its own migration at the end. The Discord `typing` table was first appended to `INBOX_TABLES`, so every file made before it failed each send with `no such table: typing`; it now lives in `TYPING_TABLES` and migration 22 (`typing`) creates it. `src/storage/schema/upgrade.test.ts` holds the objects each early list shipped with, and checks that a file left at any earlier version ends, after `migrate`, with the same tables, indexes and columns as a fresh one.

Checked by: code and SubQ

## The loose stores, moved in

### REQ-STORAGE-12: The X queues live in log.db

Each X queue is one document in `queues` (its JSON, its account and a version that rises with every save), keyed by its resolved path, so every command that names a queue by its file still finds it (`loadQueue`, `saveQueue`, through `readQueueBody` and `writeQueueBody`). What a run logs goes to `queueLog` (`queueLog`, `appendQueueLog`). The queue hook reads it with one cursor per Claude session (`queue:<session>`, `queueReader`) and shows the queue by its short name (`queueLabel`). Items added during a run are `queueIncoming` rows taken in one transaction. The run lock is a row in `queueLocks` that is taken over when its pid has died (`takeQueueLock`, `queueLockHolder`, `clearDeadQueueLockRows`), and a nudge is a row in `queueNudges`. A queue file already on disk is imported once with its `.log` and `.incoming.jsonl` (`importQueueFile`, `importQueueFiles`) and isn't read again. `queue build` refuses to overwrite a queue that is in the store or on disk.

Checked by: code and SubQ

### REQ-STORAGE-13: The MCP jobs live in log.db

A long MCP call that comes back as a job is a row in `jobs` (its tool, arguments, account, pid, status, result and whether a cancel was asked for), and its progress lines are rows in `jobLines` numbered from 0. `startJob`, `appendProgress`, `finishJob`, `requestCancel`, `readJob`, `readProgress`, `listJobs` and `busyJob` read and write them in transactions (`src/mcp/jobs/client.ts`), replacing the `.json`, `.jsonl` and `.cancel` files in `~/.logCli/mcp/jobs`. A job whose pid is gone still reads as lost. The old files are imported once (`importJobFiles`), and a cancel file becomes `cancelRequested`.

Checked by: code and SubQ

### REQ-STORAGE-14: Transcripts live in log.db

Every voice-note transcript is a row in `transcripts`, keyed by the sha256 of its audio, with its text, length and whole answer (`body`). Which message each one belongs to is a row in `transcriptLinks`. `readTranscript`, `writeTranscript`, `readLinks` and `linkMessages` (`src/media/voiceNotes/helpers/store.ts`) read and write them, so search, the voice gate and profiles find voice notes beside the events. The old `~/.logCli/transcripts` files and their `messages.json` are imported once (`importTranscriptFiles`).

Checked by: code and SubQ

### REQ-STORAGE-15: The small logs are records, and hook timings are spans

The Facebook warm-up's stage log, each run prune and each meme rating are rows in `records`, with a kind (`stageLog`, `prunedRun`, `memeRating`), a key (the account, the run) and the body (`appendRecord`, `readRecords`, `src/storage/records`). `appendStageLog`, `readStageLog`, `pruneRuns`, `addRating` and `readRatings` go through it, and each old file is imported once (`importRecordFile`). Every context-layer hook timing (`logTiming`) is a span in `spans`, tool `hook:<event>:<provider>`, so `log timing` reports hook costs beside tool calls instead of in `timings.jsonl`.

Checked by: code and SubQ

### REQ-STORAGE-16: Nothing new writes shared state outside log.db

`bun run check:oneDatabase` (`scripts/checks/checkOneDatabase.ts`, lefthook pre-commit and pre-push, and `bun run check`) counts every file write in log's own tracked code under `src`, `scripts`, `bin`, `python` and `hermesPlugin`, leaving out tests, fixtures and vendored libraries: in TypeScript `appendFileSync`, `writeFileSync`, `Bun.write`, `writeFile`, `createWriteStream`, `copyFileSync` and `cpSync` (`TS_WRITE`), and in Python `write_text`, `write_bytes`, `json.dump`, an `open` for writing or appending, `os.fdopen` and `shutil.copy` (`PY_WRITE`). A file that writes to disk must be in `ALLOWED` with how many writes it has and a kind from `WHY`: inside the repo, a capture, a dataset or export, an index, media, a log people watch, a private session file, or the old-file fallback a store keeps for a machine whose log.db or table is not made yet; there is no kind for shared state, so none can be listed. A new writer, or more writes in a listed one, fails the commit, and a listed file that no longer writes is named so it is dropped. The old `inbox/pending.jsonl` is retired (`retirePendingFile`): any row not already in `events` is appended, and then the file is renamed `pending.jsonl.imported`, not deleted. A file with an unreadable line is left where it is.

Checked by: code and SubQ

### REQ-STORAGE-17: The small shared state is keyed rows in log.db

Every small piece of shared state is a row in `state`, keyed by scope and key, with its value and when it changed (`getState`, `putState`, `deleteState`, `claimState`, `pruneState`, `src/storage/state`, migration 16). That covers the page-state hook's memory (`hookMemory`), the engines hook's last answer (`lastHook`), each Claude session's hook offsets (`hookOffsets`, rows older than 3 days pruned), the context service's address (`contextService`, deleted with `deleteState` by `forgetService` when the service hands over to new code) and its start claim (`contextServiceStarting`, held for its grace), the owner's meme taste (`memeTaste`), the voice clones (`voiceClone`), each account's chat list cache (`chatList`), the MCP server's code stamp (`mcpServerStart`) and the reload proxy's state (`mcpReload`), recent voice-gate passes (`voicePasses`), what the inbox poll last saw per account (`inboxSeen`), the inbox poll's plan and lock, claimed inside one `BEGIN IMMEDIATE` so two sessions never both poll (`inboxPoll`, `claimPoll`), each platform's watcher code stamp (`watcherCodeStamp`), and which Hermes session takes live pushes (`hermesPush`, written by the Hermes plugin straight into `state`). Each row is keyed by the path the old file had (the chat list by platform and account), so tests and moved folders stay apart, and that old file is imported once on first read (`legacyFile`, recorded in `imports`), never again after.

One count is not in `state`: each platform engine's governor keeps its own count in its account's `governor_state.json`, the engine's private session file that only that account's one engine process reads and writes. `log governor reset` (`src/directApi/governor`) is the only other writer. It writes the file whole through a temporary file and a rename, reads it back, and records each reset as a `governorReset` row in log.db's `ledger`, so the reset itself is in the database (rule 168).

Checked by: code and SubQ

### REQ-STORAGE-20: The engines' own stores are rows in log.db

The Python engines kept their per-account stores as whole JSON files rewritten on every change, with a read, merge and rename that two processes could interleave. They are now rows in `engineState` (migration 23, `ENGINE_STATE_TABLES`), keyed by platform, account, store and part: X's inbox sync (`xInbox`, one row per conversation under `xchat` plus a head row), X's notifications (`xNotifications`, one row per notification and per post's engager sync), X's last call time (`xLastCall`), Discord's server channel list and kept threads (`discordServers`, `discordThreads`) and LinkedIn's sent connects (`linkedinConnects`). The engines write them through `python/logDb/engineStore.py` (`save`, `write`), which inside one `BEGIN IMMEDIATE` reads the stored parts, merges them into the new state with the store's merge (`merge_states` for the X inbox, `merge_threads`, `merge_connects`, `later_call`), and upserts only the parts whose text changed; a part is never deleted. TypeScript reads them through `readEngineStore` (`src/storage/engineStore`), used by `xInboxHandleOf`, `storedWaiting`, `xchatStoredMedia` and `readNotificationStore`.

The old file is the backfill: the first read or write of a store imports it, recorded in `imports` as `engineState:<platform>:<account>:<store>` with the file's modified time, and the file is kept. A file modified after that time (an engine still on the old code) is merged in again by the next Python read or write, and until then `readEngineStore` answers from the file. When log.db or `engineState` is not there yet, the engine reads and writes its old file as before.

Checked by: code and SubQ

### REQ-STORAGE-21: A chat's kind and name come from the best source that knows them

A Discord server channel could be stored first as a `dm` named after whoever spoke, and the chat upsert never changed `kind` or `name` once the row existed. The upsert in `writeTypedRows` and `conversationSeen` (`src/storage/platform/client.ts`) now runs each chat through `placedChat` (`src/storage/platform/helpers/places.ts`): when the account's channel catalog (`discordServers`, `discordThreads` in `engineState`, read by `roomCatalog` and cached until `engineState` changes) lists the conversation, its kind is a server kind, its name is the channel's name (`channelNameOf`) and its server id the catalog's. A channel, thread or guild id means a server kind, never a dm, and a later dm-looking event never turns a server channel back into a dm or names it after a speaker (`PLACE_UPDATE`). Migration 28 (`chatPlaces`) runs `repairChatPlaces` once, correcting rows stored before. The inbox's Discord lines and the conversation block name the server, the #channel and the sender (`placeLabel`, `placeNameOf`), `log inbox waiting` lists server channels the owner talks in under them (`channelWordsOf`), and `log discord chats` shows who last spoke in each channel (`channelSendersOf`).

Checked by: code and tests

### REQ-STORAGE-22: A chat with more than two members is a group

Instagram, Reddit, Facebook and LinkedIn extenders stored every chat as `dm`, and Discord did whenever the event carried no group box, so a group chat made every member ring 1 as if they had a one-to-one chat with the owner. An extender that only guesses dm says so (`kindFromMembers`); for those platforms the chat upsert in `writeTypedRows` and `conversationSeen` calls `groupByMembers` (`src/storage/platform/helpers/members.ts`) after storing a member, which turns a `dm` into a `group` once it has `GROUP_OTHERS` (2) or more members besides the owner (the owner's own ids and handles, `self:` and `unknown:` ids left out). X and Slack keep the kind their conversation ids carry. A server kind from the channel catalog still wins over `group`. When a chat moves, `insertEventRow` recomputes the rings (REQ-RELATE-14) in the same transaction. Migration 31 (`chatGroups`) runs `repairChatPlaces` and then `repairChatGroups` once over the rows stored before, and recomputes the rings when any row moved.

Checked by: code and tests

### REQ-STORAGE-23: A write to a database LOG_DB points at says so

An exported `LOG_DB` left in a shared shell sent another session's writes into a scratch copy, and they reported success. `runOne` (`src/cli/runner/client.ts`), which every CLI and MCP command goes through, compares `writesSinceOpen` on the database `dbOverride` names (`LOG_DB`, when it is not `logHome()/log.db`) before and after the command. When the command wrote to it, stderr gets `writing to <path> (LOG_DB is set; not your usual log.db)`, a JSON object result gets `db: <path>`, and the MCP tool result carries `db` and the note in its stderr. With the usual database nothing is added.

Checked by: code and tests
