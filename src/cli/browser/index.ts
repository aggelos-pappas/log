import { viewerState } from "../../browser/viewer/index.ts";
import { createAdsPowerClient } from "../../browser/adsPower/index.ts";
import { BROWSER_BRANDS, driverOrNull } from "../../browser/driver/index.ts";
import { logDbMoveLedger, MOVE_TARGETS, moveAccounts, movePlanText, moveResultText, planMoves, readStateOverCdp, releaseMoved } from "../../browser/move/index.ts";
import type { MoveCheck, MoveDeps, MoveTarget } from "../../browser/move/index.ts";
import { inProcessToolCaller } from "../../console/accountCheck/index.ts";
import { readConnectionRows } from "../../console/connections/index.ts";
import { runSessionCheck } from "../../platformKit/sessionCheck/index.ts";
import type { FacebookAccount } from "../../platformKit/socialAccount/index.ts";
import { liveThroughAction } from "../../platformKit/action/index.ts";
import { refuseError } from "../runner/helpers/index.ts";
import type { CommandContext, CommandResult } from "../runner/types.ts";
import type { ViewerView } from "../../browser/viewer/index.ts";
import { readLocalAccounts } from "../../accounts/store/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import { knownPlatformOfAccount, PLATFORM_LABELS } from "../runner/helpers/platforms.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const BROWSER_USAGE = [
  "Usage: log browser view --account <accountName> [--json]   (the account's live browser: whether it needs a person to sign in, the page state and its revision; an MCP Apps host or Hermes shows it live inline, streamed from the page)",
  "       log browser move [<account>] [--to camoufox|brave] [--all] [--apply --approvedBy <who>] [--release] [--json]   (a dry run unless --apply)",
  "Where the runtime is comes from LOG_BROWSER_VIEW_LOCATION (local or remote), which the stdio MCP, the HTTP MCP and the hosted bridge each set for their own process.",
].join("\n");

export const BROWSER_INPUT: CommandInput = {
  forms: [
    {
      words: ["view"],
      effect: "read",
      summary: "The account's live browser: whether it needs a person to sign in, and where they do it. One account's live browser: whether it needs a person to sign in, streamed inline into the chat",
      positionals: [],
      flags: [{ name: "account", kind: "string", description: "The account whose browser to show", required: true }, JSON_FLAG],
    },
    {
      words: ["move"],
      effect: "read",
      liveEffect: "write",
      summary: "Move accounts to another browser with their signed-in session, checked by the platform (a dry run unless apply)",
      positionals: [{ name: "account", kind: "string", description: "The account to move (else --all)" }],
      flags: [
        { name: "to", kind: "enum", values: MOVE_TARGETS, description: "The browser to move to (default camoufox)" },
        { name: "all", kind: "boolean", description: "Every account on AdsPower or linked to a profile" },
        { name: "release", kind: "boolean", description: "Delete moved accounts' old AdsPower profiles (with apply)" },
        { name: "apply", kind: "boolean", live: true, description: "Move (or release); without it a dry run" },
        { name: "approvedBy", kind: "string", approval: true, description: "Who approved it: needed with --apply (rule 8)" },
        JSON_FLAG,
      ],
    },
  ],
};

export const BROWSER_VIEW_LOCATIONS = ["local", "remote"] as const;
export type BrowserViewLocation = (typeof BROWSER_VIEW_LOCATIONS)[number];

export function browserViewLocation(env: Record<string, string | undefined> = process.env): BrowserViewLocation {
  return env.LOG_BROWSER_VIEW_LOCATION === "remote" ? "remote" : "local";
}

export function browserBrandOf(account: string): { name: string; label: string; logo: string | null } | null {
  try {
    const row = readLocalAccounts().find((item) => String(item.accountName ?? "") === account);
    if (!row) return null;
    const driver = driverOrNull({ browserDriver: typeof row.browserDriver === "string" ? row.browserDriver : null, adsPowerProfileId: typeof row.adsPowerProfileId === "string" ? row.adsPowerProfileId : null });
    return driver ? { name: driver, label: BROWSER_BRANDS[driver].label, logo: BROWSER_BRANDS[driver].logo ?? null } : null;
  } catch {
    return null;
  }
}

