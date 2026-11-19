import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProfiles } from "wreq-js";
import { redditBrowser } from "../../reddit/engine/client.ts";
import { resolveIdentity, wreqProfile } from "./index.ts";

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
  });

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
  });

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
