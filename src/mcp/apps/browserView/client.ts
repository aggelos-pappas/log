import { join } from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { relayOrigin, relayTicket, ViewerError, VIEWER_ERROR_TEXT, viewerFrame, viewerInput, viewerState, voxlOrigins } from "../../../browser/viewer/index.ts";
import type { ViewerView } from "../../../browser/viewer/index.ts";
import { browserViewJson, browserViewLocation, browserViewText } from "../../../cli/browser/index.ts";
import type { BrowserViewLocation } from "../../../cli/browser/index.ts";
import { SIGN_IN_TOOL } from "../signIn/types.ts";
import { appResourceMeta, appToolMeta } from "../meta.ts";
import { widgetHtml } from "./helpers/index.ts";
import { APP_TOOLS, BROWSER_DIRECTIVE, BROWSER_VIEW_DONE_TOOL, BROWSER_VIEW_FRAME_TOOL, BROWSER_VIEW_INPUT_TOOL, BROWSER_VIEW_STREAM_TOOL, BROWSER_VIEW_TOOL, BROWSER_VIEW_URI, MCP_APP_MIME_TYPE, UI_EXTENSION_ID } from "./types.ts";
import type { AppToolDefinition, AppToolName, BrowserViewCsp } from "./types.ts";

const ACCOUNT = { type: "string", description: "The account whose browser this is" };
const GENERATION = { type: "string", description: "The viewer generation from browserView: a restarted browser has a new one and older input is refused" };
const LOOPBACK_BINDS = new Set(["127.0.0.1", "localhost", "::1"]);

async function closeOwnerBrowser(account: string): Promise<boolean> {
  const root = join(import.meta.dir, "..", "..", "..", "..");
  const run = Bun.spawn([process.execPath, join(root, "bin", "log.ts"), "inspect", "do", "stop", "--account", account], { cwd: root, stdout: "ignore", stderr: "ignore", windowsHide: true });
  return (await run.exited) === 0;
}

export const appToolDeps = { state: viewerState, frame: viewerFrame, input: viewerInput, ticket: relayTicket, close: closeOwnerBrowser };
export const BROWSER_VIEW_DESCRIPTION = "An account's live browser, streamed from the page so a person can watch it and sign in without leaving the chat";

export function uiCapable(capabilities: unknown): boolean {
  const extensions = (capabilities as { extensions?: Record<string, { mimeTypes?: unknown }> } | undefined)?.extensions;
  const ui = extensions?.[UI_EXTENSION_ID];
  return Array.isArray(ui?.mimeTypes) && ui.mimeTypes.includes(MCP_APP_MIME_TYPE);
}

export function httpLocation(host: string, authenticated: boolean): BrowserViewLocation {
  return LOOPBACK_BINDS.has(host) && !authenticated ? "local" : "remote";
}

export function settleLocation(location: BrowserViewLocation, env: Record<string, string | undefined> = process.env): BrowserViewLocation {
  if (env.LOG_BROWSER_VIEW_LOCATION !== "local" && env.LOG_BROWSER_VIEW_LOCATION !== "remote") env.LOG_BROWSER_VIEW_LOCATION = location;
  return browserViewLocation(env);
}

function appTool(name: AppToolName, title: string, description: string, properties: Record<string, unknown>, required: string[], readOnly: boolean): AppToolDefinition {
  return {
    name,
    title,
    description,
    inputSchema: { type: "object", properties, required, additionalProperties: false },
    annotations: { title, readOnlyHint: readOnly, destructiveHint: false, idempotentHint: readOnly, openWorldHint: !readOnly },
    _meta: appToolMeta(BROWSER_VIEW_URI, { visibility: ["app"] }) as AppToolDefinition["_meta"],
  };
}

export function appTools(): AppToolDefinition[] {
  return [
    appTool(BROWSER_VIEW_STREAM_TOOL, "Browser view stream", "For the browser view only, never the model: on this machine a one-time loopback URL of the page screencast; from a remote runtime the voxl stream descriptor (its URL carries voxl's read-only password).", { account: ACCOUNT, generation: GENERATION }, ["account", "generation"], true),
    appTool(BROWSER_VIEW_FRAME_TOOL, "Browser view frame", "The newest page screencast frame (a screenshot when there is none) and its revision, for the browser view when it cannot stream. after: the seq of the frame the view has, so the answer waits briefly for a newer one. withState adds the current view.", { account: ACCOUNT, generation: GENERATION, after: { type: "integer", description: "The seq of the frame the view already drew" }, withState: { type: "boolean", description: "Also return the current view" } }, ["account", "generation"], true),
    appTool(
      BROWSER_VIEW_INPUT_TOOL,
      "Browser view input",
      "The person's own click, text, key or scroll in the live browser, for the browser view only. It reaches the page only while the page still asks for sign-in and the revision still matches, and it is replayed as a recorded step. It never goes through voxl.",
      {
        account: ACCOUNT,
        generation: GENERATION,
        revision: { type: "string", description: "The revision of the page the person acted on" },
        event: { type: "object", description: "{type:'click',x,y} in page pixels, {type:'text',text}, {type:'key',key} or {type:'scroll',deltaY}" },
      },
      ["account", "generation", "revision", "event"],
      false,
    ),
    appTool(BROWSER_VIEW_DONE_TOOL, "Browser view state", "Reads the page again: the view polls it, and calls it when the person says they are finished, to say whether the page still needs them. With close, the owner closes the browser he opened: its session is saved and the browser stops.", { account: ACCOUNT, close: { type: "boolean", description: "Close the browser the owner opened to drive it" } }, ["account"], false),
  ];
}

