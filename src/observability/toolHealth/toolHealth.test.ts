import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { callShapedNames, cliToolName, failingTools, healthReport, lastCommits, OFFERS_NOTE, readCalls, readGuides, reportLines, schemaChangesIn, staleGuides, toolRows, unusedTools } from "./index.ts";
import type { CallRow, GuideFile, RegisteredTool } from "./index.ts";

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 20);

function call(tool: string, n: number, ok: boolean, code: string | null = null, ms = 100): CallRow {
  return { tool, callId: `${tool}${n}`, startedAt: NOW - n * 60000, ms, ok, code };
}

const registered: RegisteredTool[] = [
  { name: "twitterDms", module: "src/cli/twitter/index.ts" },
  { name: "discordRead", module: "src/cli/discord/index.ts" },
  { name: "slackChats", module: "src/cli/slack/index.ts" },
  { name: "kbSearch", module: "src/cli/kb/index.ts" },
];

const guides: GuideFile[] = [
  { path: "docs/useCases/slack/dmReply.md", text: "| 1 | read | `slackChats` { account } | done |\n| 2 | old | `slackOldRead` { channel } | done |\n| 3 | other | `bhwSearch` { order } | done |", committedAt: NOW - 20 * DAY },
  { path: "docs/useCases/twitter/dmInbox.md", text: "| 1 | read | `twitterDms` { account } | done |", committedAt: NOW - 2 * DAY },
  { path: "docs/guides/xInbox.md", text: "`twitterDms` usage", committedAt: NOW - 20 * DAY },
];

