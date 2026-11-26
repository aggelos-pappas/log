import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ignoredList, isIgnored, setIgnored, withoutIgnored } from "./index.ts";

const realDb = process.env.LOG_DB;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "ignore"));
  process.env.LOG_DB = join(dir, "log.db");
});

afterEach(() => {
  if (realDb === undefined) delete process.env.LOG_DB;
  else process.env.LOG_DB = realDb;
});

const heard = (conversationId: string, serverId?: string) => ({ platform: "discord", account: "discordAccount", conversationId, with: "fakeFriend", text: "hi", at: "2026-11-18T10:00:00.000Z", box: serverId ? "mention" : "dm", seenAt: "2026-11-18T10:00:00.000Z", ...(serverId ? { serverId } : {}) });

describe("ignoring a server or a chat", () => {
  test("an ignored server drops every channel in it, a DM still comes through", () => {
    const entries = [{ platform: "discord", server: "1111", by: "the owner", at: "x" }];
    expect(isIgnored(heard("2222", "1111"), entries)).toBe(true);
    expect(isIgnored(heard("3333"), entries, () => null)).toBe(false);
    expect(isIgnored(heard("4444", "9999"), entries)).toBe(false);
  });

  test("a message with no server on it is matched through the chat's server", () => {
    const entries = [{ platform: "discord", server: "1111", by: "the owner", at: "x" }];
    expect(isIgnored(heard("2222"), entries, () => "1111")).toBe(true);
  });

  test("an ignored chat drops just that chat, and another platform is untouched", () => {
    const entries = [{ platform: "discord", chat: "2222", by: "the owner", at: "x" }];
    expect(withoutIgnored([heard("2222"), heard("5555"), { ...heard("2222"), platform: "slack" }], entries, () => null).map((m) => `${m.platform}:${m.conversationId}`)).toEqual(["discord:5555", "slack:2222"]);
  });

  test("ignore is kept, set twice is one entry, and undo lifts it", () => {
    setIgnored({ platform: "discord", server: "1111" }, "the owner");
    setIgnored({ platform: "discord", server: "1111" }, "the owner");
    expect(ignoredList()).toHaveLength(1);
    setIgnored({ platform: "discord", server: "1111" }, "the owner", true);
    expect(ignoredList()).toEqual([]);
  });
});
