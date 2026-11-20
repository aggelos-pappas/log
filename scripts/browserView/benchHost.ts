import { join } from "node:path";
import { browserViewJson } from "../../src/cli/browser/index.ts";
import { viewerState } from "../../src/browser/viewer/index.ts";
import { browserViewCsp, readBrowserViewResource, runAppTool } from "../../src/mcp/apps/browserView/index.ts";
import { runReport } from "../../src/mcp/apps/report/index.ts";
import { openDatabase } from "../../src/storage/schema/index.ts";

const root = join(import.meta.dir, "..", "..");
const account = process.env.BENCH_ACCOUNT ?? "benchAccount";
const port = Number(process.env.BENCH_HOST_PORT ?? "0");
const pluginApi = process.env.BENCH_PLUGIN_API ?? "";

export const HOST_VARIABLES = {
  light: { "--color-background-primary": "#ffffff", "--color-background-secondary": "#f5f5f4", "--color-border-primary": "#e7e5e4", "--color-text-primary": "#1c1917", "--color-text-secondary": "#78716c", "--color-background-inverse": "#1c1917", "--color-text-inverse": "#fafaf9", "--color-ring-primary": "#c2410c", "--font-sans": "system-ui, sans-serif" },
  dark: { "--color-background-primary": "#262624", "--color-background-secondary": "#1f1e1d", "--color-border-primary": "#3e3e38", "--color-text-primary": "#f5f4ef", "--color-text-secondary": "#a8a29e", "--color-background-inverse": "#f5f4ef", "--color-text-inverse": "#1f1e1d", "--color-ring-primary": "#d97757", "--font-sans": "system-ui, sans-serif" },
} as const;

export const HERMES_VARIABLES = {
  light: { "--ui-text-primary": "#1f2328", "--ui-text-tertiary": "#6e7781", "--ui-accent": "#0969da", "--ui-stroke-tertiary": "#d0d7de", "--ui-bg-editor": "#ffffff" },
  dark: { "--ui-text-primary": "#e6edf3", "--ui-text-tertiary": "#8b949e", "--ui-accent": "#58a6ff", "--ui-stroke-tertiary": "#30363d", "--ui-bg-editor": "#161b22" },
} as const;

const INLINE = `'${["unsafe", "inline"].join("-")}'`;
const SANDBOX = ["allow", "scripts"].join("-");

function cspOf(connect: string[]): string {
  return `default-src 'none'; script-src ${INLINE}; style-src ${INLINE}; img-src data: blob:; font-src data:; connect-src ${connect.length ? connect.join(" ") : "'none'"}`;
}

function hostPage(theme: "light" | "dark", mode: string): string {
  const background = theme === "dark" ? "#1f1e1d" : "#f5f5f4";
  return `<!doctype html><html><head><meta charset="utf-8"><title>replica MCP Apps host</title><style>body{margin:0;padding:24px;background:${background};font-family:system-ui}iframe{display:block;width:900px;border:0;height:200px}</style></head><body><iframe id="view" sandbox="${SANDBOX}"></iframe><script>
const theme=${JSON.stringify(theme)},mode=${JSON.stringify(mode)},variables=${JSON.stringify(HOST_VARIABLES[theme])};
window.__host={calls:[],initialized:false,unknown:[]};
(async()=>{
const resource=await (await fetch('/widget')).json();
const iframe=document.getElementById('view');
const csp='<meta http-equiv="Content-Security-Policy" content="'+resource.csp+'">';
iframe.srcdoc=resource.html.replace(/<head>/i,'<head>'+csp);
const send=(m)=>iframe.contentWindow.postMessage(m,'*');
const reply=(id,result)=>send({jsonrpc:'2.0',id,result});
const fail=(id,code,message)=>send({jsonrpc:'2.0',id,error:{code,message}});
const hostContext={theme,styles:{variables},displayMode:'inline',availableDisplayModes:['inline'],platform:'web',containerDimensions:{width:900,maxHeight:2000}};
addEventListener('message',async(event)=>{
if(event.source!==iframe.contentWindow)return;const msg=event.data;if(!msg||msg.jsonrpc!=='2.0')return;
switch(msg.method){
case 'ui/initialize':return reply(msg.id,{protocolVersion:'2026-01-26',hostInfo:{name:'replicaHost',version:'1.0.0'},hostCapabilities:{serverTools:{},message:{text:{}},updateModelContext:{text:{}}},hostContext});
case 'ui/notifications/initialized':{window.__host.initialized=true;const view=await (await fetch('/initial')).json();send({jsonrpc:'2.0',method:'ui/notifications/tool-input',params:{arguments:{account:${JSON.stringify(account)}}}});send({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{content:[{type:'text',text:'view'}],structuredContent:{json:view}}});return}
case 'ui/notifications/size-changed':if(msg.params&&msg.params.height)iframe.style.height=Math.ceil(msg.params.height)+'px';return;
case 'tools/call':{window.__host.calls.push(msg.params.name);const res=await fetch('/call?mode='+mode,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(msg.params)});const body=await res.json();return reply(msg.id,body)}
case 'ui/message':case 'ui/update-model-context':case 'ping':return reply(msg.id,{});
default:window.__host.unknown.push(msg.method);if(msg.id!==undefined)fail(msg.id,-32601,'not supported: '+msg.method)}
});
})();
</script></body></html>`;
}

