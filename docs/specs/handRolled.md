---
title: "Hand-rolled one-offs into tools"
---

# Hand-rolled one-offs into tools

When an agent hand-rolls a data read or action (a scratch script or raw query against log.db, a curl to a platform or a link, a one-off `python -c` or `bun -e`), log labels it, counts it and advises turning it into a real command and MCP tool, without blocking and without asking the owner; `log new tool` then writes that tool through the syntax tree. Rules 83 and 163.

### REQ-HANDROLLED-01: Every host's call is normalised before it is classified

`normaliseCall` (`src/agentHooks/handRolled/helpers/normalise.ts`) turns a tool call from any host into `{ tool, effectiveCommands, writtenFiles, code }`: shell tools (Claude Code's `Bash` and `PowerShell`, Codex's `shell`, Hermes's `terminal`) through `shellParts`, which splits on `&&`, `||`, `;` and newlines outside quotes, keeps variable assignments and turns a `cat > <file> << 'EOF'` heredoc into a written file; write tools (`Write`, `write_file`) and Codex's `apply_patch` into written files; Hermes `execute_code` through `pythonParts`, which unwraps `terminal()`, `subprocess`, `write_file()`, `open(…, 'w').write()` and `Path().write_text()` and keeps the rest of the Python as code; `browser_exec` code as browser code; and `tool_call` wrappers by normalising each inner call. A log MCP tool, inside a wrapper or not, is kept apart and never classified, and `delegate_task` is out of scope. A new wrapper needs only a new normaliser.

Checked by: code and SubQ

### REQ-HANDROLLED-02: The label is readsData or actsOnData with the data it touched

`classifyCall` (`src/agentHooks/handRolled/client.ts`) labels a call `readsData` and/or `actsOnData` with its target: log.db with the tables its SQL names (`logDbHits`: an open or a query, `INSERT`, `UPDATE`, `DELETE` or schema changes acting), `~/.logCli` files (`stateFileHits`), a platform's API or page and a link through a short-link host or a `curl -I … | grep location` (`httpHits`; a POST, PUT, PATCH or DELETE acts). A scratch script (`isScratchScript`: a script outside the repo's source folders) is classified by its content, whether it is written in the same call or run later from disk. It never labels `git`, `gh`, `bun test`, `tsc`, `log` itself (`excludedCommand`), a `VACUUM INTO` copy, the devlog, `~/.logCli/mcp` logs, or files written inside the repo's source.

Checked by: code and SubQ

### REQ-HANDROLLED-03: Each hit is counted in log.db

`recordHandRolled` keeps one row per label and target in log.db's `state` table (scope `handRolled`) with its count, first and last time, the tools it came through and a sample, so a one-off that keeps coming back is countable. `listHandRolled` reads them, most frequent first, and `log new tool` with no name shows them.

Checked by: code and SubQ

### REQ-HANDROLLED-04: The hook advises on every host and never blocks

`scripts/hooks/handRolled.ts` is a `PreToolUse` hook in `AGENT_HOOKS` (`HAND_ROLLED_MATCHER`), run in its own process like the other per-call hooks, written to Claude Code's and Codex's hook files; OpenCode's plugin runs it before a shell, write or patch call, and Antigravity's adapter runs `classifyCall` in its `PreToolUse`. On a hit it answers with `handRolledAdvice` as context (Claude Code's `additionalContext`, Hermes's `context`), naming the label, the target and `getGuide({ useCase: "log/toolFromOneOff" })`, and always exits 0: the call goes on. Hermes's `pre_tool_call` can only block, ask the owner or change the arguments, so the native plugin's `transform_tool_result` runs the same script after a `terminal`, `execute_code`, `write_file`, `browser_exec` or `tool_call` (`hand_rolled_advice`) and adds the advice to that call's result.

Checked by: code and SubQ

### REQ-HANDROLLED-05: log new tool writes the tool through the syntax tree

`planNewTool` (`src/scaffold/tool/client.ts`) plans a new any-platform command from a name and a summary (optional string flags, `acts` for a dry run plus a Live form, the use case folder, the owner's asks and the guide group): `src/cli/<name>/index.ts` with its rows function, a test, and `docs/useCases/<area>/<name>.md` with "How the owner asks for it" and a steps table; and syntax-tree edits that add the import and the `COMMANDS` entry, its `SOURCE_COMMAND_RULES` and its entry in a `GUIDE_TOPICS` group (`addToPropertyArray`). An existing command, a bad name, a missing summary or an unknown guide group is refused before anything is written. Without `--apply` it lists the plan; with it, `applyPlan` checks every edit landed before writing, then the docs and skills builds run and `src/mcp/server/index.ts` is touched so the reload proxy loads the tool.

Checked by: code and SubQ
