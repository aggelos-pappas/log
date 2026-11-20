import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "..");
const none = join(tmpdir(), "no-identity-settings.json");
const scratch = mkdtempSync(join(tmpdir(), "discordIdentity"));

afterAll(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));

const FIXTURE = `
import base64, json, os, time
from pathlib import Path
from discordApi import browserIdentity as b
FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101 Firefox/156.0"
CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155" + ".0" * 3 + " Safari/537.36"
DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1 Chrome/138 Electron/37 Safari/537.36"
def sp(ua, build, browser="Chrome", channel="stable"):
    return base64.b64encode(json.dumps({"os": "Windows", "browser": browser, "browser_user_agent": ua, "release_channel": channel, "client_build_number": build, "client_event_source": None, "client_launch_id": "old", "launch_signature": "old", "client_heartbeat_session_id": "old", "client_app_state": "focused"}).encode()).decode()
def api(ua, build, extra=()):
    hs = [("Host", "discord.com"), ("User-Agent", ua), ("Accept", "*/*"), ("Accept-Language", "en-US,en;q=0.9"), ("Authorization", "secret"), ("X-Super-Properties", sp(ua, build)), ("X-Installation-ID", "inst"), ("X-Discord-Locale", "en-US"), ("X-Discord-Timezone", "Asia/Bangkok"), ("X-Debug-Options", "bugReporterEnabled"), ("Cookie", "c=1"), *extra]
    return {"request": {"url": "https://discord.com/api/v9/users/@me", "headers": [{"name": n, "value": v} for n, v in hs]}}
def write(runs, stamp, folder, entries, age):
    path = Path(runs) / "inspect" / f"{stamp}_acct" / folder / "session.har"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"log": {"entries": entries}}), encoding="utf-8")
    os.utime(path, (time.time() - age, time.time() - age))
    return path
CHROME_IDENTIFY = {"token": "secret", "capabilities": 99, "properties": {"browser_user_agent": CHROME, "client_build_number": 671000, "client_launch_id": "x", "launch_signature": "y", "installation_id": "inst"}, "presence": {"status": "online", "since": 0, "activities": [], "afk": False}, "compress": False, "client_state": {"guild_versions": {}}}
def chrome_har(runs, age):
    ws = {"request": {"url": b.GATEWAY_URL, "headers": []}, "_webSocketMessages": [{"type": "send", "data": json.dumps({"op": 2, "d": CHROME_IDENTIFY})}, {"type": "send", "data": json.dumps({"op": 40, "d": {"seq": 1, "qos": {"ver": 31}}})}]}
    return write(runs, "20261113T000000", "adsPower", [api(CHROME, 671000, (("sec-ch-ua", "x"), ("sec-ch-ua-platform", "w"))), ws], age)
def firefox_har(runs, age):
    return write(runs, "20261120T000000", "camoufox", [api(FIREFOX, 677000)], age)
L = {"client_launch_id": "L", "launch_signature": "S", "client_heartbeat_session_id": "H"}
`;

function py(code: string, env: Record<string, string> = {}): any {
  const script = `import sys, json\nsys.path[:0] = ${JSON.stringify([join(root, "python")])}\n${FIXTURE}\n${code}`;
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("LOG_BROWSER") && k !== "LOG_HTTP_CLIENT"));
  const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...clean, LOG_SETTINGS: none, ...env } });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim().split("\n").pop() as string);
}

function dir(name: string): string {
  return join(scratch, name).replace(/\\/g, "/");
}

const REAL_FIREFOX_GET = ["user-agent", "accept", "accept-language", "accept-encoding", "referer", "authorization", "x-super-properties", "x-installation-id", "x-discord-locale", "x-discord-timezone", "x-debug-options", "content-length", "cookie", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "priority", "te"];
const REAL_FIREFOX_POST = ["user-agent", "accept", "accept-language", "accept-encoding", "referer", "content-type", "authorization", "x-super-properties", "x-installation-id", "x-discord-locale", "x-discord-timezone", "x-debug-options", "content-length", "origin", "cookie", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "priority", "te"];

