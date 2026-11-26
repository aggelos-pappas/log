import { homedir } from "node:os";
import { userEnvPath } from "../../config/userEnv/index.ts";
import { platformOfTwenty, signInRouteOf } from "../../cli/launch/helpers/start.ts";
import { PLATFORM_LABELS, PLATFORM_SITES, PLATFORMS } from "../../cli/runner/helpers/platforms.ts";
import type { Platform } from "../../cli/runner/helpers/platforms.ts";
import { localAccountsPath, readLocalAccounts, updateLocalAccount } from "../../accounts/store/index.ts";
import { driverOrNull, isBrowserDriver } from "../../browser/driver/index.ts";
import { readCheckRows } from "../accountCheck/index.ts";
import { browserChoices, readConnectionAccounts } from "./helpers/accounts.ts";
import { readExtensionStates } from "./helpers/extensions.ts";
import type { ConnectionAccount, ConnectionsView, ConsoleAccount, ConsoleConnections } from "./types.ts";

type Env = Record<string, string | undefined>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function platformNamed(value: unknown): Platform | null {
  const name = String(value ?? "").toLowerCase();
  return PLATFORMS.find((platform) => platform === name) ?? null;
}

export function readConsoleAccounts(path: string = localAccountsPath()): ConsoleAccount[] {
  return readLocalAccounts(path).flatMap((row): ConsoleAccount[] => {
    const platform = platformOfTwenty(row.platform) ?? platformNamed(row.platform);
    const accountName = text(row.accountName) ?? text(row.name);
    if (!platform || !accountName) return [];
    return [{ id: String(row.id), platform, accountName, sessionState: text(row.sessionState), browserProfile: Boolean(text(row.adsPowerProfileId)), browser: driverOrNull({ browserDriver: text(row.browserDriver), adsPowerProfileId: text(row.adsPowerProfileId) }, process.env), signIn: signInRouteOf(platform).kind }];
  });
}

export function readConnectionRows(env: Env = process.env, home = homedir()): ConnectionAccount[] {
  const checks = readCheckRows();
  return readConnectionAccounts(env, home).map((account) => ({ ...account, lastCheck: checks.get(account.id) ?? null }));
}

export function loadConnectionsView(env: Env = process.env, home = homedir()): ConnectionsView {
  return { schemaVersion: 1, source: "workspace", generatedAt: new Date().toISOString(), accounts: readConnectionRows(env, home), extensions: readExtensionStates(env, home), browsers: browserChoices(env) };
}

export function setAccountBrowser(args: { accountId?: unknown; browser?: unknown }, env: Env = process.env): ConnectionsView {
  if (!isBrowserDriver(args.browser)) throw new Error("consoleInputInvalid");
  const account = loadConnectionsView(env).accounts.find((item) => item.id === args.accountId);
  if (!account) throw new Error("accountNotFound");
  const saved = updateLocalAccount(PLATFORM_SITES[account.platform].twenty, account.name, { browserDriver: args.browser }, localAccountsPath(env)) ?? updateLocalAccount(account.platform, account.name, { browserDriver: args.browser }, localAccountsPath(env));
  if (!saved) throw new Error("accountNotFound");
  return loadConnectionsView(env);
}

export async function moveConsoleAccount(args: { accountId?: unknown; browser?: unknown; apply?: unknown }, env: Env = process.env): Promise<{ applied: boolean; move: unknown }> {
  if (!isBrowserDriver(args.browser) || args.browser === "adsPower") throw new Error("consoleInputInvalid");
  const account = loadConnectionsView(env).accounts.find((item) => item.id === args.accountId);
  if (!account) throw new Error("accountNotFound");
  const { inProcessToolCaller } = await import("../accountCheck/index.ts");
  const callTool = await inProcessToolCaller();
  const apply = args.apply === true;
  const answer = await callTool(apply ? "browserMoveLive" : "browserMove", { account: account.name, to: args.browser, json: true, ...(apply ? { apply: true, approvedBy: "the owner, from the console", confirmLive: true } : {}) });
  const content = answer.structuredContent && typeof answer.structuredContent === "object" ? (answer.structuredContent as Record<string, unknown>) : {};
  return { applied: apply, move: content.json ?? content };
}

export function loadConsoleConnections(options: { platform?: string; path?: string } = {}): ConsoleConnections {
  const path = options.path ?? localAccountsPath();
  const wanted = options.platform?.trim().toLowerCase();
  if (wanted && !(PLATFORMS as readonly string[]).includes(wanted)) throw new Error("consolePlatformInvalid");
  const accounts = readConsoleAccounts(path).filter((account) => !wanted || account.platform === wanted);
  const platforms = PLATFORMS.flatMap((platform) => {
    const mine = accounts.filter((account) => account.platform === platform).sort((left, right) => left.accountName.localeCompare(right.accountName));
    return mine.length ? [{ platform, label: PLATFORM_LABELS[platform], accounts: mine }] : [];
  });
  const view = loadConnectionsView(options.path ? { ...process.env, LOG_LOCAL_ACCOUNTS: path, LOG_USER_ENV: userEnvPath() } : process.env);
  return { schemaVersion: 1, source: "local", generatedAt: view.generatedAt, path, total: accounts.length, platforms, accounts: view.accounts.filter((account) => !wanted || account.platform === wanted), extensions: view.extensions, browsers: view.browsers };
}
