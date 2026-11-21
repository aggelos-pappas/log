# Contributing

## Changes

- Work on a branch from `main`, one change per pull request.
- Run `bun run check` before pushing: the commit and push hooks run the same gates (privacy, naming, specs, docs, typecheck), with pre-push running only the affected tests (see [Tests](#tests)).
- Title the pull request as a conventional commit (`feat: …`, `fix: …`, `docs: …`, `feat!: …` for a breaking change). release-please reads these titles from the merge commits to pick the next version and write the changelog.

## Tests

- `bun run test:full` (and `bun test`, which `bun run check` and CI run) is the whole suite: about 3,200 tests in 350 files, 4-5 minutes on a busy Windows box.
- `bun run test:affected` runs only what a change can reach. It takes the files changed against `origin/main` (committed, uncommitted and untracked; `--base <ref>` or `LOG_TEST_BASE` picks another base, `--changed a.ts,b.py` names them), then runs: each changed file's own folder's tests; every test that imports it, directly or through other files (an import-graph walk over `src/`, `scripts/`, `bin/`, `python/` and `hermesPlugin/`, Python imports included); every test that spawns a changed Python file by path; and a small fixed smoke set (`SMOKE_TESTS` in `scripts/tests/affectedTests.ts`). The command registry (`src/cli/runner/index.ts`, any file importing 40 or more others) is a wall the walk doesn't cross, or every command change would reach half the suite. A change to `package.json`, `bun.lock`, `bunfig.toml`, `tsconfig.json`, `patches/`, `vendor/` or the test preload, or one that reaches 60% of the test files, runs the full suite. `--list` prints the selection without running it; `LOG_TEST_FULL=1` forces the full suite.
- Pre-push runs `test:affected`; CI runs the full suite on every pull request, so a test the walk misses still fails before merge.
- Every test run gets its own scratch folder from `scripts/tests/preload.ts`: `LOG_HOME`, `TMPDIR`/`TEMP`/`TMP` and the other `LOG_*` stores point inside it, so a test never reads or writes `~/.logCli` and two runs never share a file. A test that needs a folder makes it with `mkdtempSync(join(tmpdir(), ...))`; a server binds port 0. A test that sets a store variable (`LOG_DB`, `LOG_INBOX_STATE`) in a test puts it back in `afterEach`: bun runs many files in one process.
- A test that does slow, real work names why with a budget from `scripts/tests/timeouts.ts` as its third argument, instead of bun's 5 s default: `FRESH_DB_MS` (it creates a log.db and runs every migration), `SPAWNS_PROCESS_MS` (it starts Python, a Bun child or a worker), `STARTS_SERVER_MS`, `SCANS_REPO_MS` (it reads every source file) and `LOADS_EVERY_TOOL_MS` (it builds every tool's schema). Under three parallel runs a test takes 3-4 times as long as alone, so a test over about 400 ms alone should carry one.

## Several agents on one machine

Each agent works in its own worktree and never in the live clone:

1. `git fetch && git worktree add -b <branch> ../log-<name> origin/main`.
2. Link the live clone's `node_modules` with a junction, never a copy or `bun install`: `New-Item -ItemType Junction -Path <worktree>\node_modules -Target <live clone>\node_modules` from PowerShell. Copy `.env.local`.
3. Work and commit as usual; run `bun run test:affected` while working.
4. Push. Pre-push runs every check and `test:affected`, never the full suite; push only once an affected run has passed for the tree you are pushing, and don't edit the worktree while its push runs (pre-push tests the working tree). CI's full run is the gate before merge.
5. Remove the junction first (PowerShell `(Get-Item <worktree>\node_modules).Delete()`), check the live clone's `node_modules` is still whole, then `git worktree remove --force <worktree>`: removing the worktree with the junction still in it empties the live clone's `node_modules`.

## Releasing

Releases are cut from `main` by release-please; nobody tags or publishes by hand.

1. Merge pull requests into `main` as usual. release-please opens (or updates) a pull request titled `chore(main): release X.Y.Z` that bumps `package.json`, `hermesPlugin/dashboard/manifest.json`, `.release-please-manifest.json` and `CHANGELOG.md`.
2. The release workflow adds the release's `Models:` line to `CHANGELOG.md` and rebuilds the README Releases table on the release PR's branch (`bun run docs:releases`). If that run failed, run `bun run docs:releases` on the branch yourself and push: `check:docs` fails without it.
3. Before merging it, bump the `hermesVersion` default in `src/agentHooks/registry/index.ts` on the release PR's branch and run `bun run check:agentHooks --write`, which regenerates `hermesPlugin/plugin.yaml`; push both.
4. Merge the release PR. `.github/workflows/release.yml` tags `vX.Y.Z`, creates the GitHub Release with the notes, and publishes `@listeningkit/log@X.Y.Z` to npm with provenance.
5. Check it: `npm view @listeningkit/log version` (the registry can lag a few minutes), `log version --check` on an install, and a fresh install ending with `installed log X.Y.Z`.

A release that changes a local model changes `src/models/manifest` (and `MODEL_REVISION` in `python/judge/server.py` for the judge) in an ordinary pull request before the release; its README row then says which model changed. Never point a loader at a model without a pinned revision.

The workflow needs the repository secret `NPM_TOKEN`: an npm automation token with publish rights on `@listeningkit/log` (Settings → Secrets and variables → Actions). Provenance needs nothing else: the job has `id-token: write`.

Installs hear about the release within a day through the update check; see [updates.md](updates.md).

Every merge to `main` whose `check` passed is also published as a nightly (`.github/workflows/nightly.yml`, npm dist-tag `next`, a GitHub prerelease); nobody runs it by hand either.

## Research

Research lives in the repo, not only in issue comments or a local folder. Each topic gets `docs/decisions/<topic>/research.md` (papers with their id and the one finding that matters), plus its test results and the decision. Add a row to [research and decisions](decisions/README.md) and link the page back to it. The issue comment can link the file instead of carrying the only copy.

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
