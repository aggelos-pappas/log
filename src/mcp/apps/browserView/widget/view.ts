import { FRAME_CSS, FRAME_STYLE_ID } from "./viewStyle.ts";
import { ADDRESS_WAITING, CONNECTING, TAKE_CONTROL } from "./viewModel.ts";
import type { FrameAction, FrameIcon, FrameModel } from "./viewModel.ts";

export * from "./viewModel.ts";

const SVG = (body: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<FrameIcon, string> = {
  screen: SVG('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  back: SVG('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  reload: SVG('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  lock: SVG('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  close: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  expand: SVG('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  shrink: SVG('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  pip: SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>'),
  pointer: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3l14 7-6 2-2 6z"/></svg>',
  check: SVG('<path d="M5 12l5 5L20 7"/>'),
  user: SVG('<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 14 0M16 11l2 2 4-4"/>'),
  save: SVG('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'),
  spinner: SVG('<path d="M12 3a9 9 0 1 0 9 9"/>'),
  open: SVG('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
};

export const FRAME_MARKUP = `
<header class="lbvHead">
  <div class="lbvBar">
    <span class="lbvMark">${ICONS.screen}</span>
    <span class="lbvWho"><strong data-ref="title">Live browser</strong><span data-ref="account"></span></span>
    <span class="lbvBadge" data-ref="badge" data-browser-badge="" title="The browser this account opens in" hidden><img data-ref="badgeLogo" alt="" hidden><span data-ref="badgeLabel"></span></span>
    <span class="lbvPill" data-ref="pill"><i></i><span data-ref="pillText">Connecting</span></span>
    <span class="lbvTools" data-ref="tools"></span>
  </div>
  <div class="lbvNav">
    <button class="lbvIcon" type="button" data-action="back" data-ref="back" title="Go back" aria-label="Go back" disabled>${ICONS.back}</button>
    <button class="lbvIcon" type="button" data-action="reload" data-ref="reload" title="Reload page" aria-label="Reload page" disabled>${ICONS.reload}</button>
    <div class="lbvAddress" role="group" aria-label="Browser address"><span data-ref="lock" hidden>${ICONS.lock}</span><span data-ref="address">${ADDRESS_WAITING}</span></div>
  </div>
</header>
<div class="lbvLive" role="status" aria-live="polite" data-ref="live" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>
<div class="lbvStage" data-ref="stage">
  <canvas class="lbvCanvas" data-ref="canvas" width="1280" height="800" role="application" aria-label="Live browser. Click into the page, then type."></canvas>
  <textarea class="lbvKeys" data-ref="keys" aria-label="Type into the page" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
  <button class="lbvTake" type="button" data-ref="take" hidden>${ICONS.pointer}${TAKE_CONTROL}</button>
  <div class="lbvCover" data-ref="cover"><div class="lbvSpin" data-ref="spin"></div><span data-ref="idle" hidden>${ICONS.screen}</span><h2 data-ref="coverTitle">${CONNECTING}</h2><p data-ref="coverNote"></p><div class="lbvCoverActions" data-ref="coverActions"></div></div>
  <p class="lbvNote" data-ref="note" hidden></p>
  <div class="lbvToast" data-ref="toast" role="alert" hidden><strong data-ref="toastTitle"></strong><span data-ref="toastBody"></span></div>
</div>
<footer class="lbvFoot"><p class="lbvStatus" data-ref="status"><span data-ref="statusIcon"></span><span data-ref="statusText">${CONNECTING}</span></p><div class="lbvActions" data-ref="actions"></div></footer>`;

export interface FrameHandlers {
  onAction?: (id: string) => void;
  onPoint?: (fx: number, fy: number) => void;
  onText?: (text: string) => void;
  onKey?: (key: string) => void;
  onScroll?: (deltaY: number) => void;
  onTake?: () => void;
}

export const FRAME_KEYS = ["Enter", "Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Home", "End"] as const;

export interface BrowserFrame {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  tools: HTMLElement;
  paint(model: FrameModel): void;
  toast(title: string, body?: string): void;
  focusKeys(): void;
  destroy(): void;
}

function ensureStyle(doc: Document): void {
  if (doc.getElementById(FRAME_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = FRAME_STYLE_ID;
  style.textContent = FRAME_CSS;
  doc.head.appendChild(style);
}

function buttonHtml(action: FrameAction): string {
  const icon = action.busy ? ICONS.spinner : action.icon ? ICONS[action.icon] : "";
  return `<button class="lbvButton" type="button" data-action="${action.id}" data-primary="${Boolean(action.primary)}" data-busy="${Boolean(action.busy)}"${action.disabled ? " disabled" : ""}>${icon}<span></span></button>`;
}

function setButtons(host: HTMLElement, actions: FrameAction[]): void {
  const key = JSON.stringify(actions);
  if (host.dataset.key === key) return;
  host.dataset.key = key;
  host.innerHTML = actions.map(buttonHtml).join("");
  host.querySelectorAll("button").forEach((button, index) => {
    (button.querySelector("span") as HTMLElement).textContent = actions[index].label;
  });
}

export function mountBrowserFrame(root: HTMLElement, handlers: FrameHandlers): BrowserFrame {
  ensureStyle(root.ownerDocument);
  root.classList.add("lbv");
  root.innerHTML = FRAME_MARKUP;
  const ref = <T extends HTMLElement>(name: string) => root.querySelector(`[data-ref="${name}"]`) as T;
  const canvas = ref<HTMLCanvasElement>("canvas");
  const keys = ref<HTMLTextAreaElement>("keys");
  let model: FrameModel | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  const focusKeys = () => keys.focus({ preventScroll: true });
  const pointOf = (event: MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return { fx: (event.clientX - rect.left) / rect.width, fy: (event.clientY - rect.top) / rect.height };
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const action = target.closest("[data-action]") as HTMLElement | null;
    if (action && root.contains(action)) {
      if (!(action as HTMLButtonElement).disabled) handlers.onAction?.(action.dataset.action ?? "");
      return;
    }
    if (target.closest('[data-ref="take"]')) {
      focusKeys();
      handlers.onTake?.();
      return;
    }
    if (target === canvas || target.classList.contains("lbvHit")) {
      if (!model?.input) return;
      focusKeys();
      const { fx, fy } = pointOf(event, target);
      handlers.onPoint?.(fx, fy);
    }
  };
  const onWheel = (event: WheelEvent) => {
    const target = event.target as HTMLElement;
    if (!model?.input || (target !== canvas && !target.classList.contains("lbvHit"))) return;
    event.preventDefault();
    handlers.onScroll?.(Math.max(-600, Math.min(600, event.deltaY)));
  };
  const onInput = () => {
    const text = keys.value;
    keys.value = "";
    if (text && text.length <= 2048) handlers.onText?.(text);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.altKey || event.metaKey || event.ctrlKey || !model?.input) return;
    if ((FRAME_KEYS as readonly string[]).includes(event.key)) {
      event.preventDefault();
      handlers.onKey?.(event.key);
    }
  };
  root.addEventListener("click", onClick);
  root.addEventListener("wheel", onWheel, { passive: false });
  keys.addEventListener("input", onInput);
  keys.addEventListener("keydown", onKeyDown);
  const paint = (next: FrameModel) => {
    model = next;
    ref("title").textContent = next.title;
    ref("account").textContent = next.accountLine;
    const badge = ref("badge");
    badge.hidden = !next.badge;
    badge.dataset.browserBadge = next.badge?.name ?? "";
    ref("badgeLabel").textContent = next.badge?.label ?? "";
    const logo = ref<HTMLImageElement>("badgeLogo");
    logo.hidden = !next.badge?.logo;
    if (next.badge?.logo && logo.getAttribute("src") !== next.badge.logo) logo.src = next.badge.logo;
    const pill = ref("pill");
    pill.dataset.tone = next.pill.tone;
    ref("pillText").textContent = next.pill.text;
    ref("address").textContent = next.address;
    ref("lock").hidden = !next.secure;
    ref<HTMLButtonElement>("back").disabled = !next.nav.back;
    ref<HTMLButtonElement>("reload").disabled = !next.nav.reload;
    ref("reload").dataset.spin = String(next.nav.spinning);
    canvas.dataset.live = String(next.live && !next.streamUrl);
    canvas.dataset.input = String(next.input);
    const stage = ref("stage");
    let frame = stage.querySelector("iframe.lbvFrame") as HTMLIFrameElement | null;
    if (next.streamUrl && !frame) {
      frame = root.ownerDocument.createElement("iframe");
      frame.className = "lbvFrame";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
      frame.title = "Browser stream";
      const hit = root.ownerDocument.createElement("div");
      hit.className = "lbvFrame lbvHit";
      hit.setAttribute("role", "application");
      stage.prepend(hit);
      stage.prepend(frame);
    }
    if (frame && next.streamUrl && frame.src !== next.streamUrl) frame.src = next.streamUrl;
    if (frame && !next.streamUrl) stage.querySelectorAll(".lbvFrame").forEach((node) => node.remove());
    const cover = ref("cover");
    cover.hidden = next.cover.hidden;
    cover.dataset.shade = String(next.cover.shade);
    ref("spin").hidden = !next.cover.spin;
    ref("idle").hidden = next.cover.spin;
    ref("coverTitle").textContent = next.cover.title;
    ref("coverNote").textContent = next.cover.note;
    ref("coverNote").hidden = !next.cover.note;
    setButtons(ref("coverActions"), next.coverActions);
    ref("take").hidden = !next.take;
    const bubble = ref("note");
    bubble.hidden = !next.bubble;
    bubble.textContent = next.bubble ?? "";
    const status = ref("status");
    status.dataset.tone = next.status.tone;
    ref("statusIcon").innerHTML = next.status.tone === "busy" ? ICONS.spinner : next.status.tone === "ok" ? ICONS.check : ICONS.screen;
    ref("statusText").textContent = next.status.text;
    ref("live").textContent = next.status.text;
    setButtons(ref("actions"), next.actions);
    root.dataset.mode = next.mode;
  };
  return {
    root,
    canvas,
    tools: ref("tools"),
    paint,
    toast(title, body = "") {
      ref("toastTitle").textContent = title;
      ref("toastBody").textContent = body;
      ref("toast").hidden = false;
      if (toastTimer !== null) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (ref("toast").hidden = true), 4000);
    },
    focusKeys,
    destroy() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("wheel", onWheel);
      keys.removeEventListener("input", onInput);
      keys.removeEventListener("keydown", onKeyDown);
      if (toastTimer !== null) clearTimeout(toastTimer);
      root.innerHTML = "";
      root.classList.remove("lbv");
    },
  };
}
