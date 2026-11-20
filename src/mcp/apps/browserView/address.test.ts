import { describe, expect, test } from "bun:test";
import { ADDRESS_NONE, ADDRESS_WAITING, addressText, CONNECTING, frameModel, PHASE_LABELS, PHASE_NOTES } from "./widget/viewModel.ts";

describe("the browser view's address bar", () => {
  test("a page that is shown but has no web address no longer says it is waiting", () => {
    expect(addressText(null, false)).toBe(ADDRESS_WAITING);
    expect(addressText({ address: null, generation: null }, false)).toBe(ADDRESS_WAITING);
    expect(addressText({ address: null, generation: "a".repeat(32) }, false)).toBe(ADDRESS_NONE);
    expect(addressText({ address: null, generation: null }, true)).toBe(ADDRESS_NONE);
    expect(addressText({ address: "https://example.com/login", generation: "a".repeat(32) }, true)).toBe("https://example.com/login");
  });
});

describe("one view model for the console dialog and the chat's view", () => {
  const base = { platform: "Discord", account: "someone", browser: { name: "camoufox", label: "Camoufox", logo: null }, address: null, generation: "a".repeat(32), canNavigate: false, canGoBack: false, canInteract: false, hasControl: false, actions: [] };
  test("waiting, signing in, ready, view unavailable and busy each read the same on both surfaces", () => {
    const waiting = frameModel({ ...base, phase: null, live: false, connecting: true, generation: null });
    expect(waiting).toMatchObject({ title: "Discord", pill: { tone: "idle", text: "Connecting" }, address: ADDRESS_WAITING, cover: { hidden: false, spin: true, title: CONNECTING } });
    const signing = frameModel({ ...base, phase: "signInRequired", live: true, connecting: false, canInteract: true, address: "https://discord.com/login" });
    expect(signing).toMatchObject({ pill: { tone: "live", text: "Live browser" }, address: "https://discord.com/login", secure: true, take: true, input: true, cover: { hidden: true }, status: { text: PHASE_LABELS.signInRequired } });
    const ready = frameModel({ ...base, phase: "ready", live: true, connecting: false, address: "https://discord.com/channels/@me" });
    expect(ready).toMatchObject({ status: { tone: "ok", text: PHASE_LABELS.ready }, bubble: PHASE_NOTES.ready, take: false });
    const unavailable = frameModel({ ...base, phase: "viewerUnavailable", live: false, connecting: false });
    expect(unavailable).toMatchObject({ pill: { text: "Not connected" }, cover: { hidden: false, spin: false, title: PHASE_LABELS.viewerUnavailable, note: PHASE_NOTES.viewerUnavailable } });
    const busy = frameModel({ ...base, phase: "busy", live: true, connecting: false });
    expect(busy).toMatchObject({ cover: { hidden: false, spin: true, shade: true }, status: { tone: "busy" } });
    expect(frameModel({ ...base, phase: "needsAttention", live: true, connecting: false }).pill).toEqual({ tone: "stop", text: "Stopped" });
  });

  test("the page in view never says it is waiting for a page", () => {
    expect(frameModel({ ...base, phase: "ready", live: true, connecting: false, address: null }).address).toBe(ADDRESS_NONE);
  });
});
