import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { findTiktokAccount, recordTiktokSession, tiktokGate } from "../../tiktok/account/session/index.ts";
import type { PlatformAnswer } from "../../platformKit/session/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuse, refuseError } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const TIKTOK_SESSION_USAGE = [
  "Usage: log tiktok session check --account <accountName> [--json]",
  "Checks that TikTok still accepts the account's saved session, on the direct-API engine (no browser): TikTok Studio's own /tiktokstudio/api/web/user, whose userId is 0 when the cookies aren't signed in. Sends nothing.",
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
  if (answer.ok) return `log tiktok session check: ${accountName} is loggedIn${answer.screenName ? ` as ${answer.screenName}` : ""}, via the direct-API engine (no browser).`;
  return `log tiktok session check: ${accountName}: ${answer.code}${answer.loginState ? ` (${answer.loginState})` : ""}: ${answer.detail ?? ""}`;
}

export const TIKTOK_STATS_USAGE = [
  "Usage: log tiktok stats --account <accountName> [--limit <n>] [--json]",
  "How the account is doing on TikTok, on the direct-API engine (no browser): its followers and following (TikTok Studio's multiGetFollowRelationCount), then its own posts newest first with each one's views, likes, comments, shares and saves (TikTok Studio's creator/manage/item_list/v1, the Content page's own list).",
  "Reads only: nothing is sent. --limit is how many posts to read, default 50, at most 500.",
].join("\n");

const TIKTOK_STATS_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Read the account's followers and its own posts' views, likes, comments, shares and saves",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TIKTOK socialAccount's accountName (its handle)" },
        { name: "limit", kind: "integer", min: 1, max: 500, refusal: "limitInvalid", description: "How many posts to read (default 50, at most 500)" },
        JSON_FLAG,
      ],
    },
  ],
};

export interface TiktokPostStats {
  id: string;
  caption: string;
  postedAt: number | null;
  seconds: number;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  inReview: boolean;
  pinned: boolean;
}

const flat = (value: string, max: number) => {
  const one = value.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

export function tiktokPostLine(p: TiktokPostStats, i: number, handle: string | null): string {
  const when = p.postedAt ? new Date(p.postedAt * 1000).toISOString().slice(0, 16).replace("T", " ") : "?";
  const flags = [p.pinned ? "pinned" : "", p.inReview ? "in review" : ""].filter(Boolean).join(", ");
  const link = handle ? `https://www.tiktok.com/@${handle}/video/${p.id}` : p.id;
  return `  ${i + 1}. ${when} · ${p.views ?? "?"} views · ${p.likes ?? "?"} likes · ${p.comments ?? "?"} comments · ${p.shares ?? "?"} shares · ${p.saves ?? "?"} saves${flags ? ` · ${flags}` : ""}\n     ${link}${p.caption ? `\n     ${flat(p.caption, 160)}` : ""}`;
}

export const tiktokStatsCommand: Command = {
  usage: TIKTOK_STATS_USAGE,
  platform: "tiktok",
  name: "stats",
  effect: "read",
  input: TIKTOK_STATS_INPUT,
  summary: "Read an account's TikTok followers and its own posts' views, likes, comments, shares and saves, on the direct-API engine",
  args: "--account <a> [--limit <n>] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_STATS_INPUT));
    if (!parsed.ok) return { code: 1, stderr: `log tiktok stats: ${parsed.error}\n${TIKTOK_STATS_USAGE}` };
    if (parsed.positionals.length) return { code: 1, stderr: `log tiktok stats: takes no words, only flags\n${TIKTOK_STATS_USAGE}` };
    const ref = parsed.flags["account"];
    if (typeof ref !== "string") return { code: 1, stderr: `log tiktok stats: --account is needed\n${TIKTOK_STATS_USAGE}` };
    const limit = numberOf(parsed, "limit") ?? 50;
    try {
      const account = await findTiktokAccount(context.twenty, ref);
      const gate = tiktokGate(account);
      if (!gate.ok) return refuse("tiktok stats", gate.code === "accountDeactivated" ? "accountNotUsable" : gate.code, gate.detail);
      if (!context.directTiktok) return { code: 1, stderr: "log tiktok stats: the direct-API engine isn't wired in this context" };
      context.err(`${account.accountName}: reading its followers and its ${limit} newest posts' stats from TikTok Studio on the direct-API engine (reads only)`);
      const run = context.directTiktok(account, { action: "stats", limit });
      for (const line of await recordTiktokSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      const answer = run.answer;
      if (!answer.ok) return { code: 1, stderr: `log tiktok stats: ${account.accountName}: ${answer.code}: ${answer.detail ?? ""}. Nothing is retried (rule 94).` };
      const posts = (Array.isArray(answer["posts"]) ? answer["posts"] : []) as TiktokPostStats[];
      const totals = (answer["totals"] ?? {}) as Record<string, number>;
      const handle = account.accountName;
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ engine: "directApi", platform: "tiktok", account: handle, followers: answer["followers"], following: answer["following"], totals, posts }, null, 2) };
      const head = `log tiktok stats: ${handle}: ${answer["followers"] ?? "?"} followers · ${answer["following"] ?? "?"} following · ${posts.length} posts read: ${totals["views"] ?? 0} views · ${totals["likes"] ?? 0} likes · ${totals["comments"] ?? 0} comments · ${totals["shares"] ?? 0} shares · ${totals["saves"] ?? 0} saves`;
      return { code: 0, stdout: [head, ...posts.map((p, i) => tiktokPostLine(p, i, handle))].join("\n") };
    } catch (error) {
      return refuseError("tiktok stats", error);
    }
  },
};

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
      context.err(`${account.accountName}: session check on the direct-API engine`);
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

