import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { marketplaceFixture } from "../../twenty/graphql/index.ts";
import type { PlatformEngineRun } from "../../platformKit/session/index.ts";
import { runCli } from "../runner/index.ts";

function fixture() {
  const twenty = marketplaceFixture();
  twenty.rows.socialAccounts!.push({ id: "tiktokOne", accountName: "tiktokOne", platform: "TIKTOK", cookies: { "sessionid": "x".repeat(20), "sid_tt": "x".repeat(20) }, proxy: null } as never);
  return twenty;
}

async function run(argv: string[], engine?: PlatformEngineRun, twenty = fixture()) {
  const out: string[] = [];
  const err: string[] = [];
  const calls: string[] = [];
  const code = await runCli(argv, {
    twenty,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    directTiktok: (account, spec) => {
      calls.push(`${account.accountName}:${spec.action}`);
      return engine ?? { answer: { ok: false, code: "notExpected" }, refreshed: null };
    },
  });
  const row = twenty.rows.socialAccounts!.find((r) => r.accountName === "tiktokOne")!;
  return { code, out: out.join("\n"), err: err.join("\n"), calls, row };
}

describe("log tiktok session check", () => {
  test("loggedIn: the engine's answer goes to Twenty", async () => {
    const r = await run(["tiktok", "session", "check", "--account", "tiktokOne"], { answer: { ok: true, loginState: "loggedIn", screenName: "tiktokOne" }, refreshed: null });
    expect(r.code).toBe(0);
    expect(r.calls).toEqual(["tiktokOne:ping"]);
    expect(r.row.sessionState).toBe("loggedIn");
  });

  test("an account of another platform is refused before the engine is called", async () => {
    const r = await run(["tiktok", "session", "check", "--account", "galwayOne"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("accountPlatformMismatch");
    expect(r.calls).toEqual([]);
  });
});

describe("log tiktok stats", () => {
  const answer = {
    ok: true,
    loginState: "loggedIn" as const,
    followers: 7,
    following: 41,
    totals: { views: 1332, likes: 91, comments: 0, shares: 1, saves: 5 },
    posts: [
      { id: "7708913986665712917", caption: "logLaunchVideo", postedAt: 1794872580, seconds: 31.5, views: 1158, likes: 90, comments: 0, shares: 1, saves: 5, inReview: false, pinned: false },
      { id: "7702591005236808978", caption: "We have built something really cool here", postedAt: 1793485620, seconds: 20, views: 174, likes: 1, comments: 0, shares: 0, saves: 0, inReview: false, pinned: false },
    ],
  };

  test("reads followers and each post's numbers through the engine's stats action", async () => {
    const r = await run(["tiktok", "stats", "--account", "tiktokOne", "--limit", "2"], { answer, refreshed: null });
    expect(r.code).toBe(0);
    expect(r.calls).toEqual(["tiktokOne:stats"]);
    expect(r.out).toContain("7 followers · 41 following · 2 posts read: 1332 views · 91 likes");
    expect(r.out).toContain("1158 views · 90 likes · 0 comments · 1 shares · 5 saves");
    expect(r.out).toContain("https://www.tiktok.com/@tiktokOne/video/7708913986665712917");
  });

  test("--json gives the posts as data", async () => {
    const r = await run(["tiktok", "stats", "--account", "tiktokOne", "--json"], { answer, refreshed: null });
    const data = JSON.parse(r.out);
    expect(data.followers).toBe(7);
    expect(data.posts[0].views).toBe(1158);
  });

  test("TikTok's refusal is said with its code and nothing is retried", async () => {
    const r = await run(["tiktok", "stats", "--account", "tiktokOne"], { answer: { ok: false, code: "signatureRequired", detail: "TikTok answered HTTP 200 with an empty body" }, refreshed: null });
    expect(r.code).toBe(1);
    expect(r.err).toContain("signatureRequired");
    expect(r.err).toContain("Nothing is retried");
    expect(r.calls).toEqual(["tiktokOne:stats"]);
  });

  test("an out-of-range --limit is refused before the engine is called", async () => {
    const r = await run(["tiktok", "stats", "--account", "tiktokOne", "--limit", "9999"]);
    expect(r.code).toBe(1);
    expect(r.calls).toEqual([]);
  });

  test("--limit reaches the engine", async () => {
    const seen: unknown[] = [];
    const twenty = fixture();
    await runCli(["tiktok", "stats", "--account", "tiktokOne", "--limit", "2"], { twenty, out: () => {}, err: () => {}, directTiktok: (_a, spec) => (seen.push(spec), { answer, refreshed: null }) });
    expect(seen).toEqual([{ action: "stats", limit: 2 }]);
  });
});

function clip(): string {
  const dir = mkdtempSync(join(tmpdir(), "tiktokPost"));
  const path = join(dir, "clip.mp4");
  writeFileSync(path, "not really a video");
  return path;
}

describe("log tiktok post", () => {
  test("without --live it is a dry run and the engine isn't called", async () => {
    const r = await run(["tiktok", "post", "--account", "tiktokOne", "--video", clip(), "--caption", "hello"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("dry run");
    expect(r.calls).toEqual([]);
  });

  test("--live needs --approvedBy", async () => {
    const r = await run(["tiktok", "post", "--account", "tiktokOne", "--video", clip(), "--caption", "hello", "--live"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("notApproved");
    expect(r.calls).toEqual([]);
  });

  test("a missing file, a non-video or a bad visibility is refused before anything is sent", async () => {
    expect((await run(["tiktok", "post", "--account", "tiktokOne", "--video", "nowhere.mp4", "--caption", "x", "--live", "--approvedBy", "m"])).err).toContain("videoMissing");
    const text = join(mkdtempSync(join(tmpdir(), "tiktokPost")), "notes.txt");
    writeFileSync(text, "x");
    expect((await run(["tiktok", "post", "--account", "tiktokOne", "--video", text, "--caption", "x", "--live", "--approvedBy", "m"])).err).toContain("videoTypeUnsupported");
    expect((await run(["tiktok", "post", "--account", "tiktokOne", "--video", clip(), "--caption", "x", "--visibility", "public", "--live", "--approvedBy", "m"])).err).toContain("visibilityInvalid");
  });

  test("live, the engine posts and its answer names the new post", async () => {
    const seen: Record<string, unknown>[] = [];
    const twenty = fixture();
    const out: string[] = [];
    const path = clip();
    const code = await runCli(["tiktok", "post", "--account", "tiktokOne", "--video", path, "--caption", "hello", "--visibility", "onlyMe", "--live", "--approvedBy", "mandeep"], {
      twenty,
      out: (l) => out.push(l),
      err: () => {},
      directTiktok: (_a, spec) => (seen.push(spec), { answer: { ok: true, itemId: "7709617645145902356", videoId: "v1c025", url: "https://www.tiktok.com/@tiktokOne/video/7709617645145902356" }, refreshed: null }),
    });
    expect(code).toBe(0);
    expect(seen).toEqual([{ action: "post", live: true, approvedBy: "mandeep", video: path, caption: "hello", visibility: "onlyMe" }]);
    expect(out.join("\n")).toContain("https://www.tiktok.com/@tiktokOne/video/7709617645145902356");
  });

  test("TikTok's refusal stops the run, nothing retried", async () => {
    const r = await run(["tiktok", "post", "--account", "tiktokOne", "--video", clip(), "--caption", "x", "--live", "--approvedBy", "m"], { answer: { ok: false, code: "tiktokRefused", detail: "status 5" }, refreshed: null });
    expect(r.code).toBe(1);
    expect(r.err).toContain("tiktokRefused");
    expect(r.calls).toEqual(["tiktokOne:post"]);
  });
});

describe("log tiktok delete", () => {
  test("a dry run unless --live, and an id must be a post id", async () => {
    const dry = await run(["tiktok", "delete", "--account", "tiktokOne", "--id", "7709617645145902356"]);
    expect(dry.code).toBe(0);
    expect(dry.calls).toEqual([]);
    const bad = await run(["tiktok", "delete", "--account", "tiktokOne", "--id", "abc", "--live", "--approvedBy", "m"]);
    expect(bad.err).toContain("itemIdInvalid");
    expect(bad.calls).toEqual([]);
  });

  test("live, the engine deletes by the post's id", async () => {
    const r = await run(["tiktok", "delete", "--account", "tiktokOne", "--id", "7709617645145902356", "--live", "--approvedBy", "m"], { answer: { ok: true, itemId: "7709617645145902356", deleted: true }, refreshed: null });
    expect(r.code).toBe(0);
    expect(r.calls).toEqual(["tiktokOne:deletePost"]);
    expect(r.out).toContain("deleted post 7709617645145902356");
  });
});

