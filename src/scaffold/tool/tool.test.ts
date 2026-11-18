import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { applyPlan } from "../platform/index.ts";
import { addToPropertyArray, AstEditError, propertyArrayHasText } from "../platform/helpers/index.ts";
import { planNewTool, toolNamesOf } from "./index.ts";

const REPO = join(import.meta.dir, "..", "..", "..");
const PROBE = "scaffoldToolProbe";
const SUMMARY = "Every message someone sent, found by their name across every platform in log.db, newest first";

function copyOfRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "newTool"));
  for (const path of ["src/cli/runner/index.ts", "src/mcp/server/helpers/agentRules.ts", "src/mcp/server/helpers/guides.ts"]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(REPO, path), join(root, path));
  }
  return root;
}

const syntaxErrors = (source: string) => (ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

describe("the nested-array syntax-tree edit", () => {
  test("a guide group's commands gain one entry, on one line or many", () => {
    const one = `export const G: Readonly<Record<string, T>> = {\n  a: { about: "x", commands: ["any:kb", "any:search"], skills: [] },\n};\n`;
    expect(addToPropertyArray(one, "G", "a", "commands", `"any:saidBy"`)).toContain(`commands: ["any:kb", "any:search", "any:saidBy"]`);
    expect(propertyArrayHasText(addToPropertyArray(one, "G", "a", "commands", `"any:saidBy"`), "G", "a", "commands", `"any:saidBy"`)).toBe(true);
    expect(() => addToPropertyArray(one, "G", "a", "commands", `"any:kb"`)).toThrow(AstEditError);
    expect(() => addToPropertyArray(one, "G", "b", "commands", `"any:kb"`)).toThrow(AstEditError);
  });
});

describe("log new tool", () => {
  test("names follow the tool's name; acting on data adds a Live tool", () => {
    expect(toolNamesOf({ name: "saidBy", summary: SUMMARY, flags: ["name"] })).toMatchObject({ command: "saidByCommand", usage: "SAID_BY_USAGE", rows: "saidByRows", tools: ["saidBy"], area: "inbox", guide: "knowledgeAndSearch" });
    expect(toolNamesOf({ name: "linkTargets", summary: "x", acts: true }).tools).toEqual(["linkTargets", "linkTargetsLive"]);
  });

  test("the plan wires COMMANDS, the rules and the guide group through the syntax tree and writes the command, its test and its use case", () => {
    const root = copyOfRepo();
    const plan = planNewTool(root, { name: PROBE, summary: SUMMARY, flags: ["name"], asks: ["find his messages"] });
    applyPlan(root, plan);
    const read = (p: string) => readFileSync(join(root, p), "utf8");
    expect(read("src/cli/runner/index.ts")).toContain(`import { ${PROBE}Command } from "../${PROBE}/index.ts";`);
    expect(read("src/cli/runner/index.ts")).toContain(`  ${PROBE}Command,\n`);
    expect(read("src/mcp/server/helpers/agentRules.ts")).toContain(`${PROBE}: [30, 163]`);
    expect(read("src/mcp/server/helpers/guides.ts")).toContain(`"any:${PROBE}"]`);
    for (const file of [`src/cli/${PROBE}/index.ts`, `src/cli/${PROBE}/${PROBE}.test.ts`, `docs/useCases/inbox/${PROBE}.md`]) expect(existsSync(join(root, file))).toBe(true);
    const command = read(`src/cli/${PROBE}/index.ts`);
    expect(syntaxErrors(command)).toEqual([]);
    expect(syntaxErrors(read(`src/cli/${PROBE}/${PROBE}.test.ts`))).toEqual([]);
    expect(command).toContain(`export function ${PROBE}Rows(handle: Database, input: ScaffoldToolProbeInput)`);
    expect(command).toContain(`{ name: "name", kind: "string"`);
    expect(command).not.toMatch(/\/\/|\/\*/);
    const doc = read(`docs/useCases/inbox/${PROBE}.md`);
    expect(doc).toContain(`How the owner asks for it: "find his messages"`);
    expect(doc).toContain(`| 1 | ${SUMMARY} | \`${PROBE}\` { name } |`);
  });

  test("a tool that acts on data is a dry run with a Live form", () => {
    const root = copyOfRepo();
    const plan = planNewTool(root, { name: PROBE, summary: "Mark a chat read", acts: true, flags: ["chat"] });
    const command = plan.files[0].content;
    expect(syntaxErrors(command)).toEqual([]);
    expect(command).toContain("liveThroughAction<Command>(");
    expect(command).toContain(`{ name: "apply", kind: "boolean", live: true`);
    expect(plan.files[2].content).toContain(`\`${PROBE}Live\` { chat, confirmLive: true }`);
  });

  test("an existing command, a bad name, a missing summary or an unknown guide is refused before anything is written", () => {
    const root = copyOfRepo();
    expect(() => planNewTool(root, { name: "people", summary: SUMMARY })).toThrow("already");
    expect(() => planNewTool(root, { name: "said by", summary: SUMMARY })).toThrow("camelCase");
    expect(() => planNewTool(root, { name: PROBE, summary: " " })).toThrow("--summary");
    expect(() => planNewTool(root, { name: PROBE, summary: SUMMARY, guide: "nowhere" })).toThrow("GUIDE_TOPICS");
    expect(() => planNewTool(root, { name: PROBE, summary: SUMMARY, flags: ["json"] })).toThrow("--flags");
  });
});
