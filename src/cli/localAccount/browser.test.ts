import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localAccountCommand } from "./index.ts";

const KEYS = ["LOG_LOCAL_ACCOUNTS", "LOG_BROWSER_DRIVER"] as const;
const before: Record<string, string | undefined> = {};
let dir = "";

beforeAll(() => {
  for (const key of KEYS) before[key] = process.env[key];
  dir = mkdtempSync(join(tmpdir(), "localAccountBrowser"));
  process.env.LOG_LOCAL_ACCOUNTS = join(dir, "localAccounts.json");
  delete process.env.LOG_BROWSER_DRIVER;
  writeFileSync(process.env.LOG_LOCAL_ACCOUNTS, JSON.stringify({ socialAccounts: [{ id: "twentyRow1", platform: "REDDIT", accountName: "fakeRedditor" }] }));
});

afterAll(() => {
  for (const key of KEYS) {
    if (before[key] === undefined) delete process.env[key];
    else process.env[key] = before[key];
  }
  rmSync(dir, { recursive: true, force: true });
});

const run = (argv: string[]) => localAccountCommand.run({} as never, argv);
const rows = () => JSON.parse(readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, "utf8")).socialAccounts as Record<string, unknown>[];

describe("log localAccount add --browser", () => {
  test("sets the browser on the account's own row, even one pulled from Twenty, and list shows it", async () => {
    const saved = await run(["add", "--platform", "reddit", "--account", "fakeRedditor", "--browser", "brave"]);
    expect(saved.code).toBe(0);
    expect(saved.stdout).toContain("browser brave");
    expect(rows()).toEqual([{ id: "twentyRow1", platform: "REDDIT", accountName: "fakeRedditor", browserDriver: "brave" }]);
    const listed = await run(["list", "--json"]);
    expect(JSON.parse(listed.stdout!).accounts[0].browser).toBe("brave");
  });

  test("a new account without --browser runs on Camoufox, and a browser log does not drive is refused", async () => {
    expect((await run(["add", "--platform", "discord", "--account", "fakeGuildUser"])).stdout).toContain("browser camoufox");
    const refused = await run(["add", "--platform", "discord", "--account", "fakeGuildUser", "--browser", "netscape"]);
    expect(refused.code).not.toBe(0);
    expect(rows().find((row) => row.accountName === "fakeGuildUser")?.browserDriver).toBeUndefined();
  });
});
