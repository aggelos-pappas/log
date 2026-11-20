import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ViewerError } from "../../../browser/viewer/index.ts";
import { appToolDeps, BROWSER_VIEW_URI } from "../browserView/index.ts";
import { answerAppRequest, appCall, appCallRefusal, appResource, appResult, appUriOf, logAppDeps, warmApps } from "./index.ts";
import type { LogAppDeps, LogAppTool } from "./index.ts";

const TOOLS: LogAppTool[] = [
  { name: "browserView", annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: BROWSER_VIEW_URI } } },
  { name: "browserViewInput", annotations: { readOnlyHint: false }, _meta: { ui: { resourceUri: BROWSER_VIEW_URI, visibility: ["app"] } } },
  { name: "report", annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: "ui://log/report" } } },
  { name: "twitterDms", annotations: { readOnlyHint: true } },
  { name: "twitterPostLive", annotations: { readOnlyHint: false } },
  { name: "logCall", annotations: { readOnlyHint: true } },
  { name: "otherView", annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: "ui://someone/view" } } },
];

function fakeDeps(over: Partial<LogAppDeps> = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const deps: LogAppDeps = {
    tools: async () => TOOLS,
    read: async (uri) => ({ contents: [{ uri, text: "<!doctype html><html><head></head><body>view</body></html>", _meta: { ui: { csp: { connectDomains: ["http://127.0.0.1:47613", "javascript:alert(1)"], resourceDomains: [] } } } }] }),
    call: async (name, args) => {
      calls.push({ name, args });
      return { content: [{ type: "text", text: `ran ${name}` }], structuredContent: { ran: name } };
    },
    view: () => null,
    ...over,
  };
  return { deps, calls };
}

const textOf = (result: CallToolResult) => (result.content as { text?: string }[]).map((c) => c.text ?? "").join("\n");

