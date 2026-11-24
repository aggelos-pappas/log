import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { marketplaceFixture } from "../../twenty/graphql/index.ts";
import type { PlatformEngineRun } from "../../platformKit/session/index.ts";
import { TIKTOK_PLATFORM } from "../../tiktok/account/session/index.ts";
import { runCli } from "../runner/index.ts";

function fixture() {
  const twenty = marketplaceFixture();
  twenty.rows.socialAccounts!.push({ id: "tiktokOne", accountName: "tiktokOne", platform: "TIKTOK", cookies: { session: "x".repeat(20) }, proxy: null } as never);
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
    expect(r.err).toContain("accountNotFound");
    expect(r.calls).toEqual([]);
  });

  test("the generated engine answers engineNotBuilt until its client is wired in", () => {
    const dir = mkdtempSync(join(tmpdir(), "tiktokEngine"));
    const cookiesPath = join(dir, "cookies.json");
    writeFileSync(cookiesPath, JSON.stringify({ session: "x" }));
    const spec = join(dir, "spec.json");
    writeFileSync(spec, JSON.stringify({ action: "ping", account: "tiktokOne", platform: "tiktok", stateRoot: join(dir, "state"), cookiesPath }));
    const engine = spawnSync(process.env.LOG_PYTHON || "python", [TIKTOK_PLATFORM.engine, spec], { encoding: "utf8" });
    if (engine.error) return;
    expect(JSON.parse(engine.stdout.trim().split("\n").pop()!)).toMatchObject({ ok: false, code: "engineNotBuilt" });
  });
});
