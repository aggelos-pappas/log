import { VIEWER_ERRORS, ViewerError, viewerFrame, viewerInput, viewerState } from "../../../browser/viewer/index.ts";
import type { ViewerErrorCode } from "../../../browser/viewer/index.ts";
import { browserCheckStream } from "../../browserCheck/index.ts";
import { loadConnectionsView } from "../../connections/index.ts";
import type { ConnectionAccount } from "../../connections/index.ts";

export const CONSOLE_BROWSER_PATHS = ["/api/console/browser", "/api/console/browser/frame", "/api/console/browser/input", "/api/console/browserCheck/stream"] as const;

const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const ACCOUNT = /^[A-Za-z0-9_.@+-]{1,128}$/;
const MAX_BODY = 16_384;

function refusal(code: string, status: number): Response {
  return Response.json({ error: code }, { status, headers: HEADERS });
}

function statusOf(code: ViewerErrorCode): number {
  if (code === "browserMissing") return 404;
  if (code === "browserViewerUnavailable") return 503;
  return 409;
}

function failed(error: unknown): Response {
  if (error instanceof ViewerError && (VIEWER_ERRORS as readonly string[]).includes(error.code)) return refusal(error.code, statusOf(error.code));
  return refusal("browserViewerUnavailable", 503);
}

export function accountOf(value: unknown): string | null {
  return typeof value === "string" && ACCOUNT.test(value) ? value : null;
}

async function bodyOf(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("Content-Length") ?? "0");
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BODY) return null;
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return null;
  try {
    const parsed = (await request.json()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function consoleBrowserAnswer(url: URL, request: Request): Promise<Response> | null {
  if (!(CONSOLE_BROWSER_PATHS as readonly string[]).includes(url.pathname)) return null;
  return answer(url, request);
}

export const consoleStreamDeps: { account: (accountId: string) => ConnectionAccount | null } = {
  account: (accountId) => loadConnectionsView().accounts.find((item) => item.id === accountId) ?? null,
};

async function streamAnswer(url: URL, request: Request): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "consoleMethodNotAllowed" }, { status: 405, headers: { ...HEADERS, Allow: "GET" } });
  if (request.headers.get("x-log-console") !== "1") return refusal("consoleMethodNotAllowed", 405);
  const accountId = url.searchParams.get("accountId") ?? "";
  const account = /^[A-Za-z0-9_-]{1,128}$/.test(accountId) ? consoleStreamDeps.account(accountId) : null;
  if (!account) return refusal("accountNotFound", 404);
  try {
    const upstream = await browserCheckStream(account, url.searchParams.get("generation"), request.signal);
    return new Response(upstream.body, { headers: { ...HEADERS, "Content-Type": upstream.headers.get("content-type") ?? "", "X-Log-Browser-Generation": upstream.headers.get("X-Log-Browser-Generation") ?? "" } });
  } catch (error) {
    return failed(error);
  }
}

async function answer(url: URL, request: Request): Promise<Response> {
  if (url.pathname === "/api/console/browserCheck/stream") return streamAnswer(url, request);
  if (url.pathname === "/api/console/browser/input") {
    if (request.method !== "POST") return Response.json({ error: "consoleMethodNotAllowed" }, { status: 405, headers: { ...HEADERS, Allow: "POST" } });
    const body = await bodyOf(request);
    const account = accountOf(body?.account);
    if (!body || !account) return refusal("browserInputInvalid", 400);
    try {
      return Response.json({ schemaVersion: 1, view: await viewerInput(account, { generation: body.generation, revision: body.revision, event: body.event }) }, { headers: HEADERS });
    } catch (error) {
      return failed(error);
    }
  }
  if (request.method !== "GET") return Response.json({ error: "consoleMethodNotAllowed" }, { status: 405, headers: { ...HEADERS, Allow: "GET" } });
  const account = accountOf(url.searchParams.get("account"));
  if (!account) return refusal("browserAccountInvalid", 400);
  if (url.pathname === "/api/console/browser") return Response.json({ schemaVersion: 1, view: await viewerState(account) }, { headers: HEADERS });
  try {
    const frame = await viewerFrame(account, url.searchParams.get("generation"));
    return new Response(Buffer.from(frame.data, "base64"), { headers: { ...HEADERS, "Content-Type": frame.mimeType, "X-Log-Browser-Generation": frame.generation, "X-Log-Browser-Revision": frame.revision } });
  } catch (error) {
    return failed(error);
  }
}
