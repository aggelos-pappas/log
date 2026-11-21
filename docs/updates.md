# Updates

log tells you when a newer release is out, asks before it installs anything, and after an update it starts again whatever was running: the hook service, the account watchers and the open browsers.

## Which version runs here

`log version` (or `log --version`, MCP `version`) answers:

- the installed version, from `package.json`;
- the git commit, when log runs from a clone;
- how it was installed: `bunGlobal` (`bun add -g @listeningkit/log`, what the install scripts do), `gitClone` (a checkout, `bun link`ed or run with `bun bin/log.ts`) or `other`;
- the newest known release and when it was checked;
- the local models this release pins, each with its exact revision (`log models` says whether each is here and matches).

`--json` gives the same as one object, with the pins under `models`. `--check` asks for the newest release now instead of reading the cache.

## How the check works

- It reads the newest GitHub Release of the repo named in `package.json` (`api.github.com/repos/<owner>/<repo>/releases/latest`, which never answers a prerelease). When the repo has no release yet, it reads npm's `latest` dist-tag. On the `nightly` track it takes the highest version among the recent GitHub Releases, nightly prereleases included, with npm's `next` dist-tag (or `latest` when that is higher) as the fallback.
- Each request has a 2 s timeout. Offline it says nothing and keeps the last answer.
- It runs at most once every 24 hours, and never in front of a command: after a CLI command finishes, or when the prompt hook runs, a detached `scripts/update/check.ts` does it in the background.
- The answer is kept in `~/.logCli/update.json` (`LOG_UPDATE_STATE` moves it): `latest`, `notesUrl`, `source`, `checkedAt`, and which sessions were already told.
- Versions are compared as semver (numbers, then prerelease parts); nothing outside log decides it.

## The notices

- **CLI:** after a command, one line on stderr when stderr is a terminal: `log 0.2.2 is out (you have 0.2.1): log update`. `log version` and `log update` don't add it.
- **Agent:** the prompt hook (the same one that says the storage line, through the warm hook service or `scripts/hooks/storage.ts`) adds one `log-cli update:` line to the context the first time a session prompts while a newer release is known. Each session hears it once per release. With the default `update.auto` of `ask`, the line tells the agent to ask the owner first, show the plan with `updateLog`, and run `updateLogLive` only after the owner says yes.
- **Console:** `log console start` (MCP `consoleStart`) ends with the same notice, and its JSON carries it as `update`.

## Settings

In `~/.logCli/settings.json` (or `LOG_SETTINGS`), under `update`; the environment variables win:

| Setting | Values | Default | Environment |
| --- | --- | --- | --- |
| `update.check` | `on` / `off` | `on` | `LOG_UPDATE_CHECK` |
| `update.auto` | `ask`, `notify`, `auto` | `ask` | `LOG_UPDATE_AUTO` |
| `update.track` | `stable`, `nightly` | `stable` | `LOG_TRACK` |

```json
{ "update": { "check": "on", "auto": "ask", "track": "stable" } }
```

`log update --track nightly` (or `stable`) saves `update.track` and plans against that track straight away. An older `update.channel` of `beta` (or `LOG_UPDATE_CHANNEL`) still counts as `nightly`; saving a track drops it.

- `ask`: the agent asks the owner and updates only after a yes. Nothing installs by itself.
- `notify`: the agent only says a release is out.
- `auto`: the agent may run `updateLogLive` with `approvedBy: "update.auto"` when nothing is running. With any other setting that approver is refused.

## log update, then resume

`log update` (MCP `updateLog`) only shows the plan: the version it would install, what it would stop and restart, and anything busy. Nothing changes.

`log update --apply --approvedBy <who>` (MCP `updateLogLive`, write-gated like every live tool) does it:

