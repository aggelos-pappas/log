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

  test("rows that each carry a long thread still fit: the whole answer, text and structured together, stays under the cap", () => {
    const message = (i: number) => ({ conversationId: "1000000000000000001", seq: i, at: "2026-11-19T13:55:46Z", fromOwner: false, senderLabel: "grace_ships", text: "a long message about the retainer and the base ".repeat(40), files: 0 });
    const waiting = Array.from({ length: 100 }, (_, r) => ({ platform: "discord", with: `linus_k${r}`, messages: Array.from({ length: 60 }, (_, i) => message(i)) }));
    const stdoutText = JSON.stringify({ waiting, followUps: [], totals: { waiting: 100 } }, null, 1);
    const huge: CallToolResult = { content: [{ type: "text", text: `Browsers: none open.\n\n${stdoutText}` }], structuredContent: { exit: 0, ok: true, stdout: stdoutText, log: [], progress: [], json: { waiting, followUps: [], totals: { waiting: 100 } } } };
    const capped = capResult("inboxWaiting", huge, ["platform", "limit", "tail"]);
    const total = Buffer.byteLength(JSON.stringify(capped.content), "utf8") + Buffer.byteLength(JSON.stringify(capped.structuredContent), "utf8");
    expect(total).toBeLessThan(RESULT_CAP_BYTES);
    const json = (capped.structuredContent as { json: { waiting: { count: number; first: { messages: unknown[] }[] } } }).json;
    expect(json.waiting.count).toBe(100);
    expect(json.waiting.first[0].messages.length).toBeLessThanOrEqual(4);
    expect((capped.content![0] as { text: string }).text).toContain("inboxWaiting's flags: --platform, --limit, --tail");
  });
});