export function platformNameOf(account: string): string {
  try {
    const row = readLocalAccounts().find((item) => String(item.accountName ?? "") === account);
    const platform = row ? knownPlatformOfAccount({ platform: typeof row.platform === "string" ? row.platform : null }) : null;
    return platform ? PLATFORM_LABELS[platform] : "account";
  } catch {
    return "account";
  }
}

const REMOTE: Record<ViewerView["phase"], string> = {
  browserMissing: "No browser is open for this account. Open it with sessionsSignIn { account } (add open: true when it is signed in already), on the local and the hosted server alike, then call browserView again.",
  viewerUnavailable: "The account's browser is open but its viewer could not be reached, so it cannot be shown. Nothing was sent to the page.",
  signInRequired: "The page asks for sign-in. The person signs in inside the browser view; their clicks and keys reach the page, each one a recorded step (any page when the owner opened it to drive, else only while it asks for sign-in). Wait for them, then call browserView again before carrying on.",
  needsAttention: "The page needs a person and is a stop (rule 94): input is off. Tell the person what the page shows; do not continue this account until they clear it.",
  busy: "The browser is running a step. Call browserView again in a moment.",
  ready: "The page does not ask for sign-in. Nothing is needed from the person; carry on.",
};

const DRIVEN = "The owner opened this browser to watch and drive it: his clicks, scrolls and keys in the live view reach every page, each one a recorded step. The agent never types into it; wait for him, then call browserView again before carrying on.";

function localText(view: ViewerView, platform: string): string {
  if (view.phase === "signInRequired") return `The ${platform} sign-in is open in this account's browser on this machine. The person signs in in the live view shown in the chat (or its window, when it has one); their clicks and keys reach the page, each one a recorded step (any page when the owner opened it to drive, else only while it asks for sign-in). Then call browserView again to check before carrying on.`;
  if (view.canInteract && view.phase === "ready") return DRIVEN;
  if (view.phase === "needsAttention") return `The ${platform} page needs a person and is a stop (rule 94): ${view.canInteract ? "the owner can answer it in the live view" : "input is off"}. Tell the person what it shows; do not continue this account until they clear it.`;
  return REMOTE[view.phase];
}

export function browserViewText(view: ViewerView, location: BrowserViewLocation = browserViewLocation(), platform = platformNameOf(view.account)): string {
  const head = `${view.account}: ${view.phase}${view.pageState ? ` (page state ${view.pageState})` : ""}${view.address ? ` on ${view.address}` : ""}`;
  if (location === "local") return [head, localText(view, platform)].join("\n");
  return [head, view.canInteract && view.phase === "ready" ? DRIVEN : REMOTE[view.phase], ...(view.needsHuman ? ["Without an inline view (a host without MCP Apps), sessionsSignIn answers with a console link that works once, for ten minutes, for the person who asked; the console's Connections page shows the same live browser."] : [])].join("\n");
}

export type BrowserViewJson = Omit<ViewerView, "stream"> & { location: BrowserViewLocation; streamKind: "voxl" | "cast" | "frames" | "none"; platform: string; browser: { name: string; label: string; logo: string | null } | null };

export function browserViewJson(view: ViewerView, location: BrowserViewLocation = browserViewLocation()): BrowserViewJson {
  const { stream, ...rest } = view;
  const named = { platform: platformNameOf(view.account), browser: browserBrandOf(view.account) };
  if (location === "local") return { ...rest, ...named, location, streamKind: rest.generation ? "cast" : "none" };
  return { ...rest, ...named, location, streamKind: stream ? "voxl" : "frames" };
}

export async function checkMovedAccount(account: FacebookAccount): Promise<MoveCheck> {
  const row = readConnectionRows().find((item) => item.id === account.id) ?? readConnectionRows().find((item) => item.name === account.accountName && item.platform === String(account.platform ?? "").toLowerCase());
  if (!row) return { verdict: "unknown", code: "accountNotFound", detail: "the account is not in the connections list" };
  const run = await runSessionCheck({ id: row.id, name: row.name, platform: row.platform, status: row.status, state: row.state, checkedAt: row.checkedAt, lastCheck: row.lastCheck }, { callTool: await inProcessToolCaller() });
  const report = run.report;
  return report ? { verdict: report.verdict, code: report.code, detail: report.detail } : { verdict: "unknown", code: "checkFailed", detail: "the check gave no report" };
}

