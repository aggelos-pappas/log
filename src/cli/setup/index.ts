import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { installHermes, hermesHome } from "../../agentHooks/hermes/index.ts";
import { installOpenCode, opencodeConfigDir } from "../../agentHooks/opencode/index.ts";
import { userEnvPath } from "../../config/userEnv/index.ts";
import { SETUP_HARNESSES, needsBrowser } from "../launch/helpers/index.ts";
import type { ExtensionId } from "../launch/helpers/index.ts";
import type { Platform } from "../runner/helpers/platforms.ts";
import type { Command, CommandContext, CommandResult } from "../runner/types.ts";
import { parseSetupArgs, SETUP_EXTENSION_IDS, SETUP_HARNESS_IDS, SETUP_INPUT, SETUP_PLATFORM_IDS, validateSetupIds } from "./helpers/index.ts";
import type { SetupArgs } from "./helpers/index.ts";
import { setupAdsPowerStep, setupEnvStep, setupExtensionStep, setupHarnessStep, setupPlatformStep } from "./helpers/index.ts";
import type { SetupStep } from "./helpers/index.ts";
import { renderSetupReport } from "./helpers/index.ts";
import type { SetupReport } from "./helpers/index.ts";

export * from "./helpers/index.ts";

export const SETUP_USAGE = "Usage: log setup [--json] [--dryRun] [--platforms <list>] [--extensions <list>] [--harnesses <list>] [--config <file>]";

interface SetupSelection {
  platforms: readonly string[];
  extensions: readonly string[];
  harnesses: readonly string[];
}

function readSelectionFile(path: string): { ok: true; selection: SetupSelection } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { ok: false, error: `could not read ${path}: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: `${path} must hold a JSON object` };
  const values = parsed as Record<string, unknown>;
  const read = (key: string): string[] | null => {
    const value = values[key];
    if (value === undefined) return [];
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
    return value as string[];
  };
  const platforms = read("platforms");
  const extensions = read("extensions");
  const harnesses = read("harnesses");
  if (!platforms || !extensions || !harnesses) return { ok: false, error: `${path}: platforms, extensions and harnesses must be arrays of strings` };
  for (const [kind, list, known] of [
    ["platform", platforms, SETUP_PLATFORM_IDS],
    ["extension", extensions, SETUP_EXTENSION_IDS],
    ["harness", harnesses, SETUP_HARNESS_IDS],
  ] as const) {
    const problem = validateSetupIds(kind, list, known);
    if (problem) return { ok: false, error: `${path}: ${problem}` };
  }
  return { ok: true, selection: { platforms, extensions, harnesses } };
}

function mergeSelection(args: SetupArgs, file: SetupSelection | null): SetupSelection {
  return {
    platforms: [...new Set([...args.platforms, ...(file?.platforms ?? [])])],
    extensions: [...new Set([...args.extensions, ...(file?.extensions ?? [])])],
    harnesses: [...new Set([...args.harnesses, ...(file?.harnesses ?? [])])],
  };
}

function harnessConfigPath(id: string): string {
  return id === "hermes" ? hermesHome() : opencodeConfigDir();
}

function harnessLabel(id: string): string {
  return SETUP_HARNESSES.find((harness) => harness.id === id)?.label ?? id;
}

function writeEnvFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, text, { mode: 0o600 });
}

export function runSetupCommand(context: CommandContext, argv: string[]): CommandResult {
  const parsed = parseSetupArgs(argv);
  if (!parsed.ok) return { code: 2, error: "inputInvalid", stderr: `log setup: ${parsed.error}\n${SETUP_USAGE}` };
  const args = parsed.args;
  let file: SetupSelection | null = null;
  if (args.configPath) {
    const loaded = readSelectionFile(args.configPath);
    if (!loaded.ok) return { code: 2, error: "inputInvalid", stderr: `log setup: ${loaded.error}\n${SETUP_USAGE}` };
    file = loaded.selection;
  }
  const selection = mergeSelection(args, file);
  const envFile = userEnvPath();
  const envText = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  const env = setupEnvStep(envFile, envText, args.dryRun);
  if (env.changed) writeEnvFile(envFile, env.text);
  const agent: SetupStep[] = [env.step];

  const harnessIds = selection.harnesses.includes("none") ? [] : selection.harnesses.length ? selection.harnesses : SETUP_HARNESSES.map((harness) => harness.id);
  for (const id of harnessIds) {
    const configPath = harnessConfigPath(id);
    const label = harnessLabel(id);
    if (args.dryRun) {
      agent.push({ id: `harness:${id}`, kind: "agent", label, detail: `Would wire it into ${configPath}`, done: false });
      continue;
    }
    const got = id === "hermes" ? installHermes() : installOpenCode();
    agent.push(setupHarnessStep(id, label, got.configPath || configPath, got.changed));
  }

  const platforms = selection.platforms as Platform[];
  const pending: SetupStep[] = [];
  if (needsBrowser(platforms)) pending.push(setupAdsPowerStep());
  for (const platform of platforms) pending.push(setupPlatformStep(platform));
  for (const id of selection.extensions as ExtensionId[]) pending.push(setupExtensionStep(id));
  const next = pending.flatMap((step) => (step.command ? [step.command] : []));
  const report: SetupReport = {
    ok: pending.length === 0,
    reason: pending.length ? "humanActionRequired" : null,
    envFile,
    completed: agent,
    pending,
    next,
    dryRun: args.dryRun,
  };
  context.out(renderSetupReport(report, args.json));
  return { code: report.ok ? 0 : 3 };
}

export const setupCommand: Command = {
  usage: SETUP_USAGE,
  platform: "any",
  name: "setup",
  effect: "write",
  input: SETUP_INPUT,
  summary: "Set up everything an agent can set up in one pass: wire the agent harnesses, set local account defaults, and name the exact sign-ins only you can finish",
  args: "[--json] [--dryRun] [--platforms <list>] [--extensions <list>] [--harnesses <list>] [--config <file>]",
  run: runSetupCommand,
};
