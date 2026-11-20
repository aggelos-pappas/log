import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { drawBlob, jpegBlob, readCast } from "./cast.ts";
import { connectVoxl, voxlSupported } from "./voxl.ts";
import type { VoxlConnection, VoxlStream } from "./voxl.ts";

type Phase = "browserMissing" | "viewerUnavailable" | "signInRequired" | "needsAttention" | "busy" | "ready";
interface View {
  account: string;
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

const KEYS = ["Enter", "Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Home", "End"];
const TITLES: Record<Phase, string> = { browserMissing: "No browser is open", viewerUnavailable: "Browser view unavailable", signInRequired: "Sign in here", needsAttention: "This page needs a person", busy: "The browser is working", ready: "Signed in" };
const NOTES: Record<Phase, string> = {
  browserMissing: "Ask the agent to open this account's browser, then it shows here.",
  viewerUnavailable: "The browser is open, but its view could not be reached. Nothing was sent to the page.",
  signInRequired: "Click a field in the page and type. Your clicks and keys go to this account's browser, each one a recorded step.",
  needsAttention: "This page is a stop: input is off. Clear it yourself, then tell the agent.",
  busy: "The browser is running a step. It shows here in a moment.",
  ready: "The page no longer asks for sign-in. Press Done so the agent carries on.",
};
const ERRORS: Record<string, string> = {
  browserStateChanged: "The page changed before your input, so it was not sent.",
  browserInputStopped: "The page no longer asks for sign-in, so input is off.",
  browserBusy: "The browser is running another step. Try again in a moment.",
  browserGenerationChanged: "The account's browser was restarted.",
  browserViewerUnavailable: "The browser view could not be reached.",
  browserInputInvalid: "That input was rejected.",
  browserInputFailed: "That input failed in the browser.",
  browserMissing: "No browser is open for this account.",
};
const ICON = {
  screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  pip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/></svg>',
  pointer: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M5 3l14 7-6 2-2 6z"/></svg>',
};

const root = document.getElementById("app") as HTMLElement;
root.innerHTML = `
<div class="head">
  <div class="bar">
    <span class="mark">${ICON.screen}</span>
    <span class="who"><strong data-ref="title">Live browser</strong><span data-ref="account">Waiting for the agent…</span></span>
    <span class="pill" data-ref="pill"><i></i><span data-ref="pillText">Connecting</span></span>
    <button class="icon" data-ref="pip" type="button" title="Picture in picture" aria-label="Picture in picture" hidden>${ICON.pip}</button>
    <button class="icon" data-ref="full" type="button" title="Full screen" aria-label="Full screen" hidden>${ICON.expand}</button>
  </div>
  <div class="address" data-ref="address" role="group" aria-label="Browser address">Waiting for page…</div>
</div>
<div class="stage" data-ref="stage">
  <canvas data-ref="canvas" width="1280" height="800" role="application" aria-label="Live browser. Click into the page, then type."></canvas>
  <textarea class="keys" data-ref="keys" aria-label="Type into the page" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
  <button class="take" data-ref="take" type="button" hidden>${ICON.pointer}Click to take control</button>
  <div class="cover" data-ref="cover"><div class="spin" data-ref="spin"></div><h2 data-ref="coverTitle">Connecting to the browser…</h2><p data-ref="coverNote"></p></div>
  <p class="note" data-ref="note" hidden></p>
  <div class="toast" data-ref="toast" role="alert" hidden><strong data-ref="toastTitle"></strong><span data-ref="toastBody"></span></div>
</div>
<div class="foot"><p data-ref="hint">The agent waits while you sign in.</p><button class="done" data-ref="done" type="button" disabled>Done, carry on</button></div>`;
const ref = <T extends HTMLElement>(name: string) => root.querySelector(`[data-ref="${name}"]`) as T;
const canvas = ref<HTMLCanvasElement>("canvas");
const keys = ref<HTMLTextAreaElement>("keys");
const context2d = canvas.getContext("2d");

type Source = "cast" | "pull" | "voxl" | null;
const state: { account: string | null; view: View | null; revision: string | null; live: boolean; hasControl: boolean; pending: boolean; queue: Input[]; stream: VoxlStream | null; voxl: VoxlConnection | null; finished: boolean; autoMode: boolean; mode: string; streamAsked: boolean; seq: number; cast: AbortController | null; castTried: boolean; looping: boolean; torn: boolean; frames: number; source: Source; stateAt: number } = {
  account: null, view: null, revision: null, live: false, hasControl: false, pending: false, queue: [], stream: null, voxl: null, finished: false, autoMode: false, mode: "inline", streamAsked: false, seq: 0, cast: null, castTried: false, looping: false, torn: false, frames: 0, source: null, stateAt: 0,
};
const STATE_EVERY_MS = 1000;
const IDLE_MS = 1500;

const app = new App({ name: "logBrowserView", version: "1.0.0" }, { availableDisplayModes: ["inline", "fullscreen", "pip"] }, { autoResize: true });

let toastTimer: number | null = null;
function toast(code: string): void {
  ref("toastTitle").textContent = ERRORS[code] ?? "The browser operation failed.";
  ref("toastBody").textContent = ERRORS[code] ? "" : code;
  ref("toast").hidden = false;
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (ref("toast").hidden = true), 4000);
}

