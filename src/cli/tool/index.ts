import { db } from "../../inbox/store/index.ts";
import { healthReport, readCalls, readGuides, readSchemaChanges, reportLines } from "../../observability/toolHealth/index.ts";
import type { RegisteredTool } from "../../observability/toolHealth/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const TOOL_USAGE = "Usage: log tool health [--days <n>] [--json]   (per tool: calls, failures, top code, p50/p95, last use; flags unused, failing, stale; read-only)";

export const TOOL_INPUT: CommandInput = {
  forms: [
    {
      words: ["health"],
      summary: "Which tools are used, fail or went stale, with a fix per flag",
      positionals: [],
      flags: [{ name: "days", kind: "integer", min: 1, max: 90, description: "How far back, in days (default 14)" }, JSON_FLAG],
    },
  ],
};

export const toolDeps: { registered: () => Promise<{ tools: RegisteredTool[]; prefixes: string[]; untracked: string[] }>; now: () => number } = {
  registered: async () => {
    const [{ COMMANDS }, { COMMAND_INDEX }, { commandTools }, { flowTool }, { listFlows, loadFlow }, { PLATFORMS }] = await Promise.all([
      import("../runner/index.ts"),
      import("../runner/helpers/commandIndex.ts"),
      import("../../mcp/server/helpers/toolsFromCommands.ts"),
      import("../../mcp/server/helpers/toolsFromFlows.ts"),
      import("../../browser/flow/index.ts"),
      import("../runner/helpers/platforms.ts"),
    ]);
    const [{ GUIDE_TOOL }, { reportTool }, { catalogTools }] = await Promise.all([import("../../mcp/server/helpers/guides.ts"), import("../../mcp/apps/report/index.ts"), import("../../mcp/catalog/index.ts")]);
    const modules = new Map(COMMAND_INDEX.map((e) => [`${e.platform}:${e.name}`, e.module]));
    const fromCommands = commandTools(COMMANDS).map((t) => ({ name: t.tool, module: modules.get(`${t.command.platform}:${t.command.name}`) ?? "" }));
    const fromFlows = listFlows().flatMap((name) => {
      const flow = loadFlow(name);
      return flow ? [false, true].map((live) => ({ name: flowTool(flow, live), module: `src/browser/flow/definitions/${name}.json` })) : [];
    });
    const prefixes = [...new Set([...PLATFORMS, ...COMMANDS.map((c) => c.name)])];
    return { tools: [...fromCommands, ...fromFlows], prefixes, untracked: [GUIDE_TOOL, reportTool().name, ...catalogTools().map((t) => t.name)] };
  },
  now: () => Date.now(),
};

export const toolCommand: Command = {
  usage: TOOL_USAGE,
  platform: "any",
  name: "tool",
  effect: "read",
  input: TOOL_INPUT,
  summary: "Tool use, failures and latency from log.db, and stale guide mentions",
  args: "health [--days <n>] [--json]",
  async run(_context, argv) {
    if (argv[0] !== "health") return refuseInput("tool", `unknown form "${argv[0] ?? ""}"`, TOOL_USAGE);
    const parsed = parseArgs(argv.slice(1), parserSpecOf({ forms: [{ ...TOOL_INPUT.forms[0], words: [] }] }));
    if (!parsed.ok) return refuseInput("tool", parsed.error, TOOL_USAGE);
    if (parsed.positionals.length) return refuseInput("tool", `unexpected argument "${parsed.positionals[0]}"`, TOOL_USAGE);
    const days = numberOf(parsed, "days") ?? 14;
    if (!Number.isInteger(days) || days < 1 || days > 90) return refuseInput("tool", "--days takes a whole number from 1 to 90", TOOL_USAGE);
    const now = toolDeps.now();
    const sinceMs = now - days * 86400000;
    const { tools, prefixes, untracked } = await toolDeps.registered();
    const { guides, hasGit } = readGuides();
    const earliest = Math.min(...guides.map((g) => g.committedAt ?? now));
    const schemaChanges = hasGit ? readSchemaChanges(tools.map((t) => t.module).filter(Boolean), earliest) : null;
    const report = healthReport({ days, now, calls: readCalls(db(), sinceMs), registered: tools, guides, schemaChanges, toolPrefixes: prefixes, untracked });
    return { code: 0, stdout: parsed.flags["json"] ? JSON.stringify(report, null, 2) : reportLines(report).join("\n") };
  },
};