const APPROVED_BY: CommandInput["forms"][number]["flags"][number] = { name: "approvedBy", kind: "string", description: "Who approved it: needed with --live (rule 8)" };
const liveOn = (what: string): CommandInput["forms"][number]["flags"][number] => ({ name: "live", kind: "boolean", live: true, description: `${what} on TikTok, only when the owner asked (rule 8); without it a dry run sends nothing` });
const VIDEO_MAX_BYTES = 4 * 1024 * 1024 * 1024;
const VISIBILITIES = ["everyone", "friends", "onlyMe"] as const;

export const TIKTOK_POST_USAGE = [
  'Usage: log tiktok post --account <accountName> --video <path> --caption "<caption>" [--visibility everyone|friends|onlyMe] [--approvedBy <who>] [--live] [--json]',
  "Posts one video on TikTok on the direct-API engine, with no browser, through the calls TikTok Studio's upload page makes (recorded from a real post): GET /api/v1/video/upload/auth/ for the upload's temporary keys, ApplyUploadInner on TikTok's upload gateway (/top/v1, signed AWS4-HMAC-SHA256 with those keys), the video sent to the storage host it names with its CRC32 (in parts above 8 MB, then finished), then POST /tiktok/web/project/post/v1/ with the video id and the caption.",
  "A dry run unless --live, which needs --approvedBy (rule 8). TikTok's answer decides: the new post's item_id is the post, and anything else stops the run with nothing retried (rule 94); a video uploaded but refused at the post step is said with its video id. --visibility defaults to everyone.",
].join("\n");

const TIKTOK_POST_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Post one video on TikTok with no browser; a dry run unless --live",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TIKTOK socialAccount's accountName (its handle)" },
        { name: "video", kind: "string", required: true, description: "The video file to post (MP4 or MOV)" },
        { name: "caption", kind: "string", required: true, description: "The post's caption, at most 2200 characters" },
        { name: "visibility", kind: "string", description: "Who can see it: everyone (default), friends or onlyMe" },
        APPROVED_BY,
        liveOn("Post it"),
        JSON_FLAG,
      ],
    },
  ],
};

