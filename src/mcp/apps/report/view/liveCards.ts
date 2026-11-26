export { MOVED_TITLE, SHOW_HERE } from "../../browserView/widget/viewModel.ts";

export const LIVE_CARD_TOOL = "browserView";

export interface LiveCard {
  key: string;
  anchor: unknown;
  setLive(live: boolean): void;
}

export type Before = (a: unknown, b: unknown) => boolean;

export interface LiveCards {
  join(card: LiveCard): () => void;
  pick(card: LiveCard): void;
}

export function liveCardKey(directive: { tool: string; args: Record<string, unknown> } | null): string | null {
  const account = directive?.args.account;
  return directive?.tool === LIVE_CARD_TOOL && typeof account === "string" && account ? `${LIVE_CARD_TOOL}|${account}` : null;
}

export function liveCards(before: Before): LiveCards {
  const groups = new Map<string, LiveCard[]>();
  const picked = new Map<string, LiveCard>();
  const shown = new Map<LiveCard, boolean>();
  const latest = (list: LiveCard[]) => list.reduce((last, card) => (before(last.anchor, card.anchor) ? card : last));
  const settle = (key: string) => {
    const list = groups.get(key) ?? [];
    if (!list.length) return;
    const pick = picked.get(key);
    const winner = pick && list.includes(pick) ? pick : latest(list);
    for (const card of list) {
      const live = card === winner;
      if (shown.get(card) === live) continue;
      shown.set(card, live);
      card.setLive(live);
    }
  };
  return {
    join(card) {
      const list = [...(groups.get(card.key) ?? []), card];
      groups.set(card.key, list);
      if (latest(list) === card) picked.delete(card.key);
      settle(card.key);
      return () => {
        const rest = (groups.get(card.key) ?? []).filter((other) => other !== card);
        if (rest.length) groups.set(card.key, rest);
        else groups.delete(card.key);
        shown.delete(card);
        if (picked.get(card.key) === card) picked.delete(card.key);
        settle(card.key);
      };
    },
    pick(card) {
      picked.set(card.key, card);
      settle(card.key);
    },
  };
}

type Positioned = { compareDocumentPosition(other: Positioned): number };

function nodeOf(value: unknown): Positioned | null {
  const held = value && typeof value === "object" && "current" in value ? (value as { current: unknown }).current : value;
  return (held as Positioned | null) ?? null;
}

export function documentBefore(a: unknown, b: unknown): boolean {
  const first = nodeOf(a);
  const second = nodeOf(b);
  if (!first || !second || typeof first.compareDocumentPosition !== "function") return false;
  return Boolean(first.compareDocumentPosition(second) & 4);
}

const WINDOW_KEY = "logLiveCards";

export function windowLiveCards(scope: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): LiveCards {
  const found = scope[WINDOW_KEY] as LiveCards | undefined;
  if (found) return found;
  const made = liveCards(documentBefore);
  scope[WINDOW_KEY] = made;
  return made;
}
