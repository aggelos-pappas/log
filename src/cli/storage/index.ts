import { openDatabase } from "../../storage/schema/index.ts";
import { countsOf, rebuildDerived, verifyDerived } from "../../storage/platform/index.ts";
import type { VerifyResult } from "../../storage/platform/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sealedSecrets, secretStoreState } from "../../storage/secrets/index.ts";
import { localAccountsPath, plainLocalAccounts } from "../../twenty/graphql/index.ts";
import { parseEnvFile, plainEnvSecrets, userEnvPath } from "../../config/userEnv/index.ts";
import { authDir } from "../../auth/session/client.ts";
import { oauthStorePath } from "../../mcp/oauth/client.ts";

export const STORAGE_USAGE = [
  "Usage: log storage status [--json]   (sealed vs plain secrets; reads only)",
  "       log storage verify [--json]   (replays every event into a scratch copy and compares each typed table with the live one; changes nothing)",
  "       log storage rebuild [--apply] [--json]   (clears the typed tables and replays every event into them in order, in one transaction; a verify unless --apply)",
  "The events are the record: every typed row is derived from them, so a rebuild loses nothing (docs/storageAgainstTheBook.md, item 2).",
].join("\n");

export const STORAGE_INPUT: CommandInput = {
  forms: [
    { words: ["status"], summary: "Show sealed vs plain secrets, changing nothing", positionals: [], flags: [JSON_FLAG] },
    { words: ["verify"], summary: "Replay every event into a scratch copy and compare each typed table with the live one, changing nothing", positionals: [], flags: [JSON_FLAG] },
    {
      words: ["rebuild"],
      effect: "write",
      summary: "Clear the typed tables and replay every event into them, in one transaction (a verify unless --apply)",
      positionals: [],
      flags: [{ name: "apply", kind: "boolean", live: true, description: "Rebuild the live tables (without it, it only verifies)" }, JSON_FLAG],
    },
  ],
};

export function verifyLines(result: VerifyResult): string[] {
  const rows = Object.keys(result.live).map((table) => `  ${table.padEnd(13)} live ${String(result.live[table].rows).padStart(6)}  replayed ${String(result.replayed[table].rows).padStart(6)}  ${result.differs.includes(table) ? "DIFFERS" : "same"}`);
  return [result.ok ? "Every typed table is what the events derive." : `>>> DIFFERS: ${result.differs.join(", ")} hold rows the events don't derive. \`log storage rebuild --apply\` replaces them with what the events say.`, ...rows];
}

export interface SecretStatus {
  store: ReturnType<typeof secretStoreState>;
  sealed: Record<string, number>;
  plain: { file: string; what: string; count: number; fields: string[] }[];
  notCovered: string[];
}

export function secretStatus(env: Record<string, string | undefined> = process.env): SecretStatus {
  const store = secretStoreState(env);
  const sealed: Record<string, number> = {};
  for (const row of sealedSecrets(env)) sealed[row.kind] = (sealed[row.kind] ?? 0) + 1;
  const plain: SecretStatus["plain"] = [];
  const accountsFile = localAccountsPath(env);
  const accounts = plainLocalAccounts(accountsFile);
  if (accounts.plain) plain.push({ file: accountsFile, what: "accounts", count: accounts.plain, fields: accounts.fields });
  const envFile = userEnvPath(env);
  if (existsSync(envFile)) {
    const values = parseEnvFile(readFileSync(envFile, "utf8"));
    const names = plainEnvSecrets(values);
    if (names.length) plain.push({ file: envFile, what: "keys", count: names.length, fields: names.sort() });
  }
  const notCovered = [join(authDir(env), "sessions.json"), oauthStorePath(env)].filter((file) => existsSync(file));
  return { store, sealed, plain, notCovered };
}

export function secretStatusLines(status: SecretStatus): string[] {
  const { store } = status;
  const held = store.keyMethods.length ? `its key is held by ${store.keyMethods.join(" and ")}${store.unlocks ? " and opens here" : ", and does not open here"}` : "no key yet (one is made on the first secret it seals)";
  const lines = [`  store: ${store.on ? "on" : "off"}, ${held}; holders that answer here: ${store.methods.join(", ") || "none"}`];
  if (store.reason) lines.push(`  >>> ${store.reason}`);
  const kinds = Object.entries(status.sealed).map(([kind, count]) => `${count} ${kind}`);
  lines.push(`  sealed in log.db: ${kinds.join(", ") || "nothing yet"}`);
  for (const item of status.plain) lines.push(`  plain: ${item.file}: ${item.count} ${item.what} (${item.fields.join(", ")}), sealed on their next use${store.ready ? "" : " once a key holder answers"}`);
  if (!status.plain.length) lines.push("  plain: no account secrets or keys left in plain files");
  for (const file of status.notCovered) lines.push(`  not covered yet: ${file} (log's own sign-in tokens, file permissions only)`);
  return lines;
}

export const storageCommand: Command = liveThroughAction<Command>({
  usage: STORAGE_USAGE,
  platform: "any",
  name: "storage",
  effect: "read",
  input: STORAGE_INPUT,
  summary: "Check log.db's sealed secrets and typed tables, and rebuild the tables from events",
  args: "status|verify|rebuild [--apply] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(STORAGE_INPUT));
    if (!parsed.ok) return refuseInput("storage", parsed.error, STORAGE_USAGE);
    const [sub, ...rest] = parsed.positionals;
    if (!sub || rest.length || !["status", "verify", "rebuild"].includes(sub)) return refuseInput("storage", "say status, verify or rebuild", STORAGE_USAGE);
    const json = parsed.flags["json"] === true;
    if (sub === "status") {
      const status = secretStatus();
      if (json) return { code: 0, stdout: JSON.stringify(status, null, 2) };
      return { code: 0, stdout: ["log storage status:", ...secretStatusLines(status)].join("\n") };
    }
    const handle = openDatabase();
    if (sub === "rebuild" && parsed.flags["apply"] === true) {
      context.err("log storage rebuild: replaying every event into the typed tables");
      const started = performance.now();
      const rebuilt = rebuildDerived(handle);
      const ms = Math.round(performance.now() - started);
      if (json) return { code: 0, stdout: JSON.stringify({ rebuilt, ms }, null, 2) };
      return { code: 0, stdout: `log storage rebuild: ${rebuilt.events} events replayed in ${ms} ms into ${rebuilt.messages} messages, ${rebuilt.chats} chats, ${rebuilt.identities} people and ${rebuilt.interactions} interactions.` };
    }
    context.err(`log storage ${sub}: replaying every event into a scratch copy (${countsOf(handle).messages} messages now)`);
    const result = verifyDerived(handle);
    if (json) return { code: result.ok ? 0 : 1, stdout: JSON.stringify(result, null, 2) };
    return { code: result.ok ? 0 : 1, stdout: [`log storage ${sub}:`, ...verifyLines(result)].join("\n") };
  },
}, ["apply"]);
