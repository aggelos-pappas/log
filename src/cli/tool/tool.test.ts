import { describe, expect, test } from "bun:test";
import { db } from "../../inbox/store/index.ts";
import { runCli } from "../runner/index.ts";
import { toolDeps } from "./index.ts";

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("log tool health", () => {
  test("reports from the stored calls and refuses bad input", async () => {
    const tool = `adaProbe${Date.now()}`;
    const insert = db().prepare(`INSERT INTO spans (spanId, traceId, callId, parentId, tool, name, source, pid, startedAt, ms, ok, attrs) VALUES (?, ?, ?, NULL, ?, 'call', 'bun', 1, ?, ?, ?, ?)`);
    for (let n = 0; n < 6; n++) insert.run(`${tool}${n}`, `${tool}${n}`, `${tool}${n}`, tool, Date.now() - n * 1000, 100 + n, n < 4 ? 0 : 1, JSON.stringify(n < 4 ? { exit: 1, code: "inputInvalid" } : { exit: 0 }));
    const before = toolDeps.registered;
    toolDeps.registered = async () => ({ tools: [{ name: tool, module: "src/cli/tool/index.ts" }, { name: "linusNeverCalled", module: "src/cli/tool/index.ts" }], prefixes: ["linus"], untracked: [] });
    try {
      const json = await run(["tool", "health", "--days", "1", "--json"]);
      expect(json.code).toBe(0);
      const report = JSON.parse(json.out);
      const row = report.tools.find((t: { tool: string }) => t.tool === tool);
      expect(row).toMatchObject({ calls: 6, failures: 4, topCode: "inputInvalid" });
      expect(report.failing.map((f: { tool: string }) => f.tool)).toContain(tool);
      expect(report.unused.map((u: { tool: string }) => u.tool)).toEqual(["linusNeverCalled"]);
      const text = await run(["tool", "health"]);
      expect(text.code).toBe(0);
      expect(text.out).toContain("Tool health over the last 14 d");
      expect((await run(["tool", "health", "--days", "0"])).code).toBe(1);
      expect((await run(["tool", "sick"])).code).toBe(1);
    } finally {
      toolDeps.registered = before;
    }
  });
});
