import { spawnSync } from "node:child_process";
import { utimesSync } from "node:fs";
import { join } from "node:path";
import { applyPlan } from "../../scaffold/platform/index.ts";
import { planNewTool } from "../../scaffold/tool/index.ts";
import { listHandRolled } from "../../agentHooks/handRolled/index.ts";
import { JSON_FLAG, listOf, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { ParsedArgs } from "../runner/helpers/index.ts";
import type { Command, CommandInput, CommandResult } from "../runner/types.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";

const REPO = join(import.meta.dir, "..", "..", "..");

export const TOOL_USAGE = [
  "Usage: log tool scaffold [<name> --summary <text>] [--acts] [--flags <a,b>] [--area <f>] [--asks <a,b>] [--guide <g>] [--apply] [--json]",
  "A hand-rolled one-off as a command and MCP tool with its test and use case, each edit made through the syntax tree and checked before anything is written; no name lists the one-offs the hook counted. Without --apply it writes nothing.",
].join("\n");

export const TOOL_INPUT: CommandInput = {
  forms: [
    {
      words: ["scaffold"],
      effect: "write",
      summary: "A hand-rolled one-off made a log command and MCP tool; no name lists the counted one-offs",
      positionals: [{ name: "name", kind: "string", description: "camelCase (saidBy)" }],
      flags: [
        { name: "summary", kind: "string", description: "What it does, one line" },
        { name: "acts", kind: "boolean", description: "It changes data: adds a Live form" },
        { name: "flags", kind: "list", description: "Its inputs, a,b" },
        { name: "area", kind: "string", description: "Use case folder (inbox)" },
        { name: "asks", kind: "list", description: "The owner's asks, a,b" },
        { name: "guide", kind: "string", description: "Guide group (knowledgeAndSearch)" },
        { name: "apply", kind: "boolean", live: true, description: "Write it (without it, only list what it would do)" },
        JSON_FLAG,
      ],
    },
  ],
};

function handRolledList(json: boolean): CommandResult {
  const seen = listHandRolled();
  if (json) return { code: 0, stdout: JSON.stringify({ oneOffs: seen }, null, 2) };
  if (!seen.length) return { code: 0, stdout: "log tool scaffold: no hand-rolled one-off counted yet. Give a name and --summary to make one a tool." };
  const lines = seen.map((r) => `${String(r.count).padStart(4)}x  ${r.kinds.join("+").padEnd(20)} ${r.target}  (${r.tools.join(", ")}; last ${new Date(r.lastAt).toISOString().slice(0, 16)})\n        ${r.sample}`);
  return { code: 0, stdout: [`log tool scaffold: ${seen.length} hand-rolled one-off(s) counted by the hook, most frequent first. Give a name and --summary to make one a tool:`, ...lines].join("\n") };
}

function scaffold(context: { err(line: string): void }, parsed: Extract<ParsedArgs, { ok: true }>, name: string | undefined): CommandResult {
  const json = parsed.flags["json"] === true;
  if (!name) return handRolledList(json);
  const str = (flag: string) => (typeof parsed.flags[flag] === "string" ? (parsed.flags[flag] as string) : undefined);
  const summary = str("summary")?.trim() ?? "";
  const apply = parsed.flags["apply"] === true;
  let plan;
  try {
    plan = planNewTool(REPO, { name, summary: summary || (apply ? "" : `What ${name} reads or does`), acts: parsed.flags["acts"] === true, flags: listOf(parsed, "flags"), area: str("area"), asks: listOf(parsed, "asks"), guide: str("guide") });
  } catch (error) {
    return refuseInput("tool scaffold", error instanceof Error ? error.message : String(error), TOOL_USAGE);
  }
  if (!summary) plan.notes.unshift("No --summary yet: it becomes the tool's description, so give one line before --apply.");
  const listed = [...plan.files.map((f) => `write ${f.path}`), ...plan.edits.map((e) => `edit ${e.path}: ${e.what}`)];
  if (!apply) {
    if (json) return { code: 0, stdout: JSON.stringify({ apply: false, tools: plan.names.tools, files: plan.files.map((f) => f.path), edits: plan.edits.map((e) => ({ path: e.path, what: e.what })), notes: plan.notes }, null, 2) };
    return { code: 0, stdout: [`log tool scaffold ${name}: would make log ${name} (MCP ${plan.names.tools.join(", ")}). Nothing written; --apply does it:`, ...listed.map((l) => `  ${l}`), ...plan.notes.map((n) => `note: ${n}`)].join("\n") };
  }
  let done: string[];
  try {
    done = applyPlan(REPO, plan);
  } catch (error) {
    return refuseInput("tool scaffold", `${error instanceof Error ? error.message : String(error)} (nothing written)`, TOOL_USAGE);
  }
  for (const line of done) context.err(line);
  const builds = [["bun", "scripts/docs/buildDocs.ts"], ["node", "scripts/docs/syncSiteSkills.mjs"]].map(([bin, script]) => {
    const run = spawnSync(bin, [script], { cwd: REPO, encoding: "utf8", windowsHide: true });
    return run.status === 0 ? `${script}: done` : `${script} failed: ${(run.stderr || run.stdout).slice(-300)}`;
  });
  const server = join(REPO, "src", "mcp", "server", "index.ts");
  const now = new Date();
  try {
    utimesSync(server, now, now);
  } catch {}
  const next = `Next: move the one-off into ${plan.names.rows} (src/cli/${name}/index.ts), run bun test src/cli/${name}, call ${plan.names.tools[0]} once the MCP has reloaded and compare it with the one-off's output; when it answers the same, commit (getGuide({ useCase: "log/toolFromOneOff" })).`;
  const failed = builds.some((b) => b.includes("failed"));
  if (json) return { code: failed ? 1 : 0, stdout: JSON.stringify({ apply: true, tools: plan.names.tools, done, builds, notes: plan.notes, next }, null, 2) };
  return { code: failed ? 1 : 0, stdout: [`log tool scaffold ${name}: made log ${name} (MCP ${plan.names.tools.join(", ")}).`, ...done.map((l) => `  ${l}`), ...builds.map((b) => `  ${b}`), ...plan.notes.map((n) => `note: ${n}`), next].join("\n") };
}

export const toolCommand: Command = liveThroughAction<Command>({
  usage: TOOL_USAGE,
  platform: "any",
  name: "tool",
  effect: "write",
  input: TOOL_INPUT,
  summary: "Turn a hand-rolled one-off into a log command and MCP tool",
  args: "scaffold [<name> --summary <text>] [--apply]",
  run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TOOL_INPUT));
    if (!parsed.ok) return refuseInput("tool", parsed.error, TOOL_USAGE);
    const [what, name, ...rest] = parsed.positionals;
    if (what !== "scaffold" || rest.length) return refuseInput("tool", "give scaffold [<name>]", TOOL_USAGE);
    return scaffold(context, parsed, name);
  },
}, ["apply"]);
