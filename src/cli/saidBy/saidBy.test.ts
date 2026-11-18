import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../storage/schema/index.ts";
import { saidByCommand, saidByRows } from "./index.ts";

const dbPath = join(mkdtempSync(join(tmpdir(), "saidBy")), "log.db");

afterAll(() => {
  openDatabase(dbPath).close();
  Bun.gc(true);
});

function world() {
  const on = openDatabase(dbPath);
  const chat = (platform: string, id: string, name: string) => on.prepare("INSERT OR IGNORE INTO chats (chatId, platform, account, conversationId, kind, name) VALUES (?, ?, ?, ?, 'dm', ?)").run(`${platform}:a:${id}`, platform, "a", id, name);
  let seq = 0;
  const say = (platform: string, id: string, label: string, text: string, at: string, fromOwner = 0) => on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, text, source, receivedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)").run(`t:${++seq}`, `${platform}:a:${id}`, platform, label, label, fromOwner, at, text, at);
  chat("discord", "d1", "grace_ships");
  chat("twitter", "x1", "Grace");
  chat("discord", "d2", "linus_k");
  say("discord", "d1", "grace_ships", "shipping the build tonight", "2026-11-10T10:00:00Z");
  say("twitter", "x1", "Grace Ships", "saw your post about the queue", "2026-11-12T09:00:00Z");
  say("discord", "d2", "linus_k", "grace said she'd ship it", "2026-11-13T09:00:00Z");
  say("discord", "d1", "xAccount", "nice", "2026-11-11T10:00:00Z", 1);
  return on;
}

describe("log saidBy", () => {
  test("an empty name answers with nothing, and changes nothing", () => {
    expect(saidByRows(openDatabase(dbPath), {})).toEqual([]);
  });

  test("someone's messages across platforms by name, newest first, as the one-off over messages JOIN chats found them", () => {
    const rows = saidByRows(world(), { name: "grace" });
    expect(rows.map((r) => [r.platform, r.chat, r.senderLabel, r.text])).toEqual([
      ["twitter", "Grace", "Grace Ships", "saw your post about the queue"],
      ["discord", "grace_ships", "grace_ships", "shipping the build tonight"],
    ]);
    expect(saidByRows(openDatabase(dbPath), { name: "grace", limit: 1 })).toHaveLength(1);
    expect(saidByRows(openDatabase(dbPath), { name: "%" })).toEqual([]);
  });

  test("it is an any-platform read command", () => {
    expect(saidByCommand.name).toBe("saidBy");
    expect(saidByCommand.effect).toBe("read");
  });
});
