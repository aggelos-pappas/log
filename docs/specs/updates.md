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

### REQ-UPDATE-06: Every local model is pinned to one revision, and log models says whether it is here

`LOCAL_MODELS` (`src/models/manifest`) lists every local model: its id, purpose, source (`huggingFace` or `pip`), the exact revision (a Hugging Face commit sha, or a pip version), the files with size and hash, and the process that loads it. Every loader asks for that revision: the embed worker and the media describer pass `revision: revisionOf(model)` to transformers.js and keep files under `hfCacheDir` (`~/.logCli/models/hf/<id>/<revision>`), the judge server passes `revision=MODEL_REVISION` to `snapshot_download` and re-downloads when its recorded commit differs, and the pip model is installed as `<id>==<revision>` (`pipSpecs`). `log models` (MCP `models`) runs `checkModels`: each model's pinned revision and whether it is present and matches (`ready`, `missing`, `mismatched`, `notInstalled`, `wrongVersion`), naming a copy in transformers.js's old cache. `log models --fetch --approvedBy <who>` (MCP `modelsLive`) runs `fetchModels`: it keeps a file that already matches, moves a matching old copy (`adopted`), else downloads `<HF_ENDPOINT>/<id>/resolve/<revision>/<file>`, checks its sha256 (or git blob sha1), removes a download that doesn't match and refuses with `modelFetchFailed`. Every disk, network and process effect comes through `ModelsDeps` (`liveModelsDeps` in real runs). `log version --json` lists the pinned revisions under `models`.

Checked by: code and SubQ

### REQ-UPDATE-07: Install and update run one after-install routine, at one release

`install.ps1` and `install.sh` install one version: `LOG_VERSION` when set, else the newest GitHub Release's tag, else npm's `latest`, refuse when Bun installed another version than `LOG_VERSION`, and end with `installed log X.Y.Z`. After setting up Python they run `scripts/update/postInstall.ts`, which is `runPostInstall` over `POST_INSTALL_STEPS`: the Python vendors (`PYTHON_VENDORS` with the pip-pinned models and the Windows wheel), log.db's migrations, the skills build, the local models (`fetchModels`) and every harness (`refreshHarnesses`). `log update` runs the NEW version's own `postInstall.ts` with `--skip harnesses --json` (harnesses are refreshed after the restart) and reads its report (`parsePostInstall`); a failed vendor, migration or skills step fails the update and rolls it back, while a model that couldn't be fetched is reported in the answer and `resume.json` (`models`).

Checked by: code and SubQ

### REQ-UPDATE-08: The README lists every release in order, with its models

`CHANGELOG.md` holds one section per release (release-please writes them); each carries a `Models:` line, the pins of that release (`recordModels`, from `modelPins`). `scripts/docs/releasesTable.ts` (`bun run docs:releases`, part of `docs:build`) renders the README's Releases table between its markers (`renderReleases`, `withReleases`): Version, Date, What's in it (the first note, plus how many more) and Models (`modelsCell`: not pinned, first pinned, same as the previous release, or changed/added/removed), newest first by semver. `check:docs` runs it with `--check` and fails when the table is stale, when a release has no `Models:` line, or when the newest section isn't `.release-please-manifest.json`'s version (`releaseProblems`). The release workflow runs it on the release PR's branch and pushes the result.

Checked by: code and SubQ
