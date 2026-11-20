import { describe, expect, test } from "bun:test";
import { calibrationOf, failingSpans, heldOutSample, rankOptions } from "./helpers/voiceOptions.ts";
import type { GateReading } from "./helpers/voice.ts";
import type { VoicePair } from "../../voice/pairs/index.ts";

const reading = (score: number, pass: boolean, extra: Partial<GateReading> = {}): GateReading => ({ to: "@grace_ships", voice: 0.9, inContext: 0.9, answerRequired: true, friendLike: 0.9, openerOnly: 1, toThem: null, buildsOn: null, neverSays: [], watermark: { level: "clean", findings: [] } as unknown as GateReading["watermark"], pass, model: "m", notHere: [], scrambler: { ran: true, suspicious: 0, hits: [] } as unknown as GateReading["scrambler"], ranked: [], score: { score, threshold: 0.7, pass, blocks: [], rows: [] }, ...extra });

describe("ranked options with the fix for the best one", () => {
  test("options come back ranked: passing first, then by the one score", () => {
    const ranked = rankOptions(["a", "b", "c"], [reading(0.75, true), reading(0.9, false), reading(0.82, true)]);
    expect(ranked.map((o) => [o.rank, o.option, o.pass])).toEqual([[1, 3, true], [2, 1, true], [3, 2, false]]);
  });

  test("the failing spans name never-said phrases, AI tells and pairs he has never written, each once", () => {
    const spans = failingSpans(reading(0.5, false, { neverSays: ["spot on"], phrases: { familiarity: 0.3, floor: 0.4, unfamiliar: [], newPhrasing: ["is wild", "is wild"], newWords: [], pass: false }, aiTells: { hits: [{ rule: "Delve", match: "delve", message: "" }], overused: [], closest: [{ chunk: "lets delve in", phrase: "delve into", source: "s", cosine: 0.9, rerank: null }], score: 0.9, p50: 0.7, p99: 0.95, flagged: false, pass: false } }));
    expect(spans.map((s) => s.span)).toEqual(["spot on", "delve", "lets delve in", "is wild"]);
  });

  test("calibration sets the threshold from his held-out scores and reports before and after", () => {
    const owner = Array.from({ length: 20 }, (_, i) => ({ score: 0.6 + i * 0.015, strictPass: i % 2 === 0, blocked: false }));
    const ai = [{ score: 0.3, strictPass: false, blocked: false }, { score: 0.95, strictPass: true, blocked: false }];
    const c = calibrationOf(owner, ai, new Date("2026-11-20T00:00:00Z"));
    expect(c.passBefore).toBe(0.5);
    expect(c.passAfter).toBeGreaterThanOrEqual(0.95);
    expect(c.aiFailedAfter).toBe(0.5);
    expect(c.measuredAt).toBe("2026-11-20T00:00:00.000Z");
  });

  test("the held-out sample takes his dm replies with something before them, one per chat first", () => {
    const pair = (id: string, conversationId: string, at: string, reply = "yeah bro lets go", kind: "dm" | "group" = "dm"): VoicePair => ({ id, platform: "discord", account: "a", conversationId, chat: "c", kind, with: ["linus_k"], at, said: "you around", saidBy: "linus_k", reply, parts: 1, gaps: [] });
    const picked = heldOutSample([pair("1", "A", "2026-11-01"), pair("2", "A", "2026-11-03"), pair("3", "B", "2026-11-02"), pair("4", "C", "2026-11-04", "ok"), pair("5", "D", "2026-11-05", "yeah bro lets go", "group")], 3);
    expect(picked.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });
});
