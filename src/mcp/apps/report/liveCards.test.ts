import { describe, expect, test } from "bun:test";
import { liveCardKey, liveCards, windowLiveCards } from "./view/liveCards.ts";
import type { LiveCard } from "./view/liveCards.ts";

const byPosition = (a: unknown, b: unknown) => (a as number) < (b as number);

function card(key: string, position: number, seen: Record<number, boolean>): LiveCard {
  return { key, anchor: position, setLive: (live) => (seen[position] = live) };
}

describe("one live ::logbrowser card per account in a Hermes window", () => {
  test("a newer card for the same account takes the live view and the older one collapses", () => {
    const cards = liveCards(byPosition);
    const seen: Record<number, boolean> = {};
    cards.join(card("browserView|grace_ships", 1, seen));
    expect(seen).toEqual({ 1: true });
    cards.join(card("browserView|grace_ships", 2, seen));
    expect(seen).toEqual({ 1: false, 2: true });
    cards.join(card("browserView|grace_ships", 3, seen));
    expect(seen).toEqual({ 1: false, 2: false, 3: true });
  });

  test("an older card remounting while scrolling back stays collapsed", () => {
    const cards = liveCards(byPosition);
    const seen: Record<number, boolean> = {};
    const leave = cards.join(card("browserView|grace_ships", 1, seen));
    cards.join(card("browserView|grace_ships", 2, seen));
    leave();
    delete seen[1];
    cards.join(card("browserView|grace_ships", 1, seen));
    expect(seen).toEqual({ 1: false, 2: true });
  });

  test("when the live card goes away the latest remaining card takes over", () => {
    const cards = liveCards(byPosition);
    const seen: Record<number, boolean> = {};
    cards.join(card("browserView|grace_ships", 1, seen));
    const leave = cards.join(card("browserView|grace_ships", 2, seen));
    leave();
    expect(seen[1]).toBe(true);
  });

  test("show it here picks an older card until a newer one mounts", () => {
    const cards = liveCards(byPosition);
    const seen: Record<number, boolean> = {};
    const first = card("browserView|grace_ships", 1, seen);
    cards.join(first);
    cards.join(card("browserView|grace_ships", 2, seen));
    cards.pick(first);
    expect(seen).toEqual({ 1: true, 2: false });
    cards.join(card("browserView|grace_ships", 3, seen));
    expect(seen).toEqual({ 1: false, 2: false, 3: true });
  });

  test("cards for different accounts stay live side by side", () => {
    const cards = liveCards(byPosition);
    const seen: Record<number, boolean> = {};
    cards.join(card("browserView|grace_ships", 1, seen));
    cards.join(card("browserView|linus_k", 2, seen));
    expect(seen).toEqual({ 1: true, 2: true });
  });

  test("only browserView cards with an account are keyed; other log apps are left alone", () => {
    expect(liveCardKey({ tool: "browserView", args: { account: "grace_ships" } })).toBe("browserView|grace_ships");
    expect(liveCardKey({ tool: "report", args: { account: "grace_ships" } })).toBeNull();
    expect(liveCardKey({ tool: "browserView", args: {} })).toBeNull();
    expect(liveCardKey(null)).toBeNull();
  });

  test("every card in one window shares one registry", () => {
    const scope: Record<string, unknown> = {};
    expect(windowLiveCards(scope)).toBe(windowLiveCards(scope));
  });
});
