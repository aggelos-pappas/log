import { describe, expect, test } from "bun:test";
import { liveClaim, newerClaim, streamEnded } from "./widget/liveClaim.ts";
import type { Claim, ClaimLink } from "./widget/liveClaim.ts";

function hub() {
  const listeners = new Set<{ owner: number; handler: (message: unknown) => void }>();
  let next = 0;
  return {
    link(): ClaimLink {
      const owner = ++next;
      return {
        post: (message) => {
          for (const listener of [...listeners]) if (listener.owner !== owner) listener.handler(structuredClone(message));
        },
        listen: (handler) => {
          const entry = { owner, handler };
          listeners.add(entry);
          return () => listeners.delete(entry);
        },
      };
    },
  };
}

describe("one live browser view per account across widgets", () => {
  test("a newer view of the same account moves the older one away and leaves the newer live", () => {
    const channel = hub();
    const moves: string[] = [];
    const older = liveClaim({ account: "grace_ships", id: "a", born: 100 }, channel.link(), (moved) => moves.push(`older ${moved}`));
    const newer = liveClaim({ account: "grace_ships", id: "b", born: 200 }, channel.link(), (moved) => moves.push(`newer ${moved}`));
    expect(older.moved).toBe(true);
    expect(newer.moved).toBe(false);
    expect(moves).toEqual(["older true"]);
  });

  test("an older view mounting late learns at once that a newer one is live", () => {
    const channel = hub();
    const newer = liveClaim({ account: "grace_ships", id: "b", born: 200 }, channel.link(), () => undefined);
    const older = liveClaim({ account: "grace_ships", id: "a", born: 100 }, channel.link(), () => undefined);
    expect(older.moved).toBe(true);
    expect(newer.moved).toBe(false);
  });

  test("another account's view never moves this one", () => {
    const channel = hub();
    const first = liveClaim({ account: "grace_ships", id: "a", born: 100 }, channel.link(), () => undefined);
    const second = liveClaim({ account: "linus_k", id: "b", born: 200 }, channel.link(), () => undefined);
    expect(first.moved).toBe(false);
    expect(second.moved).toBe(false);
  });

  test("show it here takes the live view back and the other view moves away", () => {
    const channel = hub();
    const older = liveClaim({ account: "grace_ships", id: "a", born: 100 }, channel.link(), () => undefined);
    const newer = liveClaim({ account: "grace_ships", id: "b", born: 200 }, channel.link(), () => undefined);
    older.reclaim(300);
    expect(older.moved).toBe(false);
    expect(newer.moved).toBe(true);
  });

  test("ties on the mount time are broken by id so exactly one stays live", () => {
    const a: Claim = { account: "grace_ships", id: "a", born: 5 };
    const b: Claim = { account: "grace_ships", id: "b", born: 5 };
    expect(newerClaim(b, a)).toBe(true);
    expect(newerClaim(a, b)).toBe(false);
  });
});

describe("the cast reader", () => {
  test("a part the viewer sends when a newer view replaced this stream reads as replaced, frames never do", () => {
    expect(streamEnded({ "content-type": "application/json", "x-log-stream-ended": "replaced" })).toBe("replaced");
    expect(streamEnded({ "content-type": "image/jpeg", "content-length": "10" })).toBeNull();
    expect(streamEnded({ "content-type": "application/json" })).toBeNull();
  });
});
