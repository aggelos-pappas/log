import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addressOf, browserInputMode, eventOf, ownerDrivenOf, streamOf, viewerDeps, viewerFrame, viewerInput, viewerState, viewerStream, viewOf, voxlOrigins } from "./index.ts";
import { ViewerError } from "./types.ts";
import { consoleBrowserAnswer, consoleStreamDeps } from "../../console/web/helpers/browser.ts";
import type { ConnectionAccount } from "../../console/connections/index.ts";

const GENERATION = "a".repeat(32);
const REVISION = "b".repeat(64);
const NEXT = "c".repeat(64);
const TOKEN = "fixtureToken";
const PART = "--logFrame\r\nContent-Type: image/jpeg\r\nContent-Length: 4\r\n\r\njpeg\r\n";

interface Fake {
  state: { state: string; inputAllowed: boolean; blocked: boolean; busy: boolean; url: string };
  inputs: Record<string, unknown>[];
}

function fakeViewer(fake: Fake) {
  const revision = () => (fake.inputs.length ? NEXT : REVISION);
  const live = () => ({ generation: GENERATION, revision: revision(), width: 800, height: 600, historyLength: 1, stream: null, ...fake.state });
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      if (request.headers.get("authorization") !== `Bearer ${TOKEN}`) return Response.json({ error: "browserAccessDenied" }, { status: 403 });
      const path = new URL(request.url).pathname;
      if (path === "/state") return Response.json(live());
      if (path === "/stream") return new Response(new ReadableStream({ start: (controller) => controller.enqueue(new TextEncoder().encode(PART)) }), { headers: { "content-type": "multipart/x-mixed-replace; boundary=logFrame", "X-Log-Browser-Generation": GENERATION } });
      if (path === "/frame") return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { "content-type": "image/jpeg", "X-Log-Browser-Generation": GENERATION, "X-Log-Browser-Revision": revision() } });
      const body = (await request.json()) as Record<string, unknown>;
      if (body.generation !== GENERATION || body.revision !== revision()) return Response.json({ error: "browserStateChanged" }, { status: 409 });
      if (fake.state.blocked || !fake.state.inputAllowed) return Response.json({ error: "browserInputStopped" }, { status: 409 });
      fake.inputs.push(body);
      return Response.json(live());
    },
  });
}

let dir = "";
let server: ReturnType<typeof Bun.serve>;
const fake: Fake = { state: { state: "loginForm", inputAllowed: true, blocked: false, busy: false, url: "https://example.com/login?next=secret" }, inputs: [] };
const original = { ...viewerDeps };

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "viewer-"));
  mkdirSync(join(dir, "run"));
  server = fakeViewer(fake);
  writeFileSync(join(dir, "run", "browserViewer.json"), JSON.stringify({ port: server.port, token: TOKEN, generation: GENERATION, pid: process.pid }));
  viewerDeps.owner = (account) => (account === "fixtureAccount" ? { account, runDir: join(dir, "run"), commandsPath: "", repliesPath: "", startedAt: "", pid: process.pid } : null);
});