export const tiktokPostCommand: Command = {
  usage: TIKTOK_POST_USAGE,
  platform: "tiktok",
  name: "post",
  effect: "write",
  input: TIKTOK_POST_INPUT,
  summary: "Post one video on TikTok on the direct-API engine, with no browser; a dry run unless --live",
  args: '--account <a> --video <path> --caption "<caption>" [--visibility everyone|friends|onlyMe] [--approvedBy <who>] [--live] [--json]',
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_POST_INPUT));
    if (!parsed.ok) return { code: 1, stderr: `log tiktok post: ${parsed.error}\n${TIKTOK_POST_USAGE}` };
    if (parsed.positionals.length) return { code: 1, stderr: `log tiktok post: takes no words, only flags\n${TIKTOK_POST_USAGE}` };
    const ref = parsed.flags["account"];
    const videoFlag = parsed.flags["video"];
    const caption = parsed.flags["caption"];
    if (typeof ref !== "string" || typeof videoFlag !== "string" || typeof caption !== "string") return { code: 1, stderr: `log tiktok post: --account, --video and --caption are needed\n${TIKTOK_POST_USAGE}` };
    const visibility = typeof parsed.flags["visibility"] === "string" ? parsed.flags["visibility"] : "everyone";
    if (!(VISIBILITIES as readonly string[]).includes(visibility)) return refuse("tiktok post", "visibilityInvalid", `--visibility is everyone, friends or onlyMe, not ${visibility}`);
    if (caption.length > 2200) return refuse("tiktok post", "captionTooLong", `the caption is ${caption.length} characters; TikTok takes at most 2200`);
    const video = resolve(videoFlag);
    if (!existsSync(video) || !statSync(video).isFile()) return refuse("tiktok post", "videoMissing", `no such video file ${video}`);
    if (!/\.(mp4|mov)$/i.test(video)) return refuse("tiktok post", "videoTypeUnsupported", `${video} is not an MP4 or MOV`);
    const size = statSync(video).size;
    if (size > VIDEO_MAX_BYTES) return refuse("tiktok post", "videoTooLarge", `${video} is ${size} bytes; TikTok's web upload takes at most 4 GB`);
    const live = parsed.flags["live"] === true;
    const approvedBy = typeof parsed.flags["approvedBy"] === "string" ? parsed.flags["approvedBy"] : "";
    if (live && !approvedBy) return refuse("tiktok post", "notApproved", "--live needs --approvedBy <who> (rule 8)");
    try {
      const account = await findTiktokAccount(context.twenty, ref);
      const gate = tiktokGate(account);
      if (!gate.ok) return refuse("tiktok post", gate.code === "accountDeactivated" ? "accountNotUsable" : gate.code, gate.detail);
      if (!live) return { code: 0, stdout: `log tiktok post: dry run: ${account.accountName} would post ${video} (${Math.round(size / 1024)} KB) to ${visibility} with the caption "${caption}". Nothing was sent. --live --approvedBy <who> does it (rule 8).` };
      if (!context.directTiktok) return { code: 1, stderr: "log tiktok post: the direct-API engine isn't wired in this context" };
      context.err(`${account.accountName}: uploading ${Math.round(size / 1024)} KB and posting it on the direct-API engine, no browser (approved by ${approvedBy})`);
      const run = context.directTiktok(account, { action: "post", live: true, approvedBy, video, caption, visibility });
      for (const line of await recordTiktokSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      const answer = run.answer;
      if (!answer.ok) return { code: 1, stderr: `log tiktok post: ${account.accountName}: ${answer.code}: ${answer.detail ?? ""}. Nothing is retried (rule 94).` };
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ engine: "directApi", platform: "tiktok", account: account.accountName, itemId: answer["itemId"], videoId: answer["videoId"], url: answer["url"] }, null, 2) };
      return { code: 0, stdout: `log tiktok post: posted on ${account.accountName}: ${answer["url"]} (item ${answer["itemId"]}, video ${answer["videoId"]})` };
    } catch (error) {
      return refuseError("tiktok post", error);
    }
  },
};

