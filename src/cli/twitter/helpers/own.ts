import { ownChangesSince, refreshOwnActivity } from "../../../twitter/ownActivity/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuse, refuseError, refuseInput } from "../../runner/helpers/index.ts";
import type { Command, CommandInput } from "../../runner/types.ts";
import { governorLine, openTwitterAccount } from "./account.ts";

export const OWN_USAGE = [
  "Usage: log twitter own --account <accountName> [--with <handle>] [--json]",
  "What the owner did on X himself (replies, likes, follows) that log didn't send, on the direct-API engine. Three reads; a check under 10 min old is reused; the watcher polls it. --with: just that person, last day. Sends nothing.",
].join("\n");

export const OWN_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Read what the owner did on X himself (replies, likes, follows), sending nothing",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TWITTER socialAccount's accountName (its handle)" },
        { name: "with", kind: "string", description: "Only what he did with this one person (an X handle)" },
        JSON_FLAG,
      ],
    },
  ],
};

export const ownCommand: Command = {
  usage: OWN_USAGE,
  platform: "twitter",
  name: "own",
  effect: "read",
  input: OWN_INPUT,
  summary: "Read what the owner did on X himself (replies, likes, follows), sending nothing",
  args: "--account <a> [--with <handle>] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(OWN_INPUT));
    if (!parsed.ok) return refuseInput("twitter own", parsed.error, OWN_USAGE);
    const ref = parsed.flags["account"];
    const raw = parsed.flags["with"];
    const who = typeof raw === "string" ? raw.trim().replace(/^@/, "") : null;
    if (typeof ref !== "string") return refuseInput("twitter own", "--account is needed", OWN_USAGE);
    try {
      const opened = await openTwitterAccount(context, "twitter own", ref);
      if (!opened.ok) return opened.result;
      const account = opened.account.accountName;
      let governor: string | null = null;
      const engine = async (spec: Parameters<typeof opened.engine>[0]) => {
        const run = await opened.engine(spec);
        governor = governorLine(run);
        return run;
      };
      const now = (context.now?.() ?? new Date()).getTime();
      const read = await refreshOwnActivity(account, engine, now);
      if (!read.ok) return refuse("twitter own", "ownActivityRefused", `${account}: X didn't answer the read of his own activity: ${read.refused}`);
      const since = new Date(now - 24 * 3600_000).toISOString();
      const lines = who ? ownChangesSince(account, { handle: who }, since) : [];
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ account, ...read, ...(who ? { with: who, lines } : {}) }, null, 2) };
      const head = read.fresh ? `log twitter own: @${account}: checked under 10 minutes ago, nothing read` : `log twitter own: @${account}: read his replies, likes and follows: ${read.added} new since the last look`;
      const body = who ? (lines.length ? [`  by hand with @${who} in the last day:`, ...lines.map((l) => `  ${l}`)] : [`  nothing by hand with @${who} in the last day`]) : ["  new by-hand items reach every agent's hook as THE OWNER WROTE BY HAND"];
      return { code: 0, stdout: [head, ...body, ...(governor ? [governor] : [])].join("\n") };
    } catch (error) {
      return refuseError("twitter own", error);
    }
  },
};