afterAll(() => {
  Object.assign(viewerDeps, original);
  server.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

describe("the viewer's stream and address", () => {
  test("streamOf takes https anywhere and http only on loopback, with the window matching the page", () => {
    const row = { kind: "voxl", url: "https://voxl.example.com/?token=x", page: { width: 800, height: 600 }, window: { left: 0, top: 0, width: 800, height: 600 } };
    expect(streamOf(row)?.url).toBe(row.url);
    expect(streamOf({ ...row, url: "http://voxl.example.com/" })).toBeNull();
    expect(streamOf({ ...row, url: "http://127.0.0.1:6901/" })?.kind).toBe("voxl");
    expect(streamOf({ ...row, window: { ...row.window, width: 801 } })).toBeNull();
    expect(streamOf({ ...row, page: { width: -1, height: 600 } })).toBeNull();
  });

  test("voxl origins follow the same rule, as https plus wss", () => {
    expect(voxlOrigins("https://voxl.example.com:8443/?token=x")).toEqual(["https://voxl.example.com:8443", "wss://voxl.example.com:8443"]);
    expect(voxlOrigins("http://127.0.0.1:6901/")).toEqual(["http://127.0.0.1:6901", "ws://127.0.0.1:6901"]);
    expect(voxlOrigins("http://voxl.example.com/")).toEqual([]);
    expect(voxlOrigins(undefined)).toEqual([]);
  });

  test("the address drops the query", () => {
    expect(addressOf("https://example.com/login?next=secret")).toBe("https://example.com/login");
    expect(addressOf("about:blank")).toBeNull();
  });

  test("phases: blocked is a stop, a sign-in state takes input, anything else is ready", () => {
    const base = { generation: GENERATION, revision: REVISION, state: "loginForm", blocked: false, inputAllowed: true, busy: false };
    expect(viewOf("a", base)).toMatchObject({ phase: "signInRequired", needsHuman: true, canInteract: true });
    expect(viewOf("a", { ...base, state: "checkpoint", blocked: true, inputAllowed: false })).toMatchObject({ phase: "needsAttention", needsHuman: true, canInteract: false });
    expect(viewOf("a", { ...base, state: "loggedIn", inputAllowed: false })).toMatchObject({ phase: "ready", needsHuman: false });
    expect(viewOf("a", { ...base, busy: true })).toMatchObject({ phase: "busy", canInteract: false });
  });

  test("a browser the owner opened to drive takes input on every page; one the agent opened only on sign-in", () => {
    const home = { generation: GENERATION, revision: REVISION, state: "unknown", blocked: false, inputAllowed: false, busy: false };
    expect(viewOf("a", home)).toMatchObject({ phase: "ready", canInteract: false });
    expect(viewOf("a", { ...home, ownerDriven: false })).toMatchObject({ phase: "ready", canInteract: false });
    expect(viewOf("a", { ...home, ownerDriven: true })).toMatchObject({ phase: "ready", needsHuman: false, canInteract: true });
    expect(viewOf("a", { ...home, ownerDriven: true, blocked: true })).toMatchObject({ phase: "needsAttention", canInteract: true });
    expect(viewOf("a", { ...home, ownerDriven: true, busy: true })).toMatchObject({ phase: "busy", canInteract: false });
  });

  test("LOG_BROWSER_INPUT picks who drives an opened browser, the owner by default", () => {
    expect(browserInputMode({})).toBe("owner");
    expect(browserInputMode({ LOG_BROWSER_INPUT: "signInOnly" })).toBe("signInOnly");
    expect(ownerDrivenOf(true, {})).toBe(true);
    expect(ownerDrivenOf(true, { LOG_BROWSER_INPUT: "signInOnly" })).toBe(false);
    expect(ownerDrivenOf(undefined, {})).toBe(false);
  });

  test("events are checked before anything is sent", () => {
    expect(eventOf({ type: "click", x: 1, y: 2 })).toEqual({ type: "click", x: 1, y: 2 });
    expect(eventOf({ type: "scroll", deltaY: 5000 })).toEqual({ type: "scroll", deltaY: 600 });
    for (const bad of [null, [], { type: "key", key: "F12" }, { type: "text", text: "" }, { type: "text", text: "x".repeat(2049) }, { type: "click", x: Number.NaN, y: 1 }, { type: "drag" }]) expect(() => eventOf(bad)).toThrow(ViewerError);
  });
});

describe("the viewer client against a running viewer", () => {
  test("a missing account has no browser", async () => {
    expect((await viewerState("nobody")).phase).toBe("browserMissing");
  });

  test("state reads the page", async () => {
    expect(await viewerState("fixtureAccount")).toMatchObject({ phase: "signInRequired", generation: GENERATION, revision: REVISION, address: "https://example.com/login", width: 800, stream: null });
  });

  test("a frame needs the current generation", async () => {
    await expect(viewerFrame("fixtureAccount", "d".repeat(32))).rejects.toThrow("browserGenerationChanged");
    const frame = await viewerFrame("fixtureAccount", GENERATION);
    expect(frame).toMatchObject({ generation: GENERATION, revision: REVISION, mimeType: "image/jpeg" });
    expect(Buffer.from(frame.data, "base64")[0]).toBe(0xff);
  });

  test("input with a stale revision is refused and nothing reaches the page", async () => {
    await expect(viewerInput("fixtureAccount", { generation: GENERATION, revision: NEXT, event: { type: "click", x: 1, y: 1 } })).rejects.toThrow("browserStateChanged");
    expect(fake.inputs).toEqual([]);
  });

  test("input with the current revision goes through and the revision moves on", async () => {
    const view = await viewerInput("fixtureAccount", { generation: GENERATION, revision: REVISION, event: { type: "text", text: "me@example.com" } });
    expect(fake.inputs).toEqual([{ type: "text", text: "me@example.com", generation: GENERATION, revision: REVISION }]);
    expect(view.revision).toBe(NEXT);
  });

  test("a page that no longer asks for sign-in refuses input", async () => {
    fake.state = { ...fake.state, state: "loggedIn", inputAllowed: false };
    await expect(viewerInput("fixtureAccount", { generation: GENERATION, revision: NEXT, event: { type: "key", key: "Enter" } })).rejects.toThrow("browserInputStopped");
    fake.state = { ...fake.state, state: "loginForm", inputAllowed: true };
  });

  test("the stream needs the current generation and hands back the viewer's multipart body", async () => {
    await expect(viewerStream("fixtureAccount", "d".repeat(32), AbortSignal.timeout(5000))).rejects.toThrow("browserGenerationChanged");
    const controller = new AbortController();
    const response = await viewerStream("fixtureAccount", GENERATION, controller.signal);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe(PART);
    controller.abort();
    await reader.cancel().catch(() => {});
  });

  test("the console pipes the stream through for a known account and the console's own header only", async () => {
    const held = consoleStreamDeps.account;
    consoleStreamDeps.account = (accountId) => (accountId === "a1" ? ({ id: "a1", name: "fixtureAccount" } as ConnectionAccount) : null);
    try {
      const url = (accountId: string) => new URL(`http://127.0.0.1/api/console/browserCheck/stream?accountId=${accountId}&generation=${GENERATION}`);
      const controller = new AbortController();
      const answer = await consoleBrowserAnswer(url("a1"), new Request(url("a1").href, { headers: { "x-log-console": "1" }, signal: controller.signal }))!;
      expect(answer.status).toBe(200);
      expect(answer.headers.get("content-type")).toStartWith("multipart/x-mixed-replace");
      expect(answer.headers.get("X-Log-Browser-Generation")).toBe(GENERATION);
      const reader = answer.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toBe(PART);
      controller.abort();
      await reader.cancel().catch(() => {});
      expect((await consoleBrowserAnswer(url("a1"), new Request(url("a1").href))!).status).toBe(405);
      expect((await consoleBrowserAnswer(url("a2"), new Request(url("a2").href, { headers: { "x-log-console": "1" } }))!).status).toBe(404);
      const stale = new URL(`http://127.0.0.1/api/console/browserCheck/stream?accountId=a1&generation=${"d".repeat(32)}`);
      const refused = await consoleBrowserAnswer(stale, new Request(stale.href, { headers: { "x-log-console": "1" } }))!;
      expect(refused.status).toBe(409);
      expect(await refused.json()).toEqual({ error: "browserGenerationChanged" });
    } finally {
      consoleStreamDeps.account = held;
    }
  });

  test("the local console answers the same routes, and refuses a bad account name", async () => {
    const state = await consoleBrowserAnswer(new URL("http://127.0.0.1/api/console/browser?account=fixtureAccount"), new Request("http://127.0.0.1/api/console/browser?account=fixtureAccount"))!;
    expect(((await state.json()) as { view: { phase: string } }).view.phase).toBe("signInRequired");
    const frame = await consoleBrowserAnswer(new URL(`http://127.0.0.1/api/console/browser/frame?account=fixtureAccount&generation=${GENERATION}`), new Request("http://127.0.0.1/"))!;
    expect(frame.headers.get("content-type")).toBe("image/jpeg");
    const body = JSON.stringify({ account: "fixtureAccount", generation: GENERATION, revision: REVISION, event: { type: "click", x: 3, y: 4 } });
    const stale = await consoleBrowserAnswer(new URL("http://127.0.0.1/api/console/browser/input"), new Request("http://127.0.0.1/api/console/browser/input", { method: "POST", body, headers: { "content-type": "application/json", "Content-Length": String(body.length) } }))!;
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "browserStateChanged" });
    const bad = await consoleBrowserAnswer(new URL("http://127.0.0.1/api/console/browser?account=../x"), new Request("http://127.0.0.1/"))!;
    expect(bad.status).toBe(400);
    expect(consoleBrowserAnswer(new URL("http://127.0.0.1/api/console/events"), new Request("http://127.0.0.1/"))).toBeNull();
  });
});
