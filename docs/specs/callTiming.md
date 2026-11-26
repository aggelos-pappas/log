---
title: "Call timing"
---

# Call timing

Every call is timed, never guessed: one timing layer across Bun and Python gives each call an id, stores every stage inside it in log.db, and reports p50, p95 and p99 per tool and per stage. Rule 165.

The SubQ decision client (`src/subq/decisions/client.ts`, `createDecisionsClient`) also records an `inference` span inside the active call, with provider and actual input/output token counts from the response. It records no decision input or output content. `src/observability/console/helpers/projection.ts` exposes only the fixed metadata projection described in [Usage summaries](../proposals/listeningKitUsage.md); older records without duration/usage remain unavailable rather than estimated.

### REQ-TIMING-01: Every call has an id and its stages are spans

Every MCP tool call (`runGuarded` in `src/mcp/server/index.ts`) and every terminal run (`bin/log.ts`) runs inside `timeCall`, which gives the call a trace id, a short call id and a root span named `call`. The call id and how long the call took are written on its `▶` and `■` lines in the live log. Inside a call, `timed` and `timedSync` record a span with its parent, start time, length, whether it failed, and its attributes. Outside a call they only run the work. `instrumentFetch` patches `fetch` once, so every request made inside a call is a `fetch <METHOD> <host><path>` span with its status, with long ids in the path replaced.

Checked by: code and SubQ

### REQ-TIMING-02: The trace crosses into Python and back as one tree

Every place Bun starts a Python engine (`runTwitterEngine`, `runTwitterEngineLive`, `runPlatformEngine`, `runPlatformEngineLive`, and the Facebook engine's `spawnEngine`) runs inside `timedEngineSync` or `timedEngine`. That writes the call's trace, with the engine span as parent, into the engine's spec. Python's `timing.begin` (`python/platformKit/timing.py`) picks it up, and `timing.span` records each stage. The outer engine process records `python.imports`. On its way to the account's session host it records `host.connect`, then `host.roundTrip`, passing its own span on as the parent with `child_trace`. The host records `host.queue` while it waits for the account's turn. The X engine records `account.lock`, `spacing`, `governor`, `client`, `action <name>` and `session.keep`; the shared platform engine records `governor` and `action <name>`. `instrument_curl` patches curl_cffi's `Session.request` and `AsyncSession.request` once, so every platform request is an `http` span. The spans and the process's start time come back in the answer (`attach`). Bun takes them out of the answer (`harvestEngine`), adds a `python.start` span for the interpreter's start-up, and stores them all in the same call.

Checked by: code and SubQ

### REQ-TIMING-03: The guards and the voice gate are timed stage by stage

The catch-up wait (`waitCaughtUp`, `inbox.waitCaughtUp`), the read-source choice (`readSourceFor`, `inbox.readSource`), the chat claim (`claimChat`, `inbox.claim`) and the voice gate (`gateSend`, `voice.gate`, with `voice.sameness`, `voice.chatContext`, `voice.room`, `voice.rankedContext`, `voice.evidence` and `voice.reading`, and `voice.briefReading` for a brief) are each a span. Each says what it decided as an attribute: caught up or not, where the read came from, passed or not.

Checked by: code and SubQ

### REQ-TIMING-04: Timings are stored and reported, never lost to a failure

When a call ends, `timeCall` writes every span to log.db's `spans` table in one transaction and deletes spans older than 90 days once per process. Storing or exporting never fails the call. With `LOG_OTLP_URL` set, the spans are also posted as OTLP JSON to `<url>/v1/traces`. `log timing` (MCP `timing`) reads them: p50, p95 and p99 per tool, and per stage with its share of the tool's time and an `unaccounted` stage for the call's own time outside every stage. `--call <id>` shows one call as a waterfall, and an unknown id is refused with `callTimingMissing`. A failed call's root span keeps its refusal code as `code` in its attributes (`commandFailed` when there is none). `log tool health` (MCP `toolHealth`) reads the root spans of the last `--days` (default 14) and only reads: per tool its calls, failures, commonest code, p50, p95 and last use, and flags tools no call touched, tools failing more than 20% of at least 5 calls, and guides whose last commit is older than an input change of a tool they name or that call a tool nothing registers, each with a suggested fix.

Checked by: code and SubQ

### REQ-TIMING-05: Whole agent turns are timed and split into tool and agent time

The prompt hook (`UserPromptSubmit`) starts a turn per session (`turnStarted`, state `turnStart`) and the `Stop` hook ends it (`turnEnded`; Hermes sends `Stop` from `post_llm_call` with the turn's tool-call count). The turn is one `spans` row with source `turn` and tool `turn:<host>`, carrying how many of log's top-level tool calls fell inside it, their summed ms and the rest as agent time. `log timing --turns` prints p50, p95 and p99 per turn and each turn's split.

Checked by: code and SubQ

### REQ-TIMING-06: Landed to pushed is measured per platform, and watch sessions are listed apart

`log timing --landed` (`readLanded`, `landedStats`, `landedLines`) reads every message event of the last `--hours` that isn't a backfill and times three gaps from its `timings` stages: landed (the platform's own `sourceAtMs`) to stored (`appended`), stored to pushed (`shown`, the first push loop or prompt hook that took it) and landed to pushed, as p50, p95 and p99 per platform and per source (`live` from the watcher, `catchUp` read after a gap, whose wait is the gap itself), naming each platform whose live p95 is over `LANDED_TARGET_P95_MS` and counting messages no session took yet. In the plain report a watcher (`isWatchSession`: a tool ending in `watch`) is one long-lived connection, so its length is listed under "Watch sessions" apart from the calls that wait and never heads the slowest p99; whole agent turns (`turn:`) are left to `--turns`.

Checked by: code, tests and SubQ

### REQ-TIMING-07: A watcher's reads have deadlines and spend requests only where something changed

Every engine call that only reads has a deadline (`engineCallMs`): `ENGINE_CATCH_UP_MS` for a watcher's catch-up read (its spec carries `catchUp`), `ENGINE_CALL_MS` for other reads and none for a live write; past it the engine is stopped and the call answers `engineTimedOut`, and the watcher's next check asks again. The Instagram host bounds every call but `watch` to `CALL_SECONDS` (`instagramSessionHostTimedOut`). A host whose call failed with an import error (`poisoned`: `ImportError`, `ModuleNotFoundError`, a failed DLL load) closes once its calls finish so the next call starts a fresh interpreter, in both the Instagram host and the platform read host. Discord's catch-up lists the account's DMs and groups once (`chats` with `dmsOnly`, each with its `lastMessageId`) and reads only the chats whose newest message is past their saved position, newest first (`changedChats`); an account refusal of the list stops it, any other failure reads every saved chat as before. The Discord engine keeps one client per token and recorded browser (`CLIENTS`), so a read doesn't ask `/users/@me` again. The voice gate ranks only the newest `RANKED_POOL` lines of a chat, so a send never embeds a whole history.

Checked by: code, tests and SubQ
