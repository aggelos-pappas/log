import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getState } from "../../../storage/state/index.ts";
import { HERMES_VIEW_SCOPE } from "../report/helpers/hermesView.ts";
import { LOG_APP_ARGS_LIMIT, LOG_APP_CLIENT, LOG_APP_TOOL, LOG_APP_URI_PREFIX, LOG_APP_VIEW_ID } from "./types.ts";
import type { LogAppAnswer, LogAppCsp, LogAppDeps, LogAppRefusal, LogAppRequest, LogAppResource, LogAppStoredView, LogAppTool } from "./types.ts";

const CATALOG_RUNNERS = new Set(["logCall"]);
const server = () => import("../../server/index.ts");

const TOOLS_KEPT_MS = 60_000;
let listed: { at: number; tools: Promise<LogAppTool[]> } | null = null;

export function keptTools(list: () => Promise<LogAppTool[]>, now: number = Date.now()): Promise<LogAppTool[]> {
  if (!listed || now - listed.at > TOOLS_KEPT_MS) {
    const tools = list();
    listed = { at: now, tools };
    tools.catch(() => {
      if (listed?.tools === tools) listed = null;
    });
  }
  return listed.tools;
}

export const logAppDeps: LogAppDeps = {
  tools: () => keptTools(async () => (await server()).statelessTools() as unknown as LogAppTool[]),
  read: async (uri) => (await (await server()).statelessLogHandlers({}, { logDir: null, watchFlows: false }).readResource(uri, { version: "", capabilities: {}, clientInfo: { name: LOG_APP_CLIENT }, inputResponses: null, requestState: null })) as Awaited<ReturnType<LogAppDeps["read"]>>,
  call: async (name, args) => (await server()).runToolCall(name, args, {}, () => {}, undefined, undefined, true, undefined, false, "stateless", LOG_APP_CLIENT),
  view: (id) => getState<LogAppStoredView>(HERMES_VIEW_SCOPE, id)?.body ?? null,
};

const refuse = (error: LogAppRefusal, message: string): LogAppAnswer => ({ ok: false, error, message });

export function appUriOf(tool: LogAppTool | undefined): string | null {
  const uri = (tool?._meta?.ui as { resourceUri?: unknown } | undefined)?.resourceUri;
  return typeof uri === "string" && uri.startsWith(LOG_APP_URI_PREFIX) ? uri : null;
}

export function appArgsOf(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return JSON.stringify(value).length <= LOG_APP_ARGS_LIMIT ? (value as Record<string, unknown>) : null;
}

function cspOf(meta: Record<string, unknown> | undefined): LogAppCsp {
  const csp = (meta?.ui as { csp?: Partial<LogAppCsp> } | undefined)?.csp ?? {};
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((d): d is string => typeof d === "string" && /^(https?|wss?):\/\/[^\s;'"]+$/.test(d)) : []);
  return { connectDomains: list(csp.connectDomains), resourceDomains: list(csp.resourceDomains) };
}

export function appCallRefusal(uri: string, name: string, tools: LogAppTool[]): string | null {
  if (!LOG_APP_TOOL.test(name)) return "the view asked for a tool with no valid name";
  if (CATALOG_RUNNERS.has(name)) return `${name} runs other tools, so a view can't call it`;
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `${name} is not one of log's tools`;
  if (appUriOf(tool) === uri) return null;
  if (tool.annotations?.readOnlyHint === true) return null;
  return `${name} is neither a read tool nor one of this view's own tools; a send goes through the chat and its gates, never from a view`;
}

async function viewTool(tool: string, deps: LogAppDeps): Promise<{ tools: LogAppTool[]; uri: string } | LogAppAnswer> {
  if (!LOG_APP_TOOL.test(tool)) return refuse("logAppInvalid", "tool must be a log tool name");
  const tools = await deps.tools();
  const uri = appUriOf(tools.find((t) => t.name === tool));
  if (!uri) return refuse("logAppUnknown", `${tool} has no view of log's own (no ${LOG_APP_URI_PREFIX} resourceUri)`);
  return { tools, uri };
}

export async function appResource(tool: string, deps: LogAppDeps = logAppDeps): Promise<LogAppAnswer> {
  const found = await viewTool(tool, deps);
  if ("ok" in found) return found;
  const read = await deps.read(found.uri);
  const content = read?.contents?.find((c) => c.uri === found.uri) ?? read?.contents?.[0];
  if (!content || typeof content.text !== "string") return refuse("logAppUnknown", `${found.uri} could not be read`);
  const resource: LogAppResource = { tool, uri: found.uri, html: content.text, csp: cspOf(content._meta) };
  return { ok: true, resource };
}

function storedResult(stored: LogAppStoredView): CallToolResult | null {
  if (typeof stored.compiled !== "string" || typeof stored.title !== "string") return null;
  const data = stored.data && typeof stored.data === "object" ? (stored.data as Record<string, unknown>) : {};
  const subtitle = typeof stored.subtitle === "string" ? { subtitle: stored.subtitle } : {};
  return { content: [{ type: "text", text: typeof stored.text === "string" ? stored.text : stored.title }], structuredContent: { title: stored.title, ...subtitle, compiled: stored.compiled, data } };
}

export async function appResult(tool: string, args: unknown, view: unknown, deps: LogAppDeps = logAppDeps): Promise<LogAppAnswer> {
  const found = await viewTool(tool, deps);
  if ("ok" in found) return found;
  if (typeof view === "string") {
    if (!LOG_APP_VIEW_ID.test(view)) return refuse("logAppInvalid", "view must be an 8-hex view id");
    const stored = deps.view(view);
    const result = stored ? storedResult(stored) : null;
    return result ? { ok: true, result } : refuse("logAppViewMissing", `view ${view} is not kept (views are kept 30 days), so ask for it again`);
  }
  const given = appArgsOf(args);
  if (!given) return refuse("logAppInvalid", `args must be one JSON object under ${LOG_APP_ARGS_LIMIT} characters`);
  return { ok: true, result: await deps.call(tool, given) };
}

export async function appCall(tool: string, name: unknown, args: unknown, deps: LogAppDeps = logAppDeps): Promise<LogAppAnswer> {
  const found = await viewTool(tool, deps);
  if ("ok" in found) return found;
  const asked = typeof name === "string" ? name : "";
  const refusal = appCallRefusal(found.uri, asked, found.tools);
  if (refusal) return { ok: true, result: { isError: true, content: [{ type: "text", text: `logAppToolRefused: ${refusal}` }], structuredContent: { error: "logAppToolRefused", message: refusal } } };
  const given = appArgsOf(args);
  if (!given) return refuse("logAppInvalid", `arguments must be one JSON object under ${LOG_APP_ARGS_LIMIT} characters`);
  return { ok: true, result: await deps.call(asked, given) };
}

export async function answerAppRequest(request: LogAppRequest, deps: LogAppDeps = logAppDeps): Promise<LogAppAnswer> {
  try {
    if (request.op === "resource") return await appResource(request.tool, deps);
    if (request.op === "result") return await appResult(request.tool, request.args, request.view, deps);
    if (request.op === "call") return await appCall(request.tool, request.name, request.arguments, deps);
    return refuse("logAppInvalid", "op must be resource, result or call");
  } catch (error) {
    return refuse("logAppUnknown", error instanceof Error ? error.message : String(error));
  }
}