export function isAppTool(name: string): name is AppToolName {
  return (APP_TOOLS as readonly string[]).includes(name);
}


function refusal(code: string, message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: `${code}: ${message}` }], structuredContent: { error: code, message } };
}

function failed(error: unknown): CallToolResult {
  if (error instanceof ViewerError) return refusal(error.code, VIEWER_ERROR_TEXT[error.code]);
  return refusal("browserViewerUnavailable", VIEWER_ERROR_TEXT.browserViewerUnavailable);
}

function accountOf(input: Record<string, unknown>): string | null {
  return typeof input.account === "string" && /^[A-Za-z0-9_.@+-]{1,128}$/.test(input.account) ? input.account : null;
}

export async function runAppTool(name: AppToolName, input: Record<string, unknown> | undefined, allowed: boolean, location: BrowserViewLocation = browserViewLocation()): Promise<CallToolResult> {
  if (!allowed) return refusal("browserViewAppOnly", "This tool is called by the browser view in an MCP Apps host, not by the model.");
  const fields = input ?? {};
  const account = accountOf(fields);
  if (!account) return refusal("browserInputInvalid", "account is required");
  try {
    if (name === BROWSER_VIEW_STREAM_TOOL) {
      const view = await appToolDeps.state(account);
      if (typeof fields.generation !== "string" || fields.generation !== view.generation) return refusal("browserGenerationChanged", VIEWER_ERROR_TEXT.browserGenerationChanged);
      if (location === "local") {
        const cast = await appToolDeps.ticket(account, fields.generation);
        if (!cast) return refusal("browserStreamUnavailable", "The loopback stream could not start; the view pulls frames.");
        return { content: [{ type: "text", text: `page screencast for ${account}` }], structuredContent: { generation: view.generation, stream: { kind: "cast", url: cast.url, expiresIn: cast.expiresIn } } };
      }
      if (!view.stream) return refusal("browserStreamUnavailable", "This browser has no voxl stream; the view pulls frames.");
      return { content: [{ type: "text", text: `voxl stream for ${account}` }], structuredContent: { generation: view.generation, stream: view.stream } };
    }
    if (name === BROWSER_VIEW_FRAME_TOOL) {
      const frame = await appToolDeps.frame(account, fields.generation, fields.after);
      const view = fields.withState === true ? browserViewJson(await appToolDeps.state(account), location) : null;
      return { content: [{ type: "text", text: `frame ${frame.revision.slice(0, 12)}` }], structuredContent: { ...frame, view } };
    }
    if (name === BROWSER_VIEW_INPUT_TOOL) {
      const view = await appToolDeps.input(account, { generation: fields.generation, revision: fields.revision, event: fields.event });
      return { content: [{ type: "text", text: `${view.account}: ${view.phase}` }], structuredContent: { view: browserViewJson(view, location) } };
    }
    const view = await appToolDeps.state(account);
    if (fields.close === true) {
      if (!view.ownerDriven) return refusal("browserCloseRefused", "Only a browser the owner opened to drive can be closed from the view.");
      const closed = await appToolDeps.close(account);
      return { content: [{ type: "text", text: closed ? `${account}: browser closed` : `${account}: the browser did not close` }], structuredContent: { view: null, closed } };
    }
    return { content: [{ type: "text", text: browserViewText(view, location) }], structuredContent: { view: browserViewJson(view, location), done: !view.needsHuman && view.phase !== "busy" } };
  } catch (error) {
    return failed(error);
  }
}

export function browserViewCsp(env: Record<string, string | undefined> = process.env, location: BrowserViewLocation = browserViewLocation(env)): BrowserViewCsp {
  const voxl = voxlOrigins(env.LOG_VOXL_URL?.trim());
  return { connectDomains: location === "local" ? [...voxl, relayOrigin(env)] : voxl, resourceDomains: [] };
}

export function browserViewResource() {
  return { uri: BROWSER_VIEW_URI, name: "Live browser", description: BROWSER_VIEW_DESCRIPTION, mimeType: MCP_APP_MIME_TYPE };
}

export async function readBrowserViewResource(env: Record<string, string | undefined> = process.env) {
  return {
    contents: [{ uri: BROWSER_VIEW_URI, mimeType: MCP_APP_MIME_TYPE, text: await widgetHtml(), _meta: appResourceMeta(browserViewCsp(env), true, BROWSER_VIEW_DESCRIPTION) }],
  };
}

export function accountOfArgs(input: Record<string, unknown> | undefined): string | null {
  return input ? accountOf(input) : null;
}

export function browserDirective(account: string): string {
  return `::${BROWSER_DIRECTIVE}{account="${account}"}`;
}

export function hermesBrowserLine(account: string): string {
  return `In Hermes, put this line on its own line in your reply so the person sees the live browser inline: ${browserDirective(account)}`;
}

export function withBrowserView(result: CallToolResult, view: ViewerView, location: BrowserViewLocation = browserViewLocation(), hermes: boolean = false): CallToolResult {
  const structured = (result.structuredContent ?? {}) as Record<string, unknown>;
  const content = hermes && view.generation ? [...(result.content ?? []), { type: "text" as const, text: hermesBrowserLine(view.account) }] : result.content;
  return { ...result, content, structuredContent: { ...structured, json: browserViewJson(view, location) } };
}
