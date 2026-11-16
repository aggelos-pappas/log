import type { TwitterPost, TwitterSessionAnswer } from "../../../twitter/account/session/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseError, refuseInput } from "../../runner/helpers/index.ts";
import type { Command, CommandInput } from "../../runner/types.ts";
import { governorLine, openTwitterAccount } from "./account.ts";

export const POSTS_USAGE = [
  "Usage: log twitter posts --account <accountName> --user <handle> [--limit <n>] [--media] [--json]",
  "Reads one person's recent posts on X through the account's own session on the direct-API engine (no browser, no proxy: X accounts call X directly, rule 80), newest first: when, the text, likes, reposts, replies and views, and each photo or video with its best MP4 link. Sends nothing, and the person is never told.",
  "--media reads their Media tab (posts with a photo or video) instead of their posts. X's own answer decides: the session check first, then X's own user and timeline answers, up to 40 a page, 1.5 s apart. --limit is how many posts to read, default 20, at most 200.",
].join("\n");

export const POSTS_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Read one person's recent posts on X, newest first, sending nothing",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TWITTER socialAccount's accountName (its handle) whose session reads them" },
        { name: "user", kind: "string", required: true, description: "The handle of the person whose posts to read" },
        { name: "limit", kind: "integer", min: 1, max: 200, refusal: "limitInvalid", description: "How many posts to read (default 20, at most 200)" },
        { name: "media", kind: "boolean", description: "Read their Media tab: only posts with a photo or video" },
        JSON_FLAG,
      ],
    },
  ],
};

const flat = (text: string, max: number) => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

export function postLine(p: TwitterPost, i: number): string {
  const kind = p.repostOf ? ` · repost of @${p.repostOf}` : p.isQuote ? " · quote" : "";
  const stats = `${p.views} views · ${p.likes} likes · ${p.reposts} reposts · ${p.replies} replies`;
  const media = p.media.map((m) => (m.videoUrl ? `\n     video ${m.durationMs ? `${Math.round(m.durationMs / 1000)} s ` : ""}${m.videoUrl}` : m.url ? `\n     ${m.type} ${m.url}` : "")).join("");
  return `  ${i + 1}. ${p.createdAt ?? ""}${kind} · ${stats}\n     ${p.url}${p.text ? `\n     ${flat(p.text, 220)}` : ""}${media}`;
}

function render(account: string, user: string, answer: TwitterSessionAnswer): string {
  if (!answer.ok) return `log twitter posts: ${account}: ${answer.code}${answer.loginState ? ` (${answer.loginState})` : ""}: ${answer.detail ?? ""}`;
  const list = answer.posts ?? [];
  const who = answer.user ? ` (${answer.user.followers} followers, ${answer.user.posts} posts)` : "";
  return [`log twitter posts: @${user}${who}, ${list.length} posts read through @${account}'s session, newest first, via the direct-API engine (no browser):`, ...list.map(postLine)].join("\n");
}

export const postsCommand: Command = {
  usage: POSTS_USAGE,
  platform: "twitter",
  name: "posts",
  effect: "read",
  input: POSTS_INPUT,
  summary: "Read one person's recent posts on X on the direct-API engine, sending nothing",
  args: "--account <a> --user <handle> [--limit <n>] [--media] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(POSTS_INPUT));
    if (!parsed.ok) return refuseInput("twitter posts", parsed.error, POSTS_USAGE);
    const ref = parsed.flags["account"];
    const rawUser = parsed.flags["user"];
    const user = typeof rawUser === "string" ? rawUser.trim().replace(/^@/, "").replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//, "").split(/[/?#]/)[0] : "";
    if (typeof ref !== "string" || !/^[A-Za-z0-9_]{1,15}$/.test(user)) return refuseInput("twitter posts", "--account and --user (an X handle) are needed", POSTS_USAGE);
    const limit = numberOf(parsed, "limit") ?? 20;
    const mediaOnly = parsed.flags["media"] === true;
    try {
      const opened = await openTwitterAccount(context, "twitter posts", ref);
      if (!opened.ok) return opened.result;
      context.err(`${opened.account.accountName}: reading @${user}'s ${mediaOnly ? "media posts" : "posts"} (up to ${limit}) on the direct-API engine, X called directly`);
      const run = await opened.engine({ action: "userPosts", user, limit, mediaOnly });
      const code = run.answer.ok ? 0 : 1;
      if (parsed.flags["json"]) return { code, stdout: JSON.stringify({ engine: "directApi", library: "twikit", account: opened.account.accountName, ...run.answer }, null, 2) };
      const governor = governorLine(run);
      return { code, stdout: [render(opened.account.accountName, user, run.answer), ...(governor ? [governor] : [])].join("\n") };
    } catch (error) {
      return refuseError("twitter posts", error);
    }
  },
};
