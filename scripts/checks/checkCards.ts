import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_MAX_ACTIONS, CARD_MAX_PRIMARY_ACTIONS, CARDS } from "../../src/mcp/apps/cards.ts";
import type { AppCard, CardResource } from "../../src/mcp/apps/cards.ts";
import { cardActions } from "../../src/mcp/apps/browserView/widget/viewModel.ts";
import type { FrameAction } from "../../src/mcp/apps/browserView/widget/viewModel.ts";

const ROOT = join(import.meta.dir, "..", "..");

export const CARD_STYLE_FILES = ["src/mcp/apps/browserView/widget/viewStyle.ts", "src/mcp/apps/browserView/helpers/style.ts", "src/mcp/apps/report/view/kit.css"];

export function metaIssues(card: AppCard, resource: CardResource, toolNames: Set<string>): string[] {
  const issues: string[] = [];
  if (!card.uri.startsWith("ui://log/")) issues.push(`${card.uri}: a card's uri starts with ui://log/`);
  if (card.description.length < 20) issues.push(`${card.uri}: the description says what the card shows, so the model doesn't narrate it`);
  if (!card.invoking || !card.invoked) issues.push(`${card.uri}: invoking and invoked are the short lines shown while its tool runs`);
  for (const tool of card.tools) if (!toolNames.has(tool)) issues.push(`${card.uri}: draws for ${tool}, which no client is offered`);
  const content = resource.contents[0];
  if (!content || content.uri !== card.uri) issues.push(`${card.uri}: the resource reads back under its own uri`);
  const meta = (content?._meta ?? {}) as Record<string, unknown>;
  const ui = meta.ui as { csp?: unknown } | undefined;
  if (!ui?.csp) issues.push(`${card.uri}: the resource declares its CSP in _meta.ui.csp`);
  if (typeof meta["openai/widgetDescription"] !== "string") issues.push(`${card.uri}: the resource carries openai/widgetDescription`);
  return issues;
}

export function actionIssues(where: string, actions: FrameAction[]): string[] {
  const issues: string[] = [];
  if (actions.length > CARD_MAX_ACTIONS) issues.push(`${where}: ${actions.length} actions, a card shows at most ${CARD_MAX_ACTIONS}`);
  const primary = actions.filter((action) => action.primary).length;
  if (primary > CARD_MAX_PRIMARY_ACTIONS) issues.push(`${where}: ${primary} primary actions, a card has at most ${CARD_MAX_PRIMARY_ACTIONS}`);
  return issues;
}

export function styleIssues(file: string, css: string): string[] {
  const issues: string[] = [];
  for (const match of css.matchAll(/border-radius:\s*(9{3,}px|9{3,}rem)|rounded-full/g)) issues.push(`${file}: "${match[0]}" is a fully rounded pill; use the radius tokens`);
  for (const match of css.matchAll(/overflow(-y)?:\s*(auto|scroll|overlay)/g)) issues.push(`${file}: "${match[0]}" scrolls inside the card; a card sizes to its content`);
  return issues;
}

export function browserActionStates(): { where: string; actions: FrameAction[] }[] {
  const out: { where: string; actions: FrameAction[] }[] = [];
  for (const hasView of [false, true])
    for (const running of [false, true])
    for (const ownerDriven of [false, true])
      for (const closed of [false, true])
        for (const finished of [false, true])
          for (const pending of [false, true]) out.push({ where: `browserView ${JSON.stringify({ hasView, running, ownerDriven, closed, finished, pending })}`, actions: cardActions({ hasView, running, ownerDriven, closed, finished, pending }) });
  return out;
}

export async function cardIssues(toolNames: Set<string>, read: (rel: string) => string = (rel) => readFileSync(join(ROOT, rel), "utf8")): Promise<string[]> {
  const issues: string[] = [];
  for (const card of CARDS) issues.push(...metaIssues(card, await card.read(), toolNames));
  for (const state of browserActionStates()) issues.push(...actionIssues(state.where, state.actions));
  for (const file of CARD_STYLE_FILES) issues.push(...styleIssues(file, read(file)));
  return issues;
}

if (import.meta.main) {
  const { statelessTools } = await import("../../src/mcp/server/index.ts");
  const names = new Set(statelessTools().map((tool) => String(tool.name)));
  const issues = await cardIssues(names);
  if (issues.length) {
    console.error(`check:cards: ${issues.length} card rule(s) broken`);
    for (const issue of issues) console.error(`  ${issue}`);
    process.exit(1);
  }
  console.log(`check:cards: ${CARDS.length} cards meet the card rules (meta, at most ${CARD_MAX_ACTIONS} actions with ${CARD_MAX_PRIMARY_ACTIONS} primary, no pills, no inner scroll)`);
  process.exit(0);
}
