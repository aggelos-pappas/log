import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { drawBlob, jpegBlob, readCast } from "./cast.ts";
import { ERROR_TITLES, frameModel, ICONS, mountBrowserFrame } from "./view.ts";
import type { FramePhase } from "./view.ts";
import { connectVoxl, voxlSupported } from "./voxl.ts";
import type { VoxlConnection, VoxlStream } from "./voxl.ts";

type Phase = "browserMissing" | "viewerUnavailable" | "signInRequired" | "needsAttention" | "busy" | "ready";
interface View {
  account: string;
  platform?: string | null;
  browser?: { name: string; label: string; logo: string | null } | null;
  phase: Phase;
  needsHuman: boolean;
  generation: string | null;
  revision: string | null;
  pageState: string | null;
  address: string | null;
  width: number | null;
  height: number | null;
  canInteract: boolean;
  location: "local" | "remote";
  streamKind: "voxl" | "cast" | "frames" | "none";
}
type Input = { type: "click"; x: number; y: number } | { type: "text"; text: string } | { type: "key"; key: string } | { type: "scroll"; deltaY: number };
interface ToolAnswer {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

const LOGOS: Record<string, string> = (() => {
  try {
    return JSON.parse(document.getElementById("browserLogos")?.textContent ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
})();

const root = document.getElementById("app") as HTMLElement;
const frame = mountBrowserFrame(root, {
  onAction: (id) => {
    if (id === "done") void done();
    if (id === "full") void setMode(state.mode === "fullscreen" ? "inline" : "fullscreen");
    if (id === "pip") void setMode("pip");
  },
  onPoint: (fx, fy) => {
    if (!state.view?.canInteract) return;
    state.hasControl = true;
    enqueue({ type: "click", ...pagePoint(fx, fy) });
    render();
  },
  onText: (text) => enqueue({ type: "text", text }),
  onKey: (key) => enqueue({ type: "key", key }),
  onScroll: (deltaY) => enqueue({ type: "scroll", deltaY }),
  onTake: () => {
    state.hasControl = true;
    render();
  },
});
frame.tools.innerHTML = `<button class="lbvIcon" type="button" data-action="pip" data-ref="pip" title="Picture in picture" aria-label="Picture in picture" hidden>${ICONS.pip}</button><button class="lbvIcon" type="button" data-action="full" data-ref="full" title="Full screen" aria-label="Full screen" hidden>${ICONS.expand}</button>`;
const tool = (name: string) => frame.tools.querySelector(`[data-ref="${name}"]`) as HTMLButtonElement;
const canvas = frame.canvas;

type Source = "cast" | "pull" | "voxl" | null;
const state: { account: string | null; view: View | null; revision: string | null; live: boolean; hasControl: boolean; pending: boolean; queue: Input[]; stream: VoxlStream | null; voxl: VoxlConnection | null; finished: boolean; autoMode: boolean; mode: string; streamAsked: boolean; seq: number; cast: AbortController | null; castTried: boolean; looping: boolean; torn: boolean; frames: number; source: Source; stateAt: number } = {
  account: null, view: null, revision: null, live: false, hasControl: false, pending: false, queue: [], stream: null, voxl: null, finished: false, autoMode: false, mode: "inline", streamAsked: false, seq: 0, cast: null, castTried: false, looping: false, torn: false, frames: 0, source: null, stateAt: 0,
};
const STATE_EVERY_MS = 1000;
const IDLE_MS = 1500;

const app = new App({ name: "logBrowserView", version: "1.0.0" }, { availableDisplayModes: ["inline", "fullscreen", "pip"] }, { autoResize: true });

function toast(code: string): void {
  frame.toast(ERROR_TITLES[code] ?? "The browser operation failed.", ERROR_TITLES[code] ? "" : code);
}

function modes(): string[] {
  return app.getHostContext()?.availableDisplayModes ?? [];
}

function render(): void {
  const view = state.view;
  const phase = view?.phase ?? null;
  const connecting = !view || (Boolean(view.generation) && !state.live && phase !== "browserMissing" && phase !== "viewerUnavailable");
  const browser = view?.browser ? { ...view.browser, logo: LOGOS[view.browser.name] ?? null } : null;
  frame.paint(frameModel({
    platform: view?.platform ?? null,
    account: view?.account ?? state.account,
    pageState: view?.pageState ?? null,
    browser,
    phase: phase as FramePhase | null,
    live: state.live,
    connecting,
    address: view?.address ?? null,
    generation: view?.generation ?? null,
    canNavigate: false,
    canGoBack: false,
    canInteract: Boolean(view?.canInteract),
    hasControl: state.hasControl,
    actions: [{ id: "done", label: state.finished ? "Agent told" : "Done, carry on", icon: "check", primary: true, disabled: !view || state.pending || state.finished }],
    mode: state.mode,
  }));
  root.dataset.source = state.source ?? "";
  root.dataset.frames = String(state.frames);
  const available = modes();
  tool("full").hidden = !available.includes("fullscreen");
  tool("pip").hidden = !available.includes("pip") || state.mode === "pip";
  tool("full").innerHTML = state.mode === "fullscreen" ? ICONS.shrink : ICONS.expand;
}

async function call(name: string, args: Record<string, unknown>): Promise<ToolAnswer> {
  return (await app.callServerTool({ name, arguments: args })) as ToolAnswer;
}

function errorOf(answer: ToolAnswer): string {
  const error = answer.structuredContent?.error;
  return typeof error === "string" ? error : "browserViewerUnavailable";
}

async function drawFrame(blob: Blob, source: Source): Promise<void> {
  await drawBlob(canvas, blob);
  state.frames++;
  state.source = source;
  root.dataset.frames = String(state.frames);
  root.dataset.source = source ?? "";
}

function adopt(view: View | null): void {
  if (!view) return;
  const restarted = state.view?.generation !== view.generation;
  state.view = view;
  if (restarted) {
    state.live = false;
    state.hasControl = false;
    state.revision = view.revision;
    state.stream = null;
    state.streamAsked = false;
    state.seq = 0;
    state.castTried = false;
    stopVoxl();
    stopCast();
  }
  if (view.revision && !state.pending) state.revision = view.revision;
  if (view.phase === "signInRequired" && !state.autoMode && modes().includes("fullscreen")) {
    state.autoMode = true;
    void setMode("fullscreen");
  }
}

function stopVoxl(): void {
  state.voxl?.close();
  state.voxl = null;
}

function startVoxl(): void {
  if (state.voxl || !state.stream || !voxlSupported()) return;
  state.voxl = connectVoxl(state.stream, canvas, () => {
    if (!state.live) {
      state.live = true;
      render();
    }
  }, () => {
    state.voxl = null;
    state.stream = null;
    render();
  });
}

function stopCast(): void {
  state.cast?.abort();
  state.cast = null;
}

function startCast(url: string): void {
  stopCast();
  const control = new AbortController();
  state.cast = control;
  let drawn = 0;
  void readCast(url, control.signal, async (blob) => {
    await drawFrame(blob, "cast");
    drawn++;
    if (!state.live) {
      state.live = true;
      render();
    }
  })
    .catch(() => undefined)
    .finally(() => {
      if (state.cast !== control) return;
      state.cast = null;
      if (drawn > 0 && !control.signal.aborted) window.setTimeout(() => (state.castTried = false), 1000);
      render();
      void loop();
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function running(): boolean {
  return Boolean(state.account) && !state.torn && !state.finished && !document.hidden;
}

async function refreshState(): Promise<void> {
  const answer = await call("browserViewDone", { account: state.account });
  state.stateAt = Date.now();
  adopt((answer.structuredContent?.view as View | undefined) ?? null);
}

async function pull(view: View): Promise<void> {
  const withState = Date.now() - state.stateAt >= STATE_EVERY_MS;
  const answer = await call("browserViewFrame", { account: state.account, generation: view.generation, after: state.seq, withState });
  if (answer.isError) {
    const code = errorOf(answer);
    state.live = false;
    if (code === "browserGenerationChanged" || code === "browserMissing") await refreshState();
    else await sleep(IDLE_MS);
    return;
  }
  const frame = answer.structuredContent as { data: string; revision: string; seq?: number; source?: string; view: View | null };
  const seq = typeof frame.seq === "number" ? frame.seq : 0;
  if (seq === 0 || seq !== state.seq || !state.live) await drawFrame(jpegBlob(frame.data), "pull");
  state.seq = seq;
  if (!state.pending) state.revision = frame.revision;
  state.live = true;
  if (withState) state.stateAt = Date.now();
  adopt(frame.view);
  if (seq === 0) await sleep(250);
}

async function step(): Promise<void> {
  const view = state.view;
  if (!view?.generation) {
    await refreshState();
    if (!state.view?.generation) await sleep(IDLE_MS);
    return;
  }
  if (view.streamKind === "voxl" && !state.stream && !state.streamAsked && voxlSupported()) {
    state.streamAsked = true;
    const answer = await call("browserViewStream", { account: state.account, generation: view.generation });
    const stream = answer.structuredContent?.stream as VoxlStream | undefined;
    if (!answer.isError && stream?.kind === "voxl") state.stream = stream;
    return;
  }
  if (state.stream && voxlSupported()) {
    startVoxl();
    state.source = "voxl";
    await refreshState();
    await sleep(STATE_EVERY_MS);
    return;
  }
  if (view.streamKind === "cast" && !state.castTried && typeof fetch === "function") {
    state.castTried = true;
    const answer = await call("browserViewStream", { account: state.account, generation: view.generation });
    const stream = answer.structuredContent?.stream as { kind?: string; url?: string } | undefined;
    if (!answer.isError && stream?.kind === "cast" && typeof stream.url === "string") startCast(stream.url);
    return;
  }
  if (state.cast) {
    await refreshState();
    await sleep(STATE_EVERY_MS);
    return;
  }
  await pull(view);
}

async function loop(): Promise<void> {
  if (state.looping) return;
  state.looping = true;
  try {
    while (running()) {
      try {
        await step();
      } catch {
        state.live = false;
        await sleep(IDLE_MS);
      }
      render();
    }
  } finally {
    state.looping = false;
  }
  if (!running()) stopCast();
  render();
}

async function pump(): Promise<void> {
  if (state.pending || !state.queue.length || !state.view?.canInteract || !state.account) return;
  const event = state.queue.shift()!;
  state.pending = true;
  render();
  try {
    const answer = await call("browserViewInput", { account: state.account, generation: state.view.generation, revision: state.revision, event });
    if (answer.isError) {
      state.queue = [];
      toast(errorOf(answer));
    } else {
      const view = answer.structuredContent?.view as View | undefined;
      state.pending = false;
      adopt(view ?? null);
    }
  } catch {
    state.queue = [];
    toast("browserViewerUnavailable");
  } finally {
    state.pending = false;
    render();
  }
  if (state.queue.length) window.setTimeout(() => void pump(), state.queue[0]?.type === "text" ? 120 : 0);
  void loop();
}

function enqueue(input: Input): void {
  if (!state.live || !state.view?.canInteract || state.queue.length >= 100) return;
  const last = state.queue.at(-1);
  if (input.type === "text" && last?.type === "text" && last.text.length + input.text.length <= 2048) last.text += input.text;
  else state.queue.push(input);
  void pump();
}

function pagePoint(fx: number, fy: number): { x: number; y: number } {
  const x = fx * canvas.width;
  const y = fy * canvas.height;
  if (state.voxl && state.stream) return { x: x - state.stream.window.left, y: y - state.stream.window.top };
  return { x, y };
}

async function setMode(mode: "inline" | "fullscreen" | "pip"): Promise<void> {
  if (!modes().includes(mode)) return;
  try {
    const answer = await app.requestDisplayMode({ mode });
    state.mode = answer.mode;
  } catch {
  }
  render();
}

async function done(): Promise<void> {
  if (!state.account) return;
  state.pending = true;
  render();
  try {
    const answer = await call("browserViewDone", { account: state.account });
    adopt((answer.structuredContent?.view as View | undefined) ?? null);
    const finished = answer.structuredContent?.done === true;
    const view = state.view;
    const text = finished
      ? `I finished in ${state.account}'s browser: the page no longer asks for sign-in${view?.address ? ` (now on ${view.address})` : ""}. Check it with browserView and carry on.`
      : `I'm done in ${state.account}'s browser, but the page still shows ${view?.pageState ?? view?.phase ?? "an unknown state"}. Check it with browserView before carrying on.`;
    await app.updateModelContext({ content: [{ type: "text", text }] }).catch(() => undefined);
    const sent = await app.sendMessage({ role: "user", content: [{ type: "text", text }] });
    state.finished = !sent.isError && finished;
    if (sent.isError) toast("The host did not take the message. Tell the agent you are done.");
    if (state.mode !== "inline") await setMode("inline");
  } catch {
    toast("The host did not take the message. Tell the agent you are done.");
  } finally {
    state.pending = false;
    render();
  }
}

type OpenAiGlobals = { theme?: unknown; displayMode?: unknown };
function openAi(): OpenAiGlobals | undefined {
  return (window as unknown as { openai?: OpenAiGlobals }).openai;
}

function themeOf(value: unknown): "light" | "dark" | null {
  return value === "light" || value === "dark" ? value : null;
}

function hostChanged(context: McpUiHostContext): void {
  const theme = themeOf(context.theme) ?? themeOf(openAi()?.theme);
  if (theme) applyDocumentTheme(theme);
  if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context.displayMode) state.mode = context.displayMode;
  render();
}

window.addEventListener("openai:set_globals", () => {
  const theme = themeOf(openAi()?.theme);
  if (theme) applyDocumentTheme(theme);
});
const openAiTheme = themeOf(openAi()?.theme);
if (openAiTheme) applyDocumentTheme(openAiTheme);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopCast();
    state.castTried = false;
    return;
  }
  void loop();
});

app.ontoolinput = (params) => {
  const account = (params.arguments as { account?: unknown } | undefined)?.account;
  if (typeof account === "string") state.account = account;
  render();
};
app.ontoolresult = (result) => {
  const answer = result as ToolAnswer;
  const given = (answer.structuredContent?.view ?? answer.structuredContent?.json) as View | undefined;
  const view = given && typeof given.phase === "string" ? given : null;
  if (view) {
    state.account = view.account;
    adopt(view);
  }
  render();
  void loop();
};
app.onhostcontextchanged = (context) => hostChanged(context as McpUiHostContext);
app.onteardown = async () => {
  state.torn = true;
  stopVoxl();
  stopCast();
  state.account = null;
  return {};
};

render();
await app.connect();
const initial = app.getHostContext();
if (initial) hostChanged(initial);
