# Updates

log tells you when a newer release is out, asks before it installs anything, and after an update it starts again whatever was running: the hook service, the account watchers and the open browsers.

## Which version runs here

`log version` (or `log --version`, MCP `version`) answers:

- the installed version, from `package.json`;
- the git commit, when log runs from a clone;
- how it was installed: `bunGlobal` (`bun add -g @listeningkit/log`, what the install scripts do), `gitClone` (a checkout, `bun link`ed or run with `bun bin/log.ts`) or `other`;
- the newest known release and when it was checked.

`--json` gives the same as one object. `--check` asks for the newest release now instead of reading the cache.

## How the check works

- It reads the newest GitHub Release of the repo named in `package.json` (`api.github.com/repos/<owner>/<repo>/releases/latest`). When the repo has no release yet, it reads npm's `latest` dist-tag. On the `beta` channel it takes the newest release, prereleases included (npm's `beta` or `next` tag as the fallback).
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
| `update.channel` | `stable`, `beta` | `stable` | `LOG_UPDATE_CHANNEL` |

```json
{ "update": { "check": "on", "auto": "ask", "channel": "stable" } }
```

- `ask`: the agent asks the owner and updates only after a yes. Nothing installs by itself.
- `notify`: the agent only says a release is out.
- `auto`: the agent may run `updateLogLive` with `approvedBy: "update.auto"` when nothing is running. With any other setting that approver is refused.

## log update, then resume

`log update` (MCP `updateLog`) only shows the plan: the version it would install, what it would stop and restart, and anything busy. Nothing changes.

`log update --apply --approvedBy <who>` (MCP `updateLogLive`, write-gated like every live tool) does it:

1. **Waits, or refuses.** A running job (`jobStatus`) or a queue mid-send holds it; it waits about 30 s for them to settle and then refuses with `updateBusy`, having stopped nothing.
2. **Records what runs** in `~/.logCli/resume.json` (`LOG_UPDATE_RESUME` moves it): the warm hook service, each account watcher, each open browser, with the version it came from and the commit of a clone. The record's `status` moves through `stopping`, `installing`, `verifying` and ends `resumed`, `rolledBack` or `failed`.
3. **Stops them:** each open browser through `inspect do stop`, each watcher through `watchers stop`, and the hook service.
4. **Installs:** `bun add -g @listeningkit/log@X.Y.Z` for a bun global install; for a clone, `git fetch --tags` and a fast-forward to the tag `vX.Y.Z`, then `bun install --frozen-lockfile`. Then the Python vendors (`uv pip install` into `LOG_PYTHON`), log.db's migrations (opening it runs them) and the skills build.
5. **Verifies** that `log version --json` says X.Y.Z and that a smoke command (`log runs space`) passes.
6. **Rolls back** on any failure in steps 4-5: the previous version is installed again (`bun add -g …@<previous>`, or `git reset --keep <commit>` in a clone) and the refusal is `updateFailed`, naming the step.
7. **Resumes** what `resume.json` lists (the service, `watchers start` for each watcher, `inspect start --detach` for each browser).
8. **Refreshes every agent harness** that is on this machine, with the new version's own code (`scripts/update/harnesses.ts`, `refreshHarnesses`): see the table below. Each harness's result goes into `resume.json` (`harnesses`) and the answer.
9. **Answers** `updated 0.2.1 -> 0.2.2, resumed: service, 3 watchers, 1 browser; harnesses: Hermes plugin rewritten, Desktop plugin copied, Claude Code .claude/settings.json came with the new version`. The next prompt's context gets the updated line once, so the agent carries on with the task it had.

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

## How a release is made

Releases come from `main` with [release-please](https://github.com/googleapis/release-please):

1. Merged pull requests with conventional commit titles (`feat:`, `fix:`, `feat!:`) make release-please open or update a release PR that bumps `package.json` and writes `CHANGELOG.md`.
2. Merging the release PR tags `vX.Y.Z` and creates the GitHub Release with its notes.
3. The same workflow (`.github/workflows/release.yml`) then runs `npm publish --provenance --access public` for that tag.

The workflow needs one repository secret, `NPM_TOKEN` (an npm automation token for `@listeningkit/log`). Without it the tag and the GitHub Release are still made, and the check still finds them; only the npm half is skipped. The contributor steps are in [contributing.md](contributing.md).

## Later: a compiled build and Velopack

log installs as a Bun package plus uv-managed Python vendors, not as one executable, so Velopack doesn't fit yet. Once `bun build --compile` ships a single log executable with the Python runtime beside it, it can be packed with `vpk pack` and published through Velopack's GitHub Releases source, which brings a Windows installer, delta updates and an apply-on-restart. Until then updates go through npm and GitHub Releases as above.
