import { spawnSync } from "node:child_process";
import { utimesSync } from "node:fs";
import { join } from "node:path";
import { applyPlan, planNewPlatform } from "../../scaffold/platform/index.ts";
import { planNewTool } from "../../scaffold/tool/index.ts";
import { listHandRolled } from "../../agentHooks/handRolled/index.ts";
import type { CommandResult } from "../runner/types.ts";
import type { ParsedArgs } from "../runner/helpers/index.ts";
import { JSON_FLAG, listOf, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";

const REPO = join(import.meta.dir, "..", "..", "..");

export const NEW_USAGE = [
  "Usage: log new platform <name> [--label <shown name>] [--twentyPlatform <ENUM>] [--library <vendor/folder>] [--sessionCookies <a,b>] [--cookieDomain <.site.com>] [--hosts <a.com,b.com>] [--home <https://…>] [--noProxy] [--noBrowser] [--apply] [--json]",
  "       log new tool [<name> --summary <text>] [--acts] [--flags <a,b>] [--area <f>] [--asks <a,b>] [--guide <g>] [--apply] [--json]",
  "platform: its session on the shared platformKit, `log <name> session check` with its MCP tool, a direct-API engine in python/<name>Api and docs/platforms/<name>. tool: a hand-rolled one-off as a command and MCP tool with its test and use case; no name lists the one-offs the hook counted.",
  "Each file is edited through its syntax tree and every edit is checked to have landed before anything is written. Without --apply it lists what it would do and writes nothing; nothing is overwritten. It says what Twenty is missing but never changes Twenty (rule 83).",
].join("\n");

export const NEW_INPUT: CommandInput = {
  forms: [
    {
      words: ["platform"],
      effect: "write",
      summary: "Make a new platform's session, command, MCP tool, engine and docs, wired through the syntax tree",
      positionals: [{ name: "name", kind: "string", required: true, description: "The platform's name, camelCase (reddit, blueSky)" }],
      flags: [
        { name: "label", kind: "string", description: "How it is shown (default: the name capitalised)" },
        { name: "twentyPlatform", kind: "string", description: "Its socialAccounts.platform value in Twenty (default: the name in capitals)" },
        { name: "library", kind: "string", description: "Its vendored client's folder, vendor/<folder>" },
        { name: "sessionCookies", kind: "list", description: "The cookies a logged-in session must have, comma-separated" },
        { name: "cookieDomain", kind: "string", description: "The domain its cookies are saved under (default: . and its first host)" },
        { name: "hosts", kind: "list", description: "Its hosts, comma-separated (default <name>.com): log inspect may go to them" },
        { name: "home", kind: "string", description: "The page its browser opens on (default https://www.<first host>/)" },
        { name: "noProxy", kind: "boolean", description: "Its accounts open with no proxy, like X (default: a proxy in the home country is required)" },
        { name: "noBrowser", kind: "boolean", description: "It has no browser path, only the direct-API engine (default: the account's AdsPower browser)" },
        { name: "apply", kind: "boolean", live: true, description: "Write it (without it, only list what it would do)" },
        JSON_FLAG,
      ],
    },
    {
      words: ["tool"],
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
  if (!seen.length) return { code: 0, stdout: "log new tool: no hand-rolled one-off counted yet. Give a name and --summary to make one a tool." };
  const lines = seen.map((r) => `${String(r.count).padStart(4)}x  ${r.kinds.join("+").padEnd(20)} ${r.target}  (${r.tools.join(", ")}; last ${new Date(r.lastAt).toISOString().slice(0, 16)})\n        ${r.sample}`);
  return { code: 0, stdout: [`log new tool: ${seen.length} hand-rolled one-off(s) counted by the hook, most frequent first. Give a name and --summary to make one a tool:`, ...lines].join("\n") };
}

function newTool(context: { err(line: string): void }, parsed: Extract<ParsedArgs, { ok: true }>, name: string | undefined): CommandResult {
  const json = parsed.flags["json"] === true;
  if (!name) return handRolledList(json);
  const str = (flag: string) => (typeof parsed.flags[flag] === "string" ? (parsed.flags[flag] as string) : undefined);
  const summary = str("summary")?.trim() ?? "";
  const apply = parsed.flags["apply"] === true;
  let plan;
  try {
    plan = planNewTool(REPO, { name, summary: summary || (apply ? "" : `What ${name} reads or does`), acts: parsed.flags["acts"] === true, flags: listOf(parsed, "flags"), area: str("area"), asks: listOf(parsed, "asks"), guide: str("guide") });
  } catch (error) {
    return refuseInput("new tool", error instanceof Error ? error.message : String(error), NEW_USAGE);
  }
  if (!summary) plan.notes.unshift("No --summary yet: it becomes the tool's description, so give one line before --apply.");
  const listed = [...plan.files.map((f) => `write ${f.path}`), ...plan.edits.map((e) => `edit ${e.path}: ${e.what}`)];
  if (!apply) {
    if (json) return { code: 0, stdout: JSON.stringify({ apply: false, tools: plan.names.tools, files: plan.files.map((f) => f.path), edits: plan.edits.map((e) => ({ path: e.path, what: e.what })), notes: plan.notes }, null, 2) };
    return { code: 0, stdout: [`log new tool ${name}: would make log ${name} (MCP ${plan.names.tools.join(", ")}). Nothing written; --apply does it:`, ...listed.map((l) => `  ${l}`), ...plan.notes.map((n) => `note: ${n}`)].join("\n") };
  }
  let done: string[];
  try {
    done = applyPlan(REPO, plan);
  } catch (error) {
    return refuseInput("new tool", `${error instanceof Error ? error.message : String(error)} (nothing written)`, NEW_USAGE);
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
  return { code: failed ? 1 : 0, stdout: [`log new tool ${name}: made log ${name} (MCP ${plan.names.tools.join(", ")}).`, ...done.map((l) => `  ${l}`), ...builds.map((b) => `  ${b}`), ...plan.notes.map((n) => `note: ${n}`), next].join("\n") };
}

export const newCommand: Command = liveThroughAction<Command>({
  usage: NEW_USAGE,
  platform: "any",
  name: "new",
  effect: "write",
  input: NEW_INPUT,
  summary: "Make a new platform, or a tool from a one-off, wired in through the syntax tree",
  args: "platform <name> [--library <vendor/folder>] [--apply] | tool [<name> --summary <text>] [--apply]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(NEW_INPUT));
    if (!parsed.ok) return refuseInput("new", parsed.error, NEW_USAGE);
    const [what, name, ...rest] = parsed.positionals;
    if (what === "tool" && !rest.length) return newTool(context, parsed, name);
    if (what !== "platform" || !name || rest.length) return { code: 1, stderr: `log new: give platform <name>\n${NEW_USAGE}` };
    const str = (flag: string) => (typeof parsed.flags[flag] === "string" ? (parsed.flags[flag] as string) : undefined);
    let plan;
    try {
      plan = planNewPlatform(REPO, { name, label: str("label"), twentyPlatform: str("twentyPlatform"), library: str("library"), cookieDomain: str("cookieDomain"), hosts: listOf(parsed, "hosts"), home: str("home"), noProxy: parsed.flags["noProxy"] === true, noBrowser: parsed.flags["noBrowser"] === true, sessionCookies: listOf(parsed, "sessionCookies") });
    } catch (error) {
      return { code: 1, stderr: `log new platform: ${error instanceof Error ? error.message : String(error)}` };
    }
    const apply = parsed.flags["apply"] === true;
    const listed = [...plan.files.map((f) => `write ${f.path}`), ...plan.edits.map((e) => `edit ${e.path}: ${e.what}`)];
    if (!apply) {
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ apply: false, names: plan.names, files: plan.files.map((f) => f.path), edits: plan.edits.map((e) => ({ path: e.path, what: e.what })), notes: plan.notes }, null, 2) };
      return { code: 0, stdout: [`log new platform ${name}: would make ${plan.names.label} (log ${name} session check, MCP ${name}SessionCheck). Nothing written; --apply does it:`, ...listed.map((l) => `  ${l}`), ...plan.notes.map((n) => `note: ${n}`)].join("\n") };
    }
    let done: string[];
    try {
      done = applyPlan(REPO, plan);
    } catch (error) {
      return { code: 1, stderr: `log new platform: ${error instanceof Error ? error.message : String(error)} (nothing written)` };
    }
    for (const line of done) context.err(line);
    context.err("bun run docs:build: the README, the diagrams and every MCP tool's description");
    const docs = spawnSync("bun", ["scripts/docs/buildDocs.ts"], { cwd: REPO, encoding: "utf8", windowsHide: true });
    const docsLine = docs.status === 0 ? (docs.stdout.trim().split("\n").pop() ?? "docs built") : `docs:build failed: ${(docs.stderr || docs.stdout).slice(-300)}`;
    const next = [`Next: bun run check, then fill in python/${name}Api/engine.py's ping and add ${plan.names.label}'s families as commands (docs/platforms/${name}/README.md).`];
    if (parsed.flags["json"]) return { code: docs.status === 0 ? 0 : 1, stdout: JSON.stringify({ apply: true, names: plan.names, done, docs: docsLine, notes: plan.notes, next }, null, 2) };
    return { code: docs.status === 0 ? 0 : 1, stdout: [`log new platform ${name}: made ${plan.names.label}.`, ...done.map((l) => `  ${l}`), `  ${docsLine}`, ...plan.notes.map((n) => `note: ${n}`), ...next].join("\n") };
  },
}, ["apply"]);
