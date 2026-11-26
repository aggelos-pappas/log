import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProfiles } from "wreq-js";
import { redditBrowser } from "../../reddit/engine/client.ts";
import { resolveIdentity, wreqProfile } from "./index.ts";
import { SPAWNS_PROCESS_MS } from "../../../scripts/tests/timeouts.ts";

const root = join(import.meta.dir, "..", "..", "..");
const none = join(tmpdir(), "no-identity-settings.json");

function py(code: string, env: Record<string, string> = {}): any {
  const script = `import sys, json\nsys.path[:0] = ${JSON.stringify([join(root, "python"), join(root, "vendor", "gabrielSlack"), join(root, "vendor", "openLinkedinApi"), join(root, "vendor", "twikit"), join(root, "vendor", "fbk", "src")])}\n${code}`;
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("LOG_BROWSER") && k !== "LOG_HTTP_CLIENT"));
  const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", env: { ...clean, LOG_SETTINGS: none, ...env } });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim().split("\n").pop() as string);
}

describe("one browser identity for every client", () => {
  test("nothing set: Chrome 152 on Windows through curl_cffi, the UA and client hints say the same", () => {
    const out = py(`from identity import browserIdentity as b\nprint(json.dumps(b.resolve("slack")))`);
    expect(out).toMatchObject({ browser: "chrome152", os: "windows", client: "curl_cffi", curl: "chrome152", wreq: "chrome_152" });
    expect(out.httpcloak).toBe(["chrome", 152, "windows"].join("-"));
    expect(out.userAgent).toMatch(/^Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/152\.[\d.]+ Safari\/537\.36$/);
    expect(out.headers["sec-ch-ua-platform"]).toBe('"Windows"');
  });

  test("the environment wins, one value for all or per platform with a default", () => {
    const out = py(`from identity import browserIdentity as b\nprint(json.dumps([b.resolve(p)["browser"] for p in ("facebook", "slack")] + [b.resolve("slack")["os"]]))`, { LOG_BROWSER: "facebook=chrome136,default=chrome150", LOG_BROWSER_OS: "macos" });
    expect(out).toEqual(["chrome136", "chrome150", "macos"]);
  });

  test("~/.logCli/settings.json is read when the environment says nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "identity-"));
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ identity: { browser: { default: "chrome151", twitter: "chrome150" }, os: "linux" } }));
    const out = py(`from identity import browserIdentity as b\nprint(json.dumps([b.resolve("twitter")["browser"], b.resolve("discord")["browser"], b.resolve()["os"]]))`, { LOG_SETTINGS: file });
    expect(out).toEqual(["chrome150", "chrome151", "linux"]);
  });

  test("an unpinned, unknown or not-installed target is refused, never swapped for another", () => {
    const out = py(`from identity import browserIdentity as b
res = []
for env in ({"LOG_BROWSER": "chrome"}, {"LOG_BROWSER": "safari17_0"}, {"LOG_BROWSER": "chrome999"}, {"LOG_BROWSER_OS": "android"}, {"LOG_HTTP_CLIENT": "discord=httpcloak"}):
    try:
        b.curl_target("discord", env)
        res.append("allowed")
    except b.IdentityError as e:
        res.append("refused")
print(json.dumps(res))`);
    expect(out).toEqual(["refused", "refused", "refused", "refused", "refused"]);
  }, SPAWNS_PROCESS_MS);

  test("Firefox is a valid identity too, with its own UA and no Chrome client hints", () => {
    const out = py(`from identity import browserIdentity as b\ni = b.resolve(None, {"LOG_BROWSER": "firefox155"})\nprint(json.dumps([i["curl"], i["userAgent"], "sec-ch-ua-platform" in i["headers"]]))`);
    expect(out).toEqual(["firefox155", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0", false]);
  });

  test("every vendored client takes its target and UA from the identity", () => {
    const out = py(`import importlib
from identity import browserIdentity as b
slack = importlib.import_module("gabriel.core.transport")
linkedin = importlib.import_module("open_linkedin_api.transport")
twikit = importlib.import_module("twikit.constants")
fbk = importlib.import_module("constants")
discord = importlib.import_module("discordApi.browserIdentity")
print(json.dumps({"slack": [slack.IMPERSONATE, slack.USER_AGENT], "linkedin": [linkedin.IMPERSONATE, linkedin.USER_AGENT], "twitter": [twikit.IMPERSONATE, twikit.USER_AGENT], "facebook": [fbk.IMPERSONATE_DEFAULT, fbk.USER_AGENT_DEFAULT], "discord": [discord.IMPERSONATE, b.user_agent("discord")], "identity": [b.curl_target(), b.user_agent()]}))`, { LOG_BROWSER: "chrome146" });
    const expected = out.identity;
    expect(expected[0]).toBe("chrome146");
    for (const platform of ["slack", "linkedin", "twitter", "facebook", "discord"]) expect(out[platform]).toEqual(expected);
  }, SPAWNS_PROCESS_MS);

  test("the TypeScript twin resolves the same identity as Python", () => {
    const env = { LOG_BROWSER: "reddit=chrome149,default=chrome152", LOG_BROWSER_OS: "windows" };
    const fromPy = py(`from identity import browserIdentity as b\nprint(json.dumps([b.resolve("reddit")["userAgent"], b.resolve("slack")["curl"]]))`, env);
    expect([resolveIdentity("reddit", env, none).userAgent, resolveIdentity("slack", env, none).curl]).toEqual(fromPy);
  });

  test("Reddit's wreq-js takes the identity's profile, or the newest one wreq-js ships below it", () => {
    const profiles = getProfiles().map(String);
    expect(wreqProfile(resolveIdentity("reddit", { LOG_BROWSER: "chrome146" }, none), profiles)).toEqual({ profile: "chrome_146", exact: true });
    const near = wreqProfile(resolveIdentity("reddit", { LOG_BROWSER: "chrome152" }, none), profiles);
    expect(near.profile.startsWith("chrome_")).toBe(true);
    expect(Number(near.profile.slice(7))).toBeLessThanOrEqual(152);
    expect(redditBrowser().os).toBe("windows");
  });
});

