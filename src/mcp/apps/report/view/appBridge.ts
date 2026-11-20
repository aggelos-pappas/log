export const APP_DIRECTIVE = "logapp";
export const APP_PROTOCOL_VERSION = "2026-01-26";
export const APP_HOST_INFO = { name: "Hermes", version: "log" } as const;
export const APP_MAX_HEIGHT = 2000;
export const APP_MESSAGE_GAP_MS = 2000;
export const APP_SANDBOX = ["allow", "scripts"].join("-");
const TOOL = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const VIEW = /^[0-9a-f]{8}$/;
const ACCOUNT = /^[A-Za-z0-9_.@+-]{1,128}$/;
const ARGS_LIMIT = 4096;
const SCHEME = ["color", "scheme"].join("-");
const ORIGIN = /^(https?|wss?):\/\/[^\s;'"]+$/;
const INLINE = `'${["unsafe", "inline"].join("-")}'`;

export interface AppCsp {
  connectDomains?: string[];
  resourceDomains?: string[];
}
export interface AppDirective {
  tool: string;
  args: Record<string, unknown>;
  view: string | null;
}
export interface AppResource {
  uri: string;
  html: string;
  csp?: AppCsp;
}
export interface AppToolResult {
  isError?: boolean;
  content?: unknown[];
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}
export interface AppApi {
  resource(tool: string): Promise<AppResource>;
  result(directive: AppDirective): Promise<AppToolResult>;
  call(tool: string, name: string, args: Record<string, unknown>): Promise<AppToolResult>;
}
export interface HostTheme {
  theme: "light" | "dark";
  variables: Record<string, string>;
}
export interface BridgeHost {
  post(frame: Record<string, unknown>): void;
  setHeight(height: number): void;
  send(text: string): boolean;
  open(url: string): boolean;
  theme(): HostTheme;
  now?: () => number;
}
export interface JsonRpcFrame {
  jsonrpc?: unknown;
  id?: number | string | null;
  method?: unknown;
  params?: unknown;
}
export type Rest = (path: string, opts?: { method?: string; body?: unknown }) => Promise<unknown>;

export function parseAppDirective(attrs: Record<string, string | undefined> | undefined, fallbackTool?: string): { ok: true; directive: AppDirective } | { ok: false; problem: string } {
  const tool = attrs?.tool ?? fallbackTool;
  if (typeof tool !== "string" || !TOOL.test(tool)) return { ok: false, problem: "This view names no log tool." };
  const view = attrs?.view ?? attrs?.id;
  if (view !== undefined && !VIEW.test(view)) return { ok: false, problem: "This view id can't be found." };
  let args: Record<string, unknown> = {};
  if (attrs?.args !== undefined) {
    if (attrs.args.length > ARGS_LIMIT) return { ok: false, problem: "This view's arguments are too long." };
    try {
      const parsed = JSON.parse(attrs.args) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, problem: "This view's arguments are not an object." };
      args = parsed as Record<string, unknown>;
    } catch {
      return { ok: false, problem: "This view's arguments are not JSON." };
    }
  }
  if (attrs?.account !== undefined) {
    if (!ACCOUNT.test(attrs.account)) return { ok: false, problem: "This account name can't be shown." };
    args = { ...args, account: attrs.account };
  }
  return { ok: true, directive: { tool, args, view: view ?? null } };
}

function origins(list: string[] | undefined): string {
  return (list ?? []).filter((d) => typeof d === "string" && ORIGIN.test(d)).join(" ");
}

