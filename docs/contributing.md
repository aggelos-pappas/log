# Contributing

## Changes

- Work on a branch from `main`, one change per pull request.
- Run `bun run check` before pushing: the commit and push hooks run the same gates (privacy, naming, specs, docs, typecheck, tests).
- Title the pull request as a conventional commit (`feat: …`, `fix: …`, `docs: …`, `feat!: …` for a breaking change). release-please reads these titles from the merge commits to pick the next version and write the changelog.

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

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
