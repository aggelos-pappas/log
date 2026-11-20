import { describe, expect, test } from "bun:test";
import { join } from "node:path";
type Result = { isError?: boolean; content?: unknown[]; structuredContent?: Record<string, unknown> };
type Directive = { tool: string; args: Record<string, unknown>; view: string | null };
type Theme = { theme: "light" | "dark"; variables: Record<string, string> };
type Api = { resource(tool: string): Promise<{ uri: string; html: string }>; result(directive: Directive): Promise<Result>; call(tool: string, name: string, args: Record<string, unknown>): Promise<Result> };
type Host = { post(frame: Record<string, unknown>): void; setHeight(h: number): void; send(text: string): boolean; open(url: string): boolean; theme(): Theme; now?: () => number };
type Parsed = { ok: true; directive: Directive } | { ok: false; problem: string };
type Rest = (path: string, opts?: { method?: string; body?: unknown }) => Promise<unknown>;
interface BridgeModule {
  APP_DIRECTIVE: string;
  APP_MAX_HEIGHT: number;
  APP_SANDBOX: string;
  appApi(rest: Rest): Api;
  appCsp(csp?: { connectDomains?: string[]; resourceDomains?: string[] }): string;
  withAppCsp(html: string, csp?: { connectDomains?: string[]; resourceDomains?: string[] }): string;
  createBridge(directive: Directive, api: Api, host: Host): { handle(message: unknown): Promise<void>; themeChanged(): void };
  hostTheme(read: (name: string) => string, dark: boolean, supports?: (property: string, value: string) => boolean): Theme;
  parseAppDirective(attrs: Record<string, string | undefined> | undefined, fallbackTool?: string): Parsed;
}
declare namespace Bridge {
  type AppDirective = Directive;
  type HostTheme = Theme;
  type AppApi = Api;
}

const { APP_DIRECTIVE, APP_MAX_HEIGHT, APP_SANDBOX, appApi, appCsp, createBridge, hostTheme, parseAppDirective, withAppCsp } = (await import(join(import.meta.dir, "view", "appBridge.ts"))) as BridgeModule;

const DIRECTIVE: Bridge.AppDirective = { tool: "browserView", args: { account: "fakeSeller" }, view: null };
const LIGHT: Bridge.HostTheme = { theme: "light", variables: { "--color-text-primary": "#1f2328" } };
const DARK: Bridge.HostTheme = { theme: "dark", variables: { "--color-text-primary": "#e6edf3" } };

function harness(over: Partial<Bridge.AppApi> = {}, clock = { now: 10_000 }) {
  const posted: Record<string, unknown>[] = [];
  const sent: string[] = [];
  const opened: string[] = [];
  const heights: number[] = [];
  const calls: { tool: string; name: string; args: Record<string, unknown> }[] = [];
  let theme = LIGHT;
  const api: Bridge.AppApi = {
    resource: async () => ({ uri: "ui://log/browserView", html: "<html></html>" }),
    result: async () => ({ content: [{ type: "text", text: "view" }], structuredContent: { json: { phase: "signInRequired" } } }),
    call: async (tool, name, args) => {
      calls.push({ tool, name, args });
      return name === "browserViewInput" && args.refuse ? { isError: true, content: [{ type: "text", text: "browserInputStopped: no" }], structuredContent: { error: "browserInputStopped" } } : { structuredContent: { ran: name } };
    },
    ...over,
  };
  const bridge = createBridge(DIRECTIVE, api, {
    post: (frame) => posted.push(frame),
    setHeight: (h) => heights.push(h),
    send: (text) => (sent.push(text), true),
    open: (url) => (opened.push(url), true),
    theme: () => theme,
    now: () => clock.now,
  });
  return { bridge, posted, sent, opened, heights, calls, clock, dark: () => (theme = DARK) };
}

const rpc = (id: number | null, method: string, params: unknown = {}) => ({ jsonrpc: "2.0", ...(id === null ? {} : { id }), method, params });