describe("::logapp, log's own MCP App views in Hermes", () => {
  test("warming the host reads each of log's own views once, so the first card finds them built", async () => {
    const read: string[] = [];
    const { deps } = fakeDeps({ read: async (uri) => (read.push(uri), { contents: [{ uri, text: "<html></html>" }] }) });
    expect(await warmApps(deps)).toEqual([BROWSER_VIEW_URI, "ui://log/report"]);
    expect(read).toEqual([BROWSER_VIEW_URI, "ui://log/report"]);
  });

  test("only a tool whose view is log's own ui://log/ resource is opened", async () => {
    const { deps } = fakeDeps();
    const opened = await appResource("browserView", deps);
    expect(opened).toMatchObject({ ok: true, resource: { tool: "browserView", uri: BROWSER_VIEW_URI } });
    if (opened.ok && "resource" in opened) expect(opened.resource.csp.connectDomains).toEqual(["http://127.0.0.1:47613"]);
    expect(await appResource("otherView", deps)).toMatchObject({ ok: false, error: "logAppUnknown" });
    expect(await appResource("twitterDms", deps)).toMatchObject({ ok: false, error: "logAppUnknown" });
    expect(await appResource("../etc", deps)).toMatchObject({ ok: false, error: "logAppInvalid" });
    expect(appUriOf(TOOLS[6])).toBeNull();
  });

  test("a view calls its own tools and read tools; a send or a runner of other tools is refused without running", async () => {
    expect(appCallRefusal(BROWSER_VIEW_URI, "browserViewInput", TOOLS)).toBeNull();
    expect(appCallRefusal(BROWSER_VIEW_URI, "twitterDms", TOOLS)).toBeNull();
    expect(appCallRefusal(BROWSER_VIEW_URI, "twitterPostLive", TOOLS)).toContain("never from a view");
    expect(appCallRefusal(BROWSER_VIEW_URI, "logCall", TOOLS)).toContain("runs other tools");
    expect(appCallRefusal(BROWSER_VIEW_URI, "noSuchTool", TOOLS)).toContain("not one of log's tools");
    const { deps, calls } = fakeDeps();
    const refused = await appCall("browserView", "twitterPostLive", { text: "hello" }, deps);
    expect(refused.ok && "result" in refused && refused.result.isError).toBe(true);
    if (refused.ok && "result" in refused) expect(textOf(refused.result)).toStartWith("logAppToolRefused:");
    expect(calls).toEqual([]);
    const ran = await appCall("browserView", "browserViewInput", { account: "fakeSeller" }, deps);
    expect(ran).toMatchObject({ ok: true, result: { structuredContent: { ran: "browserViewInput" } } });
    expect(calls).toEqual([{ name: "browserViewInput", args: { account: "fakeSeller" } }]);
  });

  test("the view's input is refused when the viewer's gate refuses it (rule 94: sign-in pages only)", async () => {
    const saved = appToolDeps.input;
    appToolDeps.input = async () => {
      throw new ViewerError("browserInputStopped");
    };
    try {
      const { deps } = fakeDeps({ call: logAppDeps.call });
      const answer = await appCall("browserView", "browserViewInput", { account: "fakeSeller", generation: "a".repeat(32), revision: "b".repeat(64), event: { type: "click", x: 1, y: 2 } }, deps);
      expect(answer.ok).toBe(true);
      if (answer.ok && "result" in answer) {
        expect(answer.result.isError).toBe(true);
        expect((answer.result.structuredContent as { error?: string }).error).toBe("browserInputStopped");
      }
    } finally {
      appToolDeps.input = saved;
    }
  });

  test("the first result is the tool run with the directive's arguments, or a kept report view", async () => {
    const { deps, calls } = fakeDeps({ view: (id) => (id === "0a1b2c3d" ? { title: "T", compiled: "exports.default=()=>null", data: { n: 1 }, text: "# T" } : id === "0a1b2c3e" ? { title: "Old", text: "# Old" } : null) });
    expect(await appResult("browserView", { account: "fakeSeller" }, undefined, deps)).toMatchObject({ ok: true, result: { structuredContent: { ran: "browserView" } } });
    expect(calls.at(-1)).toEqual({ name: "browserView", args: { account: "fakeSeller" } });
    expect(await appResult("report", {}, "0a1b2c3d", deps)).toMatchObject({ ok: true, result: { structuredContent: { title: "T", compiled: "exports.default=()=>null", data: { n: 1 } } } });
    expect(await appResult("report", {}, "0a1b2c3e", deps)).toMatchObject({ ok: false, error: "logAppViewMissing" });
    expect(await appResult("report", {}, "nothex!!", deps)).toMatchObject({ ok: false, error: "logAppInvalid" });
    expect(await appResult("browserView", "not an object", undefined, deps)).toMatchObject({ ok: false, error: "logAppInvalid" });
    expect(await appResult("browserView", { pad: "x".repeat(5000) }, undefined, deps)).toMatchObject({ ok: false, error: "logAppInvalid" });
  });

  test("one request line in, one answer out, and a crash is an answer too", async () => {
    const { deps } = fakeDeps({ tools: async () => Promise.reject(new Error("boom")) });
    expect(await answerAppRequest({ op: "resource", tool: "browserView" }, deps)).toEqual({ ok: false, error: "logAppUnknown", message: "boom" });
    expect(await answerAppRequest({ op: "nope" } as never, fakeDeps().deps)).toMatchObject({ ok: false, error: "logAppInvalid" });
  });
});

const scratch = mkdtempSync(join(tmpdir(), "logAppHost"));
afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));

const FAKE_HOST = [
  "import json, os, sys",
  "marker = sys.argv[1]",
  "for line in sys.stdin:",
  "    request = json.loads(line)",
  "    if request.get('name') == 'stopOnce' and not os.path.exists(marker):",
  "        open(marker, 'w').close()",
  "        sys.exit(0)",
  "    sys.stdout.write(json.dumps({'id': request['id'], 'ok': True, 'result': {'echo': request, 'pid': os.getpid()}}) + chr(10))",
  "    sys.stdout.flush()",
].join("\n");

