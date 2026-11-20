import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answerEvent } from "../answers/index.ts";
import { AGENT_HOOKS, antigravityHooks, claudeCodeHooks, cursorHooks, HOOK_SERVICE_URL, hooksFor } from "../registry/index.ts";
import type { HookEvent } from "../registry/index.ts";
import { antigravityPromptPayload, contextOf, hostBody } from "./client.ts";
import type { HookHost } from "./types.ts";

const root = join(import.meta.dir, "..", "..", "..");
const dir = mkdtempSync(join(tmpdir(), "updateNoticeHarness"));
const saved: Record<string, string | undefined> = {};
const storageHooks = AGENT_HOOKS.filter((hook) => hook.script.endsWith("storage.ts"));
const NOTICE = "log-cli update: log 9.9.9 is out";

beforeAll(() => {
  for (const key of ["LOG_UPDATE_STATE", "LOG_UPDATE_CHECK"]) saved[key] = process.env[key];
  process.env.LOG_UPDATE_STATE = join(dir, "update.json");
  process.env.LOG_UPDATE_CHECK = "on";
  writeFileSync(process.env.LOG_UPDATE_STATE, JSON.stringify({ latest: "9.9.9", notesUrl: "https://example.com/notes", checkedAt: new Date().toISOString(), track: "stable" }));
});

afterAll(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(dir, { recursive: true, force: true });
});

async function told(host: HookHost, event: HookEvent, raw: string): Promise<string> {
  const answered = await answerEvent(event, raw, root, async () => null as never, storageHooks);
  const body = hostBody(host, event, answered.body);
  if (!body) return "";
  if (host === "cursor") return String(body.additional_context ?? "");
  if (host === "hermes") return String(body.context ?? "");
  return contextOf(body);
}

async function onceThenQuiet(host: HookHost, event: HookEvent, raw: string): Promise<void> {
  expect(await told(host, event, raw)).toContain(NOTICE);
  expect(await told(host, event, raw)).not.toContain("log-cli update:");
}

describe("the update notice reaches the agent in every harness, once per session", () => {
  test("Claude Code: its UserPromptSubmit http hook reaches the storage hook", async () => {
    expect(JSON.stringify(claudeCodeHooks(AGENT_HOOKS).UserPromptSubmit)).toContain(`${HOOK_SERVICE_URL}/UserPromptSubmit`);
    await onceThenQuiet("claudeCode", "UserPromptSubmit", JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "claudeSession", prompt: "hi" }));
  });

  test("Codex: its UserPromptSubmit hook reaches the storage hook", async () => {
    expect(JSON.stringify(hooksFor("codex").UserPromptSubmit)).toMatch(/storage|hooks\/UserPromptSubmit|event\.ts/);
    await onceThenQuiet("codex", "UserPromptSubmit", JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "codexSession", prompt: "hi" }));
  });

  test("Cursor: its sessionStart hook runs event.ts, and the storage hook answers SessionStart by conversation", async () => {
    expect(cursorHooks().hooks).toHaveProperty("sessionStart");
    await onceThenQuiet("cursor", "SessionStart", JSON.stringify({ hook_event_name: "sessionStart", conversation_id: "cursorConversation" }));
  });

  test("Hermes: pre_llm_call posts SessionStart then UserPromptSubmit with the session, and only the first says it", async () => {
    const plugin = readFileSync(join(root, "hermesPlugin", "__init__.py"), "utf8");
    expect(plugin).toContain('f"/hooks/{event}?host=hermes"');
    expect(plugin).toContain('payload = {"session_id": session_id or ""');
    const raw = JSON.stringify({ session_id: "hermesSession", prompt: "hi", source: "startup" });
    expect(await told("hermes", "SessionStart", raw)).toContain(NOTICE);
    expect(await told("hermes", "UserPromptSubmit", raw)).not.toContain("log-cli update:");
  });

  test("OpenCode: its plugin posts UserPromptSubmit with the session to the same hook", async () => {
    const plugin = readFileSync(join(root, ".opencode", "plugins", "logHooks", "index.ts"), "utf8");
    expect(plugin).toContain('postHook("UserPromptSubmit", { session_id: event.sessionID');
    await onceThenQuiet("opencode", "UserPromptSubmit", JSON.stringify({ session_id: "opencodeSession", prompt: "hi" }));
  });

  test("Antigravity: PreInvocation carries the conversation into UserPromptSubmit", async () => {
    expect(JSON.stringify(antigravityHooks())).toContain("PreInvocation");
    const payload = antigravityPromptPayload({ lastUserInput: "hi", conversationId: "antigravityConversation" });
    expect(JSON.parse(payload).session_id).toBe("antigravityConversation");
    await onceThenQuiet("antigravity", "UserPromptSubmit", payload);
  });
});
