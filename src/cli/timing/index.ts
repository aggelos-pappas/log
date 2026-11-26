import { callWaterfall, msText, reportLines, timingStats } from "../../observability/timing/index.ts";
import { landedLines, landedStats, readLanded } from "../../observability/landed/index.ts";
import { readTurns, TURN_TOOL_PREFIX, turnLines, turnStats } from "../../observability/turns/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const TIMING_USAGE = [
  "Usage: log timing [--tool <name>] [--hours <n>] [--stages <n>] [--top <n>] [--all] [--json]   (p50, p95, p99 per tool and stage; the slowest --top by p99, default 12, or --all; --hours, default 24)",
  "       log timing --call <callId> [--json]   (one call as a waterfall: every stage in order, when it started and how long it took; the id is on the call's ▶ and ■ lines in the live log)",
  "       log timing --turns [--hours <n>] [--json]   (p50, p95, p99 per agent turn: log's tool time and agent time)",
  "       log timing --landed [--hours <n>] [--json]   (per platform: landed, stored, pushed)",
].join("\n");

export const TIMING_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "How slow log is: p50, p95, p99 per tool and stage, or one call as a waterfall (--call); --tool and --hours narrow it",
      positionals: [],
      flags: [
        { name: "tool", kind: "string", description: "Only this tool (its MCP name, e.g. twitterDms, or a terminal run's words, e.g. cli twitter dms)" },
        { name: "hours", kind: "number", description: "How far back, in hours (default 24), more than 0" },
        { name: "stages", kind: "number", description: "Stages per tool, slowest share first (default 8, 4 without --tool)" },
        { name: "top", kind: "number", description: "How many tools, slowest p99 first (default 12)" },
        { name: "all", kind: "boolean", description: "Every tool" },
        { name: "call", kind: "string", description: "One call's id, to show it as a waterfall" },
        { name: "turns", kind: "boolean", description: "Agent turns instead of calls" },
        { name: "landed", kind: "boolean", description: "Landed to pushed per platform" },
        JSON_FLAG,
      ],
    },
  ],
};

export const COMPACT_TOOLS = 12;
export const COMPACT_STAGES = 4;

export function isWatchSession(tool: string): boolean {
  return /(^|\s)watch$/.test(tool.trim());
}

export function slowestTools<T extends { p99: number }>(stats: readonly T[], top: number): T[] {
  const kept = new Set([...stats].sort((a, b) => b.p99 - a.p99).slice(0, top));
  return stats.filter((t) => kept.has(t));
}

function positive(value: number | undefined, fallback: number): number | null {
  if (value === undefined) return fallback;
  return value > 0 ? value : null;
}

export const timingCommand: Command = {
  usage: TIMING_USAGE,
  platform: "any",
  name: "timing",
  effect: "read",
  input: TIMING_INPUT,
  summary: "Where the time goes: p50, p95, p99 per tool and stage from log.db, one call as a waterfall, or landed to pushed per platform",
  args: "[--tool <name>] [--hours <n>] [--stages <n>] [--top <n>] [--all] [--call <callId>] [--turns] [--landed] [--json]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIMING_INPUT));
    if (!parsed.ok) return refuseInput("timing", parsed.error, TIMING_USAGE);
    if (parsed.positionals.length) return { code: 1, error: "inputInvalid", stderr: `log timing: unexpected argument "${parsed.positionals[0]}"\n${TIMING_USAGE}` };
    const json = Boolean(parsed.flags["json"]);
    const call = parsed.flags["call"];
    if (typeof call === "string" && call) {
      const lines = callWaterfall(call);
      if (!lines.length) return { code: 1, stderr: `log timing: no call "${call}" is stored (callTimingMissing): its id is on the ▶ and ■ lines in the live log, and timings are kept 90 days` };
      return { code: 0, stdout: json ? JSON.stringify({ call, lines }, null, 2) : lines.join("\n") };
    }
    const hours = positive(numberOf(parsed, "hours"), 24);
    const tool = typeof parsed.flags["tool"] === "string" ? String(parsed.flags["tool"]) : undefined;
    const every = parsed.flags["all"] === true || Boolean(tool);
    const stages = positive(numberOf(parsed, "stages"), every ? 8 : COMPACT_STAGES);
    const top = positive(numberOf(parsed, "top"), COMPACT_TOOLS);
    if (hours === null || stages === null || top === null) return { code: 1, stderr: `log timing: --hours, --stages and --top take a positive number\n${TIMING_USAGE}` };
    if (parsed.flags["turns"] === true) {
      const stats = turnStats(readTurns(Date.now() - hours * 3600000));
      return { code: 0, stdout: json ? JSON.stringify({ hours, ...stats }, null, 2) : turnLines(stats, hours).join("\n") };
    }
    if (parsed.flags["landed"] === true) {
      const stats = landedStats(readLanded(Date.now() - hours * 3600000));
      return { code: 0, stdout: json ? JSON.stringify({ hours, platforms: stats }, null, 2) : landedLines(stats, hours).join("\n") };
    }
    const all = timingStats({ tool, sinceMs: Date.now() - hours * 3600000 });
    const sessions = tool ? [] : all.filter((t) => isWatchSession(t.tool));
    const stats = tool ? all : all.filter((t) => !isWatchSession(t.tool) && !t.tool.startsWith(TURN_TOOL_PREFIX));
    const shown = every ? stats : slowestTools(stats, Math.round(top));
    const left = stats.length - shown.length;
    const cut = (t: (typeof all)[number]) => ({ ...t, stages: t.stages.slice(0, Math.round(stages)) });
    if (json) return { code: 0, stdout: JSON.stringify({ hours, tool: tool ?? null, tools: shown.map(cut), ...(sessions.length ? { watchSessions: sessions.map(cut) } : {}), ...(left ? { toolsLeftOut: left } : {}) }, null, 2) };
    if (!all.length) return { code: 0, stdout: `No timed calls in the last ${hours} h${tool ? ` for ${tool}` : ""}. Every log call made through the MCP or the terminal stores its timings from now on.` };
    const total = stats.reduce((n, t) => n + t.n, 0);
    const slowest = [...(stats.length ? stats : all)].sort((a, b) => b.p99 - a.p99)[0];
    const more = [left ? `${left} more tool(s) with a lower p99 are left out: --all shows every tool, --tool <name> one in full.` : "", !tool && all.some((t) => t.tool.startsWith(TURN_TOOL_PREFIX)) ? "Whole agent turns are in --turns." : ""].filter(Boolean).join(" ");
    const watching = sessions.length ? ["", "Watch sessions: each is one long-lived connection, so its length is how long it stayed up, not a wait; the reads and stages inside it are waits.", ...reportLines(sessions, { stages: Math.round(stages) })] : [];
    return {
      code: 0,
      stdout: [`Timings for ${total} call(s) in the last ${hours} h${tool ? ` (${tool})` : ""}; slowest p99: ${slowest.tool} at ${msText(slowest.p99)}. Each stage's share is of the tool's total time; nested stages are counted inside their parent too, and "unaccounted" is the call's own time outside every stage.`, "", ...reportLines(shown, { stages: Math.round(stages) }), ...(more ? ["", more] : []), ...watching].join("\n"),
    };
  },
};