describe("the plugin's warm app host", () => {
  test("each route request is one line to the Bun child and back, a stopped child is started again once, and a bad tool never reaches it", () => {
    const root = join(scratch, "root");
    mkdirSync(join(root, "scripts", "hermes"), { recursive: true });
    writeFileSync(join(root, "scripts", "hermes", "appHost.ts"), "");
    writeFileSync(join(scratch, "fakeHost.py"), FAKE_HOST);
    const api = join(import.meta.dir, "..", "..", "..", "..", "hermesPlugin", "dashboard", "plugin_api.py");
    const script = [
      "import importlib.util, json, sys, types",
      "fastapi = types.ModuleType('fastapi'); responses = types.ModuleType('fastapi.responses')",
      "class APIRouter:",
      "    def __init__(self): pass",
      "    def get(self, path): return lambda f: f",
      "    def post(self, path): return lambda f: f",
      "    def include_router(self, router): pass",
      "class JSONResponse:",
      "    def __init__(self, body, status_code=200): self.body, self.status_code = body, status_code",
      "fastapi.APIRouter, fastapi.Body, responses.JSONResponse = APIRouter, (lambda default=None: default), JSONResponse",
      "sys.modules['fastapi'], sys.modules['fastapi.responses'] = fastapi, responses",
      `spec = importlib.util.spec_from_file_location('logPluginApi', ${JSON.stringify(api)})`,
      "module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)",
      `host = module.AppHost(roots=lambda: [module.Path(${JSON.stringify(root)})], command=lambda script: [sys.executable, ${JSON.stringify(join(scratch, "fakeHost.py"))}, ${JSON.stringify(join(scratch, "stopped.marker"))}])`,
      "module._apps = host",
      "first = module.app_call('browserView', {'name': 'browserViewDone', 'arguments': {'account': 'fakeSeller'}})",
      "pid = first['pid']",
      "again = module.app_call('browserView', {'name': 'stopOnce', 'arguments': {}})",
      "bad = module.app_call('../x', {'name': 'browserViewDone'})",
      "print(json.dumps({'first': first, 'again': again, 'restarted': again['pid'] != pid, 'bad': [bad.status_code, bad.body]}))",
      "proc = host.proc",
      "proc.stdin.close(); proc.wait(5)",
    ].join("\n");
    const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, timeout: 60_000 });
    expect(run.stderr).toBe("");
    const out = JSON.parse(run.stdout.trim()) as { first: { echo: Record<string, unknown> }; again: { echo: Record<string, unknown> }; restarted: boolean; bad: [number, { error: string; message: string }] };
    expect(out.first.echo).toMatchObject({ op: "call", tool: "browserView", name: "browserViewDone", arguments: { account: "fakeSeller" } });
    expect(out.again.echo).toMatchObject({ name: "stopOnce" });
    expect(out.restarted).toBe(true);
    expect(out.bad).toEqual([400, { error: "logAppInvalid", message: "tool must be a log tool name" }]);
  });

  test("the warm route starts the child before any card asks, and a child that ends cleanly after a while is started again at once", () => {
    const root = join(scratch, "warmRoot");
    mkdirSync(join(root, "scripts", "hermes"), { recursive: true });
    writeFileSync(join(root, "scripts", "hermes", "appHost.ts"), "");
    writeFileSync(join(scratch, "fakeHost.py"), FAKE_HOST);
    const api = join(import.meta.dir, "..", "..", "..", "..", "hermesPlugin", "dashboard", "plugin_api.py");
    const script = [
      "import importlib.util, json, sys, time, types",
      "fastapi = types.ModuleType('fastapi'); responses = types.ModuleType('fastapi.responses')",
      "class APIRouter:",
      "    def __init__(self): pass",
      "    def get(self, path): return lambda f: f",
      "    def post(self, path): return lambda f: f",
      "    def include_router(self, router): pass",
      "fastapi.APIRouter, fastapi.Body, responses.JSONResponse = APIRouter, (lambda default=None: default), dict",
      "sys.modules['fastapi'], sys.modules['fastapi.responses'] = fastapi, responses",
      `spec = importlib.util.spec_from_file_location('logPluginApi', ${JSON.stringify(api)})`,
      "module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)",
      "module.APP_RESTART_AFTER_SECONDS = 0",
      `module._apps = module.AppHost(roots=lambda: [module.Path(${JSON.stringify(root)})], command=lambda script: [sys.executable, ${JSON.stringify(join(scratch, "fakeHost.py"))}, ${JSON.stringify(join(scratch, "warm.marker"))}])`,
      "warmed = module.app_warm()",
      "first = module._apps.proc.pid",
      "module._apps.proc.stdin.write(json.dumps({'id': 999, 'name': 'stopOnce'}) + chr(10)); module._apps.proc.stdin.flush()",
      "until = time.monotonic() + 20",
      "while time.monotonic() < until and (module._apps.proc is None or module._apps.proc.pid == first): time.sleep(0.05)",
      "print(json.dumps({'warmed': warmed, 'restarted': module._apps.proc is not None and module._apps.proc.pid != first}))",
      "module._apps.proc.stdin.close(); module._apps.proc.wait(5)",
    ].join("\n");
    const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, timeout: 60_000 });
    expect(run.stderr).toBe("");
    expect(JSON.parse(run.stdout.trim())).toEqual({ warmed: { ok: true }, restarted: true });
  });
});