describe("the vendored MCP Apps host card (::logapp)", () => {
  test("the directive names a log tool and its arguments, and ::logbrowser{account} is the browserView shortcut", () => {
    expect(APP_DIRECTIVE).toBe("logapp");
    expect(parseAppDirective({ tool: "browserView", args: '{"account":"fakeSeller"}' })).toEqual({ ok: true, directive: DIRECTIVE });
    expect(parseAppDirective({ account: "fakeSeller" }, "browserView")).toEqual({ ok: true, directive: DIRECTIVE });
    expect(parseAppDirective({ tool: "report", view: "0a1b2c3d" })).toEqual({ ok: true, directive: { tool: "report", args: {}, view: "0a1b2c3d" } });
    expect(parseAppDirective({ tool: "report", view: "../x" })).toMatchObject({ ok: false });
    expect(parseAppDirective({ tool: "browser view" })).toMatchObject({ ok: false });
    expect(parseAppDirective({ tool: "browserView", args: "[1]" })).toMatchObject({ ok: false });
    expect(parseAppDirective({ tool: "browserView", args: "{nope" })).toMatchObject({ ok: false });
    expect(parseAppDirective({ tool: "browserView", args: JSON.stringify({ pad: "x".repeat(5000) }) })).toMatchObject({ ok: false });
    expect(parseAppDirective({ account: "a b" }, "browserView")).toMatchObject({ ok: false });
    expect(parseAppDirective(undefined)).toMatchObject({ ok: false });
  });

  test("the CSP comes from the view's _meta.ui.csp, nothing else gets out, and the iframe only runs scripts", () => {
    const csp = appCsp({ connectDomains: ["http://127.0.0.1:47613", "javascript:alert(1)", "https://x.example; script-src *"], resourceDomains: [] });
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src http://127.0.0.1:47613;");
    expect(csp).not.toContain("javascript:");
    expect(csp).not.toContain("script-src *");
    expect(appCsp()).toContain("connect-src 'none'");
    expect(appCsp()).toContain("frame-src 'none'");
    const html = withAppCsp('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>', { connectDomains: [] });
    expect(html).toMatch(/<head><meta http-equiv="Content-Security-Policy" content="default-src 'none';[^"]*"><meta charset/);
    expect(withAppCsp("<p>bare</p>")).toStartWith('<meta http-equiv="Content-Security-Policy"');
    expect(APP_SANDBOX).toBe(["allow", "scripts"].join("-"));
  });

  test("Hermes's theme variables become the MCP Apps style variables, light and dark", () => {
    const vars: Record<string, string> = { "--ui-bg-editor": "#161b22", "--ui-text-primary": "#e6edf3", "--border": "215 20% 27%", "--ring": "not a colour" };
    const theme = hostTheme((name) => vars[name] ?? "", true, (_p, v) => v.startsWith("#") || v.startsWith("hsl("));
    expect(theme.theme).toBe("dark");
    expect(theme.variables["--color-background-primary"]).toBe("#161b22");
    expect(theme.variables["--color-text-primary"]).toBe("#e6edf3");
    expect(theme.variables["--color-border-primary"]).toBe("hsl(215 20% 27%)");
    expect(theme.variables["--color-ring-primary"]).toBeUndefined();
    expect(hostTheme(() => "", false).theme).toBe("light");
  });

  test("ui/initialize answers with the host context, and the tool input and result follow the view's initialized", async () => {
    const h = harness();
    await h.bridge.handle(rpc(1, "ui/initialize", { protocolVersion: "2026-01-26" }));
    const init = h.posted[0] as { id: number; result: { hostCapabilities: Record<string, unknown>; hostContext: { theme: string; styles: { variables: Record<string, string> } } } };
    expect(init.id).toBe(1);
    expect(Object.keys(init.result.hostCapabilities).sort()).toEqual(["message", "openLinks", "serverTools", "updateModelContext"]);
    expect(init.result.hostContext.theme).toBe("light");
    expect(init.result.hostContext.styles.variables).toEqual(LIGHT.variables);
    await h.bridge.handle(rpc(null, "ui/notifications/initialized"));
    expect(h.posted[1]).toEqual({ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: { account: "fakeSeller" } } });
    expect(h.posted[2]).toMatchObject({ method: "ui/notifications/tool-result", params: { structuredContent: { json: { phase: "signInRequired" } } } });
    await h.bridge.handle(rpc(null, "ui/notifications/initialized"));
    expect(h.posted).toHaveLength(3);
  });

  test("a theme change in Hermes reaches the view", async () => {
    const h = harness();
    h.dark();
    h.bridge.themeChanged();
    expect(h.posted[0]).toMatchObject({ method: "ui/notifications/host-context-changed", params: { theme: "dark", styles: { variables: DARK.variables } } });
  });

  test("tools/call goes through the plugin route under the card's own tool, and a gate's refusal comes back as the view's answer", async () => {
    const h = harness();
    await h.bridge.handle(rpc(7, "tools/call", { name: "browserViewInput", arguments: { refuse: true } }));
    expect(h.calls).toEqual([{ tool: "browserView", name: "browserViewInput", args: { refuse: true } }]);
    expect(h.posted[0]).toMatchObject({ id: 7, result: { isError: true, structuredContent: { error: "browserInputStopped" } } });
    await h.bridge.handle(rpc(8, "tools/call", { arguments: {} }));
    expect(h.posted[1]).toMatchObject({ id: 8, error: { code: -32602 } });
    const broken = harness({ call: async () => Promise.reject(new Error("logAppUnknown: down")) });
    await broken.bridge.handle(rpc(9, "tools/call", { name: "browserViewDone", arguments: {} }));
    expect(broken.posted[0]).toMatchObject({ id: 9, error: { code: -32000, message: "logAppUnknown: down" } });
  });

  test("size, messages, model context, links and unknown methods", async () => {
    const h = harness();
    await h.bridge.handle(rpc(null, "ui/notifications/size-changed", { width: 900, height: 512.2 }));
    await h.bridge.handle(rpc(null, "ui/notifications/size-changed", { height: 99_999 }));
    await h.bridge.handle(rpc(null, "ui/notifications/size-changed", { height: -1 }));
    expect(h.heights).toEqual([513, APP_MAX_HEIGHT]);
    await h.bridge.handle(rpc(1, "ui/update-model-context", { content: [{ type: "text", text: "looking at the login form" }] }));
    await h.bridge.handle(rpc(2, "ui/message", { role: "user", content: [{ type: "text", text: "I'm done" }] }));
    await h.bridge.handle(rpc(3, "ui/message", { role: "user", content: { type: "text", text: "again" } }));
    expect(h.sent).toEqual(["looking at the login form\n\nI'm done"]);
    expect(h.posted[2]).toMatchObject({ id: 3, result: { isError: true } });
    h.clock.now += 2500;
    await h.bridge.handle(rpc(4, "ui/message", { role: "user", content: { type: "text", text: "again" } }));
    expect(h.sent.at(-1)).toBe("again");
    await h.bridge.handle(rpc(5, "ui/open-link", { url: "https://example.com/help" }));
    await h.bridge.handle(rpc(6, "ui/open-link", { url: "file:///c:/secret" }));
    expect(h.opened).toEqual(["https://example.com/help"]);
    expect(h.posted.at(-1)).toMatchObject({ id: 6, result: { isError: true } });
    await h.bridge.handle(rpc(7, "resources/read", { uri: "ui://log/report" }));
    expect(h.posted.at(-1)).toMatchObject({ id: 7, error: { code: -32601 } });
    await h.bridge.handle({ jsonrpc: "1.0", id: 8, method: "ping" });
    await h.bridge.handle("not a frame");
    expect(h.posted.at(-1)).toMatchObject({ id: 7 });
  });

  test("the plugin routes: resource, first result and calls, with refusals kept as answers", async () => {
    const paths: { path: string; opts?: { method?: string; body?: unknown } }[] = [];
    const rest = async (path: string, opts?: { method?: string; body?: unknown }) => {
      paths.push({ path, opts });
      if (path.endsWith("/resource")) return { uri: "ui://log/browserView", html: "<html></html>", csp: { connectDomains: [] } };
      if (path.endsWith("/call")) throw new Error('403: {"error":"logAppToolRefused","message":"no"}');
      return { structuredContent: { ok: true } };
    };
    const api = appApi(rest);
    expect((await api.resource("browserView")).uri).toBe("ui://log/browserView");
    await api.result({ tool: "report", args: {}, view: "0a1b2c3d" });
    expect(paths.at(-1)).toEqual({ path: "/apps/report/result", opts: { method: "POST", body: { view: "0a1b2c3d" } } });
    await api.result(DIRECTIVE);
    expect(paths.at(-1)?.opts?.body).toEqual({ args: { account: "fakeSeller" } });
    const refused = await api.call("browserView", "twitterPostLive", {});
    expect(refused.isError).toBe(true);
    expect(refused.structuredContent).toEqual({ error: "logAppToolRefused" });
    await expect(appApi(async () => Promise.reject(new Error('404: {"error":"logAppUnknown"}'))).resource("twitterDms")).rejects.toThrow("logAppUnknown");
  });
});
