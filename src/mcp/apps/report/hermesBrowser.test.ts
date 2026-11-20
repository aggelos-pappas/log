import { describe, expect, test } from "bun:test";
import { join } from "node:path";

type Rest = (path: string, opts?: { method?: string; body?: unknown }) => Promise<unknown>;
interface BrowserApi {
  state(account: string): Promise<{ phase: string }>;
  ticket(account: string, generation: string): Promise<string | null>;
  frame(account: string, generation: string, after: number): Promise<{ data: string; revision: string | null; seq: number } | null>;
  input(account: string, generation: string, revision: string | null, event: Record<string, unknown>): Promise<{ view: { phase: string } | null; error: string | null }>;
}

const { browserApi, BROWSER_CSS, BROWSER_DIRECTIVE } = (await import(join(import.meta.dir, "view", "hermesBrowser.tsx"))) as { browserApi: (rest: Rest) => BrowserApi; BROWSER_CSS: string; BROWSER_DIRECTIVE: string };

function fakeRest(answers: Record<string, unknown>) {
  const calls: { path: string; opts?: { method?: string; body?: unknown } }[] = [];
  const rest = async (path: string, opts?: { method?: string; body?: unknown }) => {
    calls.push({ path, opts });
    const key = Object.keys(answers).find((prefix) => path.startsWith(prefix));
    const answer = key ? answers[key] : undefined;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { rest, calls };
}

const VIEW = { account: "fakeSeller", phase: "signInRequired", generation: "a".repeat(32), revision: "b".repeat(64), pageState: "loginForm", address: "https://example.com/login", canInteract: true };

describe("the live browser drawn inside Hermes Desktop", () => {
  test("the model writes ::logbrowser and the look follows Hermes's theme variables, light and dark", () => {
    expect(BROWSER_DIRECTIVE).toBe("logbrowser");
    expect(BROWSER_CSS).toContain("var(--ui-text-primary");
    expect(BROWSER_CSS).toContain("var(--ui-bg-editor");
    expect(BROWSER_CSS).toContain(".dark .logbrowser");
  });

  test("reads the view, a one-time loopback stream and frames through log's own plugin routes", async () => {
    const { rest, calls } = fakeRest({ "/browser/fakeSeller/ticket": { url: "http://127.0.0.1:5123/stream?ticket=abcdefghijklmnopqrstuv" }, "/browser/fakeSeller/frame": { data: "/9g=", revision: VIEW.revision, seq: 7 }, "/browser/fakeSeller": { view: VIEW } });
    const api = browserApi(rest);
    expect((await api.state("fakeSeller")).phase).toBe("signInRequired");
    expect(await api.ticket("fakeSeller", VIEW.generation)).toBe("http://127.0.0.1:5123/stream?ticket=abcdefghijklmnopqrstuv");
    expect(calls.at(-1)).toEqual({ path: "/browser/fakeSeller/ticket", opts: { method: "POST", body: { generation: VIEW.generation } } });
    expect(await api.frame("fakeSeller", VIEW.generation, 6)).toEqual({ data: "/9g=", revision: VIEW.revision, seq: 7 });
    expect(calls.at(-1)?.path).toBe(`/browser/fakeSeller/frame?generation=${VIEW.generation}&after=6`);
  });

  test("a stream URL that is not loopback is never opened, and an unreachable viewer reads as unavailable", async () => {
    const { rest } = fakeRest({ "/browser/fakeSeller/ticket": { url: "https://example.com/stream" }, "/browser/fakeSeller": new Error("503") });
    const api = browserApi(rest);
    expect(await api.ticket("fakeSeller", VIEW.generation)).toBeNull();
    expect((await api.state("fakeSeller")).phase).toBe("viewerUnavailable");
  });

  test("input goes through the same gate: a refusal comes back as its code, an answer as the new view", async () => {
    const refused = browserApi(fakeRest({ "/browser/fakeSeller/input": new Error('409: {"error":"browserInputStopped"}') }).rest);
    expect(await refused.input("fakeSeller", VIEW.generation, VIEW.revision, { type: "click", x: 1, y: 2 })).toEqual({ view: null, error: "browserInputStopped" });
    const { rest, calls } = fakeRest({ "/browser/fakeSeller/input": { view: { ...VIEW, phase: "ready", canInteract: false } } });
    const answer = await browserApi(rest).input("fakeSeller", VIEW.generation, VIEW.revision, { type: "text", text: "person@example.com" });
    expect(answer.view?.phase).toBe("ready");
    expect(calls[0].opts).toEqual({ method: "POST", body: { generation: VIEW.generation, revision: VIEW.revision, event: { type: "text", text: "person@example.com" } } });
  });
});