function modes(): string[] {
  return app.getHostContext()?.availableDisplayModes ?? [];
}

function render(): void {
  const view = state.view;
  const phase = view?.phase;
  const connecting = !view || (Boolean(view.generation) && !state.live && phase !== "browserMissing" && phase !== "viewerUnavailable");
  ref("account").textContent = view ? `${view.account}${view.pageState ? ` · ${view.pageState}` : ""}` : "Waiting for the agent…";
  ref("title").textContent = phase ? TITLES[phase] : "Live browser";
  ref("address").textContent = view?.address ?? "Waiting for page…";
  const pill = ref("pill");
  pill.dataset.tone = phase === "needsAttention" ? "stop" : state.live ? "live" : "";
  ref("pillText").textContent = phase === "needsAttention" ? "Stopped" : state.live ? (state.source === "pull" ? "Live (frames)" : "Live") : "Not connected";
  root.dataset.source = state.source ?? "";
  root.dataset.frames = String(state.frames);
  canvas.dataset.live = String(state.live);
  canvas.dataset.input = String(Boolean(view?.canInteract) && state.live);
  ref("cover").hidden = state.live && !connecting;
  ref("spin").hidden = !connecting && phase !== "busy";
  ref("coverTitle").textContent = connecting ? "Connecting to the browser…" : phase ? TITLES[phase] : "";
  ref("coverNote").textContent = phase && !connecting ? NOTES[phase] : "";
  ref("take").hidden = !(state.live && view?.canInteract && !state.hasControl);
  const note = ref("note");
  note.hidden = !(state.live && phase && phase !== "signInRequired");
  note.textContent = phase ? NOTES[phase] : "";
  const done = ref<HTMLButtonElement>("done");
  done.disabled = !view || state.pending || state.finished;
  done.textContent = state.finished ? "Agent told" : "Done, carry on";
  ref("hint").textContent = state.finished ? "The agent was told to carry on." : phase === "needsAttention" ? "Input is off on this page." : "The agent waits while you sign in.";
  const available = modes();
  ref("full").hidden = !available.includes("fullscreen");
  ref("pip").hidden = !available.includes("pip") || state.mode === "pip";
  ref("full").innerHTML = state.mode === "fullscreen" ? ICON.shrink : ICON.expand;
  root.dataset.mode = state.mode;
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

function pagePoint(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  if (state.voxl && state.stream) return { x: x - state.stream.window.left, y: y - state.stream.window.top };
  return { x, y };
}

canvas.addEventListener("click", (event) => {
  if (!state.view?.canInteract) return;
  keys.focus({ preventScroll: true });
  state.hasControl = true;
  enqueue({ type: "click", ...pagePoint(event) });
  render();
});
canvas.addEventListener("wheel", (event) => {
  if (!state.view?.canInteract) return;
  event.preventDefault();
  enqueue({ type: "scroll", deltaY: Math.max(-600, Math.min(600, event.deltaY)) });
}, { passive: false });
keys.addEventListener("input", () => {
  const text = keys.value;
  keys.value = "";
  if (text && text.length <= 2048) enqueue({ type: "text", text });
});
keys.addEventListener("keydown", (event) => {
  if (event.isComposing || event.altKey || event.metaKey || event.ctrlKey || !state.view?.canInteract) return;
  if (KEYS.includes(event.key)) {
    event.preventDefault();
    enqueue({ type: "key", key: event.key });
  }
});
ref("take").addEventListener("click", () => {
  state.hasControl = true;
  keys.focus({ preventScroll: true });
  render();
});

async function setMode(mode: "inline" | "fullscreen" | "pip"): Promise<void> {
  if (!modes().includes(mode)) return;
  try {
    const answer = await app.requestDisplayMode({ mode });
    state.mode = answer.mode;
  } catch {
  }
  render();
}

ref("full").addEventListener("click", () => void setMode(state.mode === "fullscreen" ? "inline" : "fullscreen"));
ref("pip").addEventListener("click", () => void setMode("pip"));
ref("done").addEventListener("click", async () => {
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
});

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
