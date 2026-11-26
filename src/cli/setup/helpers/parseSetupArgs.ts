import { JSON_FLAG, parseArgs, parserSpecOf } from "../../runner/helpers/index.ts";
import type { CommandInput } from "../../runner/types.ts";
import { SETUP_EXTENSIONS, SETUP_HARNESSES, START_PLATFORMS } from "../../launch/helpers/index.ts";

export const SETUP_PLATFORM_IDS: readonly string[] = [...START_PLATFORMS];
export const SETUP_EXTENSION_IDS: readonly string[] = SETUP_EXTENSIONS.map((extension) => extension.id);
export const SETUP_HARNESS_IDS: readonly string[] = [...SETUP_HARNESSES.map((harness) => harness.id), "none"];

export interface SetupArgs {
  json: boolean;
  dryRun: boolean;
  platforms: readonly string[];
  extensions: readonly string[];
  harnesses: readonly string[];
  configPath: string | null;
}

export type ParseSetupArgsResult = { ok: true; args: SetupArgs } | { ok: false; error: string };

export const SETUP_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Set up everything an agent can set up without a sign-in, in one pass",
      positionals: [],
      flags: [
        JSON_FLAG,
        { name: "dryRun", kind: "boolean", description: "Report the whole plan without writing anything" },
        { name: "platforms", kind: "list", description: `Platforms to prepare: ${SETUP_PLATFORM_IDS.join(", ")}` },
        { name: "extensions", kind: "list", description: `Extensions to prepare: ${SETUP_EXTENSION_IDS.join(", ")}` },
        { name: "harnesses", kind: "list", description: `Agent harnesses to wire: ${SETUP_HARNESS_IDS.join(", ")}` },
        { name: "config", kind: "string", description: "A JSON file with platforms, extensions and harnesses arrays" },
      ],
    },
  ],
};

export function validateSetupIds(kind: string, values: readonly string[], known: readonly string[]): string | null {
  const unknown = values.filter((value) => !known.includes(value));
  return unknown.length ? `unknown ${kind}: ${unknown.join(", ")} (known: ${known.join(", ")})` : null;
}

export function parseSetupArgs(argv: string[]): ParseSetupArgsResult {
  const parsed = parseArgs(argv, parserSpecOf(SETUP_INPUT));
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.positionals.length) return { ok: false, error: `unexpected argument "${parsed.positionals[0]}"` };
  const platforms = (parsed.values.platforms as string[] | undefined) ?? [];
  const extensions = (parsed.values.extensions as string[] | undefined) ?? [];
  const harnesses = (parsed.values.harnesses as string[] | undefined) ?? [];
  for (const [kind, values, known] of [
    ["platform", platforms, SETUP_PLATFORM_IDS],
    ["extension", extensions, SETUP_EXTENSION_IDS],
    ["harness", harnesses, SETUP_HARNESS_IDS],
  ] as const) {
    const problem = validateSetupIds(kind, values, known);
    if (problem) return { ok: false, error: problem };
  }
  const configPath = typeof parsed.values.config === "string" ? parsed.values.config : null;
  return { ok: true, args: { json: parsed.values.json === true, dryRun: parsed.values.dryRun === true, platforms, extensions, harnesses, configPath } };
}