describe("Discord talks as the account's own browser, never another client (#114)", () => {
  test("a Camoufox account gets its Firefox recording, not an older AdsPower Chrome one, with the gateway sign-on built from the same super properties", () => {
    const d = dir("camoufox");
    const out = py(`runs, state = "${d}/runs", "${d}/state"
chrome = b.load(state, "acct", Path(runs)) if chrome_har(runs, 600) else None
firefox_har(runs, 60)
made = b.load(state, "acct", Path(runs), driver="camoufox")
props = b.identify_payload(made, "tok", L)["d"]["properties"]
print(json.dumps({"before": [b.family_of(chrome), b.problems(chrome, "camoufox")], "driver": made["driver"], "source": made["identifySource"], "ua": made["headers"]["user-agent"] == FIREFOX, "tls": b.impersonate_of(made)[:7], "hints": [h for h in b.CHROME_ONLY if h in made["headers"]], "problems": b.problems(made, "camoufox"), "props": [props["browser_user_agent"] == FIREFOX, props["client_build_number"], props["installation_id"], props["client_launch_id"], "client_heartbeat_session_id" in props, list(props).index("client_launch_id") == list(props).index("client_event_source") + 1], "carried": [made["identify"]["capabilities"], made["qos"]]}))`);
    expect(out.before[0]).toBe("chrome");
    expect(out.before[1].join(" ")).toContain("camoufox (firefox) but the recording is chrome");
    expect(out).toMatchObject({ driver: "camoufox", source: "superProperties", ua: true, tls: "firefox", hints: [], problems: [] });
    expect(out.props).toEqual([true, 677000, "inst", "L", false, true]);
    expect(out.carried).toEqual([99, { ver: 31 }]);
  });

  test("a Camoufox account with only a Chrome recording is refused rather than sent as Chrome", () => {
    const d = dir("chromeOnly");
    const out = py(`runs, state = "${d}/runs", "${d}/state"
chrome_har(runs, 60)
b.load(state, "acct", Path(runs), driver="adsPower")
print(json.dumps([b.load(state, "acct", Path(runs), driver="camoufox"), b.load(state, "acct", Path(runs), driver="brave")["headers"]["user-agent"] == CHROME]))`);
    expect(out).toEqual([null, true]);
  });

  test("Firefox REST calls go out in real Camoufox 156's fetch() order, with its Priority and TE and no Chrome client hints", () => {
    const d = dir("order");
    const out = py(`runs, state = "${d}/runs", "${d}/state"
firefox_har(runs, 60)
made = b.load(state, "acct", Path(runs), driver="camoufox")
get = b.rest_headers(made, "tok", L)
post = b.rest_headers(made, "tok", L, extra={"Content-Type": "application/json"}, method="POST")
print(json.dumps([b.wire_order("firefox", get).split(","), b.wire_order("firefox", post).split(","), get.get("Priority"), get.get("Te"), "Origin" in get, json.loads(base64.b64decode(get["X-Super-Properties"]))["client_launch_id"]]))`);
    expect(out[0]).toEqual(REAL_FIREFOX_GET);
    expect(out[1]).toEqual(REAL_FIREFOX_POST);
    expect(out.slice(2)).toEqual(["u=4", "trailers", false, "L"]);
  });

  test("a Chrome-family session keeps Chrome's fetch order and Priority", () => {
    const d = dir("chrome");
    const out = py(`runs, state = "${d}/runs", "${d}/state"
chrome_har(runs, 60)
made = b.load(state, "acct", Path(runs), driver="brave")
get = b.rest_headers(made, "tok", L)
print(json.dumps([b.impersonate_of(made)[:6], get.get("Priority"), "Te" in get, b.wire_order("chrome", get).split(",")[:3], b.problems(made, "brave")]))`);
    expect(out).toEqual(["chrome", "u=1, i", false, ["content-length", "sec-ch-ua-platform", "authorization"], []]);
  });

  test("a desktop-app identity is never accepted", () => {
    const out = py(`made = {"headers": {"user-agent": DESKTOP, "x-super-properties": sp(DESKTOP, 1, "Discord Client", "stable")}, "identify": {"properties": {"browser_user_agent": DESKTOP, "client_build_number": 1}}}
print(json.dumps(b.problems(made, "camoufox")))`);
    expect(out.join(" ")).toContain("not a web browser");
    expect(out.join(" ")).toContain("not the web client");
  });

  test("the TLS target follows the recorded browser: the newest curl_cffi target at or below its version, in its own family", () => {
    const out = py(`from identity import browserIdentity as i
have = {"chrome150", "chrome152", "chrome152_macos", "firefox147", "firefox155"}
mac = CHROME.replace("Windows NT 10.0; Win64; x64", "Macintosh; Intel Mac OS X 10_15_7")
print(json.dumps([i.curl_target_for(FIREFOX, have), i.curl_target_for(CHROME, have), i.curl_target_for(mac, have), i.curl_target_for(DESKTOP, have), i.curl_target_for(FIREFOX.replace("156", "140"), have)]))`);
    expect(out).toEqual(["firefox155", "chrome152", "chrome152_macos", null, "firefox147"]);
  });

  test("the engine refuses to talk to Discord as anything but the session's own browser", () => {
    const d = dir("engine");
    const out = py(`import asyncio
from discordApi import engine
runs, state = "${d}/runs", "${d}/state"
os.environ["LOG_RUNS_ROOT"] = runs
chrome_har(runs, 60)
spec = {"stateRoot": state, "account": "acct", "browserDriver": "camoufox"}
stale = asyncio.run(engine.ACTIONS["ping"](spec, {}))
firefox_har(runs, 30)
ok = asyncio.run(engine.ACTIONS["ping"](spec, {}))
Path(state, "acct", b.FILE).write_text(json.dumps({**json.loads(Path(state, "acct", b.FILE).read_text()), "recordedAt": time.time() + 60, "identify": {"properties": {"browser_user_agent": CHROME}}}))
bad = asyncio.run(engine.ACTIONS["ping"](spec, {}))
print(json.dumps([stale["code"], ok["code"], bad["code"]]))`);
    expect(out).toEqual(["templateStale", "noPlatformSession", "identityMismatch"]);
  });
});
