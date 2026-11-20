import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, WheelEvent } from "react";
import { drawBlob, jpegBlob, readCast } from "../../browserView/widget/cast.ts";

export const BROWSER_DIRECTIVE = "logbrowser";
export const BROWSER_STYLE_ID = "logBrowserStyle";
const ACCOUNT = /^[A-Za-z0-9_.@+-]{1,128}$/;
const KEYS = ["Enter", "Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Home", "End"];
const STATE_EVERY_MS = 1000;
const IDLE_MS = 1500;

export type BrowserPhase = "browserMissing" | "viewerUnavailable" | "signInRequired" | "needsAttention" | "busy" | "ready";
export interface BrowserView {
  account: string;
  phase: BrowserPhase;
  generation: string | null;
  revision: string | null;
  pageState: string | null;
  address: string | null;
  canInteract: boolean;
}
export type BrowserEvent = { type: "click"; x: number; y: number } | { type: "text"; text: string } | { type: "key"; key: string } | { type: "scroll"; deltaY: number };
export interface BrowserApi {
  state(account: string): Promise<BrowserView>;
  ticket(account: string, generation: string): Promise<string | null>;
  frame(account: string, generation: string, after: number): Promise<{ data: string; revision: string | null; seq: number } | null>;
  input(account: string, generation: string, revision: string | null, event: BrowserEvent): Promise<{ view: BrowserView | null; error: string | null }>;
}
type Rest = (path: string, opts?: { method?: string; body?: unknown }) => Promise<unknown>;

const TITLES: Record<BrowserPhase, string> = { browserMissing: "No browser is open", viewerUnavailable: "Browser view unavailable", signInRequired: "Sign in here", needsAttention: "This page needs a person", busy: "The browser is working", ready: "Signed in" };
const NOTES: Record<BrowserPhase, string> = {
  browserMissing: "Ask the agent to open this account's browser, then it shows here.",
  viewerUnavailable: "The browser is open, but its view could not be reached.",
  signInRequired: "Click a field in the page and type. Your clicks and keys go to this account's browser, each one a recorded step.",
  needsAttention: "This page is a stop: input is off. Clear it yourself, then tell the agent.",
  busy: "The browser is running a step.",
  ready: "The page no longer asks for sign-in.",
};
const ERRORS: Record<string, string> = {
  browserStateChanged: "The page changed before your input, so it was not sent.",
  browserInputStopped: "The page no longer asks for sign-in, so input is off.",
  browserBusy: "The browser is running another step. Try again in a moment.",
  browserGenerationChanged: "The account's browser was restarted.",
};

export const BROWSER_CSS = `
.logbrowser{--lb-d-text:#0f172a;--lb-d-muted:#64748b;--lb-d-line:#e2e8f0;--lb-d-card:#ffffff;--lb-d-accent:#2563eb;--lb-text:var(--ui-text-primary,var(--lb-d-text));--lb-muted:var(--ui-text-tertiary,var(--lb-d-muted));--lb-line:var(--ui-stroke-tertiary,var(--lb-d-line));--lb-card:var(--ui-bg-editor,var(--lb-d-card));--lb-accent:var(--ui-accent,var(--lb-d-accent));display:flex;flex-direction:column;margin:8px 0;max-width:1100px;border:1px solid var(--lb-line);border-radius:14px;overflow:hidden;background:var(--lb-card);color:var(--lb-text);font:inherit}
.dark .logbrowser{--lb-d-text:#e6e8ec;--lb-d-muted:#9aa3b2;--lb-d-line:#2a2f3a;--lb-d-card:#171a21;--lb-d-accent:#60a5fa}
.logbrowser .lb-bar{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--lb-line)}
.logbrowser .lb-who{display:flex;flex-direction:column;min-width:0;flex:1}
.logbrowser .lb-who strong{font-size:13px;font-weight:600}
.logbrowser .lb-who span{font-size:12px;color:var(--lb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logbrowser .lb-pill{font-size:11px;font-weight:600;border:1px solid var(--lb-line);border-radius:999px;padding:3px 8px;color:var(--lb-muted)}
.logbrowser .lb-pill[data-live="true"]{color:var(--lb-accent);border-color:var(--lb-accent)}
.logbrowser .lb-stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:220px;background:color-mix(in srgb,var(--lb-card) 92%,var(--lb-text))}
.logbrowser canvas{display:block;max-width:100%;height:auto;outline:none}
.logbrowser canvas[data-live="false"]{visibility:hidden}
.logbrowser canvas[data-input="true"]{cursor:pointer}
.logbrowser .lb-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:20px;text-align:center}
.logbrowser .lb-cover h3{margin:0;font-size:16px;font-weight:600}
.logbrowser .lb-cover p{margin:0;max-width:420px;font-size:13px;color:var(--lb-muted)}
.logbrowser .lb-keys{position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;resize:none;pointer-events:none}
.logbrowser .lb-foot{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--lb-line)}
.logbrowser .lb-foot p{margin:0;flex:1;font-size:12px;color:var(--lb-muted)}
.logbrowser .lb-done{border:1px solid var(--lb-line);border-radius:8px;background:transparent;color:var(--lb-text);padding:5px 12px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.logbrowser .lb-done:hover{border-color:var(--lb-accent);color:var(--lb-accent)}
`;