1. **Waits, or refuses.** A running job (`jobStatus`) or a queue mid-send holds it; it waits about 30 s for them to settle and then refuses with `updateBusy`, having stopped nothing.
2. **Records what runs** in `~/.logCli/resume.json` (`LOG_UPDATE_RESUME` moves it): the warm hook service, each account watcher, each open browser, with the version it came from and the commit of a clone. The record's `status` moves through `stopping`, `installing`, `verifying` and ends `resumed`, `rolledBack` or `failed`.
3. **Stops them:** each open browser through `inspect do stop`, each watcher through `watchers stop`, and the hook service.
4. **Installs:** `bun add -g @listeningkit/log@X.Y.Z` for a bun global install; for a clone, `git fetch --tags` and a fast-forward to the tag `vX.Y.Z`, then `bun install --frozen-lockfile`. Then the NEW version's own after-install routine, `scripts/update/postInstall.ts` (the same one the install scripts run): the Python vendors (`uv pip install` into `LOG_PYTHON`, pip-pinned models included), log.db's migrations (opening it runs them), the skills build and the local models of its manifest, fetched and checked against their pinned hashes. A model that can't be fetched (offline) is reported, not rolled back: `log models --fetch` finishes it later.
5. **Verifies** that `log version --json` says X.Y.Z and that a smoke command (`log runs space`) passes.
6. **Rolls back** on any failure in steps 4-5: the previous version is installed again (`bun add -g …@<previous>`, or `git reset --keep <commit>` in a clone) and the refusal is `updateFailed`, naming the step.
7. **Resumes** what `resume.json` lists (the service, `watchers start` for each watcher, `inspect start --detach` for each browser).
8. **Refreshes every agent harness** that is on this machine, with the new version's own code (`scripts/update/harnesses.ts`, `refreshHarnesses`): see the table below. Each harness's result goes into `resume.json` (`harnesses`) and the answer.
9. **Answers** `updated 0.2.1 -> 0.2.2, resumed: service, 3 watchers, 1 browser; harnesses: Hermes plugin rewritten, Desktop plugin copied, Claude Code .claude/settings.json came with the new version; models: all 4 on the pinned revision`. The models go into `resume.json` (`models`) too. The next prompt's context gets the updated line once, so the agent carries on with the task it had.

## Every harness

The update covers every harness log hooks into (`HOOK_HOSTS` in `src/agentHooks/harness`). A harness counts as present the same way `log launch --setup` decides it: Hermes when its home exists (`HERMES_HOME`, `~/.hermes`, `%LOCALAPPDATA%\hermes`), OpenCode when its config folder exists (`LOG_OPENCODE_DIR`, `~/.config/opencode`), and the others when their hook file is in the installed package. Every harness reaches log's tools through `logMcp`, whose reload proxy swaps in the new code without dropping the client (docs/specs/mcpReload.md), so no MCP client is restarted.

