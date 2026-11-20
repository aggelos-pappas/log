---
title: "Updates"
---

# Updates

log knows its own version, hears about a newer release at most once a day without slowing a command, tells the CLI, the agent and the console, and updates only after the owner's yes, then resumes what was running. docs/updates.md explains it for people.

### REQ-UPDATE-01: The version and the install are known

`log version` (alias `log --version`, MCP `version`) answers the installed version from `package.json` (`packageFacts`), the git commit in a clone (`gitCommit`), the install kind (`installKindOf`: `gitClone` when the root has `.git`, `bunGlobal` under bun's global `node_modules`, else `other`) and the newest known release with `checkedAt`, as text or `--json` (`versionInfo`).

Checked by: code and SubQ

### REQ-UPDATE-02: The newest release is checked at most once a day, never in front of a command

`fetchLatest` reads the repo's newest GitHub Release (the `releases/latest` endpoint on `stable`, the newest release on `beta`), falls back to npm's dist-tags, times each request out after `CHECK_TIMEOUT_MS` (2 s) and answers null offline. `checkForUpdate` asks only when `checkDue` (24 h since `checkedAt`, or the channel changed) or forced, and keeps the answer in `update.json` (`updateStatePath`, `LOG_UPDATE_STATE`). After a CLI command (`afterCommand` in `bin/log.ts`) and in the prompt hook, `refreshInBackground` claims the check once (`claimBackgroundCheck`) and runs `scripts/update/check.ts` detached. Versions compare as semver (`compareVersions`).

Checked by: code and SubQ

### REQ-UPDATE-03: The CLI, the agent and the console are told; the agent once per session

`cliNotice` gives one stderr line after a command when a newer release is known and stderr is a terminal. `agentNotice`, called by `storageAnswer` (the storage hook, next to the storage line) and `scripts/hooks/storage.ts`, adds one `log-cli update:` line the first time each session prompts per release, recording the session in `toldSessions`, and the `updated A -> B, resumed: ...` line once after an update. `consoleNotice` ends `console start`. `updateSettings` reads `update.check`, `update.auto` (`ask` by default) and `update.channel` from settings.json, with `LOG_UPDATE_CHECK`, `LOG_UPDATE_AUTO` and `LOG_UPDATE_CHANNEL` winning.

Checked by: code and SubQ

### REQ-UPDATE-04: An update asks first, refuses while busy, rolls back and resumes

`log update` (MCP `updateLog`) only plans (`planText`). `--apply` needs `--approvedBy` (`notApproved` otherwise; the `update.auto` approver only when `update.auto` is `auto`). `runUpdate` waits for `busy` to settle and refuses with `updateBusy` before stopping anything; writes the resume record (`writeResumeFile`, `resume.json`) with what runs; stops it; installs, runs the after-install steps and verifies; on a failure rolls back to the version that ran and restarts what ran (`updateFailed`); else restarts what ran, reloads the Hermes plugin and records the updated line (`recordUpdated`). Every process, network and file effect comes through `UpdateDeps` (`liveUpdateDeps` in real runs).

Checked by: code and SubQ

### REQ-UPDATE-05: Every harness is refreshed, and every harness's agent is told

After the install (and after a rollback), `refreshHarnesses` runs with the new code (`scripts/update/harnesses.ts`) over every hook host: Hermes through `installHermes`, which also copies the Desktop plugin to `<HERMES_HOME>/desktop-plugins/log/plugin.js` when it changed (`installHermesDesktop`), then reloads the plugin; OpenCode through `installOpenCode`; the others by their hook file in the package. A harness that is not on the machine is left alone. The results go into the resume record and the answer (`harnessesText`). The notice reaches each harness through the storage hook, keyed by its session (`sessionIdOf` reads `session_id`, `sessionId`, `sessionID`, `conversation_id`, `conversationId`; Antigravity's prompt carries its conversation through `antigravityPromptPayload`).

Checked by: code and SubQ