describe("toolHealth", () => {
  test("a terminal run counts for the MCP tool its words name", () => {
    expect(cliToolName("cli twitter dms")).toBe("twitterDms");
    expect(cliToolName("cli kb")).toBe("kb");
    expect(cliToolName("twitterDms")).toBeNull();
  });

  test("each tool gets calls, failures, its commonest code, p50, p95 and last use", () => {
    const calls = [call("discordRead", 1, true, null, 50), call("discordRead", 2, false, "inputInvalid", 150), call("discordRead", 3, false, "inputInvalid", 250), call("discordRead", 4, false, "platformRefused", 350), call("twitterDms", 5, true)];
    const [row] = toolRows(calls);
    expect(row.tool).toBe("discordRead");
    expect(row.calls).toBe(4);
    expect(row.failures).toBe(3);
    expect(row.failureRate).toBe(0.75);
    expect(row.topCode).toBe("inputInvalid");
    expect(row.p95).toBeGreaterThanOrEqual(row.p50);
    expect(row.lastUsed).toBe(new Date(NOW - 60000).toISOString());
  });

  test("failing needs more than 20% failed over at least 5 calls, and names the codes", () => {
    const few = [1, 2, 3, 4].map((n) => call("kbSearch", n, false));
    const many = [1, 2, 3, 4, 5].map((n) => call("discordRead", n, n > 3, n <= 2 ? "inputInvalid" : null));
    const fine = [1, 2, 3, 4, 5].map((n) => call("twitterDms", n, n !== 1));
    const flags = failingTools([...few, ...many, ...fine]);
    expect(flags.map((f) => f.tool)).toEqual(["discordRead"]);
    expect(flags[0].codes).toEqual({ inputInvalid: 2, uncoded: 1 });
    expect(flags[0].lastFailedCall).toBe("discordRead1");
    expect(flags[0].fix).toContain("guide edit");
  });

  test("unused lists registered tools no call touched, with the plays that name them, and never invents offers", () => {
    const flags = unusedTools(registered, [call("twitterDms", 1, true), call("cli kb search", 2, true)], guides, 14);
    expect(flags.map((f) => f.tool)).toEqual(["discordRead", "slackChats"]);
    expect(flags.find((f) => f.tool === "slackChats")!.namedBy).toEqual(["docs/useCases/slack/dmReply.md"]);
    expect(flags.find((f) => f.tool === "discordRead")!.fix).toContain("retire");
    expect(flags.every((f) => f.offered === null)).toBe(true);
  });

  test("stale flags a guide older than its tool's input change, and a call to a tool that no longer exists", () => {
    const changes = [
      { module: "src/cli/slack/index.ts", sha: "abc1234", at: NOW - 10 * DAY },
      { module: "src/cli/twitter/index.ts", sha: "def5678", at: NOW - 5 * DAY },
    ];
    const flags = staleGuides(guides, registered, changes, ["twitter", "discord", "slack", "kb"]);
    expect(flags.map((f) => `${f.guide} ${f.tool} ${f.reason}`)).toEqual([
      "docs/guides/xInbox.md twitterDms schemaChanged",
      "docs/useCases/slack/dmReply.md slackChats schemaChanged",
      "docs/useCases/slack/dmReply.md slackOldRead toolMissing",
    ]);
    expect(flags[0].fix).toContain("docs:build");
    expect(flags[1].evidence).toContain("abc1234");
  });

  test("names written as calls are found, other backticked words are not", () => {
    expect(staleGuides([{ path: "docs/useCases/inbox/showMe.md", text: "`report` { blocks }", committedAt: null }], registered, [], ["report"], ["report"])).toEqual([]);
    expect(callShapedNames("`slackChats` { a } and `slackOld {` but `README` and `slackState`")).toEqual(["slackChats", "slackOld"]);
  });

  test("without git history only missing tools are checked, and the report says so", () => {
    const report = healthReport({ days: 14, now: NOW, calls: [call("twitterDms", 1, true), { ...call("twitterDms", 2, true), startedAt: NOW - 30 * DAY }], registered, guides, schemaChanges: null, toolPrefixes: ["slack"], untracked: [] });
    expect(report.tools[0].calls).toBe(1);
    expect(report.stale.map((s) => s.reason)).toEqual(["toolMissing"]);
    expect(report.notes).toContain(OFFERS_NOTE);
    expect(report.notes.join(" ")).toContain("No git history");
    expect(reportLines(report).join("\n")).toContain("Unused");
  });

  test("git log output gives each file its newest commit and each module its input changes", () => {
    const log = "\u0001aaa1111 1795000000\ndocs/useCases/slack/dmReply.md\n\n\u0001bbb2222 1794000000\ndocs/useCases/slack/dmReply.md\ndocs/guides/xInbox.md\n";
    expect(lastCommits(log).get("docs/useCases/slack/dmReply.md")).toEqual({ sha: "aaa1111", at: 1795000000000 });
    expect(lastCommits(log).get("docs/guides/xInbox.md")!.sha).toBe("bbb2222");
    expect(schemaChangesIn(log, new Set(["docs/guides/xInbox.md"]))).toEqual([{ module: "docs/guides/xInbox.md", sha: "bbb2222", at: 1794000000000 }]);
  });

  test("calls are read from root bun spans only, with the code from attrs", () => {
    const handle = new Database(":memory:");
    handle.exec(`CREATE TABLE spans (spanId TEXT PRIMARY KEY, traceId TEXT NOT NULL, callId TEXT NOT NULL, parentId TEXT, tool TEXT NOT NULL, name TEXT NOT NULL, source TEXT NOT NULL, pid INTEGER NOT NULL, startedAt REAL NOT NULL, ms REAL NOT NULL, ok INTEGER NOT NULL, attrs TEXT NOT NULL DEFAULT '{}')`);
    const insert = handle.prepare(`INSERT INTO spans VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`);
    insert.run("s1", "t1", "c1", null, "discordRead", "call", "bun", NOW - DAY, 120, 0, JSON.stringify({ exit: 1, code: "inputInvalid" }));
    insert.run("s2", "t1", "c1", "s1", "discordRead", "fetch GET x", "bun", NOW - DAY, 80, 0, "{}");
    insert.run("s3", "t3", "c3", null, "hook:UserPromptSubmit:hookEvent", "call", "hook", NOW - DAY, 5, 1, "{}");
    insert.run("s4", "t4", "c4", null, "twitterDms", "call", "bun", NOW - 30 * DAY, 5, 1, "{}");
    insert.run("s5", "t5", "c5", null, "twitterDms", "call", "bun", NOW - DAY, 5, 1, "not json");
    const rows = readCalls(handle, NOW - 14 * DAY);
    expect(rows.map((r) => [r.tool, r.ok, r.code])).toEqual([["discordRead", false, "inputInvalid"], ["twitterDms", true, null]]);
    handle.close();
  });

  test("guides are read from the repo with their last commit time from git", () => {
    const seen: string[][] = [];
    const { guides: read, hasGit } = readGuides(undefined, (args) => {
      seen.push(args);
      return "\u0001aaa1111 1795000000\ndocs/useCases/twitter/dmInbox.md\n";
    });
    expect(hasGit).toBe(true);
    expect(seen[0]).toContain("docs/useCases");
    expect(read.find((g) => g.path === "docs/useCases/twitter/dmInbox.md")!.committedAt).toBe(1795000000000);
    const none = readGuides(undefined, () => {
      throw new Error("not a git repository");
    });
    expect(none.hasGit).toBe(false);
    expect(none.guides.every((g) => g.committedAt === null)).toBe(true);
  });
});
