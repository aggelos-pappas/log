import { liveUpdateDeps, planText, runUpdate } from "../../release/apply/index.ts";
import type { InstalledAt, UpdateDeps, UpdateTarget } from "../../release/apply/index.ts";
import { checkForUpdate, updateSettings } from "../../release/check/index.ts";
import type { UpdateSettings } from "../../release/check/index.ts";
import { gitCommit, installKindOf, LOG_ROOT, packageFacts, parseVersion } from "../../release/version/index.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuse, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput, CommandResult } from "../runner/types.ts";

export const UPDATE_USAGE = [
  "Usage: log update log [--to <version>] [--apply --approvedBy <who>] [--json]   (the word log may be left out)",
  "Plans only; --apply (after the owner's yes) stops what runs, installs, verifies, rolls back on failure and restarts it.",
].join("\n");

export const AUTO_APPROVER = "update.auto";

export const UPDATE_INPUT: CommandInput = {
  forms: [
    {
      words: ["log"],
      effect: "read",
      liveEffect: "write",
      summary: "Plan or apply a log update",
      positionals: [],
      flags: [
        { name: "to", kind: "string", pattern: "^v?\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$", takes: "a version like 0.2.2", description: "A version, not the newest" },
        { name: "approvedBy", kind: "string", approval: true, description: "Who approved it (rule 8)" },
        { name: "apply", kind: "boolean", live: true, description: "Install and resume" },
        JSON_FLAG,
      ],
    },
  ],
};

export const updateCommandDeps: {
  installed: () => InstalledAt;
  target: (to: string | null) => Promise<UpdateTarget | null>;
  settings: () => UpdateSettings;
  effects: (log: (line: string) => void) => UpdateDeps;
} = {
  installed: () => ({ version: packageFacts(LOG_ROOT).version, kind: installKindOf(LOG_ROOT), root: LOG_ROOT, commit: gitCommit(LOG_ROOT) }),
  target: async (to) => {
    if (to) return { version: to.replace(/^v/, ""), notesUrl: null };
    const state = await checkForUpdate({ force: true });
    return state.latest ? { version: state.latest, notesUrl: state.notesUrl } : null;
  },
  settings: () => updateSettings(),
  effects: (log) => liveUpdateDeps(log),
};

export const updateCommand: Command = liveThroughAction<Command>({
  usage: UPDATE_USAGE,
  platform: "any",
  name: "update",
  effect: "read",
  input: UPDATE_INPUT,
  summary: "Update log to the newest release and resume what ran",
  args: "[log] [--to <version>] [--apply --approvedBy <who>] [--json]",
  async run(context, argv): Promise<CommandResult> {
    const parsed = parseArgs(argv, parserSpecOf(UPDATE_INPUT));
    if (!parsed.ok) return refuseInput("update", parsed.error, UPDATE_USAGE);
    const extra = parsed.positionals.filter((p, i) => !(i === 0 && p === "log"));
    if (extra.length) return { code: 1, error: "inputInvalid", stderr: `log update: unexpected argument "${extra[0]}"\n${UPDATE_USAGE}` };
    const to = typeof parsed.flags["to"] === "string" ? parsed.flags["to"].trim() : null;
    if (to !== null && !parseVersion(to)) return { code: 1, error: "inputInvalid", stderr: `log update: --to is a version like 1.2.3\n${UPDATE_USAGE}` };
    const json = parsed.flags["json"] === true;
    const apply = parsed.flags["apply"] === true;
    const approvedBy = typeof parsed.flags["approvedBy"] === "string" ? parsed.flags["approvedBy"].trim() : "";
    if (apply && !approvedBy) return refuse("update", "notApproved", "--apply needs --approvedBy <who>: run it only after the owner said yes (rule 8)");
    if (apply && approvedBy === AUTO_APPROVER && updateCommandDeps.settings().auto !== "auto") return refuse("update", "notApproved", `update.auto is ${updateCommandDeps.settings().auto}, so only the owner approves an update`);
    const installed = updateCommandDeps.installed();
    const target = await updateCommandDeps.target(to);
    const effects = updateCommandDeps.effects(context.err);
    if (!apply) {
      const plan = planText(installed, target, effects.running(), effects.busy());
      return { code: 0, stdout: json ? JSON.stringify({ installed, target, plan }, null, 2) : plan };
    }
    if (!target) return refuse("update", "updateFailed", "no release is known: GitHub Releases and npm did not answer");
    context.err(`log update ${installed.version} -> ${target.version}, approved by ${approvedBy}`);
    const outcome = await runUpdate(installed, target, effects);
    if (!outcome.ok) return refuse("update", outcome.code, outcome.detail);
    return { code: 0, stdout: json ? JSON.stringify({ ...outcome, approvedBy }, null, 2) : outcome.text };
  },
}, ["apply"]);
