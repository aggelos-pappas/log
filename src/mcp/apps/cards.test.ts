import { describe, expect, test } from "bun:test";
import { listUseCases } from "../server/helpers/guides.ts";
import { loadToolFacts, rankTools } from "../../useCases/router/client.ts";
import { statelessTools } from "../server/index.ts";
import { actionIssues, browserActionStates, cardIssues, styleIssues } from "../../../scripts/checks/checkCards.ts";
import { cardOfTool, cardResources, CARDS, cardResult, VIEW_META_KEY, viewOfResult, withCard } from "./cards.ts";
import { runReport } from "./report/index.ts";

const SPEC = { title: "Who messaged grace_ships", blocks: [{ type: "barChart", title: "By person", data: [{ label: "linus_k", value: 4 }, { label: "grace_ships", value: 2 }] }] };

describe("one card registry", () => {
  test("every card tool gets the card's meta and the ChatGPT keys, and a ui-only card only for an MCP Apps client", () => {
    for (const card of CARDS)
      for (const name of card.tools) {
        const meta = withCard({ name } as { name: string; _meta?: Record<string, unknown> }, true)._meta as Record<string, unknown>;
        expect((meta.ui as { resourceUri: string }).resourceUri).toBe(card.uri);
        expect(meta["openai/outputTemplate"]).toBe(card.uri);
        expect(meta["openai/toolInvocation/invoking"]).toBe(card.invoking);
        expect(cardOfTool(name)?.uri).toBe(card.uri);
      }
    expect(withCard({ name: "report" } as { name: string; _meta?: Record<string, unknown> }, false)._meta).toBeUndefined();
    expect(withCard({ name: "accountsList" } as { name: string; _meta?: Record<string, unknown> }, true)._meta).toBeUndefined();
    expect(cardResources(false).map((r) => r.uri)).toEqual(CARDS.filter((c) => !c.uiOnly).map((c) => c.uri));
  });

  test("the served tool list carries the card meta for every card tool", () => {
    const tools = statelessTools() as { name: string; _meta?: Record<string, unknown> }[];
    for (const card of CARDS) for (const name of card.tools) expect((tools.find((t) => t.name === name)?._meta?.ui as { resourceUri?: string } | undefined)?.resourceUri).toBe(card.uri);
  });
});

describe("the card gets the data, the model gets a summary", () => {
  test("a drawn report sends its rows only in _meta log/view; the model's structuredContent holds the title and row counts", async () => {
    const answer = await runReport(SPEC, true);
    expect(answer.isError).toBeFalsy();
    expect(answer.structuredContent).toEqual({ title: SPEC.title, shown: true, rows: { blocks: 1 } });
    expect(JSON.stringify(answer.structuredContent)).not.toContain("linus_k");
    expect(JSON.stringify(answer._meta?.[VIEW_META_KEY])).toContain("linus_k");
    expect(viewOfResult(answer as never)).toHaveProperty("compiled");
  });

  test("a client without MCP Apps still gets the whole view as text and structured content", async () => {
    const answer = await runReport(SPEC, false);
    expect(answer._meta).toBeUndefined();
    expect(JSON.stringify(answer.structuredContent)).toContain("linus_k");
  });

  test("cardResult and viewOfResult agree, and an older result without _meta still draws", () => {
    const result = cardResult("shown", { title: "t" }, { rows: [1, 2] });
    expect(viewOfResult(result as never)).toEqual({ rows: [1, 2] });
    expect(viewOfResult({ structuredContent: { rows: [3] } })).toEqual({ rows: [3] });
  });
});

describe("card rules", () => {
  test("every card and every browser card state meets the rules", async () => {
    const names = new Set((statelessTools() as { name: string }[]).map((t) => t.name));
    expect(await cardIssues(names)).toEqual([]);
    expect(browserActionStates().length).toBe(64);
  });

  test("too many actions, two primaries, a pill radius and an inner scroller are each caught", () => {
    const three = [{ id: "a", label: "A", primary: true }, { id: "b", label: "B", primary: true }, { id: "c", label: "C" }];
    expect(actionIssues("fake", three)).toHaveLength(2);
    expect(styleIssues("fake.css", ".pill{border-radius:999px}.list{overflow-y:auto}")).toHaveLength(2);
    expect(styleIssues("fake.css", ".pill{border-radius:var(--r)}")).toEqual([]);
  });

  test("a browser that isn't running offers no action, an owner-driven one offers Close browser", () => {
    const states = browserActionStates();
    for (const s of states.filter((s) => s.where.includes('"running":false') && s.where.includes('"closed":false'))) expect(s.actions).toEqual([]);
    const owner = states.find((s) => s.where.includes('"hasView":true,"running":true,"ownerDriven":true,"closed":false'));
    expect(owner?.actions.map((a) => a.label)).toEqual(["Close browser"]);
  });
});

describe("every card is reachable from the owner's words", () => {
  const useCases = listUseCases();
  const facts = loadToolFacts();
  for (const card of CARDS)
    test(`${card.uri}: each of its prompts ranks one of its tools in the top 3`, () => {
      for (const tool of card.tools) expect(facts.some((f) => f.name === tool)).toBe(true);
      for (const prompt of card.prompts) {
        const top = rankTools(prompt, useCases, facts).slice(0, 3).map((m) => m.name);
        expect({ prompt, hit: top.some((name) => card.tools.includes(name)) }).toEqual({ prompt, hit: true });
      }
    });
});
