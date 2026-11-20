import { createRoot } from "react-dom/client";
import { browserApi, injectBrowserStyles, LogBrowser } from "../../src/mcp/apps/report/view/hermesBrowser.tsx";

const bench = window as unknown as { __benchAccount: string; __benchMode: string; __sent: string[] };
bench.__sent = [];

async function rest(path: string, opts: { method?: string; body?: unknown } = {}): Promise<unknown> {
  const joiner = path.includes("?") ? "&" : "?";
  const response = await fetch(`/api/plugins/log${path}${joiner}benchMode=${bench.__benchMode}`, { method: opts.method ?? "GET", headers: { "content-type": "application/json" }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text}`);
  return JSON.parse(text);
}

injectBrowserStyles();
createRoot(document.getElementById("root") as HTMLElement).render(<LogBrowser account={bench.__benchAccount} streaming={false} api={browserApi(rest)} send={(text) => bench.__sent.push(text)} />);
