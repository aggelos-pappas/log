import { describe, expect, test } from "bun:test";
import { ADDRESS_NONE, ADDRESS_WAITING, addressText, CONNECTING, DRIVE_LABEL, ERROR_TITLES, errorLabel, frameModel, PHASE_LABELS, PHASE_NOTES, phaseLabel, pullFailure, STOPPED_PREFIX, viewStatus } from "./widget/viewModel.ts";

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

  test("a browser the owner drives takes input on any page and its footer says where the input goes", () => {
    const driven = frameModel({ ...base, phase: "ready", live: true, connecting: false, canInteract: true, address: "https://discord.com/app" });
    expect(driven).toMatchObject({ input: true, take: true, bubble: null, status: { tone: "ok", text: DRIVE_LABEL } });
    expect(DRIVE_LABEL).toBe("Click and type here; it goes to the account's browser");
    expect(phaseLabel("ready", true)).toBe(DRIVE_LABEL);
    expect(phaseLabel("ready", false)).toBe(PHASE_LABELS.ready);
    expect(phaseLabel("signInRequired", true)).toBe(PHASE_LABELS.signInRequired);
    expect(phaseLabel("busy", true)).toBe(PHASE_LABELS.busy);
  });

  test("the page in view never says it is waiting for a page", () => {
    expect(frameModel({ ...base, phase: "ready", live: true, connecting: false, address: null }).address).toBe(ADDRESS_NONE);
  });
});

describe("a card whose stream fails says so instead of spinning on Connecting", () => {
  const ready = { phase: "ready", generation: "a".repeat(32) };
  const base = { platform: "Discord", account: "someone", browser: null, address: "https://discord.com/quest-home", generation: ready.generation, canNavigate: false, canGoBack: false, canInteract: true, hasControl: false, actions: [], phase: "ready" as const, live: false };

  test("every failed frame pull reads the page again, and only a real failure is kept to show", () => {
    expect(pullFailure("browserViewerUnavailable")).toEqual({ refresh: true, error: "browserViewerUnavailable" });
    expect(pullFailure("logAppUnknown")).toEqual({ refresh: true, error: "logAppUnknown" });
    expect(pullFailure("browserGenerationChanged")).toEqual({ refresh: true, error: null });
    expect(pullFailure("browserMissing")).toEqual({ refresh: true, error: null });
  });

  test("a ready browser whose viewer stopped answering shows the failure, not Connecting to browser…", () => {
    expect(viewStatus(ready, false, null)).toEqual({ connecting: true, failed: false, label: null });
    const status = viewStatus(ready, false, "browserViewerUnavailable");
    expect(status).toEqual({ connecting: false, failed: true, label: ERROR_TITLES.browserViewerUnavailable });
    const model = frameModel({ ...base, ...status });
    expect(model.status.text).toBe("The browser view could not be reached");
    expect(model.status.text).not.toBe(CONNECTING);
    expect(model).toMatchObject({ status: { tone: "stop" }, cover: { hidden: false, spin: false, title: ERROR_TITLES.browserViewerUnavailable }, pill: { text: "Not connected" } });
  });

  test("an error thrown inside the loop is shown with its own text", () => {
    expect(errorLabel("TypeError: x is undefined")).toBe(`${STOPPED_PREFIX}TypeError: x is undefined`);
    const status = viewStatus(ready, false, "TypeError: x is undefined");
    expect(frameModel({ ...base, ...status }).cover.title).toBe("The live view stopped: TypeError: x is undefined");
  });

  test("once frames arrive the card is live again", () => {
    expect(viewStatus(ready, true, "browserViewerUnavailable")).toEqual({ connecting: false, failed: false, label: null });
    expect(viewStatus({ phase: "viewerUnavailable", generation: null }, false, null)).toEqual({ connecting: false, failed: false, label: null });
    expect(viewStatus(null, false, null).connecting).toBe(true);
  });
});
