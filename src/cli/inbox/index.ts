import { claimChat, liveClaims, readActions, releaseChat } from "../../inbox/claims/index.ts";
import { behindOf, resumeGap } from "../../inbox/store/index.ts";
import type { ActionRecord, ChatClaim } from "../../inbox/claims/index.ts";
import { lastWordOf, waitingOf } from "../../inbox/lastWord/index.ts";
import type { LastWord } from "../../inbox/lastWord/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuse, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput, FlagSpec } from "../runner/types.ts";
import { readPending, READER_PATTERN } from "../../inbox/pending/index.ts";
import { PUSH_QUIET_MAX_MINUTES, setQuiet } from "../../inbox/push/index.ts";
import { ignoredList, setIgnored } from "../../inbox/ignore/index.ts";
import type { IgnoreEntry } from "../../inbox/ignore/index.ts";
import { isLabel, LABEL_MEANS, LABELS, labelsOf, setLabel } from "../../inbox/label/index.ts";
import type { Labelled } from "../../inbox/label/index.ts";

export const INBOX_USAGE = [
  "Usage: log inbox claim --platform <twitter|discord|slack|instagram> --account <a> --chat <conversationId|handle> [--event <eventId>] [--json]",
  "       log inbox release --platform <p> --account <a> --chat <conversationId|handle> [--json]",
  "       log inbox claims [--json]",
  "       log inbox resume --platform <p> --account <a> --by <who> [--json]",
  "       log inbox actions [--platform <p>] [--account <a>] [--chat <conversationId|handle>] [--limit <n>] [--json]",
  "       log inbox waiting [--platform <p>] [--account <a>] [--limit <n>] [--oldest] [--json]",
  "       log inbox pending --reader <name> [--json]",
  "       log inbox quiet --minutes <n> --by <who> [--json]",
  "       log inbox ignore --platform <p> (--server <id> | --chat <id>) --by <who> [--undo] [--json]",
  "       log inbox ignored [--json]",
  "       log inbox labels [--label <l>] [--platform <p>] [--account <a>] [--limit <n>] [--json]",
  "       log inbox label --platform <p> --account <a> --chat <id> --as <l> --by <who> [--undo] [--json]",
  "pending is what the account watchers heard since this reader last asked, with what to do next for each message: the one delivery every harness reads, the prompt hook's included. A reader is one name per session or harness; a new one starts from now.",
  "Only the session that claims a chat acts on it (rule 133). Every message the push channels bring in has an event id (shown in >>> NEW MESSAGE). claim takes the chat for this session for 10 minutes before you draft or send; a second session is refused (chatClaimedElsewhere). Every send claims the chat itself and releases it once it is sent, interrupted or failed, so two sessions never answer the same chat. A claim held by a session that ended frees itself. resume is the owner's go-ahead after a refused catch-up (rule 94): the account's gap opens again and its owner catches up through its own session within 30 s; only when the owner says so. claims lists who holds what; actions logs every claim, refusal, send and release, to see what was already done in a chat. quiet holds the live push for n minutes. waiting is who wrote last on every platform, read from log.db and nothing else: each chat's messages in time order (never the order they were stored in, since a backfill stores older messages later), one person's chats judged together (an X user's old DM and X Chat), a message mirrored into the other side counted once as whoever sent it first, reactions, read markers and call notices never counted as the last word. It lists the people waiting on a reply, then apart the ones who reacted to your last message (a follow-up), newest first unless --oldest.",
].join("\n");

const PLATFORM: FlagSpec = { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], required: true, description: "The platform: twitter, discord, slack or instagram" };
const ACCOUNT: FlagSpec = { name: "account", kind: "string", required: true, description: "The account's accountName" };
const CHAT: FlagSpec = { name: "chat", kind: "string", required: true, description: "The chat: its conversation id (an X user id or pair, a Discord channel, a Slack chat, an Instagram thread) or the person's handle" };

