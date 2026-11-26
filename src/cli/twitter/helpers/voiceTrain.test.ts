import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../../storage/schema";
import { db } from "../../../inbox/store/index.ts";
import { aiTellsMode, conventionsDeps, conventionsStale, recordDrafts, trainInBackground } from "./voiceTrain.ts";
import { corpusOf, OWNER_MIN_FOR_TRAINING } from "../../../voice/conventions/index.ts";

const scratch = mkdtempSync(join(tmpdir(), "logVoiceTrain"));
const before = { db: process.env.LOG_DB, train: process.env.LOG_VOICE_TRAIN };
const context = { err: () => {}, out: () => {} } as never;
const realStart = conventionsDeps.start;

beforeEach(() => {
  process.env.LOG_DB = join(scratch, "log.db");
  delete process.env.LOG_VOICE_TRAIN;
});

afterEach(() => {
  conventionsDeps.start = realStart;
  if (before.db === undefined) delete process.env.LOG_DB;
  else process.env.LOG_DB = before.db;
  if (before.train === undefined) delete process.env.LOG_VOICE_TRAIN;
  else process.env.LOG_VOICE_TRAIN = before.train;
});

afterAll(() => {
  openDatabase(join(scratch, "log.db")).close();
  Bun.gc(true);
  rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

describe("the gate keeps the conventions detector current without waiting on it", () => {
  test("the Jina index is read only with LOG_AI_TELLS=jina", () => {
    expect(aiTellsMode({})).toBe("conventions");
    expect(aiTellsMode({ LOG_AI_TELLS: "jina" })).toBe("jina");
  });

  test("a detector older than his voice index is stale", () => {
    const pairs = join(scratch, "pairs.json");
    writeFileSync(pairs, "[]");
    utimesSync(pairs, new Date("2026-11-20T00:00:00Z"), new Date("2026-11-20T00:00:00Z"));
    expect(conventionsStale(null, pairs)).toBe(true);
    expect(conventionsStale("2026-11-19T00:00:00.000Z", pairs)).toBe(true);
    expect(conventionsStale("2026-11-21T00:00:00.000Z", pairs)).toBe(false);
  });

  test("a scratch db with few of his messages never starts a trainer; with enough it starts one, once", () => {
    let starts = 0;
    conventionsDeps.start = () => (starts++, true);
    expect(trainInBackground(context, "missing")).toBe(false);
    const insert = db().prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, fromOwner, sentAt, text, source, receivedAt) VALUES (?, 'c1', 'discord', 'me', 1, ?, ?, 'read', ?)");
    db().transaction(() => {
      for (let i = 0; i < OWNER_MIN_FOR_TRAINING; i++) insert.run(`k${i}`, "2026-11-01T00:00:00Z", `line ${i}`, "2026-11-01T00:00:00Z");
    })();
    process.env.LOG_VOICE_TRAIN = "off";
    expect(trainInBackground(context, "missing")).toBe(false);
    delete process.env.LOG_VOICE_TRAIN;
    expect(trainInBackground(context, "missing")).toBe(true);
    expect(trainInBackground(context, "missing")).toBe(false);
    expect(starts).toBe(1);
  });

  test("every option the gate grades is kept as an AI draft for the next training", () => {
    recordDrafts(["yo lad option one", "yo lad option two"], "@grace_ships", "m1");
    const rows = corpusOf("ai").filter((r) => r.source === "gate");
    expect(rows.map((r) => r.text).sort()).toEqual(["yo lad option one", "yo lad option two"]);
    expect(rows[0].chatKey).toBe("grace_ships");
    expect(rows[0].momentKey).toBe("gate:m1");
  });
});
