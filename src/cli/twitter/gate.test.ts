import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent } from "../../inbox/store/index.ts";
import { chatIdFor, momentAnswered, failedParts, rankedContext, voiceDeps } from "./helpers/voice.ts";
import type { GateReading } from "./helpers/voice.ts";
import { RANKED_POOL } from "../../twitter/copy/voice/index.ts";
import { FRESH_DB_MS } from "../../../scripts/tests/timeouts.ts";

const passing: GateReading = { to: "@x", voice: 0.95, inContext: 0.9, answerRequired: true, friendLike: 0.9, openerOnly: 1, toThem: null, buildsOn: null, neverSays: [], watermark: { level: "clean", findings: [] } as unknown as GateReading["watermark"], pass: true, model: "m", notHere: [], scrambler: { ran: true, suspicious: 0, hits: [] } as unknown as GateReading["scrambler"], ranked: [] };

describe("the voice gate inside every send (rule 137)", () => {
  const inboxBefore = process.env.LOG_INBOX_STATE;
  afterEach(() => {
    if (inboxBefore === undefined) delete process.env.LOG_INBOX_STATE;
    else process.env.LOG_INBOX_STATE = inboxBefore;
  });

  test("a pass names nothing, and a fail names only what failed", () => {
    expect(failedParts(passing)).toEqual([]);
    const failing = { ...passing, voice: 0.4, neverSays: ["spot on"], pass: false };
    const parts = failedParts(failing);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("spot on");
    expect(parts[1]).toContain("voice 0.40");
  });

  test("a voice note that repeats what the owner already said names it (rule 149)", () => {
    const parts = failedParts({ ...passing, buildsOn: 0.3, pass: false });
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain("buildsOn 0.30");
  });

  test("the chat's context is ranked against the moment being answered, from the .db, in full", async () => {
    process.env.LOG_INBOX_STATE = mkdtempSync(join(tmpdir(), "gate"));
    const before = voiceDeps.aiEmbedder;
    const words = ["camera", "video", "tax", "weather"];
    voiceDeps.aiEmbedder = () => ({ model: "fake", dimensions: 4, embed: async (texts: string[]) => texts.map((t) => words.map((w) => (t.toLowerCase().includes(w) ? 1 : 0))), rerank: async (query: string, docs: string[]) => docs.map((d) => (d.toLowerCase().includes(query.split(" ")[0].toLowerCase()) ? 1 : 0)) });
    try {
      for (const [i, text] of ["the weather is grim", "camera arrived today, sent you the video", "tax return done"].entries()) appendEvent({ platform: "discord", account: "acct", conversationId: "D1", type: "message", with: "abby", text, sourceAt: `2026-11-04T0${i}:00:00Z`, receivedAt: `2026-11-04T0${i}:00:01Z` });
      const ranked = await rankedContext("discord", "acct", { conversationId: "D1" }, "camera ok?", 1);
      expect(ranked).toEqual([{ from: "abby", text: "camera arrived today, sent you the video", at: "2026-11-04T01:00:00Z" }]);
    } finally {
      voiceDeps.aiEmbedder = before;
    }
  }, FRESH_DB_MS);

  test("a long chat embeds only its newest lines, so a send never embeds a whole history", async () => {
    process.env.LOG_INBOX_STATE = mkdtempSync(join(tmpdir(), "gate"));
    const before = voiceDeps.aiEmbedder;
    const sizes: number[] = [];
    voiceDeps.aiEmbedder = () => ({ model: "fake", dimensions: 1, embed: async (texts: string[]) => (sizes.push(texts.length), texts.map(() => [1])), rerank: async (_query: string, docs: string[]) => docs.map(() => 1) });
    try {
      for (let i = 0; i < RANKED_POOL + 40; i++) appendEvent({ platform: "discord", account: "acct", conversationId: "D3", type: "message", with: "grace_ships", text: `line ${i}`, sourceAt: new Date(Date.UTC(2026, 10, 4, 0, i)).toISOString(), receivedAt: new Date(Date.UTC(2026, 10, 4, 0, i, 1)).toISOString() });
      await rankedContext("discord", "acct", { conversationId: "D3" }, "camera ok?", 1);
      expect(sizes[0]).toBe(RANKED_POOL + 1);
    } finally {
      voiceDeps.aiEmbedder = before;
    }
  }, FRESH_DB_MS);

  test("a Jina call that never answers falls back to the local embedder within the bound, so the send never waits on it", async () => {
    process.env.LOG_INBOX_STATE = mkdtempSync(join(tmpdir(), "gate"));
    const saved = { ai: voiceDeps.aiEmbedder, local: voiceDeps.embedder, ms: voiceDeps.jinaMs };
    const words = ["camera", "video", "tax", "weather"];
    voiceDeps.aiEmbedder = () => ({ model: "jina", dimensions: 4, embed: () => new Promise(() => {}), rerank: () => new Promise(() => {}) });
    voiceDeps.embedder = () => ({ model: "local", dimensions: 4, embed: async (texts: string[]) => texts.map((t) => Float32Array.from(words.map((w) => (t.toLowerCase().includes(w) ? 1 : 0)))) });
    voiceDeps.jinaMs = 50;
    try {
      for (const [i, text] of ["the weather is grim", "camera arrived today, sent you the video", "tax return done"].entries()) appendEvent({ platform: "discord", account: "acct", conversationId: "D2", type: "message", with: "abby", text, sourceAt: `2026-11-04T0${i}:00:00Z`, receivedAt: `2026-11-04T0${i}:00:01Z` });
      const started = Date.now();
      const ranked = await rankedContext("discord", "acct", { conversationId: "D2" }, "camera ok?", 1);
      expect(Date.now() - started).toBeLessThan(2000);
      expect(ranked.map((r) => r.text)).toEqual(["camera arrived today, sent you the video"]);
    } finally {
      voiceDeps.aiEmbedder = saved.ai;
      voiceDeps.embedder = saved.local;
      voiceDeps.jinaMs = saved.ms;
    }
  }, FRESH_DB_MS);
});

