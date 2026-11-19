# Tool calls against the book: what the tail-latency literature says about log's own calls

the owner, 2026-11-19: optimise the p95 and p99 of log's own tool calls and harness hooks, from low-level fundamentals, and stop the "dumping" (answers so big the harness spills them to a file the agent then reads back). The platforms' deliberate pacing (typing simulation, the spacing between lines, governor waits) is not latency and stays exactly as it is.

This page checks log against the sources, in the shape of `storageAgainstTheBook.md`: for each point, the source, what log does today, and what changes. Process costs were already measured in `hookStartup.md`, `toolCallSpeed.md`, `callTiming.md` and `decisions/processLimits/`; this page builds on them and does not measure them again.

Every number below is from log.db's `spans` (7 days to 2026-11-19, read from a copy) or from a synthetic run on that copy on the same machine (Windows 11, Bun 1.4.0, Python 3.12). The "before" of a synthetic run is the same code path started the old way.

## The sources

- **Dean and Barroso, "The Tail at Scale", CACM 56(2), February 2013, pp. 74-80.** Variability comes from shared resources, background daemons, global resource sharing, maintenance (garbage collection, compaction), queueing and power management, and it grows with fan-out. Remedies: hedged requests (send a second copy once the first has been out longer than the 95th-percentile latency, which costs about 5% more load), tied requests, micro-partitioning, selective replication, latency-induced probation, and good-enough answers when part of the work is late.
- **LLMCompiler (Kim et al., arXiv 2312.04511):** plan the calls, then run the independent ones in parallel. Up to 3.7x latency speedup and 6.7x lower cost against ReAct.
- **AsyncLM (Gim et al., arXiv 2412.07017):** don't block the model on each call; let calls run and interrupt the model when they return. 1.6x to 5.4x lower end-to-end latency on BFCL.
- **Conveyor (arXiv 2406.00059):** start a tool's work while the model is still decoding its arguments (partial execution). Up to 38.8% lower request latency.
- **Speculative Actions (arXiv 2510.04371):** a faster model predicts the next action and it runs ahead, kept only when the prediction matches. Up to 55% next-action accuracy, up to 20% lower latency.
- **Agentic Plan Caching (arXiv 2506.14852):** reuse plan templates across similar tasks. 50.31% lower cost and 27.28% lower latency on average.
- **RAG-MCP (arXiv 2505.03275):** retrieve the few tools a prompt needs instead of listing them all, cutting prompt tokens and raising tool-selection accuracy.
- **Anthropic, "Code execution with MCP" (2025):** tool definitions and intermediate results passed through the model are the two costs that grow with MCP use; filter in code and disclose detail progressively.
- **Anthropic, "Writing effective tools for agents" (2025):** return what the agent needs, not everything. Use search tools instead of list-everything tools, sensible default limits, pagination, filtering and truncation, and a concise or detailed response format.
- **Process creation on Windows:** `hookStartup.md` measured CreateProcess at 24 ms, `bun -e 0` at 48 ms, Git Bash at about +115 ms, Python start at about 400 ms with the engine imports at about 350 ms (`python -X importtime`: `asyncio` alone is 250 ms of it).

## How each harness reaches log

| Harness | Prompt and session hooks | After each tool | log's tools |
| --- | --- | --- | --- |
| Hermes | native plugin `pre_llm_call`, in Hermes's own Python. **Was:** `subprocess.run(bun scripts/hooks/event.ts)` per event. **Now:** POST to the warm context service, spawning only when it is down. | the plugin's `transform_tool_result` asks for `PostToolUse` the same way | MCP over stdio to one long-lived `logMcp`, which runs every command in its own process (`runCli`) |
| Claude Code | `type: "http"` hooks to the warm service; `SessionStart` is one exec-form `bun` | one http hook | MCP over stdio, the same `logMcp` |
| Codex | `curl` to the warm service, falling back to `bun` (`serviceHookCommand`): one small process per event | the same | MCP over stdio |

So a Hermes turn paid a Python `subprocess.run` plus a full Bun start and import graph for every event, and Claude Code paid none. That was the largest single tail in log's own hooks.

## 1. A process per hook event

*Book:* the tail of a request is set by its slowest part, and a part that does a big fixed amount of work every time (a process start, module loading, cold caches) makes the whole distribution heavier. Keep that work in a long-lived server and pay it once.

*Today:* `hook:UserPromptSubmit:hookEventProcess:hermes`, 889 calls: p50 687 ms, p95 2.23 s, p99 5.04 s, and 100% "unaccounted", because the span started after Bun had loaded and had no stages. Each hook's own time was also measured wrongly: `answerEvent` timed a hook from when it started until its promise settled, after every synchronous hook that came after it, so `pageState`, `storage` and `engines` all showed about 350 ms.

