import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../storage/schema/index.ts";
import { byLog, logWriteOf, logWritesOf, ownChangesSince, ownItemsAfter, recordLogWrite, refreshOwnActivity, storeOwnItems } from "./index.ts";
import type { OwnItem } from "./index.ts";

let dir = "";
let handle: Database;
const T0 = Date.parse("2026-11-26T17:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const item = (over: Partial<OwnItem>): OwnItem => ({ kind: "like", id: "1", tweetId: "1", userId: "77", handle: "grace_ships", text: "a post", at: null, ...over });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ownActivity"));
  handle = openDatabase(join(dir, "log.db"));
});

afterAll(() => {
  handle.close();
  Bun.gc(true);
  rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

describe("the owner's own replies, likes and follows on X", () => {
  test("only a write X confirmed is recorded as log's, with the ids that match it later", () => {
    expect(logWriteOf({ action: "like", tweetUrl: "https://x.com/a/status/42" }, { ok: true, event: "sent" })).toEqual({ action: "like", tweetId: "42", target: "42", userId: null });
    expect(logWriteOf({ action: "reply", tweetUrl: "https://x.com/a/status/42" }, { ok: true, event: "sent", tweetId: "99" })).toEqual({ action: "reply", tweetId: "99", target: "42", userId: null });
    expect(logWriteOf({ action: "like", tweetUrl: "https://x.com/a/status/42" }, { ok: false, code: "rateLimited" })).toBeNull();
    expect(logWriteOf({ action: "userPosts" }, { ok: true })).toBeNull();
  });

  test("what log did is never called by hand; what it didn't do is", () => {
    recordLogWrite("fakeAccount", { action: "like", tweetUrl: "https://x.com/a/status/500" }, { answer: { ok: true, event: "sent" }, refreshed: null }, handle);
    recordLogWrite("fakeAccount", { action: "follow", userId: "88" }, { answer: { ok: true, event: "sent" }, refreshed: null }, handle);
    recordLogWrite("fakeAccount", { action: "reply", tweetUrl: "https://x.com/a/status/600" }, { answer: { ok: true, event: "sent", tweetId: "601" }, refreshed: null }, handle);
    const writes = logWritesOf(handle, "fakeAccount");
    expect(byLog(item({ kind: "like", id: "500", tweetId: "500" }), writes)).toBe(true);
    expect(byLog(item({ kind: "like", id: "501", tweetId: "501" }), writes)).toBe(false);
    expect(byLog(item({ kind: "follow", id: "88", userId: "88", tweetId: null }), writes)).toBe(true);
    expect(byLog(item({ kind: "follow", id: "89", userId: "89", tweetId: null }), writes)).toBe(false);
    expect(byLog(item({ kind: "reply", id: "601", tweetId: "600" }), writes)).toBe(true);
    expect(byLog(item({ kind: "reply", id: "602", tweetId: "600" }), writes)).toBe(false);
  });

  test("the hook reads only his own by-hand items, once settled, in order", () => {
    storeOwnItems("fakeAccount", [item({ kind: "like", id: "500", tweetId: "500" }), item({ kind: "reply", id: "700", tweetId: "650", text: "yo this is clean" })], handle, new Date(T0));
    storeOwnItems("fakeAccount", [item({ kind: "follow", id: "90", userId: "90", tweetId: null, handle: "linus_k" })], handle, new Date(T0 + 50_000));
    const { items, through } = ownItemsAfter(handle, 0, iso(T0 + 30_000));
    expect(items.map((i) => `${i.item.kind}:${i.item.id}`)).toEqual(["reply:700"]);
    const later = ownItemsAfter(handle, through, iso(T0 + 120_000));
    expect(later.items.map((i) => `${i.item.kind}:${i.item.id}`)).toEqual(["follow:90"]);
  });

  test("the queue sees what he did with that one person since the draft", () => {
    const lines = ownChangesSince("fakeAccount", { handle: "@Grace_Ships" }, iso(T0 - 1), handle);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('he replied to @grace_ships: "yo this is clean"');
    expect(ownChangesSince("fakeAccount", { handle: "grace_ships" }, iso(T0 + 1), handle)).toEqual([]);
  });

  test("a fresh check is reused, a stale one reads once and stores what's new, a refusal says why", async () => {
    let calls = 0;
    const engine = async () => ((calls += 1), { answer: { ok: true, items: [item({ kind: "like", id: "800", tweetId: "800" })] } as never, refreshed: null });
    expect(await refreshOwnActivity("fakeAccount", engine, T0, () => T0 - 60_000, handle)).toEqual({ ok: true, fresh: true, added: 0 });
    expect(calls).toBe(0);
    expect(await refreshOwnActivity("fakeAccount", engine, T0, () => T0 - 11 * 60_000, handle)).toEqual({ ok: true, fresh: false, added: 1 });
    expect(await refreshOwnActivity("fakeAccount", engine, T0, () => null, handle)).toEqual({ ok: true, fresh: false, added: 0 });
    const refused = await refreshOwnActivity("fakeAccount", async () => ({ answer: { ok: false, code: "governorBlocked", detail: "500/500" }, refreshed: null }), T0, () => null, handle);
    expect(refused).toEqual({ ok: false, fresh: false, added: 0, refused: "governorBlocked: 500/500" });
  });
});