export function appCsp(csp: AppCsp = {}): string {
  const res = origins(csp.resourceDomains);
  const conn = origins(csp.connectDomains);
  return [
    "default-src 'none'",
    `script-src ${INLINE}`,
    `style-src ${INLINE} ${res}`.trim(),
    `img-src data: blob: ${res}`.trim(),
    `font-src data: ${res}`.trim(),
    `media-src ${res || "'none'"}`,
    `connect-src ${conn || "'none'"}`,
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

export function withAppCsp(html: string, csp: AppCsp = {}): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${appCsp(csp).replace(/"/g, "&quot;")}">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (match) => `${match}${meta}`) : `${meta}${html}`;
}

export const HOST_VARIABLES: Record<string, string[]> = {
  "--color-background-primary": ["--ui-bg-editor", "--background"],
  "--color-background-secondary": ["--ui-bg-secondary", "--ui-bg-sidebar", "--muted"],
  "--color-border-primary": ["--ui-stroke-tertiary", "--border"],
  "--color-text-primary": ["--ui-text-primary", "--foreground"],
  "--color-text-secondary": ["--ui-text-tertiary", "--ui-text-secondary", "--muted-foreground"],
  "--color-ring-primary": ["--ui-accent", "--ring", "--primary"],
  "--color-text-success": ["--ui-green"],
  "--color-text-danger": ["--ui-red", "--destructive"],
  "--color-background-inverse": ["--ui-text-primary", "--foreground"],
  "--color-text-inverse": ["--ui-bg-editor", "--background"],
  "--font-sans": ["--ui-font-sans", "--font-sans"],
};

type Supports = (property: string, value: string) => boolean;
const cssSupports: Supports = (property, value) => (typeof CSS !== "undefined" && typeof CSS.supports === "function" ? CSS.supports(property, value) : true);

function colorOf(raw: string, supports: Supports): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (supports("color", value)) return value;
  if (/^[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/.test(value) && supports("color", `hsl(${value})`)) return `hsl(${value})`;
  return null;
}

export function hostTheme(read: (name: string) => string, dark: boolean, supports: Supports = cssSupports): HostTheme {
  const variables: Record<string, string> = {};
  for (const [name, candidates] of Object.entries(HOST_VARIABLES)) {
    for (const candidate of candidates) {
      const raw = read(candidate);
      const value = name === "--font-sans" ? raw.trim() || null : colorOf(raw, supports);
      if (value) {
        variables[name] = value;
        break;
      }
    }
  }
  return { theme: dark ? "dark" : "light", variables };
}

export function documentTheme(doc: Document = document): HostTheme {
  const html = doc.documentElement;
  const style = doc.defaultView?.getComputedStyle(html);
  const scheme = (style?.getPropertyValue(SCHEME) ?? "").trim();
  const dark = html.classList.contains("dark") || html.dataset.theme === "dark" || scheme === "dark";
  return hostTheme((name) => style?.getPropertyValue(name) ?? "", dark);
}

export function sizeOf(params: unknown): number | null {
  const p = (params ?? {}) as { height?: unknown; size?: { height?: unknown } };
  const raw = typeof p.height === "number" ? p.height : typeof p.size?.height === "number" ? p.size.height : null;
  return raw !== null && Number.isFinite(raw) && raw > 0 ? Math.min(Math.ceil(raw), APP_MAX_HEIGHT) : null;
}

export function textOf(params: unknown): string {
  const raw = ((params ?? {}) as { content?: unknown }).content;
  const blocks = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return blocks
    .map((block) => (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string" ? (block as { text: string }).text : ""))
    .filter(Boolean)
    .join("\n");
}

function linkOf(params: unknown): string | null {
  const url = ((params ?? {}) as { url?: unknown }).url;
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export interface Bridge {
  handle(message: unknown): Promise<void>;
  themeChanged(): void;
}

export function createBridge(directive: AppDirective, api: AppApi, host: BridgeHost): Bridge {
  const now = host.now ?? Date.now;
  let lastMessage = -APP_MESSAGE_GAP_MS;
  let staged = "";
  let delivered = false;
  const result = api.result(directive).catch((error: unknown): AppToolResult => ({ isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] }));
  const reply = (id: JsonRpcFrame["id"], payload: Record<string, unknown>) => host.post({ jsonrpc: "2.0", id, ...payload });
  const notify = (method: string, params: unknown) => host.post({ jsonrpc: "2.0", method, params });
  const context = () => {
    const theme = host.theme();
    return { theme: theme.theme, styles: { variables: theme.variables }, displayMode: "inline", availableDisplayModes: ["inline"], platform: "desktop", containerDimensions: { maxHeight: APP_MAX_HEIGHT } };
  };
  const deliver = async () => {
    if (delivered) return;
    delivered = true;
    notify("ui/notifications/tool-input", { arguments: directive.args });
    notify("ui/notifications/tool-result", await result);
  };
  const handle = async (message: unknown) => {
    const msg = message as JsonRpcFrame;
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return;
    const method = msg.method;
    const asked = msg.id !== undefined && msg.id !== null;
    if (method === "ui/notifications/size-changed") {
      const height = sizeOf(msg.params);
      if (height !== null) host.setHeight(height);
      return;
    }
    if (method === "ui/notifications/initialized") return deliver();
    if (!asked) return;
    if (method === "ui/initialize") {
      const params = (msg.params ?? {}) as { protocolVersion?: unknown };
      return reply(msg.id, {
        result: {
          protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : APP_PROTOCOL_VERSION,
          hostInfo: APP_HOST_INFO,
          hostCapabilities: { serverTools: {}, message: { text: {} }, updateModelContext: { text: {} }, openLinks: {} },
          hostContext: context(),
        },
      });
    }
    if (method === "tools/call") {
      const params = (msg.params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof params.name !== "string") return reply(msg.id, { error: { code: -32602, message: "tools/call needs a name" } });
      const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? (params.arguments as Record<string, unknown>) : {};
      try {
        return reply(msg.id, { result: await api.call(directive.tool, params.name, args) });
      } catch (error) {
        return reply(msg.id, { error: { code: -32000, message: error instanceof Error ? error.message : String(error) } });
      }
    }
    if (method === "ui/update-model-context") {
      staged = textOf(msg.params).trim();
      return reply(msg.id, { result: {} });
    }
    if (method === "ui/message") {
      const text = textOf(msg.params).trim();
      const at = now();
      if (!text || at - lastMessage < APP_MESSAGE_GAP_MS) return reply(msg.id, { result: { isError: true } });
      lastMessage = at;
      const sent = host.send(staged && staged !== text ? `${staged}\n\n${text}` : text);
      if (sent) staged = "";
      return reply(msg.id, { result: sent ? {} : { isError: true } });
    }
    if (method === "ui/open-link") {
      const url = linkOf(msg.params);
      return reply(msg.id, { result: url && host.open(url) ? {} : { isError: true } });
    }
    if (method === "ui/request-display-mode") return reply(msg.id, { result: { mode: "inline" } });
    if (method === "ping") return reply(msg.id, { result: {} });
    return reply(msg.id, { error: { code: -32601, message: `not supported: ${method}` } });
  };
  return { handle, themeChanged: () => notify("ui/notifications/host-context-changed", context()) };
}

async function answerOf(rest: Rest, path: string, body?: unknown): Promise<unknown> {
  return rest(path, body === undefined ? undefined : { method: "POST", body });
}

function failure(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return /logApp[A-Z][A-Za-z]+[^"]*/.exec(text)?.[0] ?? "logAppUnknown: the view could not be reached";
}

export function appApi(rest: Rest): AppApi {
  const base = (tool: string) => `/apps/${encodeURIComponent(tool)}`;
  return {
    resource: async (tool) => {
      const answer = (await answerOf(rest, `${base(tool)}/resource`).catch((error: unknown) => {
        throw new Error(failure(error));
      })) as Partial<AppResource> | null;
      if (!answer || typeof answer.html !== "string" || typeof answer.uri !== "string") throw new Error("logAppUnknown: the view came back empty");
      return { uri: answer.uri, html: answer.html, csp: answer.csp };
    },
    result: async (directive) => (await answerOf(rest, `${base(directive.tool)}/result`, directive.view ? { view: directive.view } : { args: directive.args })) as AppToolResult,
    call: async (tool, name, args) => {
      try {
        return (await answerOf(rest, `${base(tool)}/call`, { name, arguments: args })) as AppToolResult;
      } catch (error) {
        const text = failure(error);
        return { isError: true, content: [{ type: "text", text }], structuredContent: { error: text.split(":")[0] } };
      }
    },
  };
}