*Changed:*
- The Hermes plugin's `ask_log` POSTs to the context service (`/hooks/<event>?host=hermes`, 0.3 s to connect, 10 s to answer) and runs `event.ts` only when the port refuses or `LOG_CONTEXT_SERVICE=off`. A timed-out answer is not retried in a new process, because the inbox read would then be consumed twice.
- On a session's first turn, `SessionStart` is asked beside `UserPromptSubmit` (two threads), not before it.
- Every event carries `log_sent_at`. The span now has stages: `spawn` (the caller's `CreateProcess`), `bunStart` (Bun's start and import graph), `sent` (the trip to the service), and one `hook <name>` per hook, each timed exactly (the synchronous part on its own, the waiting part until it settles).
- Hooks that wait on I/O (`useCases`, `knowledge`) start first, so their wait overlaps the hooks that only compute instead of queueing behind them.

*Measured* (synthetic, prompts 70% short, 20% 150 words, 10% 2,000 words; scratch state, db copy):

| Path | n | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
| Prompt hook, a process per event (before) | 60 | 821 ms | 877 ms | 961 ms |
| Prompt hook through the warm service (after) | 200 | 63 ms | 115 ms | 155 ms |
| PostToolUse, a process per event (before) | 40 | 517 ms | 588 ms | 784 ms |
| PostToolUse through the warm service (after) | 200 | 21 ms | 33 ms | 44 ms |

Where a process-per-event prompt hook spends its time, now that it has stages: `bunStart` 409 ms p50, `hook useCases` 314 ms, `hook engines` 180 ms (a fresh `git status` and code-stamp walk each time; the service caches both), `spawn` 30 ms. Through the service the same hook is `hook useCases` 48 ms p50 and `sent` 6.5 ms. The live 7-day numbers were worse than the synthetic ones (p99 5.04 s) because the real box runs watchers, other sessions and pushes at the same time, which is exactly the shared-resource variability the book describes.

## 2. Work that grows with the prompt

*Book:* good-enough answers. When part of the work is late or unbounded, answer from what is ready instead of waiting for all of it.

*Today:* the play router embedded every 14-word window of the prompt (step 7). A 2,000-word prompt (a pasted brief) is 285 windows: 562 ms idle for the embedding alone, and `hookAnswer` 1.47 s p50 for a 3,000-word prompt. `routeService` p99 was 3.41 s and the prompt hook's `useCases` p99 1.36 s.

*Changed:* the router reads the ask, not everything pasted after it: `askOf` keeps the first 120 and last 40 words for routing, names and tools. Inside the service the play route has a 200 ms budget (`PLAY_ROUTE_BUDGET_MS`, `withinBudget`); past it, the hook answers from the word router and the meaning router, which already had a 150 ms budget.

*Measured:* through the service, 2,000-word prompts went from `hookAnswer` 1.47 s p50 (3,000 words) to 106 ms p50, 155 ms p99 for the whole hook.

## 3. A Python process per engine call

*Book:* the same fixed cost as item 1, paid inside a tool call. X and Instagram already keep one host per account (rules 105, 129).

*Today:* Discord, Slack and Reddit start a Python process per call. `discordRead` p99 14.2 s, of which `python.start` p50 356 ms (p99 2.39 s) and `python.imports` p50 335 ms (p99 3.72 s).

*Changed:* a warm read host per account for the kit engines (`python/platformKit/host.py`, `src/platformKit/readHost`). It imports the platform's engine once, holds `kitHost.lock` so an account never gets a second one, and answers reads over localhost through `curl` (the engine runner is synchronous, and `curl` costs a few tens of ms where Python costs about 750). Each read still goes through `kit.run`, so the governor spaces it exactly as before. Writes (`send`, `react`, `voice`, `delete`), `watch`, live and streaming calls never go to the host: a send's typing simulation would otherwise hold reads behind it (head-of-line blocking), and the watcher keeps its own gateway. The first call after a quiet spell starts the host and runs the old way; the host closes after 10 idle minutes or when the engine code changes. `LOG_KIT_HOST=off` turns it off.

