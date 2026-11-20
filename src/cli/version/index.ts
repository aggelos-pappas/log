import { checkForUpdate, readUpdateState } from "../../release/check/index.ts";
import type { UpdateState } from "../../release/check/index.ts";
import { gitCommit, installKindOf, isNewer, LOG_ROOT, packageFacts } from "../../release/version/index.ts";
import type { VersionInfo } from "../../release/version/index.ts";
import { LOCAL_MODELS, shortRevision } from "../../models/manifest/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const VERSION_USAGE = [
  "Usage: log version [--check] [--json]",
  "--check asks for the newest release now instead of the daily cache.",
].join("\n");

export const VERSION_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      effect: "read",
      summary: "Installed version, commit, install kind and newest release",
      positionals: [],
      flags: [{ name: "check", kind: "boolean", description: "Ask for the newest release now" }, JSON_FLAG],
    },
  ],
};

export const versionDeps: { root: () => string; check: () => Promise<UpdateState>; known: () => UpdateState } = {
  root: () => LOG_ROOT,
  check: () => checkForUpdate({ force: true }),
  known: () => readUpdateState(),
};

export function versionInfo(root: string, state: UpdateState): VersionInfo {
  const facts = packageFacts(root);
  return {
    name: facts.name,
    version: facts.version,
    commit: gitCommit(root),
    kind: installKindOf(root),
    root,
    repo: facts.repo,
    latest: state.latest,
    notesUrl: state.notesUrl,
    checkedAt: state.checkedAt,
    newer: isNewer(state.latest, facts.version),
    models: LOCAL_MODELS.map((m) => ({ key: m.key, id: m.id, revision: m.revision, source: m.source })),
  };
}

export function versionText(info: VersionInfo): string {
  const known = info.latest ? `newest known release ${info.latest}${info.checkedAt ? ` (checked ${info.checkedAt})` : ""}${info.newer ? ": log update" : ""}` : "no release checked yet (log version --check)";
  return [`log ${info.version} (${info.kind}${info.commit ? `, commit ${info.commit.slice(0, 12)}` : ""})`, known, `models pinned: ${info.models.map((m) => `${m.id}@${shortRevision(m.revision)}`).join(", ")} (log models)`].join("\n");
}

export const versionCommand: Command = {
  usage: VERSION_USAGE,
  platform: "any",
  name: "version",
  effect: "read",
  input: VERSION_INPUT,
  summary: "Which log runs here and the newest release",
  args: "[--check] [--json]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(VERSION_INPUT));
    if (!parsed.ok) return refuseInput("version", parsed.error, VERSION_USAGE);
    if (parsed.positionals.length) return { code: 1, error: "inputInvalid", stderr: `log version: unexpected argument "${parsed.positionals[0]}"\n${VERSION_USAGE}` };
    const state = parsed.flags["check"] === true ? await versionDeps.check() : versionDeps.known();
    const info = versionInfo(versionDeps.root(), state);
    return { code: 0, stdout: parsed.flags["json"] === true ? JSON.stringify(info, null, 2) : versionText(info) };
  },
};