describe("the gate inside a send finds the chat's real replies by what the send knows", () => {
  const conversations = [
    { platform: "twitter", account: "xAccount", conversationId: "1491032180553920513:1974596626342686720", with: ["SalesPsych0"], box: "xchat", messages: [] },
    { platform: "twitter", account: "xAccount", conversationId: "1663390258099101696-1974596626342686720", with: ["sage_gtm"], box: "dm", messages: [] },
    { platform: "discord", account: "myDiscordName", conversationId: "1565734133609668780", with: ["handle_r1"], box: "dm", messages: [] },
  ] as never[];

  test("an X send with only the user id finds the person's chat, whichever pair names it", () => {
    expect(chatIdFor(conversations, { platform: "twitter", userId: "1491032180553920513" })).toBe("twitter:salespsych0");
    expect(chatIdFor(conversations, { platform: "twitter", userId: "1663390258099101696" })).toBe("twitter:sage_gtm");
  });

  test("an X copy of the chat with nobody named in it is never the chat a send is gated against", () => {
    const copies = [
      { platform: "twitter", account: "a", conversationId: "20891065-1974596626342686720", with: [], box: "inbox", messages: [] },
      { platform: "twitter", account: "a", conversationId: "20891065:1974596626342686720", with: ["Handle_N1_L"], box: "xchat", messages: [] },
    ] as unknown as Parameters<typeof chatIdFor>[0];
    expect(chatIdFor(copies, { platform: "twitter", userId: "20891065" })).toBe("twitter:handle_n1_l");
    expect(chatIdFor(copies.slice(0, 1), { platform: "twitter", userId: "20891065" })).toBeNull();
  });

  test("another platform's send finds its chat by the conversation id, never another platform's chat of the same name", () => {
    expect(chatIdFor(conversations, { platform: "discord", conversationId: "1565734133609668780" })).toBe("discord:1565734133609668780");
    expect(chatIdFor(conversations, { platform: "slack", handle: "handle_r1" })).toBeNull();
  });
});

describe("the gate inside a send only grades an answer when there is something to answer", () => {
  test("their newest message is what is being answered", () => {
    expect(momentAnswered([{ fromMe: true, text: "you there", time: "2026-11-05T00:24:58Z" }, { fromMe: false, text: "Not me", time: "2026-11-05T00:26:44Z" }])).toBe("Not me");
  });

  test("when the owner's own message is the newest, the send is new news, not a reply", () => {
    expect(momentAnswered([{ fromMe: false, text: "Not me", time: "2026-11-05T00:26:44Z" }, { fromMe: true, text: "(voice note: look at my screen)", time: "2026-11-05T06:27:57Z" }])).toBe("");
    expect(momentAnswered([])).toBe("");
    expect(momentAnswered([{ fromMe: true, text: "how you gonna get people on it", time: "2026-11-05T17:47:00Z" }, { fromMe: false, text: "just put on earning sites", time: "2026-11-05T17:47:30Z" }, { fromMe: false, text: "will take a while", time: "2026-11-05T17:49:06Z" }])).toBe("just put on earning sites\nwill take a while");
  });
});