export const INBOX_INPUT: CommandInput = {
  forms: [
    { words: ["claim"], effect: "write", summary: "Claim a chat for this session before drafting or sending in it, so no other session acts on it", positionals: [], flags: [PLATFORM, ACCOUNT, CHAT, { name: "event", kind: "string", description: "The event id from >>> NEW MESSAGE that this claim answers" }, JSON_FLAG] },
    { words: ["release"], effect: "write", summary: "Release this session's claim on a chat when it is done with it", positionals: [], flags: [PLATFORM, ACCOUNT, CHAT, JSON_FLAG] },
    { words: ["resume"], effect: "write", summary: "The owner's go-ahead after a refused catch-up: the account catches up again through its own session (rule 94), only when the owner says so", positionals: [], flags: [PLATFORM, ACCOUNT, { name: "by", kind: "string", required: true, description: "Who said to resume: the owner" }, JSON_FLAG] },
    {
      words: ["waiting"], summary: "Who wrote last on every platform, from log.db in time order: the people waiting on a reply, and apart the ones who reacted to your last message",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], description: "Only this platform: twitter, discord, slack or instagram" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "limit", kind: "integer", min: 1, max: 1000, description: "How many per list, default 50, at most 1000" },
        { name: "oldest", kind: "boolean", description: "Oldest first instead of newest first" },
        JSON_FLAG,
      ],
    },
    {
      words: ["pending"], effect: "read", summary: "What the account watchers heard since this reader last asked, with what to do next: the same delivery the prompt hook gives, for any harness",
      positionals: [],
      flags: [{ name: "reader", kind: "string", required: true, pattern: READER_PATTERN.source, takes: "a reader name: letters, digits, _ and -, up to 80", description: "Who is reading: one name per session or harness. A new reader starts from now; each read moves only its own place" }, JSON_FLAG],
    },
    {
      words: ["quiet"], effect: "write", summary: "Quiet the live push for n minutes; what comes in arrives as one batch after",
      positionals: [],
      flags: [
        { name: "minutes", kind: "integer", min: 0, max: PUSH_QUIET_MAX_MINUTES, required: true, description: "Minutes, 0 ends it" },
        { name: "by", kind: "string", required: true, description: "The owner" },
        JSON_FLAG,
      ],
    },
    {
      words: ["ignore"], effect: "write", summary: "Stop pushing a server or a chat to the owner; its messages are still stored, only the alerts stop. --undo lifts it",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], required: true, description: "The platform" },
        { name: "server", kind: "string", description: "A Discord server or Slack workspace id: every channel in it goes quiet, DMs still come" },
        { name: "chat", kind: "string", description: "One chat or channel id" },
        { name: "by", kind: "string", required: true, description: "The owner" },
        { name: "undo", kind: "boolean", description: "Lift the ignore" },
        JSON_FLAG,
      ],
    },
    { words: ["ignored"], summary: "Every server and chat the push ignores, and who asked", positionals: [], flags: [JSON_FLAG] },
    {
      words: ["labels"], summary: "Every person in the owner's dms with a label: warming, readyToAsk, askedWaiting, friend, client, cold or skip, worked out from log.db unless the owner set it, with why",
      positionals: [],
      flags: [
        { name: "label", kind: "enum", values: [...LABELS], description: "Only this label" },
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], description: "Only this platform" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "limit", kind: "integer", min: 1, max: 1000, description: "At most this many, newest first (default 40)" },
        JSON_FLAG,
      ],
    },
    {
      words: ["label"], effect: "write", summary: "Set the label on one person's dm by hand, over what log.db says; --undo goes back to the worked out label",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], required: true, description: "The platform" },
        { name: "account", kind: "string", required: true, description: "The owner's account on it" },
        { name: "chat", kind: "string", description: "The dm's conversation id (log inbox labels shows it)" },
        { name: "as", kind: "enum", values: [...LABELS], description: "The label" },
        { name: "by", kind: "string", required: true, description: "The owner" },
        { name: "undo", kind: "boolean", description: "Drop the hand label" },
        JSON_FLAG,
      ],
    },
    { words: ["claims"], summary: "Every live claim: which session holds which chat, and until when", positionals: [], flags: [JSON_FLAG] },
    {
      words: ["actions"], summary: "The log of every claim, refusal, send and release, oldest first, to see what was already done in a chat",
      positionals: [],
      flags: [
        { name: "platform", kind: "string", description: "Only this platform" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "chat", kind: "string", description: "Only this chat (its id or the person's handle)" },
        { name: "limit", kind: "integer", min: 1, max: 1000, description: "How many of the newest, default 50, at most 1000" },
        JSON_FLAG,
      ],
    },
  ],
};

const PLATFORMS = ["twitter", "discord", "slack", "instagram"];

function claimLine(c: ChatClaim): string {
  return `  ${c.platform} ${c.account} ${c.with ? `@${c.with} ` : ""}${c.conversationId}  held by pid ${c.by} since ${c.claimedAt} until ${c.expiresAt}${c.eventId ? `  event ${c.eventId}` : ""}`;
}