describe("API calls carry real Chrome's fetch headers, in its order", () => {
  const realChromePost = ["content-length", "sec-ch-ua-platform", "authorization", "x-csrf-token", "user-agent", "sec-ch-ua", "content-type", "sec-ch-ua-mobile", "accept", "origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "referer", "accept-encoding", "accept-language", "cookie", "priority"];
  const realChromeGet = ["content-length", "sec-ch-ua-platform", "user-agent", "sec-ch-ua", "sec-ch-ua-mobile", "accept", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "referer", "accept-encoding", "accept-language", "cookie", "priority"];

  test("the order is the one captured from real Chrome 157 doing fetch(), with the page's own headers after sec-ch-ua-platform", () => {
    const out = py(`from identity import browserIdentity as b
post, order = b.chrome_fetch("x", "POST", "https://tls.peet.ws/api/all", "https://tls.peet.ws", {"authorization": "Bearer x", "x-csrf-token": "t", "content-type": "application/json"})
get, order2 = b.chrome_fetch("x", "GET", "https://tls.peet.ws/api/all", "https://tls.peet.ws")
print(json.dumps([order.split(","), order2.split(","), post, get]))`);
    expect(out[0]).toEqual(realChromePost);
    expect(out[1]).toEqual(realChromeGet);
    expect(out[2]).toMatchObject({ "sec-fetch-mode": "cors", "sec-fetch-dest": "empty", "sec-fetch-site": "same-origin", accept: "*/*", priority: "u=1, i", origin: "https://tls.peet.ws" });
    expect(out[3].origin).toBeUndefined();
    expect(out[2]["upgrade-insecure-requests"]).toBeUndefined();
  });

  test("sec-ch-ua follows Chromium's brand rule: real Chrome 157 and curl_cffi's chrome152 both match", () => {
    const out = py(`from identity import browserIdentity as b\nprint(json.dumps([b.sec_ch_ua(157), b.sec_ch_ua(152)]))`);
    expect(out).toEqual(['"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"', '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"']);
  });

  test("the site is worked out from the page: same-origin, same-site or cross-site", () => {
    const out = py(`from identity import browserIdentity as b
print(json.dumps([b.chrome_fetch("x", "POST", u, "https://app.slack.com")[0]["sec-fetch-site"] for u in ("https://app.slack.com/api/a", "https://slack.com/api/a", "https://example.org/api")]))`);
    expect(out).toEqual(["same-origin", "same-site", "cross-site"]);
  });

  test("only API calls change: a page load keeps curl_cffi's navigation headers, and the switch turns it off per platform", () => {
    const out = py(`from identity import browserIdentity as b
class S:
    headers = {"accept-language": "en-IE"}
s = b.attach(S(), "facebook", "https://www.facebook.com")
api = b._rewrite(s, "POST", "https://www.facebook.com/api/graphql/", {"headers": {"x-fb-lsd": "L"}})
page = b._rewrite(s, "GET", "https://www.facebook.com/marketplace/", {"headers": {}})
html = b._rewrite(s, "GET", "https://www.facebook.com/api/x", {"headers": {"accept": "text/html"}})
import os
os.environ["LOG_FETCH_HEADERS"] = "facebook=off"
off = b._rewrite(s, "POST", "https://www.facebook.com/api/graphql/", {"headers": {}})
print(json.dumps([api["default_headers"], api["headers"]["accept-language"], api["headers"]["x-fb-lsd"], "header_order" in api["extra_fp"], page, html, off]))`);
    expect(out[0]).toBe(false);
    expect(out[1]).toBe("en-IE");
    expect(out[2]).toBe("L");
    expect(out[3]).toBe(true);
    expect(out[4]).toEqual({ headers: {} });
    expect(out[5]).toEqual({ headers: { accept: "text/html" } });
    expect(out[6]).toEqual({ headers: {} });
  }, SPAWNS_PROCESS_MS);

  test("every API client attaches its session: Slack, LinkedIn, X and Facebook", () => {
    const out = py(`import asyncio
from gabriel.core import transport as slack
from open_linkedin_api import transport as li
from twikit import Client
from transport.session import FBTransport
async def a():
    s = slack.new_session(); f = s._log_fetch; await s.close(); return f
fb = FBTransport(cookies={"c_user": "1", "xs": "x"})
print(json.dumps([asyncio.run(a()), li.new_session()._log_fetch, Client("en-US").http._log_fetch, fb._session._log_fetch, fb.profile.sec_ch_ua == __import__("identity.browserIdentity", fromlist=["x"]).sec_ch_ua(152)]))`);
    expect(out.slice(0, 4).map((f: any) => f.platform)).toEqual(["slack", "linkedin", "twitter", "facebook"]);
    expect(out[4]).toBe(true);
  }, SPAWNS_PROCESS_MS);
});
