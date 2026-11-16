import { recordLinkedinSession } from "../../../linkedin/account/session/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseError, refuseInput } from "../../runner/helpers/index.ts";
import type { Command, CommandInput } from "../../runner/types.ts";
import { ACCOUNT_FLAG, failed, openAccount, text } from "./share.ts";

export type LinkedinOwnPost = { activityId: string | null; url: string | null; text: string; postedAgo: string | null; repost: boolean; content: string | null; reactions: number; comments: number; reposts: number; reactionTypes: Record<string, number> };

export const LINKEDIN_POSTS_USAGE = [
  "Usage: log linkedin posts --account <accountName> [--limit <n>] [--json]",
  "Lists the account's own recent LinkedIn posts with how each is doing, on the direct-API engine (no browser): the account's own profile (/voyager/api/me), then its activity feed (profileUpdatesV2, memberShareFeed). Each post shows when, its link, the start of its text, and its reactions (by type), comments and reposts. LinkedIn gives views only on its analytics page, so they aren't here.",
  "Reads only: nothing is sent. --limit is how many posts to read, default 10, at most 50.",
].join("\n");

const LINKEDIN_POSTS_INPUT: CommandInput = {
  forms: [{
    words: [],
    summary: "List the account's own recent LinkedIn posts with their reactions, comments and reposts",
    positionals: [],
    flags: [ACCOUNT_FLAG, { name: "limit", kind: "integer", min: 1, max: 50, refusal: "limitInvalid", description: "How many posts to read (default 10, at most 50)" }, JSON_FLAG],
  }],
};

const flat = (value: string, max: number) => {
  const one = value.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

export function ownPostLine(p: LinkedinOwnPost, i: number): string {
  const types = Object.entries(p.reactionTypes).filter(([, n]) => n > 0).map(([t, n]) => `${t.toLowerCase()} ${n}`).join(", ");
  const kind = p.repost ? " · repost" : p.content ? ` · ${p.content.replace(/Component$/, "").toLowerCase()}` : "";
  return `  ${i + 1}. ${p.postedAgo ?? "?"}${kind} · ${p.reactions} reactions${types ? ` (${types})` : ""} · ${p.comments} comments · ${p.reposts} reposts\n     ${p.url ?? "(no link)"}${p.text ? `\n     ${flat(p.text, 200)}` : ""}`;
}

export const linkedinPostsCommand: Command = {
  usage: LINKEDIN_POSTS_USAGE,
  platform: "linkedin",
  name: "posts",
  effect: "read",
  input: LINKEDIN_POSTS_INPUT,
  summary: "List the account's own recent LinkedIn posts with how each is doing, on the direct-API engine",
  args: "--account <a> [--limit <n>] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(LINKEDIN_POSTS_INPUT));
    if (!parsed.ok) return refuseInput("linkedin posts", `${parsed.error}`, LINKEDIN_POSTS_USAGE);
    if (parsed.positionals.length) return refuseInput("linkedin posts", `takes no words, only flags`, LINKEDIN_POSTS_USAGE);
    const ref = text(parsed.flags, "account");
    if (!ref) return refuseInput("linkedin posts", `--account is needed`, LINKEDIN_POSTS_USAGE);
    const limit = numberOf(parsed, "limit") ?? 10;
    try {
      const opened = await openAccount(context, "posts", ref);
      if (!opened.ok) return opened.result;
      const account = opened.account;
      context.err(`${account.accountName}: reading its own LinkedIn posts (up to ${limit}) on the direct-API engine (reads only)`);
      const run = context.directLinkedin!(account, { action: "myPosts", limit });
      for (const line of await recordLinkedinSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      if (!run.answer.ok) return failed("posts", run);
      const posts = (Array.isArray(run.answer["posts"]) ? run.answer["posts"] : []) as LinkedinOwnPost[];
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ platform: "linkedin", account: account.accountName, posts }, null, 2) };
      return { code: 0, stdout: `log linkedin posts: ${account.accountName}'s ${posts.length} newest posts:\n${posts.map(ownPostLine).join("\n")}` };
    } catch (error) {
      return refuseError("linkedin posts", error);
    }
  },
};
