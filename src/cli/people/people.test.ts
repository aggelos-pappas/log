import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { identityLearnedEvent, insertEventRow } from "../../storage/platform/index.ts";
import { defaultDbPath, openDatabase } from "../../storage/schema/index.ts";
import { runCli } from "../runner/index.ts";
import { FRESH_DB_MS } from "../../../scripts/tests/timeouts.ts";

const before = process.env.LOG_DB;

afterEach(() => {
  if (before === undefined) delete process.env.LOG_DB;
  else process.env.LOG_DB = before;
});

function seed(path: string, tag: string): void {
  const on = openDatabase(path);
  const at = new Date().toISOString();
  insertEventRow(on, identityLearnedEvent("discord", "discordAccount", `90000${tag}1`, `wren${tag}`, null, at));
  insertEventRow(on, identityLearnedEvent("twitter", "xAccount", `10000${tag}1`, `wren${tag}_x`, null, at));
}

async function link(tag: string): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(["people", "link", `discord:wren${tag}`, `twitter:wren${tag}_x`, "--approvedBy", "the owner said yes", "--json"], { out: (line) => out.push(line), err: (line) => err.push(line) });
  return { code, out, err };
}

describe("a write names the database when LOG_DB points away from the usual log.db", () => {
  test("with LOG_DB at a temp db, people link says where it wrote, on stderr and in the JSON", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "peopleDb")), "log.db");
    process.env.LOG_DB = path;
    seed(path, "11");
    const ran = await link("11");
    expect(ran.code).toBe(0);
    expect(ran.err).toContain(`writing to ${path} (LOG_DB is set; not your usual log.db)`);
    expect(JSON.parse(ran.out.join("\n")).db).toBe(path);
  }, FRESH_DB_MS);

  test("with the usual database, nothing extra is said", async () => {
    delete process.env.LOG_DB;
    seed(defaultDbPath(), "22");
    const ran = await link("22");
    expect(ran.code).toBe(0);
    expect(ran.err.some((line) => line.startsWith("writing to "))).toBe(false);
    expect(JSON.parse(ran.out.join("\n")).db).toBeUndefined();
  }, FRESH_DB_MS);
});
