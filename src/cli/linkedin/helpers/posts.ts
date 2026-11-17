import { recordLinkedinSession } from "../../../linkedin/account/session/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseError, refuseInput } from "../../runner/helpers/index.ts";
import type { Command, CommandInput } from "../../runner/types.ts";
import { ACCOUNT_FLAG, failed, openAccount, text } from "./share.ts";

export type LinkedinPostViews = { impressions?: number | string; membersReached?: number | string; videoViews?: number | string; watchTime?: string; averageWatchTime?: string; profileViewers?: number | string; followersGained?: number | string; engagements?: number | string; inNetwork?: string; outOfNetwork?: string };

export type LinkedinOwnPost = { activityId: string | null; url: string | null; text: string; postedAgo: string | null; repost: boolean; content: string | null; reactions: number; comments: number; reposts: number; reactionTypes: Record<string, number>; views?: LinkedinPostViews };

export const LINKEDIN_POSTS_USAGE = [
  "Usage: log linkedin posts --account <accountName> [--limit <n>] [--views] [--json]",
  "Lists the account's own recent LinkedIn posts with how each is doing, on the direct-API engine (no browser): the account's own profile (/voyager/api/me), then its activity feed (profileUpdatesV2, memberShareFeed). Each post shows when, its link, the start of its text, and its reactions (by type), comments and reposts.",
  "--views also reads each of its own posts' analytics, the way its Post analytics page does (POST /flagship-web/analytics/post-summary/urn:li:activity:<id>/, then the spaSlowMetrics server request), a few seconds apart: impressions, members reached, in- and out-of-network share, video views and watch time, profile viewers and followers gained. Reposts have no analytics of their own and are skipped.",
  "Reads only: nothing is sent. --limit is how many posts to read, default 10, at most 50.",
].join("\n");

const LINKEDIN_POSTS_INPUT: CommandInput = {
  forms: [{
    words: [],
    summary: "List the account's own recent LinkedIn posts with their reactions, comments and reposts",
    positionals: [],
    flags: [ACCOUNT_FLAG, { name: "limit", kind: "integer", min: 1, max: 50, refusal: "limitInvalid", description: "How many posts to read (default 10, at most 50)" }, { name: "views", kind: "boolean", description: "Also read each own post's analytics: impressions, members reached, video views" }, JSON_FLAG],
  }],
};

const flat = (value: string, max: number) => {
  const one = value.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

export function viewsLine(v: LinkedinPostViews): string {
  const parts = [
    v.impressions !== undefined ? `${v.impressions} impressions` : "",
    v.membersReached !== undefined ? `${v.membersReached} reached` : "",
    v.inNetwork && v.outOfNetwork ? `${v.inNetwork} in network, ${v.outOfNetwork} out` : "",
    v.videoViews !== undefined ? `${v.videoViews} video views` : "",
    v.watchTime ? `${v.watchTime} watched (avg ${v.averageWatchTime ?? "?"})` : "",
    v.profileViewers !== undefined ? `${v.profileViewers} profile viewers` : "",
    v.followersGained !== undefined ? `${v.followersGained} followers gained` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "no analytics";
}

export function ownPostLine(p: LinkedinOwnPost, i: number): string {
  const types = Object.entries(p.reactionTypes).filter(([, n]) => n > 0).map(([t, n]) => `${t.toLowerCase()} ${n}`).join(", ");
  const kind = p.repost ? " · repost" : p.content ? ` · ${p.content.replace(/Component$/, "").toLowerCase()}` : "";
  const views = p.views ? `\n     ${viewsLine(p.views)}` : "";
  return `  ${i + 1}. ${p.postedAgo ?? "?"}${kind} · ${p.reactions} reactions${types ? ` (${types})` : ""} · ${p.comments} comments · ${p.reposts} reposts${views}\n     ${p.url ?? "(no link)"}${p.text ? `\n     ${flat(p.text, 200)}` : ""}`;
}

export const linkedinPostsCommand: Command = {
  usage: LINKEDIN_POSTS_USAGE,
  platform: "linkedin",
  name: "posts",
  effect: "read",
  input: LINKEDIN_POSTS_INPUT,
  summary: "List the account's own recent LinkedIn posts with how each is doing, on the direct-API engine",
  args: "--account <a> [--limit <n>] [--views] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(LINKEDIN_POSTS_INPUT));
    if (!parsed.ok) return refuseInput("linkedin posts", `${parsed.error}`, LINKEDIN_POSTS_USAGE);
    if (parsed.positionals.length) return refuseInput("linkedin posts", `takes no words, only flags`, LINKEDIN_POSTS_USAGE);
    const ref = text(parsed.flags, "account");
    if (!ref) return refuseInput("linkedin posts", `--account is needed`, LINKEDIN_POSTS_USAGE);
    const limit = numberOf(parsed, "limit") ?? 10;
    const views = parsed.flags["views"] === true;
    try {
      const opened = await openAccount(context, "posts", ref);
      if (!opened.ok) return opened.result;
      const account = opened.account;
      context.err(`${account.accountName}: reading its own LinkedIn posts (up to ${limit})${views ? " and each one's analytics, a few seconds apart" : ""} on the direct-API engine (reads only)`);
      const run = context.directLinkedin!(account, { action: "myPosts", limit, ...(views ? { views: true } : {}) });
      for (const line of await recordLinkedinSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      if (!run.answer.ok) return failed("posts", run);
      const viewsError = run.answer["viewsError"] as { code?: string; detail?: string } | undefined;
      if (viewsError) context.err(`linkedin posts: the posts were read, but their analytics weren't: ${viewsError.code}: ${viewsError.detail}. Nothing is retried (rule 94).`);
      const posts = (Array.isArray(run.answer["posts"]) ? run.answer["posts"] : []) as LinkedinOwnPost[];
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ platform: "linkedin", account: account.accountName, posts }, null, 2) };
      return { code: 0, stdout: `log linkedin posts: ${account.accountName}'s ${posts.length} newest posts:\n${posts.map(ownPostLine).join("\n")}` };
    } catch (error) {
      return refuseError("linkedin posts", error);
    }
  },
};
