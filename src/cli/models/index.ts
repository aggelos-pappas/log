import { LOCAL_MODELS } from "../../models/manifest/index.ts";
import type { LocalModel } from "../../models/manifest/index.ts";
import { checkModels, fetchModels, liveModelsDeps, modelsSummary, modelsText } from "../../models/store/index.ts";
import type { ModelsDeps } from "../../models/store/index.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuse, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput, CommandResult } from "../runner/types.ts";

export const MODELS_USAGE = [
  "Usage: log models [--fetch --approvedBy <who>] [--json]",
  "--fetch gets what is missing.",
].join("\n");

export const MODELS_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      effect: "read",
      liveEffect: "write",
      summary: "Local models and their pins",
      positionals: [],
      flags: [
        { name: "approvedBy", kind: "string", approval: true, description: "Who approved it (rule 8)" },
        { name: "fetch", kind: "boolean", live: true, description: "Fetch them" },
        JSON_FLAG,
      ],
    },
  ],
};

export const modelsCommandDeps: { models: () => readonly LocalModel[]; effects: (log: (line: string) => void) => ModelsDeps } = {
  models: () => LOCAL_MODELS,
  effects: (log) => liveModelsDeps(log),
};

export const modelsCommand: Command = liveThroughAction<Command>({
  usage: MODELS_USAGE,
  platform: "any",
  name: "models",
  effect: "read",
  input: MODELS_INPUT,
  summary: "Is each pinned local model here",
  args: "[--fetch --approvedBy <who>] [--json]",
  async run(context, argv): Promise<CommandResult> {
    const parsed = parseArgs(argv, parserSpecOf(MODELS_INPUT));
    if (!parsed.ok) return refuseInput("models", parsed.error, MODELS_USAGE);
    if (parsed.positionals.length) return { code: 1, error: "inputInvalid", stderr: `log models: unexpected argument "${parsed.positionals[0]}"\n${MODELS_USAGE}` };
    const json = parsed.flags["json"] === true;
    const fetch = parsed.flags["fetch"] === true;
    const approvedBy = typeof parsed.flags["approvedBy"] === "string" ? parsed.flags["approvedBy"].trim() : "";
    if (fetch && !approvedBy) return refuse("models", "notApproved", "--fetch needs --approvedBy <who>: it downloads about 530 MB, so run it after the owner said yes (rule 8)");
    const deps = modelsCommandDeps.effects(context.err);
    const models = modelsCommandDeps.models();
    if (!fetch) {
      const checks = await checkModels(models, deps);
      return { code: 0, stdout: json ? JSON.stringify({ models: checks, summary: modelsSummary(checks) }, null, 2) : `${modelsText(checks)}\n${modelsSummary(checks)}${checks.every((c) => c.ready) ? "" : ". log models --fetch --approvedBy <who> fetches them."}` };
    }
    const fetched = await fetchModels(models, deps);
    const failed = fetched.filter((f) => f.action === "failed");
    if (failed.length) return refuse("models", "modelFetchFailed", `${failed.map((f) => `${f.key}: ${f.detail}`).join("; ")}\n${modelsText(fetched)}`);
    return { code: 0, stdout: json ? JSON.stringify({ models: fetched, summary: modelsSummary(fetched), approvedBy }, null, 2) : `${modelsText(fetched)}\n${modelsSummary(fetched)}` };
  },
}, ["fetch"]);
