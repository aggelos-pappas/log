---
title: "Agent hooks"
---

# Agent hooks

The agent hooks put log-cli's state in front of the agent (Claude Code or Codex) at the right moment and stop it from running log the wrong way. One hook list writes both hosts' files, and a check refuses a commit when the hooks, the CLI and the MCP tools drift apart. Rule 55 (with rule 54 for the page states the hooks resolve, and rule 26 for the live log).

## One list, both hosts

### REQ-HOOKS-01: One hook list writes both hosts' files

The hooks are one list in the code. Claude Code's `.claude/settings.json` and Codex's `.codex/hooks.json` are both written from it, so both hosts run the same hooks. Codex runs each hook as a command that runs its script from the repo. Claude Code reaches them as REQ-HOOKS-21 says.

Checked by: code and SubQ

### REQ-HOOKS-02: The check refuses a host file that differs from the list

`bun run check:agentHooks` fails when either host's hooks differ from what the list would write, and with `--write` it rewrites them.

Checked by: code and SubQ

## The events

### REQ-HOOKS-03: SessionStart and every prompt say where every open browser is

At session start (startup, resume, clear, compact) and with every prompt, the page-state hook puts every open browser's account, step, page and known state into the agent's context.

Checked by: code and SubQ

### REQ-HOOKS-04: After every log or shell call a known state gets its resolver

After every Bash, PowerShell or Monitor call and every `mcp__log__` tool call, the page-state hook says a browser that landed on a known state with its resolver, and a failed step as an unconfirmed page to snapshot and resolve. A browser it has already reported unchanged is not said again.

Checked by: code and SubQ

### REQ-HOOKS-05: Stop holds the turn while a browser sits on a state log-cli resolves itself

The Stop hook blocks the end of the turn while an open browser sits on a known state log-cli resolves itself, or a failed step, or an inspect goal not yet met. It never blocks on a state only a person can clear, and never twice on the same unchanged states.

Checked by: code and SubQ

### REQ-HOOKS-06: A log run that would hide its lines is refused before it starts