function hermesPage(theme: "light" | "dark", mode: string, script: string, app: Record<string, string>): string {
  const css = (name: "light" | "dark") => Object.entries(HERMES_VARIABLES[name]).map(([key, value]) => `${key}:${value}`).join(";");
  const background = theme === "dark" ? "#0d1117" : "#f6f8fa";
  return `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><title>replica Hermes transcript</title><style>:root{${css("light")};color-scheme:light}:root.dark{${css("dark")};color-scheme:dark}body{margin:0;padding:24px;background:${background};color:var(--ui-text-primary);font-family:system-ui}#root{width:900px}</style></head><body><div id="root"></div><script>window.__benchAccount=${JSON.stringify(account)};window.__benchMode=${JSON.stringify(mode)};window.__benchApp=${JSON.stringify(app)};</script><script type="module" src="${script}"></script></body></html>`;
}

const bundles = new Map<string, Promise<string>>();
function benchScript(entry: string): Promise<string> {
  let built = bundles.get(entry);
  if (!built) {
    built = Bun.build({ entrypoints: [join(root, "scripts", "browserView", entry)], target: "browser", format: "esm", minify: true, define: { "process.env.NODE_ENV": '"production"' } }).then(async (output) => {
      if (!output.success || !output.outputs[0]) throw new Error(output.logs.map((log) => log.message).join("; "));
      return output.outputs[0].text();
    });
    bundles.set(entry, built);
  }
  return built;
}

const REPORT_SPEC = { title: "Who messaged the bench account", subtitle: "Fake data", blocks: [{ type: "stat", items: [{ label: "Messages in", value: 120 }, { label: "People", value: 3 }] }, { type: "barChart", title: "Messages by person", unit: "msgs", data: [{ label: "linus_k", value: 64 }, { label: "grace_ships", value: 41 }, { label: "Fake Three", value: 15 }] }] };
let reportView: Promise<string | null> | null = null;
function benchReportView(): Promise<string | null> {
  const db = process.env.LOG_DB;
  reportView ??= db ? runReport(REPORT_SPEC, false, {}, { hermes: true, db: openDatabase(db) }).then((result) => ((result.structuredContent ?? {}) as { hermesView?: string }).hermesView ?? null) : Promise.resolve(null);
  return reportView;
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  idleTimeout: 60,
  async fetch(request) {
    const url = new URL(request.url);
    const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
    const mode = url.searchParams.get("mode") === "pull" ? "pull" : "cast";
    if (url.pathname === "/host") return new Response(hostPage(theme, mode), { headers: { "content-type": "text/html" } });
    if (url.pathname === "/logapp.js") return new Response(await benchScript("benchApp.tsx"), { headers: { "content-type": "text/javascript" } });
    if (url.pathname === "/logapp") {
      const tool = url.searchParams.get("tool") === "report" ? "report" : "browserView";
      const app = tool === "report" ? { tool, view: (await benchReportView()) ?? "" } : { tool, args: JSON.stringify({ account }) };
      return new Response(hermesPage(theme, mode, "/logapp.js", app), { headers: { "content-type": "text/html" } });
    }
    if (url.pathname === "/widget") {
      const read = await readBrowserViewResource();
      return Response.json({ html: read.contents[0].text, csp: cspOf(browserViewCsp(process.env, "local").connectDomains), meta: read.contents[0]._meta });
    }
    if (url.pathname === "/initial") return Response.json(browserViewJson(await viewerState(account), "local"));
    if (url.pathname === "/call") {
      const body = (await request.json()) as { name: string; arguments?: Record<string, unknown> };
      if (mode === "pull" && body.name === "browserViewStream") return Response.json({ isError: true, content: [{ type: "text", text: "browserStreamUnavailable" }], structuredContent: { error: "browserStreamUnavailable" } });
      return Response.json(await runAppTool(body.name as never, body.arguments ?? {}, true, "local"));
    }
    if (url.pathname.startsWith("/api/plugins/log/")) {
      const target = `${pluginApi}${url.pathname}${url.search}`;
      const forwarded = await fetch(target, { method: request.method, headers: { "content-type": "application/json" }, body: request.method === "POST" ? await request.text() : undefined });
      return new Response(await forwarded.text(), { status: forwarded.status, headers: { "content-type": "application/json" } });
    }
    return new Response("missing", { status: 404 });
  },
});
console.log(JSON.stringify({ host: `http://127.0.0.1:${server.port}` }));
