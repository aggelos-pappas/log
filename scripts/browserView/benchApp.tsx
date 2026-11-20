import { createRoot } from "react-dom/client";
import { appApi, parseAppDirective } from "../../src/mcp/apps/report/view/appBridge.ts";
import { injectAppStyles, LogApp } from "../../src/mcp/apps/report/view/hermesApp.tsx";

const bench = window as unknown as { __benchApp: Record<string, string>; __sent: string[]; __opened: string[] };
bench.__sent = [];
bench.__opened = [];

async function rest(path: string, opts: { method?: string; body?: unknown } = {}): Promise<unknown> {
  const response = await fetch(`/api/plugins/log${path}`, { method: opts.method ?? "GET", headers: { "content-type": "application/json" }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text}`);
  return JSON.parse(text);
}

injectAppStyles();
const parsed = parseAppDirective(bench.__benchApp);
const send = (text: string) => {
  bench.__sent.push(text);
  return true;
};
const open = (url: string) => {
  bench.__opened.push(url);
  return true;
};
createRoot(document.getElementById("root") as HTMLElement).render(<LogApp directive={parsed.ok ? parsed.directive : null} problem={parsed.ok ? undefined : parsed.problem} streaming={false} api={appApi(rest)} send={send} open={open} />);
