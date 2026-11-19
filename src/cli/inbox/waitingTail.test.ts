import { describe, expect, test } from "bun:test";
import { waitingTotals, withTail } from "./index.ts";
import type { LastWord } from "../../inbox/lastWord/index.ts";

const word = (over: Partial<LastWord>): LastWord => ({ platform: "discord", account: "discordAccount", kind: "dm", personKey: "1", conversationIds: ["1"], with: "grace_ships", lastAt: "2026-11-19T13:33:51Z", lastFromMe: false, lastText: "yo", theyReacted: null, youReactedOnly: false, waiting: true, followUp: false, ...over });

describe("inbox waiting stays small: the last n messages per chat and totals by kind and month", () => {
  test("--tail keeps only each chat's last n messages, oldest first, whether they came with the chat or are read", () => {
    const held = { ...word({}), messages: [3, 1, 2, 5, 4].map((i) => ({ at: `2026-11-19T13:0${i}:00Z`, ms: Date.parse(`2026-11-19T13:0${i}:00Z`), text: `m${i}` })) } as LastWord;
    expect((withTail([held], 2)[0] as unknown as { messages: { text: string }[] }).messages.map((m) => m.text)).toEqual(["m4", "m5"]);
    const read = withTail([word({ with: "linus_k" })], 3, (_w, n) => Array.from({ length: n }, (_, i) => ({ at: `2026-11-19T13:0${i}:00Z`, fromMe: i === 0, from: "linus_k", text: `r${i}` })));
    expect((read[0] as unknown as { messages: unknown[] }).messages).toHaveLength(3);
    expect(withTail([word({})], undefined)[0]).not.toHaveProperty("messages");
  });

  test("totals count the waiting chats by platform, kind and month of their last message", () => {
    const totals = waitingTotals([word({}), word({ kind: "group", lastAt: "2026-10-02T00:00:00Z" }), word({ platform: "twitter", lastAt: "2026-10-30T00:00:00Z" })], [word({ followUp: true })]);
    expect(totals).toEqual({ waiting: 3, followUps: 1, byPlatform: { discord: 2, twitter: 1 }, byKind: { dm: 2, group: 1 }, byMonth: { "2026-11": 1, "2026-10": 2 } });
  });
});
