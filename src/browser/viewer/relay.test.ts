import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULT_RELAY_PORT, ensureRelay, frameAfter, relayAnswer, relayDeps, relayOrigin, relayPort, stopRelay } from "./index";

const serve = relayDeps.serve;
const probe = relayDeps.probe;
afterEach(() => {
  stopRelay();
  relayDeps.serve = serve;
  relayDeps.probe = probe;
});

describe("the loopback stream relay a view on this machine reads", () => {
  test("its origin is fixed so a view's CSP can name it, and a setting moves it", () => {
    expect(relayPort({})).toBe(DEFAULT_RELAY_PORT);
    expect(relayOrigin({ LOG_BROWSER_STREAM_PORT: "50123" })).toBe("http://127.0.0.1:50123");
    expect(relayPort({ LOG_BROWSER_STREAM_PORT: "99999" })).toBe(DEFAULT_RELAY_PORT);
  });

  test("a preflight and the health check answer any origin, and the private network read is allowed", async () => {
    const preflight = await relayAnswer(new Request("http://127.0.0.1:1/browserStream", { method: "OPTIONS" }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Private-Network")).toBe("true");
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const health = await relayAnswer(new Request("http://127.0.0.1:1/health"));
    expect(await health.json()).toEqual({ service: "logBrowserStream" });
  });

  test("a stream asked without a well-formed ticket is refused before any browser is touched", async () => {
    const bare = await relayAnswer(new Request("http://127.0.0.1:1/browserStream?account=fakeSeller"));
    expect(bare.status).toBe(403);
    const odd = await relayAnswer(new Request("http://127.0.0.1:1/browserStream?account=fake%20seller&ticket=aaaaaaaaaaaaaaaaaaaa"));
    expect(odd.status).toBe(403);
    const missing = await relayAnswer(new Request("http://127.0.0.1:1/browserStream?account=nobodyHere&ticket=aaaaaaaaaaaaaaaaaaaa"));
    expect(missing.status).toBe(503);
  });

  test("when another log process already holds the port, that relay is shared; anything else there is not", async () => {
    relayDeps.serve = () => {
      throw new Error("EADDRINUSE");
    };
    relayDeps.probe = async () => true;
    expect(await ensureRelay({})).toBe(true);
    stopRelay();
    relayDeps.probe = async () => false;
    expect(await ensureRelay({})).toBe(false);
  });

  test("the frame a view already has is a whole number, anything else counts as none", () => {
    expect(frameAfter(12)).toBe(12);
    expect(frameAfter(-1)).toBe(0);
    expect(frameAfter("3")).toBe(0);
    expect(frameAfter(1.5)).toBe(0);
  });
});
