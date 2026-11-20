import { useEffect, useMemo, useRef, useState } from "react";
import { APP_SANDBOX, createBridge, documentTheme, withAppCsp } from "./appBridge.ts";
import type { AppApi, AppDirective, Bridge } from "./appBridge.ts";

export const APP_STYLE_ID = "logAppStyle";
export const APP_CSS = `
.logapp{margin:8px 0;max-width:1100px;border-radius:14px;overflow:hidden}
.logapp iframe{display:block;width:100%;border:0;background:transparent;color-scheme:normal}
.logapp .la-note{padding:14px 16px;border:1px solid var(--ui-stroke-tertiary,#e2e8f0);border-radius:14px;font-size:13px;color:var(--ui-text-tertiary,#64748b)}
`;

type State = { kind: "loading" } | { kind: "drawn"; html: string; uri: string } | { kind: "failed"; text: string };

export function injectAppStyles(doc: Document = document): void {
  let el = doc.getElementById(APP_STYLE_ID);
  if (!el) {
    el = doc.createElement("style");
    el.id = APP_STYLE_ID;
    doc.head.appendChild(el);
  }
  el.textContent = APP_CSS;
}

function Note({ text }: { text: string }) {
  return (
    <div className="logapp">
      <div className="la-note">{text}</div>
    </div>
  );
}

export function LogApp({ directive, problem, streaming, api, send, open }: { directive: AppDirective | null; problem?: string; streaming: boolean; api: AppApi; send: (text: string) => boolean; open: (url: string) => boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<Bridge | null>(null);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [height, setHeight] = useState(420);
  const key = directive ? `${directive.tool}|${directive.view ?? ""}|${JSON.stringify(directive.args)}` : "";

  useEffect(() => {
    if (streaming || !directive) return;
    let live = true;
    setState({ kind: "loading" });
    api
      .resource(directive.tool)
      .then((resource) => {
        if (live) setState({ kind: "drawn", html: withAppCsp(resource.html, resource.csp), uri: resource.uri });
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: "failed", text: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      live = false;
    };
  }, [key, streaming]);

  const html = state.kind === "drawn" ? state.html : "";
  useEffect(() => {
    if (!html || !directive) return;
    const post = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(message, "*");
    const made = createBridge(directive, api, { post, setHeight, send, open, theme: () => documentTheme() });
    bridge.current = made;
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      void made.handle(event.data);
    };
    window.addEventListener("message", onMessage);
    const watcher = new MutationObserver(() => made.themeChanged());
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    return () => {
      window.removeEventListener("message", onMessage);
      watcher.disconnect();
      bridge.current = null;
    };
  }, [html, key]);

  if (problem) return <Note text={problem} />;
  if (streaming || !directive || state.kind === "loading") return <Note text="Opening the view..." />;
  if (state.kind === "failed") return <Note text={`This view can't be opened here: ${state.text}`} />;
  return (
    <div className="logapp" data-app-tool={directive.tool} data-app-uri={state.uri}>
      <iframe ref={frame} sandbox={APP_SANDBOX} srcDoc={html} style={{ height }} title={state.uri} />
    </div>
  );
}
