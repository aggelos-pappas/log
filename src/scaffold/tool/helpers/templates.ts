import type { ToolNames } from "../types.ts";

const flagSpec = (flag: string) => `{ name: ${JSON.stringify(flag)}, kind: "string", description: ${JSON.stringify(`The ${flag}`)} }`;

const flagArgs = (n: ToolNames) => [...n.flags.map((f) => `[--${f} <${f}>]`), ...(n.acts ? ["[--apply]"] : []), "[--json]"].join(" ");

export function commandFile(n: ToolNames): string {
  const flags = [...n.flags.map(flagSpec), ...(n.acts ? [`{ name: "apply", kind: "boolean", live: true, description: "Do it (without it, only say what it would do)" }`] : []), "JSON_FLAG"];
  const fields = n.flags.map((f) => `${f}?: string`).join("; ");
  const picks = n.flags.map((f) => `${f}: text(${JSON.stringify(f)})`).join(", ");
  const imports = [
    `import type { Database } from "bun:sqlite";`,
    `import { defaultDbPath, openDatabase } from "../../storage/schema/index.ts";`,
    `import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";`,
    `import type { Command, CommandInput } from "../runner/types.ts";`,
    ...(n.acts ? [`import { liveThroughAction } from "../../platformKit/action/index.ts";`] : []),
  ];
  const body = n.acts
    ? [
        `    const handle = openDatabase(defaultDbPath());`,
        `    const rows = ${n.rows}(handle, ${n.inputType === "{}" ? "{}" : `{ ${picks} }`});`,
        `    const apply = parsed.flags["apply"] === true;`,
        `    const done = apply ? ${n.name}Apply(handle, rows) : 0;`,
        `    if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ apply, rows, done }, null, 2) };`,
        `    if (!apply) return { code: 0, stdout: rows.length ? [\`log ${n.name}: would act on \${rows.length} (a dry run: --apply does it)\`, ...rows.map((r) => JSON.stringify(r))].join("\\n") : "log ${n.name}: nothing to do." };`,
        `    return { code: 0, stdout: \`log ${n.name}: done \${done} of \${rows.length}.\` };`,
      ]
    : [
        `    const rows = ${n.rows}(openDatabase(defaultDbPath()), ${n.inputType === "{}" ? "{}" : `{ ${picks} }`});`,
        `    if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ rows }, null, 2) };`,
        `    return { code: 0, stdout: rows.length ? rows.map((r) => JSON.stringify(r)).join("\\n") : "log ${n.name}: nothing found." };`,
      ];
  const command = [
    `{`,
    `  usage: ${n.usage},`,
    `  platform: "any",`,
    `  name: ${JSON.stringify(n.name)},`,
    `  effect: ${JSON.stringify(n.acts ? "write" : "read")},`,
    `  input: ${n.input},`,
    `  summary: ${JSON.stringify(n.summary)},`,
    `  args: ${JSON.stringify(flagArgs(n))},`,
    `  run(_context, argv) {`,
    `    const parsed = parseArgs(argv, parserSpecOf(${n.input}));`,
    `    if (!parsed.ok) return refuseInput(${JSON.stringify(n.name)}, parsed.error, ${n.usage});`,
    ...(n.flags.length ? [`    const text = (flag: string) => (typeof parsed.flags[flag] === "string" ? (parsed.flags[flag] as string) : undefined);`] : []),
    ...body,
    `  },`,
    `}`,
  ].join("\n");
  return [
    ...imports,
    "",
    `export const ${n.usage} = ${JSON.stringify(`Usage: log ${n.name} ${flagArgs(n)}   (${n.summary})`)};`,
    "",
    `export const ${n.input}: CommandInput = {`,
    `  forms: [{ words: [], ${n.acts ? `effect: "write", ` : ""}summary: ${JSON.stringify(n.summary)}, positionals: [], flags: [${flags.join(", ")}] }],`,
    `};`,
    "",
    `export type ${n.pascal}Input = ${n.inputType === "{}" ? "Record<string, never>" : `{ ${fields} }`};`,
    "",
    `export function ${n.rows}(handle: Database, input: ${n.pascal}Input): Record<string, unknown>[] {`,
    `  return [];`,
    `}`,
    "",
    ...(n.acts ? [`export function ${n.name}Apply(handle: Database, rows: Record<string, unknown>[]): number {`, `  return 0;`, `}`, ""] : []),
    n.acts ? `export const ${n.command}: Command = liveThroughAction<Command>(${command}, ["apply"]);` : `export const ${n.command}: Command = ${command};`,
    "",
  ].join("\n");
}

export function commandTest(n: ToolNames): string {
  return [
    `import { afterAll, describe, expect, test } from "bun:test";`,
    `import { mkdtempSync } from "node:fs";`,
    `import { tmpdir } from "node:os";`,
    `import { join } from "node:path";`,
    `import { openDatabase } from "../../storage/schema/index.ts";`,
    `import { ${n.command}, ${n.rows} } from "./index.ts";`,
    "",
    `const dbPath = join(mkdtempSync(join(tmpdir(), "${n.name}")), "log.db");`,
    "",
    `afterAll(() => {`,
    `  openDatabase(dbPath).close();`,
    `  Bun.gc(true);`,
    `});`,
    "",
    `describe("log ${n.name}", () => {`,
    `  test("an empty log.db answers with nothing, and changes nothing", () => {`,
    `    expect(${n.rows}(openDatabase(dbPath), {})).toEqual([]);`,
    `  });`,
    "",
    `  test("it is an any-platform ${n.acts ? "write" : "read"} command", () => {`,
    `    expect(${n.command}.name).toBe(${JSON.stringify(n.name)});`,
    `    expect(${n.command}.effect).toBe(${JSON.stringify(n.acts ? "write" : "read")});`,
    `  });`,
    `});`,
    "",
  ].join("\n");
}

export function useCaseDoc(n: ToolNames): string {
  const call = n.flags.length ? ` { ${n.flags.join(", ")} }` : "";
  const steps = n.acts
    ? [
        `| 1 | See what it would do, a dry run | \`${n.tools[0]}\`${call} | it lists what the one-off would have touched |`,
        `| 2 | Do it, after the dry run reads right | \`${n.tools[1]}\`${call.replace(/ }$/, ", confirmLive: true }") || " { confirmLive: true }"} | it says how many it did |`,
      ]
    : [`| 1 | ${n.summary.replace(/\|/g, "/")} | \`${n.tools[0]}\`${call} | it answers what the one-off answered |`];
  return [
    `# ${n.title}`,
    "",
    `${n.summary}. Made from a hand-rolled one-off with log new tool (getGuide({ useCase: "log/toolFromOneOff" })), so it is a log tool from now on and the one-off is never written again.`,
    "",
    `How the owner asks for it: ${n.asks.map((a) => JSON.stringify(a)).join(", ")}`,
    "",
    "## The steps",
    "",
    "| # | Step | Tool | Done when |",
    "| --- | --- | --- | --- |",
    ...steps,
    "",
  ].join("\n");
}
