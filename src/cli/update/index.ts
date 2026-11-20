import { liveUpdateDeps, planText, runUpdate } from "../../release/apply/index.ts";
import type { InstalledAt, UpdateDeps, UpdateTarget } from "../../release/apply/index.ts";
import { checkForUpdate, saveTrack, trackOf, UPDATE_TRACKS, updateSettings } from "../../release/check/index.ts";
import type { UpdateSettings, UpdateTrack } from "../../release/check/index.ts";
import { gitCommit, installKindOf, isPrerelease, LOG_ROOT, packageFacts, parseVersion } from "../../release/version/index.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuse, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput, CommandResult } from "../runner/types.ts";

export const UPDATE_USAGE = [
  "Usage: log update log [--to <v>] [--track <t>] [--apply --approvedBy <who>] [--json]   (log may be left out)",
  "Plans only; --track is saved; --apply (owner's yes) stops what runs, installs, verifies, rolls back on failure, restarts it.",
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
        { name: "track", kind: "enum", values: UPDATE_TRACKS, description: "Track, saved" },
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
  saveTrack: (track: UpdateTrack) => UpdateTrack;
  effects: (log: (line: string) => void) => UpdateDeps;
} = {
  installed: () => ({ version: packageFacts(LOG_ROOT).version, kind: installKindOf(LOG_ROOT), root: LOG_ROOT, commit: gitCommit(LOG_ROOT) }),
  target: async (to) => {
    if (to) return { version: to.replace(/^v/, ""), notesUrl: null };
    const state = await checkForUpdate({ force: true });
    return state.latest ? { version: state.latest, notesUrl: state.notesUrl } : null;
  },
  settings: () => updateSettings(),
  saveTrack: (track) => saveTrack(track),
  effects: (log) => liveUpdateDeps(log),
};

export const updateCommand: Command = liveThroughAction<Command>({
  usage: UPDATE_USAGE,
  platform: "any",
  name: "update",
  effect: "read",
  input: UPDATE_INPUT,
  summary: "Update log to the newest release and resume what ran",
  args: "[log] [--to <version>] [--track <track>] [--apply --approvedBy <who>] [--json]",
  async run(context, argv): Promise<CommandResult> {
    const parsed = parseArgs(argv, parserSpecOf(UPDATE_INPUT));
    if (!parsed.ok) return refuseInput("update", parsed.error, UPDATE_USAGE);
    const extra = parsed.positionals.filter((p, i) => !(i === 0 && p === "log"));
    if (extra.length) return { code: 1, error: "inputInvalid", stderr: `log update: unexpected argument "${extra[0]}"\n${UPDATE_USAGE}` };
    const to = typeof parsed.flags["to"] === "string" ? parsed.flags["to"].trim() : null;
    if (to !== null && !parseVersion(to)) return { code: 1, error: "inputInvalid", stderr: `log update: --to is a version like 1.2.3\n${UPDATE_USAGE}` };
    const trackFlag = typeof parsed.flags["track"] === "string" ? parsed.flags["track"].trim() : null;
    const track = trackFlag === null ? null : trackOf(trackFlag);
    if (trackFlag !== null && track === null) return { code: 1, error: "inputInvalid", stderr: `log update: --track is stable or nightly\n${UPDATE_USAGE}` };
    if (track) updateCommandDeps.saveTrack(track);
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
      const following = updateCommandDeps.settings().track;
      return { code: 0, stdout: json ? JSON.stringify({ installed, track: following, target, plan }, null, 2) : `${track ? `track saved: ${track}. ` : ""}${plan}` };
    }
    if (!target) return refuse("update", "updateFailed", "no release is known: GitHub Releases and npm did not answer");
    if (installed.kind === "gitClone" && isPrerelease(target.version)) return refuse("update", "updateFailed", `${target.version} is a nightly, published only to npm; a clone follows its branch with git pull`);
    context.err(`log update ${installed.version} -> ${target.version}, approved by ${approvedBy}`);
    const outcome = await runUpdate(installed, target, effects);
    if (!outcome.ok) return refuse("update", outcome.code, outcome.detail);
    return { code: 0, stdout: json ? JSON.stringify({ ...outcome, approvedBy }, null, 2) : outcome.text };
  },
}, ["apply"]);