| Harness | What update refreshes | How it reloads | How its agent is told |
| --- | --- | --- | --- |
| Hermes | `installHermes`: the plugin in `<HERMES_HOME>/plugins/log` and the Desktop plugin at `<HERMES_HOME>/desktop-plugins/log/plugin.js` (each only when it changed) | `hermes plugins disable log`, then `enable log` (a gateway restart doesn't re-register plugin hooks); MCP by the reload proxy | `pre_llm_call` posts SessionStart (first turn) and UserPromptSubmit to the warm hook service; the storage hook adds the line once per session |
| OpenCode | `installOpenCode`: the logHooks plugin and the config in `~/.config/opencode` | OpenCode loads plugins at start, so a changed plugin needs OpenCode restarted (the answer says so); MCP by the reload proxy | its plugin posts UserPromptSubmit with the session to the same hook |
| Claude Code | `.claude/settings.json` ships in the new version | its hooks call log on each event, so the next prompt runs the new code; MCP by the reload proxy | the UserPromptSubmit http hook to the warm service |
| Codex | `.codex/hooks.json` ships in the new version | same as Claude Code | its UserPromptSubmit hook |
| Cursor | `.cursor/hooks.json` ships in the new version | same as Claude Code | Cursor has no prompt hook: its sessionStart hook (`event.ts SessionStart --host cursor`), keyed by the conversation |
| Antigravity | `.agents/hooks.json` ships in the new version | same as Claude Code | PreInvocation becomes UserPromptSubmit with the conversation as its session |

`log launch --setup` uses the same installers, so it also copies the Hermes Desktop plugin and says where.

An install that is neither a bun global install nor a clone can't be replaced in place: `log update` says so and you reinstall with the install script.

## Everything on one version

A release is one version for every piece. Nothing a release runs is picked by "newest" at run time:

| Piece | Where its version comes from | How install sets it | How update moves it | How to check |
| --- | --- | --- | --- | --- |
| log itself | `package.json` `version`, bumped by the release PR; tag `vX.Y.Z` | `install.ps1`/`install.sh` install `@listeningkit/log@X.Y.Z`: `LOG_VERSION` if set, else the newest GitHub Release, else npm's `latest` | `bun add -g @listeningkit/log@X.Y.Z`, or a clone fast-forwarded to `vX.Y.Z` | `log version`; the install scripts end with `installed log X.Y.Z` |
| Python engines and vendors | `PYTHON_VENDORS` in `src/release/postInstall` (vendored folders ship in the package) | the shared after-install routine, `scripts/update/postInstall.ts` | the new version's own `postInstall.ts` | `uv pip list --python <LOG_PYTHON>` |
| log.db schema | the migrations in `src/storage/schema` | opening log.db in the after-install routine | the same, with the new code | `log storage verify` |
| Skills | `skills/*/SKILL.md` in the release | the skills build in the after-install routine | the same | `check:siteSkills` in CI |
| Harness plugins (Hermes, its Desktop plugin, OpenCode, the hook files) | `hermesPlugin/` and the hook files in the release; the Hermes plugin's `version` is the package version | `refreshHarnesses` in the after-install routine, then `log launch --setup` | `refreshHarnesses` with the new code after the restart | `hermes plugins list`; the update's `harnesses:` answer |
| Local models | `src/models/manifest` (`LOCAL_MODELS`): each model's id and exact revision (a Hugging Face commit, or a pip version), its files with size and hash | the after-install routine fetches each model at its pinned revision into `~/.logCli/models` and checks every hash | the new version's routine fetches what changed; the loaders ask for that revision | `log models`, `log version --json` (`models`) |
| README Releases table | `CHANGELOG.md` sections plus their `Models:` line, written from the manifest | | the release PR gets it from `.github/workflows/release.yml` | `bun run check:docs` |

The pinned models today:

| Model | Revision | Size | Loaded by |
| --- | --- | --- | --- |
| `patronus-studio/wolf-defender-prompt-injection-small` | `2484cc9a13550aa4f2c29b577ff3ef331dc6ba07` | 142 MB (int8 ONNX + tokenizer) | the judge server, `python/judge/server.py` (huggingface_hub, `revision=`) |
| `Xenova/all-MiniLM-L6-v2` | `751bff37182d3f1213fa05d7196b954e230abad9` | 24 MB (q8 ONNX + tokenizer) | the embed worker: the warm context service, search and the router (transformers.js, `revision`) |
| `onnx-community/LFM2.5-VL-450M-ONNX` | `24e63007ff1aaafbde27c89eb01a0513f4f61482` | 368 MB (q4 ONNX + processor) | the media describer (transformers.js, `revision`) |
| `myuri` | `5.0.0` | a pip package | every browser session in `LOG_PYTHON` (`python/human`) |

Where the files live: the judge in `~/.logCli/models/wolfDefenderSmall` (`LOG_JUDGE_MODEL` moves it), the transformers.js models in `~/.logCli/models/hf/<id>/<revision>/` (outside the package, so an update keeps them and a new pin lands beside the old). `log models --fetch`, and each loader before its first load, moves a matching copy from transformers.js's old cache inside `node_modules` instead of downloading it again. `HF_ENDPOINT` points the downloads at a mirror; `LOG_MODELS=off` makes the after-install routine skip models (`log models --fetch` gets them later).

To move a model to a new revision: change its `revision`, files, sizes and hashes in `src/models/manifest` (read them from `https://huggingface.co/api/models/<id>/revision/<sha>?blobs=true`), keep `MODEL_REVISION` in `python/judge/server.py` equal for the judge, run its tests, and the next release's `Models:` line and README row say `changed`.

## Tracks: stable and nightly

| Track | What it is | npm dist-tag | GitHub | Pick it |
| --- | --- | --- | --- | --- |
| `stable` | a release-please release, `X.Y.Z` | `latest` | a Release, tag `vX.Y.Z` | the default |
| `nightly` | every merge to `main` whose `check` passed, `X.Y.(Z+1)-nightly.<UTC yyyymmddhhmm>.<sha7>` | `next` | a prerelease, tag `v<that version>`, never marked latest | `log update --track nightly`, `LOG_TRACK=nightly` for the installer, or `bun add -g @listeningkit/log@next` |

A nightly sorts above the stable release it follows and below the next one, so moving back to `stable` waits for the next release rather than going down a version. A nightly lives on npm only: its version is set in CI and never committed, so a clone keeps following its branch with `git pull`, and `log update --apply` refuses to move a clone to one.

`.github/workflows/nightly.yml` makes them. It runs when the `check` workflow finishes on a push to `main` and does nothing unless that check passed; a release-please commit (the release PR's merge) is skipped, since the release workflow publishes that one. `bun scripts/release/nightlyVersion.ts --sha <sha> --write` (`nightlyVersion` in `src/release/nightly`) sets the version in `package.json` and the Hermes dashboard manifest, then `npm publish --tag next --provenance --ignore-scripts` and `gh release create --prerelease --latest=false`. Without `NPM_TOKEN` neither is made.

## How a release is made

Releases come from `main` with [release-please](https://github.com/googleapis/release-please):

1. Merged pull requests with conventional commit titles (`feat:`, `fix:`, `feat!:`) make release-please open or update a release PR that bumps `package.json` and writes `CHANGELOG.md`.
2. On the release PR's branch, the same workflow runs `bun scripts/docs/releasesTable.ts` (`bun run docs:releases`): it adds the release's `Models:` line (the pins from `src/models/manifest`) to its `CHANGELOG.md` section, rebuilds the README's Releases table and pushes both to the release PR.
3. Merging the release PR tags `vX.Y.Z` and creates the GitHub Release with its notes.
4. The same workflow (`.github/workflows/release.yml`) then runs `npm publish --provenance --access public --ignore-scripts` for that tag (`--ignore-scripts` because the `prepare` script installs git hooks with bun and lefthook, which the publish runner doesn't have). From then on the install scripts install that version, and `log update` moves installs to it.

The workflow needs one repository secret, `NPM_TOKEN` (an npm automation token for `@listeningkit/log`). Without it the tag and the GitHub Release are still made, and the check still finds them; only the npm half is skipped. The contributor steps are in [contributing.md](contributing.md).

## Later: a compiled build and Velopack

log installs as a Bun package plus uv-managed Python vendors, not as one executable, so Velopack doesn't fit yet. Once `bun build --compile` ships a single log executable with the Python runtime beside it, it can be packed with `vpk pack` and published through Velopack's GitHub Releases source, which brings a Windows installer, delta updates and an apply-on-restart. Until then updates go through npm and GitHub Releases as above.

## Related

- Up: [log's README](../README.md)
- Start here, in order: [Install](install.md) · [Add an account](accounts.md) · [Connect your agent](mcp.md) · [What log does, and what it never does](trust.md)
- Then: [Use cases, the plays step by step](useCases/README.md) · [Your agent app](harnesses/README.md) · [What you can do on each platform](platformGuides/x.md) · [Every command and tool](reference.md) · [How log works](howItWorks.md)