function wordLine(w: LastWord): string {
  const who = w.kind === "group" ? `${w.with} (group)` : w.with;
  const how = w.followUp ? `they reacted ${w.theyReacted ?? ""} to your last message`.trim() : w.youReactedOnly ? "waiting on you (you only reacted)" : "waiting on you";
  return `  ${w.platform} ${w.account} · ${who} · ${w.lastAt} · ${how}\n     ${w.followUp ? "them" : "they said"}: ${w.lastText.replace(/\s+/g, " ").slice(0, 160)}`;
}

function actionLine(a: ActionRecord): string {
  return `  ${a.at} ${a.kind.padEnd(11)} ${a.platform} ${a.account} ${a.with ? `@${a.with} ` : ""}${a.conversationId} pid ${a.by}${a.eventId ? ` event ${a.eventId}` : ""}${a.detail ? `: ${a.detail}` : ""}`;
}

export const inboxCommand: Command = {
  usage: INBOX_USAGE,
  platform: "any",
  name: "inbox",
  effect: "write",
  input: INBOX_INPUT,
  summary: "Claim and release chats, list claims, read the action log and what the watchers heard, quiet the push",
  args: "claim|release|claims|actions|resume|waiting|pending|quiet|ignore|ignored|labels|label [--label <l>] [--as <l>] [--server <id>] [--undo] [--reader <name>] [--minutes <n>] [--by <who>] [--platform <p>] [--account <a>] [--chat <id|handle>] [--event <id>] [--limit <n>] [--oldest]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(INBOX_INPUT));
    if (!parsed.ok) return refuseInput("inbox", parsed.error, INBOX_USAGE);
    const [sub = "claims", ...rest] = parsed.positionals;
    if (rest.length) return { code: 1, error: "inputInvalid", stderr: `log inbox: unexpected argument "${rest[0]}"\n${INBOX_USAGE}` };
    const json = parsed.flags["json"] === true;
    const str = (name: string) => (typeof parsed.flags[name] === "string" ? String(parsed.flags[name]).trim() : "");
    if (sub === "pending") {
      const reader = str("reader");
      if (!READER_PATTERN.test(reader)) return { code: 1, error: "inputInvalid", stderr: `log inbox pending: --reader is letters, digits, _ and -, up to 80\n${INBOX_USAGE}` };
      const read = readPending(reader);
      if (json) return { code: 0, stdout: JSON.stringify({ reader, messages: read.messages, alerts: read.alerts, context: read.text }, null, 2) };
      return { code: 0, stdout: read.text ?? `log inbox pending: nothing new for ${reader} since it last asked.` };
    }
    if (sub === "quiet") {
      const minutes = numberOf(parsed, "minutes");
      const by = str("by");
      if (minutes === undefined || minutes < 0 || minutes > PUSH_QUIET_MAX_MINUTES || !by) return { code: 1, error: "inputInvalid", stderr: `log inbox quiet: --minutes (0 to ${PUSH_QUIET_MAX_MINUTES}) and --by are needed\n${INBOX_USAGE}` };
      const until = setQuiet(minutes, by);
      if (json) return { code: 0, stdout: JSON.stringify({ until, by }, null, 2) };
      if (!until) return { code: 0, stdout: `log inbox quiet: ended; the push brings in what came in on its next round.` };
      return { code: 0, stdout: `log inbox quiet: no message is pushed into any session until ${until} (${minutes} min, asked by ${by}); the watchers keep storing everything, and it all arrives as one batch then.` };
    }
    if (sub === "ignore") {
      const platform = str("platform");
      const server = str("server");
      const chat = str("chat");
      const by = str("by");
      if (!PLATFORMS.includes(platform) || !by || (server && chat)) return { code: 1, error: "inputInvalid", stderr: `log inbox ignore: --platform, --by and one of --server or --chat are needed\n${INBOX_USAGE}` };
      if (!server && !chat) {
        const entries = ignoredList();
        if (json) return { code: 0, stdout: JSON.stringify({ entries, changed: false }, null, 2) };
        return { code: 0, stdout: `log inbox ignore: nothing changed, name a --server or a --chat to ignore. ${entries.length} ignored now (log inbox ignored lists them).` };
      }
      const undo = parsed.flags["undo"] === true;
      const entries = setIgnored({ platform, ...(server ? { server } : {}), ...(chat ? { chat } : {}) }, by, undo);
      if (json) return { code: 0, stdout: JSON.stringify({ entries }, null, 2) };
      const what = server ? `${platform} server ${server}` : `${platform} chat ${chat}`;
      return { code: 0, stdout: undo ? `log inbox ignore: ${what} is pushed again.` : `log inbox ignore: ${what} is no longer pushed to any session (asked by ${by}); its messages are still stored and readable, only the alerts stop. ${entries.length} ignored in all.` };
    }
    if (sub === "labels") {
      const platform = str("platform");
      const label = str("label");
      if (label && !isLabel(label)) return { code: 1, error: "inputInvalid", stderr: `log inbox labels: --label is one of ${LABELS.join(", ")}\n${INBOX_USAGE}` };
      const limit = Number(parsed.flags["limit"] ?? 40);
      const rows = labelsOf({ platform: platform || undefined, account: str("account") || undefined, ...(label && isLabel(label) ? { label } : {}) });
      const counts = LABELS.map((l) => [l, rows.filter((r) => r.label === l).length] as const).filter(([, n]) => n);
      if (json) return { code: 0, stdout: JSON.stringify({ counts: Object.fromEntries(counts), people: rows.slice(0, limit) }, null, 2) };
      const line = (r: Labelled) => `  ${r.label.padEnd(12)} ${r.platform} ${r.with} · chat ${r.conversationIds[0]} · last ${r.lastAt.slice(0, 10)} ${r.lastFromMe ? "you" : "them"} · ${r.why}`;
      return { code: 0, stdout: [`log inbox labels: ${rows.length} people (${counts.map(([l, n]) => `${l} ${n}`).join(", ") || "none"}), newest first:`, ...rows.slice(0, limit).map(line), "", ...LABELS.map((l) => `  ${l}: ${LABEL_MEANS[l]}`)].join("\n") };
    }
    if (sub === "label") {
      const platform = str("platform");
      const account = str("account");
      const chat = str("chat");
      const as = str("as");
      const by = str("by");
      const undo = parsed.flags["undo"] === true;
      if (!PLATFORMS.includes(platform) || !account || !by || (as && !isLabel(as))) return { code: 1, error: "inputInvalid", stderr: `log inbox label: --platform, --account and --by are needed, --as is one of ${LABELS.join(", ")}\n${INBOX_USAGE}` };
      if (!chat || (!as && !undo)) return { code: 0, stdout: `log inbox label: nothing changed, name a --chat and an --as (or --undo). log inbox labels lists everyone.` };
      const entries = setLabel({ platform, account, chat }, undo ? null : (as as never), by);
      if (json) return { code: 0, stdout: JSON.stringify({ entries }, null, 2) };
      return { code: 0, stdout: undo ? `log inbox label: ${platform} chat ${chat} is back to its worked out label.` : `log inbox label: ${platform} chat ${chat} is ${as} (set by ${by}). ${entries.length} set by hand in all.` };
    }
    if (sub === "ignored") {
      const entries = ignoredList();
      if (json) return { code: 0, stdout: JSON.stringify({ entries }, null, 2) };
      const line = (e: IgnoreEntry) => `  ${e.platform} ${e.server ? `server ${e.server}` : `chat ${e.chat}`}  by ${e.by} at ${e.at}`;
      return { code: 0, stdout: entries.length ? [`log inbox ignored: ${entries.length}:`, ...entries.map(line)].join("\n") : "log inbox ignored: nothing is ignored." };
    }
    if (sub === "claims") {
      const claims = liveClaims();
      if (json) return { code: 0, stdout: JSON.stringify({ claims }, null, 2) };
      return { code: 0, stdout: claims.length ? [`log inbox claims: ${claims.length} live claim(s):`, ...claims.map(claimLine)].join("\n") : "log inbox claims: no chat is claimed by any session right now." };
    }
    if (sub === "actions") {
      const limit = numberOf(parsed, "limit") ?? 50;
      const rows = readActions({ platform: str("platform") || undefined, account: str("account") || undefined, chat: str("chat") || undefined, limit });
      if (json) return { code: 0, stdout: JSON.stringify({ actions: rows }, null, 2) };
      return { code: 0, stdout: rows.length ? [`log inbox actions: the ${rows.length} newest, oldest first:`, ...rows.map(actionLine)].join("\n") : "log inbox actions: nothing has been done in that chat yet." };
    }
    if (sub === "waiting") {
      const limit = numberOf(parsed, "limit") ?? 50;
      const platform = str("platform");
      if (platform && !PLATFORMS.includes(platform)) return { code: 1, error: "inputInvalid", stderr: `log inbox waiting: --platform is one of ${PLATFORMS.join(", ")}
${INBOX_USAGE}` };
      const oldest = parsed.flags["oldest"] === true;
      const order = (list: LastWord[]) => (oldest ? [...list].reverse() : list).slice(0, limit);
      const { waiting, followUps } = waitingOf(lastWordOf({ platform: platform || undefined, account: str("account") || undefined }));
      if (json) return { code: 0, stdout: JSON.stringify({ waiting: order(waiting), followUps: order(followUps), totals: { waiting: waiting.length, followUps: followUps.length } }, null, 2) };
      const counts = PLATFORMS.map((p) => [p, waiting.filter((w) => w.platform === p).length] as const).filter(([, n]) => n).map(([p, n]) => `${p} ${n}`).join(", ");
      return {
        code: 0,
        stdout: [
          `log inbox waiting: ${waiting.length} waiting on a reply${counts ? ` (${counts})` : ""}, ${oldest ? "oldest" : "newest"} first, from log.db in time order:`,
          ...order(waiting).map(wordLine),
          ...(followUps.length ? [`${followUps.length} reacted to your last message, each a follow-up to send, not a reply they wait on:`, ...order(followUps).map(wordLine)] : []),
        ].join("\n"),
      };
    }
    if (sub === "resume") {
      const platform = str("platform");
      const account = str("account");
      const by = str("by");
      if (!PLATFORMS.includes(platform) || !account || !by) return { code: 1, error: "inputInvalid", stderr: `log inbox resume: --platform (${PLATFORMS.join(", ")}), --account and --by are needed
${INBOX_USAGE}` };
      const gap = behindOf(platform, account);
      const resumed = resumeGap(platform, account, by);
      if (json) return { code: 0, stdout: JSON.stringify({ resumed, gap }, null, 2) };
      if (resumed) return { code: 0, stdout: `log inbox resume: ${platform} ${account} catches up again from ${resumed.fromAt} (refused before: ${gap?.detail ?? "refused"}); its owner retries through its own session within 30 s, and sends wait for it.` };
      return { code: 0, stdout: gap ? `log inbox resume: ${platform} ${account} isn't refused: its gap is ${gap.status} from ${gap.fromAt}, so its owner is already on it.` : `log inbox resume: ${platform} ${account} isn't behind.` };
    }
    if (sub !== "claim" && sub !== "release") return { code: 1, stderr: `log inbox: unknown subcommand "${sub}"\n${INBOX_USAGE}` };
    const platform = str("platform");
    if (!PLATFORMS.includes(platform)) return { code: 1, error: "inputInvalid", stderr: `log inbox ${sub}: --platform is one of ${PLATFORMS.join(", ")}\n${INBOX_USAGE}` };
    const ref = { platform, account: str("account"), conversationId: str("chat").replace(/^@/, ""), ...(/^\d+([-:]\d+)?$|^[CDG][A-Z0-9]+$/.test(str("chat")) ? {} : { with: str("chat").replace(/^@/, "") }), ...(str("event") ? { eventId: str("event") } : {}) };
    if (!ref.account || !ref.conversationId) return { code: 1, stderr: `log inbox ${sub}: --account and --chat can't be empty\n${INBOX_USAGE}` };
    if (sub === "release") {
      const released = releaseChat(ref);
      return { code: 0, stdout: json ? JSON.stringify({ released }, null, 2) : released ? `log inbox release: this session's claim on ${platform} ${ref.account} ${ref.conversationId} is released.` : `log inbox release: this session held no claim on ${platform} ${ref.account} ${ref.conversationId}.` };
    }
    const claimed = claimChat(ref);
    if (!claimed.ok) return refuse("inbox claim", "chatClaimedElsewhere", `pid ${claimed.holder.by} holds ${platform} ${ref.account} ${ref.conversationId} until ${claimed.holder.expiresAt}`);
    if (json) return { code: 0, stdout: JSON.stringify({ claim: claimed.claim, renewed: claimed.renewed }, null, 2) };
    return { code: 0, stdout: `log inbox claim: this session (pid ${claimed.claim.by}) ${claimed.renewed ? "still holds" : "now holds"} ${platform} ${ref.account} ${ref.conversationId} until ${claimed.claim.expiresAt}. Draft and send; the send releases it.` };
  },
};