export const TIKTOK_DELETE_USAGE = [
  "Usage: log tiktok delete --account <accountName> --id <postId> [--approvedBy <who>] [--live] [--json]",
  "Deletes one of the account's own TikTok posts on the direct-API engine, with no browser: POST /tiktok/post/edit/v1/ with delete_type 1, the call TikTok Studio's Delete button makes (recorded from a real delete). TikTok's answer decides: edit_diff names the post and every edit result is 0, or nothing is retried (rule 94).",
  "A dry run unless --live, which needs --approvedBy (rule 8). The id is the number in the post's link (log tiktok stats lists them).",
].join("\n");

const TIKTOK_DELETE_INPUT: CommandInput = {
  forms: [
    {
      words: [],
      summary: "Delete one of the account's own TikTok posts with no browser; a dry run unless --live",
      positionals: [],
      flags: [
        { name: "account", kind: "string", required: true, description: "The TIKTOK socialAccount's accountName (its handle)" },
        { name: "id", kind: "string", required: true, description: "The post's id, the number in its link" },
        APPROVED_BY,
        liveOn("Delete it"),
        JSON_FLAG,
      ],
    },
  ],
};

export const tiktokDeleteCommand: Command = {
  usage: TIKTOK_DELETE_USAGE,
  platform: "tiktok",
  name: "delete",
  effect: "write",
  input: TIKTOK_DELETE_INPUT,
  summary: "Delete one of the account's own TikTok posts on the direct-API engine, with no browser; a dry run unless --live",
  args: "--account <a> --id <postId> [--approvedBy <who>] [--live] [--json]",
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_DELETE_INPUT));
    if (!parsed.ok) return { code: 1, stderr: `log tiktok delete: ${parsed.error}\n${TIKTOK_DELETE_USAGE}` };
    if (parsed.positionals.length) return { code: 1, stderr: `log tiktok delete: takes no words, only flags\n${TIKTOK_DELETE_USAGE}` };
    const ref = parsed.flags["account"];
    const id = parsed.flags["id"];
    if (typeof ref !== "string" || typeof id !== "string") return { code: 1, stderr: `log tiktok delete: --account and --id are needed\n${TIKTOK_DELETE_USAGE}` };
    if (!/^\d{6,25}$/.test(id)) return refuse("tiktok delete", "itemIdInvalid", `${id} is not a TikTok post id (the number in its link)`);
    const live = parsed.flags["live"] === true;
    const approvedBy = typeof parsed.flags["approvedBy"] === "string" ? parsed.flags["approvedBy"] : "";
    if (live && !approvedBy) return refuse("tiktok delete", "notApproved", "--live needs --approvedBy <who> (rule 8)");
    try {
      const account = await findTiktokAccount(context.twenty, ref);
      const gate = tiktokGate(account);
      if (!gate.ok) return refuse("tiktok delete", gate.code === "accountDeactivated" ? "accountNotUsable" : gate.code, gate.detail);
      if (!live) return { code: 0, stdout: `log tiktok delete: dry run: ${account.accountName} would delete https://www.tiktok.com/@${account.accountName}/video/${id}. Nothing was sent. --live --approvedBy <who> does it (rule 8).` };
      if (!context.directTiktok) return { code: 1, stderr: "log tiktok delete: the direct-API engine isn't wired in this context" };
      context.err(`${account.accountName}: deleting post ${id} on the direct-API engine, no browser (approved by ${approvedBy})`);
      const run = context.directTiktok(account, { action: "deletePost", live: true, approvedBy, itemId: id });
      for (const line of await recordTiktokSession(context.twenty, account, run, context.now?.() ?? new Date())) context.err(line);
      const answer = run.answer;
      if (!answer.ok) return { code: 1, stderr: `log tiktok delete: ${account.accountName}: ${answer.code}: ${answer.detail ?? ""}. Nothing is retried (rule 94).` };
      if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ engine: "directApi", platform: "tiktok", account: account.accountName, itemId: id, deleted: true }, null, 2) };
      return { code: 0, stdout: `log tiktok delete: deleted post ${id} on ${account.accountName}` };
    } catch (error) {
      return refuseError("tiktok delete", error);
    }
  },
};

export { tiktokSearchCommand } from './search'
export { tiktokScrapeCommand } from './scrape'