export const browserDeps: { state: (account: string) => Promise<ViewerView>; move: (context: CommandContext) => MoveDeps } = {
  state: viewerState,
  move: (context) => ({ accounts: context.accounts, adsPower: context.adsPower ?? createAdsPowerClient(), readState: readStateOverCdp, check: checkMovedAccount, ledger: logDbMoveLedger(), log: (line) => context.err(line), now: context.now }),
};

async function runMove(context: CommandContext, positionals: string[], flags: Record<string, unknown>): Promise<CommandResult> {
  const account = positionals[1];
  const all = flags["all"] === true;
  const apply = flags["apply"] === true;
  const to = (typeof flags["to"] === "string" ? flags["to"] : "camoufox") as MoveTarget;
  const json = flags["json"] === true;
  if (apply && !(typeof flags["approvedBy"] === "string" && flags["approvedBy"].trim())) return refuseInput("browser move", "--apply needs --approvedBy with who approved it (rule 8)", BROWSER_USAGE);
  try {
    const deps = browserDeps.move(context);
    const plan = await planMoves(deps, { account, all: all || !account, to });
    if (flags["release"] === true) {
      if (!apply) return { code: 0, stdout: json ? JSON.stringify({ applied: false, release: plan.releasable }, null, 2) : plan.releasable.length ? `Would delete these AdsPower profiles of moved accounts (--release --apply, once the owner says so): ${plan.releasable.map((e) => `${e.accountName} ${e.formerAdsPowerProfileId}`).join(", ")}` : "No moved account still holds an AdsPower profile." };
      const released = await releaseMoved(deps, plan.releasable);
      return { code: released.every((r) => r.released) ? 0 : 1, stdout: json ? JSON.stringify({ applied: true, released }, null, 2) : released.length ? released.map((r) => `  ${r.accountName} ${r.profileId}: ${r.released ? "released" : `not released: ${r.detail}`}`).join("\n") : "No moved account still holds an AdsPower profile." };
    }
    if (!apply || (!account && !all)) {
      const text = movePlanText(plan, false) + (apply ? "\nName an account or pass --all to move; nothing changed." : "");
      return { code: 0, stdout: json ? JSON.stringify({ applied: false, ...plan }, null, 2) : text };
    }
    const results = await moveAccounts(deps, plan);
    const failed = results.some((r) => r.outcome === "failed" || r.outcome === "rolledBack");
    const out = json ? JSON.stringify({ applied: true, to, results }, null, 2) : moveResultText(results);
    return failed ? { code: 1, error: "browserMoveNotSignedIn", stdout: out, stderr: `log browser move: ${results.filter((r) => r.outcome === "failed" || r.outcome === "rolledBack").map((r) => `${r.accountName} ${r.code}`).join(", ")}` } : { code: 0, stdout: out };
  } catch (error) {
    return refuseError("browser move", error);
  }
}

export const browserCommand: Command = liveThroughAction<Command>({
  usage: BROWSER_USAGE,
  platform: "any",
  name: "browser",
  effect: "write",
  input: BROWSER_INPUT,
  summary: "One account's live browser: whether it needs a person to sign in, streamed inline into the chat",
  args: "view --account <accountName> [--json] | move [<account>] [--to <browser>] [--all] [--apply]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(BROWSER_INPUT));
    if (!parsed.ok) return refuseInput("browser", parsed.error, BROWSER_USAGE);
    if (parsed.positionals[0] === "move" && parsed.positionals.length <= 2) return runMove(_context, parsed.positionals, parsed.flags);
    if (parsed.positionals[0] !== "view" || parsed.positionals.length > 1) return { code: 1, error: "inputInvalid", stderr: `log browser: say view or move\n${BROWSER_USAGE}` };
    const account = parsed.flags["account"];
    if (typeof account !== "string" || !account) return { code: 1, error: "inputInvalid", stderr: `log browser view: --account is required\n${BROWSER_USAGE}` };
    const view = await browserDeps.state(account);
    return { code: 0, stdout: parsed.flags["json"] ? JSON.stringify(browserViewJson(view), null, 2) : browserViewText(view) };
  },}, ["apply"]);
