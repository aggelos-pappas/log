import { describe, expect, test } from "bun:test";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { capResult, narrowingFlags, RESULT_CAP_BYTES } from "./index.ts";

const chats = Array.from({ length: 6_000 }, (_, i) => ({ id: `1000000000000${String(i).padStart(6, "0")}`, kind: i % 30 ? "channel" : "dm", name: `demo server #room${i}`, members: [] }));
const stdout = JSON.stringify({ ok: true, chats }, null, 2);
const big: CallToolResult = {
  content: [{ type: "text", text: `Browsers: none open.\n\n${stdout}\n\nexit 0` }],
  structuredContent: { exit: 0, ok: true, code: null, platform: "discord", capability: "chats", stdout, stderr: "", log: [], progress: stdout.split("\n").map((line) => ({ at: "2026-11-19T13:23:36Z", source: "out", line })), json: { ok: true, chats } },
};

describe("every log tool result is capped at 40 KB, whatever the platform", () => {
  test("a result over the cap comes back as counts, the first rows and one line naming the flags that narrow it", () => {
    const capped = capResult("discordChats", big, narrowingFlags([{ name: "account" }, { name: "kind" }, { name: "name" }, { name: "json" }]));
    const text = (capped.content![0] as { text: string }).text;
    expect(Buffer.byteLength(text, "utf8")).toBeLessThan(RESULT_CAP_BYTES);
    expect(Buffer.byteLength(JSON.stringify(capped.structuredContent), "utf8")).toBeLessThan(RESULT_CAP_BYTES);
    expect(text.startsWith("Browsers: none open.")).toBe(true);
    expect(text).toContain('"count": 6000');
    expect(text).toContain("Call it again narrowed with discordChats's flags: --kind, --name; never parse log output with a script.");
    expect((capped.structuredContent as { json: { chats: { count: number; first: unknown[] } } }).json.chats).toMatchObject({ count: 6000 });
    expect((capped.structuredContent as { exit: number }).exit).toBe(0);
  });

  test("a plain text answer over the cap keeps its first lines", () => {
    const lines = Array.from({ length: 5_000 }, (_, i) => `  chat ${i}  dm  linus_k`).join("\n");
    const capped = capResult("inboxWaiting", { content: [{ type: "text", text: lines }] }, ["tail", "platform"]);
    const text = (capped.content![0] as { text: string }).text;
    expect(text).toContain("  chat 0  dm  linus_k");
    expect(text).toContain("more line(s) left out");
    expect(text).toContain("inboxWaiting's flags: --tail, --platform");
  });

  test("a result under the cap is returned untouched", () => {
    const small: CallToolResult = { content: [{ type: "text", text: "ok" }], structuredContent: { exit: 0 } };
    expect(capResult("discordChats", small, [])).toBe(small);
  });
});