*Measured* (the engine's own overhead, an action that returns at once, the real engine imported):

| Engine call overhead | n | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
| Discord, a process per call (before) | 30 | 790 ms | 833 ms | 878 ms |
| Discord, warm read host (after) | 200 | 64 ms | 97 ms | 118 ms |
| Slack, a process per call (before) | 30 | 394 ms | 436 ms | 479 ms |
| Slack, warm read host (after) | 200 | 64 ms | 73 ms | 106 ms |

Still per call inside Discord's read: `GET /users/@me` (p50 497 ms) checks the token on every call. A warm host could cache it, but that lives in `python/discordApi/engine.py`.

## 4. Repeated reads inside one call

*Book:* micro-partitioning and caching: do the expensive setup once and share it.

*Today:* `voice` (the gate), 339 calls, p50 4.16 s, p99 64.7 s, with 79% unaccounted and inference only 730 ms p50. A gate with `--with` opened the owner's voice index twice (once for this chat, once for everywhere), at about 1.2 s each, and read the AI-tells check (Jina embeddings and rerank, about 0.7 s) only after SubQ had answered. An AI-tells index backfill sent its Jina batches one at a time (30 batches at 1.7 s each in one 132 s call).

*Changed:* one voice index per process, shared by every lookup until its files change (`openSharedVoiceIndex`, keyed by the index files' mtimes; a rebuild closes it first). The AI-tells read runs beside the SubQ read instead of after it. Jina batches run four at a time (`JINA_BATCHES_AT_ONCE`). New stages: `voice.chats`, `voice.openIndex`, `voice.near`, `voice.everywhere`, `voice.phraseIndex`, `voice.aiTells`. No check was removed or loosened: the same questions, scores and thresholds decide the pass.

*Measured* (the steps before inference, on the db copy):

| Gate setup | before | after |
| --- | --- | --- |
| First gate in a process | 4.0 s (two index opens, 1.69 s + 1.19 s) | 2.0 s (one open) |
| Every later gate in the MCP process | 2.5 s | 0.09 s |

## 5. Dumping

*Book (Anthropic):* return what the agent needs, with sensible defaults, and let it ask for detail.

*Today:* #191 caps every command tool's answer at 40 KB (`capResult`, in `withCallFooter`), keeping a head and naming the narrowing flags. `getGuide` and `report` are exempt by design; the largest guide is 35.9 KB. But the cap is a last resort: `log timing --hours 168` returned 57 KB, so the agent got a head cut mid-list.

*Changed:*
- `log timing` shows the 12 slowest tools by p99 with 4 stages each, and says how many it left out; `--top <n>`, `--all`, and `--tool <name>` (in full) widen it.
- `log search` shows each hit's 3 lines that hold the query words, 160 characters each, with a count of the rest; `--full` gives the whole chunk. Its JSON gives the message count and the first and last message ids instead of every id, and is compact unless `--full`.

| Answer | before | after |
| --- | --- | --- |
| `timing --hours 168` | 57.2 KB | 5.6 KB |
| `timing --hours 168 --json` | 126 KB | 11.7 KB |
| `search … --limit 40 --json` | 41.8 KB | 27.0 KB |
| `search … --limit 40` | 17.9 KB | 16.7 KB |

## 6. External reads: hedge only what is free

*Book:* hedged requests, deferred until the first has been out longer than the 95th percentile; cancel the loser. Only for idempotent reads.

*Today:* `tregCallLive`, 620 calls, p50 6.91 s, p99 25.2 s. Every call also reads the endpoint's price (`treg catalog get`), p50 6.44 s, p99 24.0 s, over only 17 endpoints. The `treg` CLI is a packaged Python program that takes about 810 ms just to start.

*Changed:* `catalog get` and `catalog search` (free, read-only) are hedged after the p95 of their own stored spans (`measuredHedgeMs`, at least 2 s, refreshed every 10 minutes), and the loser's process is aborted. `call` is never hedged: it may be paid, and a second copy is a second charge. An approved live call reuses a price read in the last 30 minutes instead of reading it again; the dry-run path, which decides whether a free endpoint runs without approval, always reads the price fresh (rule 41).

*Measured:* the stored spans show `get` and `call` slow at the same moments (the same CLI start and the same service), so a hedge helps less than the book's independent-replica case. Replaying the 637 stored `get` times as independent draws, hedging at their p95 (15.1 s) takes p99 from 24.0 s to 19.7 s; that is an upper bound. Reusing the price takes a live call from max(get, call) to the call alone: p50 6.91 s to 6.57 s, p99 25.0 s to 24.5 s. The rest of treg's tail is in treg itself.

## What the agent-side papers change next

These are about the agent loop rather than log's own calls, so nothing here builds them yet:
- **LLMCompiler and AsyncLM:** Hermes and Claude Code already run independent tool calls in parallel when the model emits them together; log's part is to never serialize them itself. The hook service is one Bun event loop, so a synchronous hook (the inbox read) still blocks a second session's hook for its duration. Moving the inbox read to a worker would remove that head-of-line blocking.
- **Conveyor and Speculative Actions:** the prompt hook could start the read a play needs (the chat it names) while the model is still reading the context. The router already knows the play and the chat name; prefetching into the read host is the natural next step.
- **Agentic Plan Caching and RAG-MCP:** the router's tools section (#192, #193) is the RAG-MCP pattern; a plan cache would sit on the same catalog.

## Still to do

- Copy the Hermes plugin change into the installed plugin and restart Hermes (the installed plugin carries other sessions' work, so it was not overwritten).
- Cache Discord's token check in the read host (`python/discordApi/engine.py`).
- Move the inbox read off the hook service's event loop.
