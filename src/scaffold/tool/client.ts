import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { addImport, addToArray, addToObject, addToPropertyArray, arrayHasText, hasImport, objectHasKey, propertyArrayHasText } from "../platform/helpers/index.ts";
import type { PlannedEdit, PlannedFile } from "../platform/types.ts";
import { commandFile, commandTest, useCaseDoc } from "./helpers/index.ts";
import { DEFAULT_TOOL_AREA, DEFAULT_TOOL_GUIDE, NEW_TOOL_RULES, TOOL_NAME } from "./types.ts";
import type { NewToolOptions, ToolNames } from "./types.ts";

const FILES = {
  runner: "src/cli/runner/index.ts",
  rules: "src/mcp/server/helpers/agentRules.ts",
  guides: "src/mcp/server/helpers/guides.ts",
} as const;

export interface ToolPlan {
  names: ToolNames;
  files: PlannedFile[];
  edits: PlannedEdit[];
  notes: string[];
}

export function toolNamesOf(options: NewToolOptions): ToolNames {
  const name = options.name.trim();
  const pascal = name[0].toUpperCase() + name.slice(1);
  const constant = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
  const summary = options.summary.trim().replace(/\.$/, "");
  const flags = [...new Set((options.flags ?? []).map((f) => f.trim()).filter(Boolean))];
  const acts = options.acts === true;
  return {
    name,
    pascal,
    constant,
    command: `${name}Command`,
    usage: `${constant}_USAGE`,
    input: `${constant}_INPUT`,
    rows: `${name}Rows`,
    inputType: flags.length ? "fields" : "{}",
    summary,
    title: summary ? summary[0].toUpperCase() + summary.slice(1) : pascal,
    acts,
    flags,
    area: options.area?.trim() || DEFAULT_TOOL_AREA,
    asks: options.asks?.length ? options.asks.map((a) => a.trim()).filter(Boolean) : [summary.toLowerCase()],
    guide: options.guide?.trim() || DEFAULT_TOOL_GUIDE,
    tools: acts ? [name, `${name}Live`] : [name],
  };
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}

export function planNewTool(root: string, options: NewToolOptions): ToolPlan {
  if (!TOOL_NAME.test(options.name.trim())) throw new Error(`${options.name} isn't a tool name: camelCase, starting with a lowercase letter (saidBy, linkTargets)`);
  if (!options.summary?.trim()) throw new Error("give --summary: one line saying what it reads or does, it is the tool's description");
  const n = toolNamesOf(options);
  for (const flag of n.flags) if (!TOOL_NAME.test(flag) || ["json", "apply", "confirmLive"].includes(flag)) throw new Error(`--flags ${flag}: each flag is camelCase and not json, apply or confirmLive`);
  if (!TOOL_NAME.test(n.area)) throw new Error(`--area ${n.area}: a use case folder name, camelCase (inbox, twitter)`);
  if (existsSync(join(root, "src/cli", n.name))) throw new Error(`src/cli/${n.name} already exists: pick another name, or add a form to that command`);
  const runner = read(root, FILES.runner);
  if (arrayHasText(runner, "COMMANDS", n.command)) throw new Error(`${n.command} is already a command`);
  if (objectHasKey(read(root, FILES.rules), "SOURCE_COMMAND_RULES", n.name)) throw new Error(`${n.name} already has rules in SOURCE_COMMAND_RULES`);
  if (!objectHasKey(read(root, FILES.guides), "GUIDE_TOPICS", n.guide)) throw new Error(`--guide ${n.guide} isn't a guide group in GUIDE_TOPICS`);
  const files: PlannedFile[] = [
    { path: `src/cli/${n.name}/index.ts`, content: commandFile(n) },
    { path: `src/cli/${n.name}/${n.name}.test.ts`, content: commandTest(n) },
    { path: `docs/useCases/${n.area}/${n.name}.md`, content: useCaseDoc(n) },
  ];
  for (const file of files) if (existsSync(join(root, file.path))) throw new Error(`${file.path} already exists: nothing is overwritten`);
  const guideEntry = `"any:${n.name}"`;
  const edits: PlannedEdit[] = [
    { path: FILES.runner, what: `imports ${n.command}`, apply: (s) => addImport(s, `../${n.name}/index.ts`, n.command), landed: (s) => hasImport(s, `../${n.name}/index.ts`, n.command) },
    { path: FILES.runner, what: `COMMANDS gains ${n.command}`, apply: (s) => addToArray(s, "COMMANDS", n.command), landed: (s) => arrayHasText(s, "COMMANDS", n.command) },
    { path: FILES.rules, what: `SOURCE_COMMAND_RULES gains ${n.name}`, apply: (s) => addToObject(s, "SOURCE_COMMAND_RULES", n.name, `[${NEW_TOOL_RULES.join(", ")}]`), landed: (s) => objectHasKey(s, "SOURCE_COMMAND_RULES", n.name) },
    { path: FILES.guides, what: `GUIDE_TOPICS.${n.guide} gains ${guideEntry}`, apply: (s) => addToPropertyArray(s, "GUIDE_TOPICS", n.guide, "commands", guideEntry), landed: (s) => propertyArrayHasText(s, "GUIDE_TOPICS", n.guide, "commands", guideEntry) },
  ];
  const notes = [
    `Move the one-off's logic into ${n.rows} in src/cli/${n.name}/index.ts${n.acts ? ` and its action into ${n.name}Apply` : ""}, and its real case into the test.`,
    `MCP tool${n.tools.length > 1 ? "s" : ""}: ${n.tools.join(", ")}, in the ${n.guide} guide, and the use case ${n.area}/${n.name}.`,
  ];
  return { names: n, files, edits, notes };
}
