import type { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { defaultDbPath, openDatabase } from "../../../../storage/schema/index.ts";
import { getState, pruneState, putState } from "../../../../storage/state/index.ts";

export const HERMES_VIEW_DIRECTIVE = "logview";
export const HERMES_APP_DIRECTIVE = "logapp";
export const HERMES_VIEW_SCOPE = "hermesView";
export const HERMES_VIEW_ID = /^[0-9a-f]{8}$/;
export const HERMES_VIEW_LIMIT = 512 * 1024;
export const HERMES_VIEW_KEPT_MS = 30 * 24 * 60 * 60 * 1000;
const HERMES_CLIENT = /^hermes/i;

export interface HermesView {
  title: string;
  subtitle?: string;
  html: string;
  text: string;
  compiled?: string;
  data?: Record<string, unknown>;
}

export function hermesClient(clientName: string | undefined): boolean {
  return typeof clientName === "string" && HERMES_CLIENT.test(clientName.trim());
}

export function hermesViewTag(id: string): string {
  return `::${HERMES_APP_DIRECTIVE}{tool="report" view="${id}"}`;
}

export function saveHermesView(view: HermesView, handle: Database = openDatabase(defaultDbPath()), now: number = Date.now()): string | null {
  const body = { ...view, savedAt: new Date(now).toISOString() };
  if (Buffer.byteLength(JSON.stringify(body), "utf8") > HERMES_VIEW_LIMIT) return null;
  pruneState(HERMES_VIEW_SCOPE, "", now - HERMES_VIEW_KEPT_MS, handle);
  let id = randomBytes(4).toString("hex");
  while (getState(HERMES_VIEW_SCOPE, id, {}, handle)) id = randomBytes(4).toString("hex");
  putState(HERMES_VIEW_SCOPE, id, body, now, handle);
  return id;
}

export function hermesViewNote(id: string): string {
  return `In Hermes Desktop and the Hermes Webapp this view draws in the chat, in log's own look, when your reply carries this line on its own: ${hermesViewTag(id)}\nPut that line in your reply once, then say what the view means in a sentence or two rather than repeating its numbers. Other Hermes chats (Telegram, the CLI) get the text above in its place.`;
}
