export type FrameIcon = "screen" | "back" | "reload" | "lock" | "close" | "expand" | "shrink" | "pip" | "pointer" | "check" | "user" | "save" | "spinner" | "open";

export const FRAME_PHASES = ["browserMissing", "viewerUnavailable", "signInRequired", "needsAttention", "busy", "ready", "verified", "needsResolution", "operationUncertain", "providerSetupRequired", "profileRequired"] as const;
export type FramePhase = (typeof FRAME_PHASES)[number];

export const PHASE_LABELS: Record<FramePhase, string> = {
  browserMissing: "Browser is not running",
  viewerUnavailable: "Browser view unavailable",
  signInRequired: "Sign-in required",
  needsAttention: "Your attention is required",
  busy: "Browser is working…",
  ready: "Browser connected",
  verified: "Session verified",
  needsResolution: "Check needs resolving",
  operationUncertain: "Browser operation not confirmed",
  providerSetupRequired: "Browser setup required",
  profileRequired: "Browser profile required",
};

export const PHASE_NOTES: Record<FramePhase, string> = {
  browserMissing: "No browser is open for this account. Open it, and it shows here.",
  viewerUnavailable: "The browser is open, but its view could not be reached. Nothing was sent to the page.",
  signInRequired: "Click a field in the page and type. Your clicks and keys go to this account's browser, each one a recorded step.",
  needsAttention: "This page needs a person. Input stays off and the run is stopped.",
  busy: "The browser is running a step. It shows here in a moment.",
  ready: "The page no longer asks for sign-in.",
  verified: "The session was confirmed from the page. Save it to finish.",
  needsResolution: "Resolve the recorded check, then verify the session.",
  operationUncertain: "The runtime has not confirmed the last operation.",
  providerSetupRequired: "Configure AdsPower in Extensions.",
  profileRequired: "Link this account to its own AdsPower profile.",
};

export const ERROR_TITLES: Record<string, string> = {
  browserStateChanged: "The page changed first, so nothing was sent",
  browserInputStopped: "The page no longer allows that",
  browserBusy: "The browser is running another step",
  browserGenerationChanged: "The account browser was restarted",
  browserViewerUnavailable: "The browser view could not be reached",
  browserInputInvalid: "That input was rejected",
  browserInputFailed: "That input failed in the browser",
  browserMissing: "No browser is open for this account",
  browserCheckUnresolved: "The check is not resolved yet",
  browserOperationRefused: "log refused that browser step",
  accountDeactivated: "Browser check stopped",
  accountCheckStopped: "Browser check stopped",
};

export const CONNECTING = "Connecting to browser…";
export const ADDRESS_WAITING = "Waiting for page…";
export const ADDRESS_NONE = "This page has no web address";
export const TAKE_CONTROL = "Click to take control";

export function addressText(view: { address: string | null; generation: string | null } | null, live: boolean): string {
  if (view?.address) return view.address;
  return live || view?.generation ? ADDRESS_NONE : ADDRESS_WAITING;
}

export interface FrameAction {
  id: string;
  label: string;
  icon?: FrameIcon;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}

export interface FrameInput {
  platform: string | null;
  account: string | null;
  pageState?: string | null;
  browser: { name: string; label: string; logo: string | null } | null;
  phase: FramePhase | null;
  live: boolean;
  connecting: boolean;
  failed?: boolean;
  label?: string | null;
  note?: string | null;
  address: string | null;
  generation: string | null;
  canNavigate: boolean;
  canGoBack: boolean;
  navigating?: boolean;
  canInteract: boolean;
  hasControl: boolean;
  actions: FrameAction[];
  coverActions?: FrameAction[];
  streamUrl?: string | null;
  mode?: string;
}

export interface FrameModel {
  title: string;
  accountLine: string;
  badge: { label: string; logo: string | null; name: string } | null;
  pill: { tone: "live" | "stop" | "idle"; text: string };
  address: string;
  secure: boolean;
  nav: { back: boolean; reload: boolean; spinning: boolean };
  cover: { hidden: boolean; spin: boolean; shade: boolean; title: string; note: string };
  take: boolean;
  bubble: string | null;
  status: { tone: "busy" | "ok" | "stop" | "idle"; text: string };
  actions: FrameAction[];
  coverActions: FrameAction[];
  input: boolean;
  live: boolean;
  streamUrl: string | null;
  mode: string;
}

export function frameModel(input: FrameInput): FrameModel {
  const phase = input.phase;
  const stopped = phase === "needsAttention";
  const busy = input.connecting || phase === "busy";
  const label = input.label ?? (input.connecting ? CONNECTING : phase ? PHASE_LABELS[phase] : CONNECTING);
  const note = input.note ?? (phase ? PHASE_NOTES[phase] : "");
  const showCover = !input.live || busy || Boolean(input.failed);
  return {
    title: input.platform ?? "Live browser",
    accountLine: input.account ? `${input.account}${input.pageState ? ` · ${input.pageState}` : ""}` : "",
    badge: input.browser ? { label: input.browser.label, logo: input.browser.logo, name: input.browser.name } : null,
    pill: stopped ? { tone: "stop", text: "Stopped" } : input.live && !input.failed ? { tone: "live", text: "Live browser" } : { tone: "idle", text: busy ? "Connecting" : "Not connected" },
    address: addressText({ address: input.address, generation: input.generation }, input.live),
    secure: Boolean(input.address?.startsWith("https://")),
    nav: { back: input.canNavigate && input.canGoBack, reload: input.canNavigate, spinning: Boolean(input.navigating) },
    cover: { hidden: !showCover, spin: busy, shade: input.live, title: label, note: busy ? "" : note },
    take: input.live && input.canInteract && !input.hasControl && !busy,
    bubble: input.live && !showCover && phase && phase !== "signInRequired" ? note || null : null,
    status: { tone: busy ? "busy" : input.failed || stopped ? "stop" : phase === "verified" || phase === "ready" ? "ok" : "idle", text: label },
    actions: input.actions,
    coverActions: input.coverActions ?? [],
    input: input.live && input.canInteract,
    live: input.live,
    streamUrl: input.streamUrl ?? null,
    mode: input.mode ?? "inline",
  };
}