export function injectBrowserStyles(doc: Document = document): void {
  let el = doc.getElementById(BROWSER_STYLE_ID);
  if (!el) {
    el = doc.createElement("style");
    el.id = BROWSER_STYLE_ID;
    doc.head.appendChild(el);
  }
  el.textContent = BROWSER_CSS;
}

function viewOf(value: unknown, account: string): BrowserView {
  const view = (value as { view?: BrowserView } | null)?.view;
  return view && typeof view.phase === "string" ? view : { account, phase: "viewerUnavailable", generation: null, revision: null, pageState: null, address: null, canInteract: false };
}

function errorOf(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return /browser[A-Z][A-Za-z]+/.exec(text)?.[0] ?? "browserViewerUnavailable";
}

export function browserApi(rest: Rest): BrowserApi {
  const base = (account: string) => `/browser/${encodeURIComponent(account)}`;
  return {
    state: async (account) => viewOf(await rest(base(account)).catch(() => null), account),
    ticket: async (account, generation) => {
      const answer = (await rest(`${base(account)}/ticket`, { method: "POST", body: { generation } }).catch(() => null)) as { url?: unknown } | null;
      return typeof answer?.url === "string" && answer.url.startsWith("http://127.0.0.1:") ? answer.url : null;
    },
    frame: async (account, generation, after) => {
      const answer = (await rest(`${base(account)}/frame?generation=${generation}&after=${after}`).catch(() => null)) as { data?: unknown; revision?: unknown; seq?: unknown } | null;
      if (!answer || typeof answer.data !== "string") return null;
      return { data: answer.data, revision: typeof answer.revision === "string" ? answer.revision : null, seq: typeof answer.seq === "number" ? answer.seq : 0 };
    },
    input: async (account, generation, revision, event) => {
      try {
        const answer = await rest(`${base(account)}/input`, { method: "POST", body: { generation, revision, event } });
        return { view: viewOf(answer, account), error: null };
      } catch (error) {
        return { view: null, error: errorOf(error) };
      }
    },
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function LogBrowser({ account, streaming, api, send }: { account: string | undefined; streaming: boolean; api: BrowserApi; send: (text: string) => void }) {
  const valid = typeof account === "string" && ACCOUNT.test(account);
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<BrowserView | null>(null);
  const revision = useRef<string | null>(null);
  const [view, setView] = useState<BrowserView | null>(null);
  const [live, setLive] = useState(false);
  const [source, setSource] = useState<"cast" | "pull" | null>(null);
  const [frames, setFrames] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [told, setTold] = useState(false);
  const [wake, setWake] = useState(0);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const visible = () => {
      if (!document.hidden) setWake((value) => value + 1);
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);

  useEffect(() => {
    if (streaming || !valid) return;
    const name = account as string;
    let alive = true;
    let cast: AbortController | null = null;
    let castTried = false;
    let seq = 0;
    let stateAt = 0;
    const adopt = (next: BrowserView) => {
      const restarted = viewRef.current?.generation !== next.generation;
      viewRef.current = next;
      if (restarted) {
        seq = 0;
        castTried = false;
        cast?.abort();
        cast = null;
        setLive(false);
      }
      if (next.revision) revision.current = next.revision;
      setView(next);
    };
    const drawn = async (blob: Blob, kind: "cast" | "pull") => {
      if (!canvas.current) return;
      await drawBlob(canvas.current, blob);
      setFrames((value) => value + 1);
      setSource(kind);
      setLive(true);
    };
    const refresh = async () => {
      stateAt = Date.now();
      adopt(await api.state(name));
    };
    const run = async () => {
      while (alive && !document.hidden) {
        const current = viewRef.current;
        try {
          if (!current?.generation) {
            await refresh();
            if (!viewRef.current?.generation) await sleep(IDLE_MS);
            continue;
          }
          if (!castTried) {
            castTried = true;
            const url = await api.ticket(name, current.generation);
            if (url) {
              const control = new AbortController();
              cast = control;
              void readCast(url, control.signal, (blob) => drawn(blob, "cast")).catch(() => undefined).finally(() => {
                if (cast === control) cast = null;
              });
            }
            continue;
          }
          if (cast) {
            await refresh();
            await sleep(STATE_EVERY_MS);
            continue;
          }
          const frame = await api.frame(name, current.generation, seq);
          if (!frame) {
            setLive(false);
            await refresh();
            await sleep(IDLE_MS);
            continue;
          }
          if (frame.seq === 0 || frame.seq !== seq) await drawn(jpegBlob(frame.data), "pull");
          seq = frame.seq;
          if (frame.revision) revision.current = frame.revision;
          if (Date.now() - stateAt >= STATE_EVERY_MS) await refresh();
          if (frame.seq === 0) await sleep(250);
        } catch {
          await sleep(IDLE_MS);
        }
      }
      cast?.abort();
      cast = null;
    };
    void run();
    return () => {
      alive = false;
      cast?.abort();
    };
  }, [account, streaming, valid, wake]);

  const act = (event: BrowserEvent) => {
    chain.current = chain.current.then(() => perform(event)).catch(() => undefined);
  };
  const perform = async (event: BrowserEvent) => {
    const current = viewRef.current;
    if (!current?.generation || !current.canInteract || !valid) return;
    const answer = await api.input(account as string, current.generation, revision.current, event);
    if (answer.error) {
      setToast(ERRORS[answer.error] ?? "That input did not reach the page.");
      setTimeout(() => setToast(null), 4000);
    }
    if (answer.view) {
      viewRef.current = answer.view;
      if (answer.view.revision) revision.current = answer.view.revision;
      setView(answer.view);
    }
  };
  const point = (event: MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) * event.currentTarget.width) / box.width, y: ((event.clientY - box.top) * event.currentTarget.height) / box.height };
  };
  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!view?.canInteract) return;
    keys.current?.focus({ preventScroll: true });
    act({ type: "click", ...point(event) });
  };
  const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (view?.canInteract) act({ type: "scroll", deltaY: Math.max(-600, Math.min(600, event.deltaY)) });
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey || !KEYS.includes(event.key)) return;
    event.preventDefault();
    act({ type: "key", key: event.key });
  };
  const onText = () => {
    const text = keys.current?.value ?? "";
    if (keys.current) keys.current.value = "";
    if (text && text.length <= 2048) act({ type: "text", text });
  };
  const done = () => {
    const finished = view?.phase === "ready";
    send(finished ? `I finished in ${account}'s browser: the page no longer asks for sign-in. Check it with browserView and carry on.` : `I'm done in ${account}'s browser. Check it with browserView before carrying on.`);
    setTold(true);
  };

  if (!valid) return <div className="logbrowser"><div className="lb-bar"><span className="lb-who"><strong>Live browser</strong><span>This account name can't be shown.</span></span></div></div>;
  const phase = view?.phase;
  const showCover = !live || !phase || phase === "browserMissing" || phase === "viewerUnavailable";
  return (
    <div className="logbrowser" data-frames={frames} data-source={source ?? ""} data-phase={phase ?? ""}>
      <div className="lb-bar">
        <span className="lb-who">
          <strong>{phase ? TITLES[phase] : "Live browser"}</strong>
          <span>{`${account}${view?.address ? ` · ${view.address}` : ""}`}</span>
        </span>
        <span className="lb-pill" data-live={String(live)}>{streaming ? "Waiting" : live ? (source === "pull" ? "Live (frames)" : "Live") : "Connecting"}</span>
      </div>
      <div className="lb-stage">
        <canvas ref={canvas} width={1280} height={800} data-live={String(live)} data-input={String(Boolean(view?.canInteract && live))} onClick={onClick} onWheel={onWheel} aria-label="Live browser. Click into the page, then type." />
        <textarea ref={keys} className="lb-keys" aria-label="Type into the page" autoComplete="off" spellCheck={false} onKeyDown={onKey} onInput={onText} />
        {showCover ? (
          <div className="lb-cover">
            <h3>{phase && !live ? TITLES[phase] : "Connecting to the browser..."}</h3>
            <p>{phase ? NOTES[phase] : ""}</p>
          </div>
        ) : null}
      </div>
      <div className="lb-foot">
        <p>{toast ?? (told ? "The agent was told." : phase === "signInRequired" ? NOTES.signInRequired : phase === "needsAttention" ? NOTES.needsAttention : "The page streams live from the account's browser.")}</p>
        <button className="lb-done" type="button" onClick={done} disabled={told || !view}>Done, carry on</button>
      </div>
    </div>
  );
}