The PreToolUse hook on Bash, PowerShell and Monitor refuses a log run piped through `tail` or `head` (or PowerShell's `Select-Object -First/-Last`), since nothing would show until it ends (rule 26). A long log run outside a Monitor is told to start one.

Checked by: code and SubQ

## The check

### REQ-HOOKS-07: Every hook script answers its event

The check runs every hook script with a sample of its event and fails on a script that is missing, exits with an error (a PreToolUse or Stop hook may refuse with exit 2 and a reason), or prints something that isn't JSON. It also fails when the PreToolUse hook lets a log run piped through tail through.

Checked by: code and SubQ

### REQ-HOOKS-08: Every command is an MCP tool or terminal-only

The check fails on a command that has no MCP tool and whose own `terminalOnly` field (why it runs only in a terminal) is not set. Terminal-only is a field of each command, keyed by its command key, so there is no separate list to fall out of step.

Checked by: SubQ

### REQ-HOOKS-09: Every MCP tool is hooked

The check fails on an MCP tool (a command's or a saved flow's) that the PostToolUse hook's matcher doesn't match.

Checked by: code and SubQ

### REQ-HOOKS-10: Every long-running tool points at the live log

The check fails on an MCP tool of a command whose `longRunning` field is set whose description doesn't point at the live log, `~/.logCli/mcp/<day>.log`.

Checked by: code and SubQ

### REQ-HOOKS-11: Every resolver is a real call

The check fails on a page state with no resolver call, a resolver call that names a tool that isn't an MCP tool, a resolver for a state that doesn't exist, and a state whose resolve text names a `log` command that doesn't exist.

Checked by: code and SubQ

## Live platform hooks

### REQ-HOOKS-12: Every platform's push channel reaches the agent through the inbox hook

On every event the inbox hook starts the live watcher for each signed-in account of every watched platform, if it isn't already running: X's X Chat watch, Discord's gateway watch, Slack's websocket watch (every workspace the account's d cookie is signed in to) and Instagram's realtime watch, each through the account's one session. It does this through `superviseLocalWatchers` (`src/platformKit/watcher/helpers/supervise.ts`), the same start `log watchers start` and `log runtime connect` make, which reads each platform's watch command from one table (`WATCH_COMMANDS`) and starts it with `startWatcher`. It stops a watcher that runs older code than the checkout and skips an account whose governor is cooling off or that the owner held with `log watchers stop`. Each message a watcher pushes is put into the agent's context with what to do, through `readPending` (`src/inbox/pending/client.ts`), the one reader `log inbox pending` also uses. A platform without a watcher isn't done yet (rule 123: Reddit and LinkedIn next). The watcher's own lifecycle is [watchers.md](watchers.md).

Checked by: code and SubQ

### REQ-HOOKS-13: One watcher process per account, never two

Every platform has one watcher process per account, shared by every Claude session through the inbox. A watcher takes the account's lock, its `owners` row in the database (written in one immediate transaction with its pid), before it opens anything; a second one is refused (`watcherAlreadyRunning`) and exits, and its refusal is written as an alert that `readPending` puts first in what the reader gets (`>>> ONE PROCESS PER ACCOUNT, NEVER TWO`). A dead holder's lock is taken over and only the holder releases it. The hook never starts a watcher while a live one holds the lock, and the stale-code cleanup stops the lock holder too. Rule 131.

Checked by: code and SubQ

### REQ-HOOKS-14: One owner per account, every other watch attaches to its relay

On every platform the watch that takes the account's lock is its one owner: it holds the platform's push connection, writes the inbox, and records its row in the database's `owners` table (pid, hostname, started, a heartbeat every 5 s, status, its local relay's port and token, and how many are attached; rule 134). Every event goes to every subscriber attached to the relay with the token. A later watch attaches to a live owner and streams the same events without opening anything; an inbox watch that loses is refused. An owner whose heartbeat is quiet for 60 s is stopped with a `hungOwner` alert, and the next start becomes the owner. The X Chat, Discord, Slack and Instagram watches all work this way. Rule 132.

Checked by: code and SubQ

### REQ-HOOKS-15: Only the session that claims a chat acts on it

Every pushed message has an event id, and the inbox hook shows each one beside who holds its chat. A session claims a chat before drafting (`log inbox claim`, 10 minutes, renewed by claiming again), and another live session is refused (`chatClaimedElsewhere`). Every send on Discord, Slack, X (direct and the queue's dms) and Instagram claims the chat first and releases it once it is sent, interrupted or failed. An X chat is one chat by the person's id or the X Chat pair. A claim whose session ended or whose time passed frees itself. Every claim, renewal, refusal, send, interruption, failure and release is written to the action log, read with `log inbox actions`. Rule 133.

Checked by: code and SubQ

### REQ-HOOKS-16: The inbox is one database, read from cursors

The inbox's state is one SQLite database (`~/.logCli/log.db`, WAL, each write in an immediate transaction). Every event is appended once to `events` with a sequence number and its event id, and each session reads what is new from its own cursor; a new session starts at the latest event. `pending.jsonl` is imported once. An event type not in the catalogue is stored with its payload and raised as an `unknownEventType` alert. Owners are rows with a generation, and a relay drops a subscriber more than 1 MB behind. Claims are rows with their chat's next generation, and every send fences each of its parts through its claim, as the storage spec says. Every claim, send and release is written to `actions` in the same transaction, with what was done before it, and actions with text are searchable beside the events. Each event's stages are timed. Rule 134.

### REQ-HOOKS-17: An account behind is caught up by its owner, and sends wait for it

Each owner records the platform's own last position (X's sequence id, each Discord DM's last message id, each Slack chat's last ts, Instagram's last activity). A gap opens when an owner takes over from a stopped or dead one (from its last heartbeat), when a first owner starts on an account with events (from the newest), or when the push channel drops. One catch-up job in the owner, never two at once, pulls only what came after the saved positions through the account's own session, paced 0.8 to 2.5 s between reads, appends it as `source: catchUp`, and closes the gap. A refusal from the platform (a 429, X's 226 or 344, a soft block, a rate limit, a suspension or lock: `PLATFORM_REFUSAL`) stops it, keeps the account behind and alerts `catchUpRefused`. A chat the account cannot read is not the account being refused: when Discord answers `403` with `Missing Access` (`50001`), `Missing Permissions`, `Unknown Channel` (`10003`) or `50013` for one channel — a dead bot DM, a server the account left — `chatRefusalIsLocal` skips that chat, leaves its saved position where it was, names it in the run's `skipped` and its detail, and reads the rest; only a refusal that is the account's own stops the run. A network failure (DNS, a timeout, a dropped or refused connection: `NETWORK_FAILURE`) or log's own error (a session host error or a Python exception: `OWN_FAILURE`) is not the platform refusing (`notThePlatform`, `src/inbox/relay`). It leaves the gap open, and the next check (every `RECHECK_GAP_MS`) tries again. A gap that was marked refused for one of these is reopened by itself at the next check. The same test decides in the catch-up job and in the read source. Every send waits up to 90 s for an open gap to close and is refused with `accountBehind` if it doesn't, or at once if the catch-up was refused. A Discord send to a DM or group doesn't wait: while the account catches up it reads that one chat from Discord and stores it (`catchUpOneChat`), then sends, refused at once only when the catch-up was refused (the owner, 2026-11-07: "we're not achieving p99"). Rule 135.

### REQ-HOOKS-18: A refused catch-up resumes only on the owner's word

`log inbox resume --platform <p> --account <a> --by <who>` calls `resumeGap` in `src/inbox/store/client.ts`, which, in one immediate transaction, opens a refused gap again (status `open`), writes who resumed it and what was refused before into its detail, and adds a `gapResumed` alert; a gap that isn't refused, or no gap, is left as it is. `ownOrAttach` in `src/inbox/relay/client.ts` runs its `catchUpRunner` every `RECHECK_GAP_MS` (30 s) as well as at start and when the socket opens, so a resumed gap is caught up through the owner's own session without a restart, and the runner still skips a refused gap. Rule 150.

Checked by: code and SubQ

### REQ-HOOKS-19: Every event is named before the owner sees it

In `src/inbox/store/client.ts`, `appendEvent` takes the sender's id (`senderId`, `userId`, `authorId`, `sender_id` or `user` in the payload, or a bare id given as `with`) and a handle (`with`, `from`, `handle`, `username`, `screenName`) from the event. A handle that is a real name is kept in the `people` table with `rememberPerson`, and an event that arrives with only an id is named from `people` (or a stored notification, `handleOfUserId`) through `personOf` before it is stored (`personOf` and `handleOfUserId` never hand back an id: a stored handle that `isBareId` calls an id counts as no name), then marked with the `named` stage. `isBareId` treats numeric ids, UUIDs and Slack member ids as ids and never a username. `namedLabel` never returns an id: it gives the name or "someone not named yet". `messageOf` and `twitterThreads` in `src/inbox/watch/client.ts` label every person through `namedLabel`. Rule 154.

Checked by: code and SubQ


### REQ-HOOKS-20: A Discord, Slack or Instagram call names its chat, never its id

The PreToolUse hook `scripts/hooks/chatNames.ts`, registered in `src/agentHooks/registry/index.ts` for the log MCP tools of discord, slack and instagram, runs `chatNameVerdict` from `src/agentHooks/chatNames/index.ts`: a `channel`, `chat` or `with` argument that `isBareId` calls an id is refused (exit 2) with how to name it instead (a person, a group, or a server channel as "<server> #<channel>"), and a name passes. Rule 155.

Checked by: code and SubQ


### REQ-HOOKS-21: Claude Code's hooks reach log through the warm service, and only the refusals start a process

`claudeCodeHooks` in `src/agentHooks/registry/index.ts` writes one handler per event:
- UserPromptSubmit, PostToolUse and Stop are each one `type: "http"` hook to the context service, at `HOOK_SERVICE_URL/<event>`;
- SessionStart is one exec-form command, `bun` with `args` and no shell, running `EVENT_SCRIPT` (`scripts/hooks/event.ts`) with the event's name. It starts the service when it is down;
- the two PreToolUse hooks in `REFUSING_HOOKS` (`chatNames`, `liveLogs`) stay their own exec-form `bun` processes, so a refusal still works when the service is down. `liveLogs` also starts the service when it is down.

The service (`scripts/contextLayer/service.ts`) answers `/hooks/<event>` with `answerEvent` (`src/agentHooks/answers/client.ts`). That runs every hook of the event whose matcher fits the tool (`hooksForEvent`, never a refusing one) at the same time, merges their answers (`mergeAnswers`), and names a hook that throws in the context instead of failing the others. Each event writes a timing line. Inside the service, the code stamp and the uncommitted files come from `cachedFreshness`. `git status` reruns only when the stamp moved, or once a minute. Issue #99.

Checked by: code and SubQ

### REQ-HOOKS-22: The hook service moves itself onto new code

The service moves itself onto new code: every `CODE_CHECK_MS` (30 s) it compares log's code stamp (`codeStamp`, and the newest file under `scripts/`) with the one it started on. Once it is newer and no hook request is in flight (`inFlight`), it stops listening, forgets its record (`forgetService`), starts a fresh service with `startService` and exits, so a hook never runs old code for long. the owner, 2026-11-08: hooks must never open a window, and a fix only reaches the hooks once the service runs it.

Checked by: code and SubQ

### REQ-HOOKS-23: Only the platform's refusal stops a catch-up

`notThePlatform` (`src/inbox/relay/client.ts`) is true for a failure that `NETWORK_FAILURE` or `OWN_FAILURE` matches and `PLATFORM_REFUSAL` does not. Such a failure leaves the gap open for the next check, and a gap once refused for one is reopened. A 429, 226, 344, soft block or rate limit is still a refusal, and nothing resumes until the owner says so (rules 94, 150). Once, one account had been held since a DNS failure and another since a crash of log's own. `OWN_FAILURE` covers a Python import that fails on this machine (`ImportError`, `ModuleNotFoundError`, `DLL load failed`, `cannot import name`, `No module named`), and `PLATFORM_REFUSAL` matches a locked account but not X Chat saying it unlocked (`(?<!un)locked`): on 2026-11-14 a broken Python import held Discord and Instagram, and an X Chat timeout after unlocking held X.

Each catch-up run is a machine, `gapCatchUpMachine` (`src/inbox/relay/machine.ts`, rule 6), that `catchUpRunner` starts inside the account's one watcher, so it runs the same whichever harness started the watcher. Its states are `checking` (read the gap), `reopening` (a gap held for a failure that wasn't the platform's), `catchingUp` (the platform's own catch-up, through the account's session), `settling` and `closing`, and every run ends as one of `nothingBehind`, `held` (refused by the platform, until the owner resumes it), `noCatchUp`, `caughtUp`, `refused` or `retryLater` (left open for the next `RECHECK_GAP_MS` check). Every invoke has `onError`, which leaves the gap open.

Checked by: code and SubQ

## Every harness

### REQ-HOOKS-24: One harness table, one hook file per hook host

`HARNESSES` (`src/agentHooks/harness/types.ts`) is one row per harness log supports: Claude Code, Codex, Cursor, Hermes, OpenCode, Antigravity, the Claude app, ChatGPT and Grok. Each row says, as yes, no or unknown, whether it has a prompt hook, a session-start hook, tool hooks, MCP Apps, server instructions, skills and URL elicitation, how the prompt router reaches it (`promptHook`, `preLlmCall` or `ask`), its hook text limit and the file its hooks come from. `HOOK_HOSTS` (the `HookHost` type) is the six with hooks. `hookFiles` (`src/agentHooks/registry/index.ts`) writes, from `AGENT_HOOKS`: `.claude/settings.json` and `.codex/hooks.json` as before (REQ-HOOKS-01), `.cursor/hooks.json` (`cursorHooks`: `sessionStart` and `postToolUse`, each one `bun scripts/hooks/event.ts <event> --host cursor`, since Cursor's `beforeSubmitPrompt` can't add context), `.agents/hooks.json` (`antigravityHooks`), the one Hermes plugin's `hermesPlugin/plugin.yaml` (`hermesPluginYaml`: `log`, `provides_hooks` naming every hook it registers) and the table in `docs/harnesses/README.md` (`withHarnessTable`). OpenCode's hooks stay the hand-written plugin in `.opencode/plugins/logHooks/`. `check:agentHooks` fails when any of them differs and when a hook host has no hook file.

Checked by: code and SubQ

### REQ-HOOKS-25: Each adapter answers in its harness's shape, cut to its limit

The hook scripts take `--host <id>` (`hookHostOf`, Claude Code when it is left out); Codex's commands and its service call carry `--host codex` and `?host=codex`, OpenCode's plugin calls the service with `?host=opencode`. `hostBody` shapes an answer: Claude Code, Codex and OpenCode get `hookSpecificOutput.additionalContext`, Cursor `{ additional_context }`, Hermes `{ context }`, and `scripts/hooks/antigravity.ts` its `injectSteps`. `clipContext` cuts the text to the harness's `contextLimit` and says it was cut: 10,000 characters for Claude Code, 7,500 for Codex (about 2,500 tokens), 7,500 for a harness whose limit no source states, and 20,000 for OpenCode (its plugin's own cap).

Checked by: code and SubQ

### REQ-HOOKS-26: The prompt hook names the play when the service is down

When the context service gives no answer (down, starting or timed out), `hookAnswer` (`src/contextLayer/hook/client.ts`) runs the word-only `route` over `listUseCases()`, the same router `getGuide({ ask })` uses, and its outcome starts with `wordsOnly`. A prompt that matches no play injects no play text; only the tools section (REQ-HOOKS-29) can still answer it.

Checked by: code and SubQ

### REQ-HOOKS-27: The check runs every hook on scratch state, starting nothing

`check:agentHooks` runs each hook and each adapter (`scripts/hooks/useCases.ts` for Claude Code and Codex, `event.ts --host hermes`, `event.ts --host cursor`, `antigravity.ts`) with `scratchHookEnv`: `LOG_DB`, the inbox, the context layer, the queues, the X, platform and fbk state and the hook memory all in its scratch folder, with a signed-in `fakeBird` account, `LOG_CONTEXT_SERVICE=off` (so `readService` reads nothing and `startService` starts nothing) and `LOG_INBOX_POLL=off` (so no watcher starts). It fails when a hook leaves a `watch.log` (`watcherLogsIn`) or a context service log in the scratch folder. Before, every run started the context service detached against the scratch database the next hook opened.

Checked by: code and SubQ

### REQ-HOOKS-29: The prompt hook names the tools for the ask

Every UserPromptSubmit answer from `hookAnswer` also ranks log's tools for the prompt with `routerSection` (`src/useCases/router/client.ts`), whose word ranking is the one `toolMatchText` gives; REQ-HOOKS-30 fuses it with meaning. The index is `src/useCases/router/fixtures/tools.json`, written by `bun run docs:build` (`toolFactsOf`): each MCP tool's name, summary, flags and required flags, a single-form command's usage notes, and no `Live` twin of a tool that has a plain one. At prompt time `toolDocsOf` adds the asks and step text of every play whose steps table names the tool (a `Live` twin counts for its plain tool). `rankToolsOver` scores the prompt against it with BM25 over the router's own stems (`contentWords`) after the typo fix; a platform the prompt names drops tools filed under other platforms and adds `TOOL_PLATFORM_BONUS` to its own, and a prompt that names no platform gets no platform. A prompt with no write word (`TOOL_WRITE_WORDS`: send, reply, post, dm, queue, like…, `asksToWrite`) gets only tools whose effect is read or browser (`TOOL_READ_EFFECTS`), so a summary ask never names a send, dm or queue tool; `effect` comes from the form's own effect in `tools.json`. Status and chat words aimed at the agent (`TOOL_GENERIC_WORDS`: how long, done, still going, stuck, any update, go through, outline) are dropped from the query, and a tool is shown only when it matches at least two of the remaining terms, or one that is in its name or in at most `TOOL_RARE_DF` tools (`specificEnough`); weak verbs (`TOOL_WEAK_WORDS`: read, check, list, find, look) score but never count for that, so "how much longer will it take here?" names no tool. When the top score clears `TOOL_MIN_SCORE`, up to `TOOLS_SHOWN` tools scoring at least `TOOL_KEEP_SHARE` of the top one are written after the play text as `>>> Tools for this ask`, one filled-in call each (`callOf`: required flags, the person after with/from/to as the chat or `with` only when the given `chatNameOf` links that word to a stored chat (none is given yet, so the chat stays a bare flag), the server and words of "search <server> for <words>", the named platform as `platform`), ending "Use these; don't parse log output with scripts.", within `TOOL_TEXT_BUDGET` characters. `fixtures/toolGolden.json` holds the expected first tools for real-shaped asks, and the router test holds the top-1 and top-3 counts.

Checked by: code and SubQ

### REQ-HOOKS-30: The prompt router ranks plays, tools and skills by meaning as well as words

`routerCatalog` (`src/useCases/router/client.ts`) lists every play (title, its "How the owner asks for it" phrases, its steps), every tool in `tools.json` (its name and summary, the summary's first clause, the steps of plays that name it) and every skill shipped in `SKILL_DIRS` (`hermesPlugin/skills`, `.claude/skills`, `skills`, `skills/published`: name, description, the asks in `when_to_use`; `skillsIn`, `skillOf`). `buildMeaningIndex` embeds each text with log's local embedder (`localEmbedder`, `EMBED_MODEL`) through `storedEmbedder`, so the vectors sit in log.db `embeddings` under that model with kind `ROUTER_VECTOR_KIND`, and records `ROUTER_INDEX_NAME` in `aiIndexes` with the catalog hash (`catalogHash`). `openMeaningIndex` opens it only while the stored hash equals the catalog's. The context service (`scripts/contextLayer/service.ts`) opens it at start and after any play, fixture or skill change, building it when the catalog changed; `log router index` shows whether it is current and `--apply` builds it. Per prompt the service embeds the prompt's windows on the same warm embedder (`meaningWithin`, `routerMeaning`, `meaningRanks`: per item the mean of its two closest texts, a step text at `MEANING_STEP_DISCOUNT`) and sends the per-kind ranking with its `/route` answer, racing `ROUTER_BUDGET_MS`; when the index is not loaded, the budget is blown or the service gives no answer, the meaning is null and the section is the word ranking alone. `fuseTools` fuses the word list (tools scoring at least `TOOL_KEEP_SHARE` of a top that clears `TOOL_MIN_SCORE`) with the meaning list (tools allowed by the same platform and read/write filters whose meaning is within `TOOL_MEANING_SPREAD` of a top that clears `TOOL_MEANING_FLOOR`) by reciprocal rank fusion with k = `RRF_K` (60), and a prompt whose ask terms are all status or chat words (`askTermsOf` empty) gets nothing. When the words or the service route the prompt to one play (a PLAY MATCH), `hookAnswer` passes that play to `routerSection`, and `playToolsFirst` puts the tools its steps table names (`playToolsOf`, allowed by the same filters) ahead of the rest, in their fused order and then by meaning, so a sign-in ask that names Discord lists `sessionsSignIn` and `browserView` rather than Discord's read tools. `fuseSkills` does the same for skills (`SKILL_MEANING_FLOOR`, word matches of their asks at `SKILL_WORD_FLOOR`), and `fusePlay` names a play only when no PLAY MATCH or menu was shown and its meaning clears `PLAY_MEANING_FLOOR`, leaving out that play's own skill copy. `routerText` writes the play, up to `FUSED_TOOLS_SHOWN` filled-in calls and up to `SKILLS_SHOWN` skills, one line each, within `TOOL_TEXT_BUDGET`. `hookAnswer` records the section as the span `hook:UserPromptSubmit:router` through `logTiming`, its time the service's meaning time plus the section's own, with `meaning` in its attrs set to used, notLoaded, overBudget, noService or failed. `scripts/useCases/evalSkillRouter.ts` measures words only, meaning only, RRF and a weighted sum on `fixtures/toolGolden.json` and writes the meaning ranking it saw for each ask to `fixtures/routerMeaning.json`, and the router test holds the word and fused counts on it.

Checked by: code and SubQ

### REQ-HOOKS-28: Setup installs the hooks for each harness it finds

`SETUP_HARNESSES` (`src/cli/launch/helpers/setup.ts`) is the table's rows with `installedBy: "launchSetup"`: Hermes and OpenCode. `log launch --setup` offers each whose home exists (`~/.hermes`, `~/.config/opencode`). For Hermes, `installHermes` (`src/agentHooks/hermes/client.ts`) copies `plugin.yaml` and `__init__.py` into `<home>/plugins/logHooks`, with `log_root` set to the log install, and says nothing changed on a second run; the owner enables it with `hermes plugins enable logHooks`. Its `pre_llm_call` POSTs each event to the warm context service (`ask_service`: `/hooks/<event>?host=hermes` on `127.0.0.1:LOG_CONTEXT_PORT`, 0.3 s to connect), the same path Claude Code's http hooks use, and runs `scripts/hooks/event.ts UserPromptSubmit --host hermes` only when the service is off or its port refuses; on a session's first turn `SessionStart` is asked beside it, not before it. Each body carries `log_sent_at`, so the span shows the time spent reaching log (`spawn` and `bunStart` for a process, `sent` for the service), and returns `{ "context": … }`. The portable plugin's skills are the 38 play skills, written by `bun run skills:build` (`scripts/docs/syncSiteSkills.mjs`) into `hermesPlugin/skills/` as into `.claude/skills/`, and `check:siteSkills` fails on any other skill there.

Checked by: code and SubQ

### REQ-HOOKS-31: The warm service never makes a hook wait on a walk, a git run or a second embed

Hooks in the context service share one event loop, so any synchronous walk or child process in one of them delays every other hook and the router's budget timer. `storageAnswer` reads the runs size through `servedRunsBytes` (`src/browser/runStore/client.ts`): the cached size is answered at once, and a size older than 15 minutes is measured again behind by `remeasureRunsBytes` with an async walk, one at a time; only a missing size is measured in place. The service gives `cachedFreshness` `background: true`, so the engines hook answers the last uncommitted-files listing and the code stamp is refreshed behind (`refreshAsync` on `codeStampWatcher`, `codeStampAsync`, `uncommittedFilesAsync`). The service checks its sources and its own code with async walks (`newestChange`, `codeStampAsync`), and the MCP reload proxy refreshes its stamp with `refreshAsync` on its timer. The play route and the meaning router embed the same prompt windows, so the service embeds through `sharedEmbed`, which keeps the vectors and the embeds still in flight by text (case folded for the uncased model in `UNCASED_MODELS`) and drops a failed one, so each window is embedded once. The hand-rolled check is served warm at `/hooks/PreToolUse/handRolled` with `handRolledText` and timed as `hook:PreToolUse:handRolled`; the Hermes plugin asks it there first and starts `scripts/hooks/handRolled.ts` only when the service doesn't answer. The plugin keeps one push runner thread per session (`Push.runner`, `Push.current`), so a turn hook arriving while the push loop is between restarts never starts a second `push.ts`. `bun scripts/bench/agentPaths.ts` times these paths on scratch state.

Checked by: code and SubQ

### REQ-HOOKS-32: A typo of a common word is never pointed at a chat

The prompt hook's `>>> NAMED IN THE PROMPT` pointers come from `nameHints` (`src/inbox/nameHints/client.ts`). Each prompt word is read with its context (`promptTokens`): an `@`, a capital letter that doesn't start a sentence, a short all-caps word, a handle shape (`_` or a digit), or one of `NAME_CUES` (with, ask, tell, message, dm…) just before it. A word that is a common English word (`isCommonWord` over `COMMON_WORDS`: the public-domain 12dicts core list plus log's chat and build words, with plural, past and -ing forms) counts only with that strong context; a word within one edit or one swap of a common word (`commonWordNear`) counts only with context; a word of five letters or fewer with no context matches a name only exactly or by one swapped pair; and a fuzzy match never lands on a name token shorter than `FUZZY_MIN_TOKEN`. A later word of a chat name that is itself a common word is not a token of that name. A fuzzy match to a chat quiet for more than `RECENT_DAYS` before the newest stored chat loses `STALE_PENALTY`, and ties go to the chat with the newest message. `bun scripts/bench/nameHints.ts --prompts <turns.json> --db <copy of log.db>` labels every pointer over a prompt set (`labelMatch`: wrong when the word is a common word or its typo and nothing marks it as a name) and reports precision and wrong pointers per 50 prompts.

Checked by: code and SubQ

### REQ-HOOKS-33: A typo-heavy prompt or one about building log names no play

`playSkipOf` (`src/useCases/router/helpers/gate.ts`) skips the play line when at least `TYPO_HEAVY_SHARE` of a prompt's lower-case words (`TYPO_MIN_WORDS` or more) are neither common words nor router vocabulary (`typoShare`), or when the prompt is about building log (`buildingLog`: a word of `LOG_BUILD_STRONG` with another build word, or "log" with two of `LOG_BUILD_WEAK`). `hookAnswer` then writes no `>>> PLAY MATCH` or `>>> MAYBE A PLAY`, tells `routerSection` not to fuse a play (`noPlay`), and puts the reason in the router span's attrs (`playSkipped`); `askAnswer` (getGuide with `ask`) loads no play for such an ask. The tools list is still written. The same bench counts the router's play lines over the prompt set.

Checked by: code and SubQ

### REQ-HOOKS-34: An unchanged block is said once per session

The storage notice, the accounts and engines block and the hand-rolled advice go through `freshBlock` (`src/agentHooks/sessionBlocks/client.ts`), which keeps one fingerprint per session and block in log.db's `state` (scope `hookBlocks`, pruned after `BLOCKS_KEEP_MS`) and returns the text only when that session hasn't seen the same fingerprint. The storage fingerprint leaves numbers out (`numbersOut`), so a notice comes back only when another warning starts or stops; the accounts fingerprint (`accountsFingerprint`) leaves out each open session's pid and call count and the checked clock, and counts requests in steps of `REQUESTS_BUCKET`, so it comes back when a session state, a pause or the writes change; the hand-rolled advice is shown once per session for each label and target, while every call is still counted (a call with no session id gets it every time). A `SessionStart` that is not a fresh start (resume, clear, compact: `resumedSession`) always says them again.

Checked by: code and SubQ
