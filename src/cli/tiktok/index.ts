import { findTiktokAccount, recordTiktokSession, tiktokGate } from "../../tiktok/account/session/index.ts";
import type { PlatformAnswer } from "../../platformKit/session/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuse, refuseError } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";
export { tiktokSearchCommand } from './search'
export { tiktokScrapeCommand } from './scrape'

export const TIKTOK_SESSION_USAGE = [
  "Usage: log tiktok session check --account <accountName> [--json]",
  "Checks that TikTok still accepts the account's saved session, on the direct-API engine (login check not implemented yet, no browser). Sends nothing.",
  "TikTok's own answer decides. The result goes to socialAccounts.sessionState, and refreshed cookies are merged back into the row.",
].join("\n");

export const TIKTOK_SESSION_INPUT: CommandInput = {
  forms: [
    {
      words: ["check"],
      summary: "Check that TikTok still accepts one account's saved session, sending nothing",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TIKTOK socialAccount's accountName (its handle)" },
        JSON_FLAG,
      ],
    },
  ],
};

function render(accountName: string, answer: PlatformAnswer): string {
  if (answer.ok) return `log tiktok session check: ${accountName} is loggedIn${answer.screenName ? ` as ${answer.screenName}` : ""}, via the direct-API engine (login check not implemented yet, no browser).`;
  return `log tiktok session check: ${accountName}: ${answer.code}${answer.loginState ? ` (${answer.loginState})` : ""}: ${answer.detail ?? ""}`;
}

export const tiktokSessionCommand: Command = {
  usage: TIKTOK_SESSION_USAGE,
  platform: "tiktok",
  name: "session",
  effect: "read",
  input: TIKTOK_SESSION_INPUT,
  summary: "Check that TikTok still accepts an account's saved session, on the direct-API engine, sending nothing; the answer goes to Twenty",
  args: "check --account <a> [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_SESSION_INPUT));
    if (!parsed.ok) return { code: 1, stderr: `log tiktok session: ${parsed.error}\n${TIKTOK_SESSION_USAGE}` };
    if (parsed.positionals[0] !== "check" || parsed.positionals.length > 1) return { code: 1, stderr: `log tiktok session: give check\n${TIKTOK_SESSION_USAGE}` };
    const ref = parsed.flags["account"];
    if (typeof ref !== "string") return { code: 1, stderr: `log tiktok session check: --account is needed\n${TIKTOK_SESSION_USAGE}` };
    try {
      const account = await findTiktokAccount(context.twenty, ref);
      const gate = tiktokGate(account);
      if (!gate.ok) return refuse("tiktok session check", gate.code === "accountDeactivated" ? "accountNotUsable" : gate.code, gate.detail);
      if (!context.directTiktok) return { code: 1, stderr: "log tiktok session check: the direct-API engine isn't wired in this context" };
      context.err(`${account.accountName}: session check on the direct-API engine (no client vendored yet)`);
      const run = context.directTiktok(account, { action: "ping" });
      for (const line of await recordTiktokSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      const code = run.answer.ok ? 0 : 1;
      if (parsed.flags["json"]) return { code, stdout: JSON.stringify({ engine: "directApi", platform: "tiktok", account: account.accountName, ...run.answer }, null, 2) };
      return { code, stdout: render(account.accountName, run.answer) };
    } catch (error) {
      return refuseError("tiktok session check", error);
    }
  },
};
