import { claimChat, liveClaims, readActions, releaseChat } from "../../inbox/claims/index.ts";
import { behindOf, resumeGap } from "../../inbox/store/index.ts";
import type { ActionRecord, ChatClaim } from "../../inbox/claims/index.ts";
import { lastWordOf, waitingOf } from "../../inbox/lastWord/index.ts";
import { chatMessages } from "../../inbox/dbRead/index.ts";
import type { LastWord } from "../../inbox/lastWord/index.ts";
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuse, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput, FlagSpec } from "../runner/types.ts";
import { readPending, READER_PATTERN } from "../../inbox/pending/index.ts";
import { PUSH_QUIET_MAX_MINUTES, setQuiet } from "../../inbox/push/index.ts";
import { ignoredList, setIgnored } from "../../inbox/ignore/index.ts";
import type { IgnoreEntry } from "../../inbox/ignore/index.ts";
import { isLabel, LABEL_MEANS, LABELS, labelList, labelsOf, setLabel } from "../../inbox/label/index.ts";
import type { Labelled } from "../../inbox/label/index.ts";
import { labelQueue, PIPELINE_SETTING, pipelineLabels, pipelineRows, QUEUE_SIZE, refreshPipeline, SALES_WHO, TEACHER_BY, teach, teachPlan, teachState, trainAndSave, uvTrainer, windowOf, windowText } from "../../inbox/pipeline/index.ts";
import type { HeadTrainer, PipelineDeps, TeachItem } from "../../inbox/pipeline/index.ts";
import { chatsOf, saidOnly } from "../../inbox/lastWord/index.ts";
import { localEmbedder } from "../../search/conversations/index.ts";
import { createDecisionsClient } from "../../subq/decisions/index.ts";
import type { DecisionsClient } from "../../subq/decisions/index.ts";
import { db } from "../../inbox/store/index.ts";

export const INBOX_USAGE = [
  "Usage: log inbox claim --platform <twitter|discord|slack|instagram> --account <a> --chat <conversationId|handle> [--event <eventId>] [--json]",
  "       log inbox release --platform <p> --account <a> --chat <conversationId|handle> [--json]",
  "       log inbox claims [--json]",
  "       log inbox resume --platform <p> --account <a> --by <who> [--json]",
  "       log inbox actions [--platform <p>] [--account <a>] [--chat <conversationId|handle>] [--limit <n>] [--json]",
  "       log inbox waiting [--platform <p>] [--account <a>] [--limit <n>] [--tail <n>] [--oldest] [--json]",
  "       log inbox pending --reader <name> [--json]",
  "       log inbox quiet --minutes <n> --by <who> [--json]",
  "       log inbox ignore --platform <p> (--server <id> | --chat <id>) --by <who> [--undo] [--json]",
  "       log inbox ignored [--json]",
  "       log inbox labels [--label <l>] [--who <w>] [--where <s>] [--platform <p>] [--account <a>] [--limit <n>] [--json]",
  "       log inbox label --platform <p> --account <a> --chat <id> (--who <w> [--where <s>] | --as <l>) --by <who> [--undo] [--json]",
  "       log inbox label queue [--platform <p>] [--limit <n>]",
  "       log inbox label teach [--platform <p>] [--limit <n>] [--apply]",
  "       log inbox label train",
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
      words: ["waiting"], summary: "The people waiting on my reply, counts per platform (inbox stats), then reactions to my last message; --platform, --account narrow it",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], description: "Only this platform: twitter, discord, slack or instagram" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "limit", kind: "integer", min: 1, max: 1000, description: "How many per list, default 50, at most 1000" },
        { name: "tail", kind: "integer", min: 0, max: 60, description: "Each chat's last n messages" },
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
      words: ["labels"], summary: "Every person in the owner's dms: who, where and the old label, worked out unless the owner set it, with why",
      positionals: [],
      flags: [
        { name: "label", kind: "enum", values: [...LABELS], description: "Only this label" },
        { name: "who", kind: "string", description: "Only this who" },
        { name: "where", kind: "string", description: "Only this stage" },
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
        { name: "as", kind: "enum", values: [...LABELS], description: "The old label" },
        { name: "who", kind: "string", description: "lead, client, partner, friend, community or bot" },
        { name: "where", kind: "string", description: "Stage, lead or client only" },
        { name: "by", kind: "string", required: true, description: "The owner" },
        { name: "undo", kind: "boolean", description: "Drop the hand label" },
        JSON_FLAG,
      ],
    },
    {
      words: ["label", "queue"], effect: "read", summary: "Chats to label first: the least sure, across platforms",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], description: "Only this platform" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "limit", kind: "integer", min: 1, max: 200, description: "How many, default 35" },
        JSON_FLAG,
      ],
    },
    {
      words: ["label", "teach"], effect: "write", summary: "SubQ labels unlabelled chats once; a dry run with its cost unless --apply",
      positionals: [],
      flags: [
        { name: "platform", kind: "enum", values: ["twitter", "discord", "slack", "instagram"], description: "Only this platform" },
        { name: "account", kind: "string", description: "Only this account" },
        { name: "limit", kind: "integer", min: 1, max: 5000, description: "At most this many chats" },
        { name: "apply", kind: "boolean", description: "Call SubQ (paid) and store its labels" },
        JSON_FLAG,
      ],
    },
    { words: ["label", "train"], effect: "write", summary: "Train the who and where head on the labels", positionals: [], flags: [JSON_FLAG] },
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

export const labelDeps: { pipeline: () => PipelineDeps & { stop?: () => void }; decisions: () => DecisionsClient; trainer: HeadTrainer } = {
  pipeline: () => {
    const embedder = localEmbedder();
    return { embedder, stop: () => embedder.stop?.() };
  },
  decisions: () => createDecisionsClient(),
  trainer: uvTrainer,
};

async function refreshed(query: { platform?: string; account?: string }): Promise<void> {
  const deps = labelDeps.pipeline();
  try {
    await refreshPipeline(query, deps);
  } finally {
    deps.stop?.();
  }
}

const keyOf = (r: { platform: string; account: string; person: string }) => `${r.platform} ${r.account} ${r.person}`;

function claimLine(c: ChatClaim): string {
  return `  ${c.platform} ${c.account} ${c.with ? `@${c.with} ` : ""}${c.conversationId}  held by pid ${c.by} since ${c.claimedAt} until ${c.expiresAt}${c.eventId ? `  event ${c.eventId}` : ""}`;
}

export interface TailLine {
  at: string;
  fromMe: boolean;
  from: string;
  text: string;
}

export type ReadTail = (w: LastWord, n: number) => TailLine[];

export const readTail: ReadTail = (w, n) =>
  w.conversationIds
    .flatMap((id) => chatMessages(w.platform, w.account, id, n))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-n)
    .map((m) => ({ at: m.at, fromMe: m.fromMe, from: m.from, text: m.text }));

export function withTail(list: readonly LastWord[], n: number | undefined, read: ReadTail = readTail): LastWord[] {
  if (n === undefined) return [...list];
  return list.map((w) => {
    const held = (w as LastWord & { messages?: { ms?: number; at: string }[] }).messages;
    const messages = Array.isArray(held) ? [...held].sort((a, b) => (a.ms ?? Date.parse(a.at)) - (b.ms ?? Date.parse(b.at))).slice(held.length - Math.min(n, held.length)) : n ? read(w, n) : [];
    return { ...w, messages } as LastWord;
  });
}

export function waitingTotals(waiting: readonly LastWord[], followUps: readonly LastWord[]) {
  const count = (keys: string[]) => keys.reduce<Record<string, number>>((all, k) => ({ ...all, [k]: (all[k] ?? 0) + 1 }), {});
  return {
    waiting: waiting.length,
    followUps: followUps.length,
    byPlatform: count(waiting.map((w) => w.platform)),
    byKind: count(waiting.map((w) => w.kind)),
    byMonth: count(waiting.map((w) => w.lastAt.slice(0, 7))),
  };
}

function wordLine(w: LastWord): string {
  const who = w.kind === "group" ? `${w.with} (group)` : w.with;
  const how = w.followUp ? `they reacted ${w.theyReacted ?? ""} to your last message`.trim() : w.youReactedOnly ? "waiting on you (you only reacted)" : "waiting on you";
  return `  ${w.platform} ${w.account} · ${who} · ${w.lastAt} · ${how}\n     ${w.followUp ? "them" : "they said"}: ${w.lastText.replace(/\s+/g, " ").slice(0, 160)}`;
}

function actionLine(a: ActionRecord): string {
  return `  ${a.at} ${a.kind.padEnd(11)} ${a.platform} ${a.account} ${a.with ? `@${a.with} ` : ""}${a.conversationId} pid ${a.by}${a.eventId ? ` event ${a.eventId}` : ""}${a.detail ? `: ${a.detail}` : ""}`;
}

async function labelTool(form: string, str: (name: string) => string, limit: number | undefined, apply: boolean, json: boolean) {
  const platform = str("platform");
  const query = { platform: PLATFORMS.includes(platform) ? platform : undefined, account: str("account") || undefined };
  const entries = labelList();
  const owned = new Set(entries.filter((e) => e.by !== TEACHER_BY).map(keyOf));
  const taught = new Set(entries.filter((e) => e.by === TEACHER_BY).map(keyOf));
  if (form === "queue") {
    await refreshed(query);
    const names = new Map(labelsOf(query).map((r) => [keyOf(r), r.with]));
    const queue = labelQueue(pipelineRows(query).map((r) => ({ ...r, with: names.get(keyOf(r)) ?? r.person })), (r) => owned.has(keyOf(r)), limit ?? QUEUE_SIZE);
    if (json) return { code: 0, stdout: JSON.stringify({ queue, labelled: owned.size }, null, 2) };
    const meanings = pipelineLabels();
    return {
      code: 0,
      stdout: [
        `log inbox label queue: the ${queue.length} chats log is least sure of (${owned.size} labelled by the owner so far), spread across platforms. Label each with inboxLabel { platform, account, chat, who, where?, by: "the owner" }:`,
        ...queue.map((q, i) => `  ${String(i + 1).padStart(2)}. ${q.platform} ${q.account} ${q.with} · chat ${q.chat} · log guesses ${q.who}${q.where ? `/${q.where}` : ""} (${Math.round(q.confidence * 100)}% sure, uncertainty ${q.uncertainty})`),
        "",
        `  who: ${Object.entries(meanings.who).map(([k, v]) => `${k} (${v})`).join("; ")}`,
        `  where, only for ${SALES_WHO.join(" and ")}: ${Object.entries(meanings.where).map(([k, v]) => `${k} (${v})`).join("; ")}`,
      ].join("\n"),
    };
  }
  if (form === "train") {
    await refreshed(query);
    const deps = labelDeps.pipeline();
    const result = await trainAndSave(pipelineRows(query), entries, pipelineLabels(), deps.embedder.model, db(), labelDeps.trainer).finally(() => deps.stop?.());
    if ("refused" in result) return { code: 0, stdout: json ? JSON.stringify(result, null, 2) : `log inbox label train: nothing trained, it ${result.refused}. Label the queue first: log inbox label queue.` };
    if (json) return { code: 0, stdout: JSON.stringify({ id: result.id, counts: result.head.counts, trainedAt: result.head.trainedAt }, null, 2) };
    const cross = result.head.counts.whoCrossValPercent;
    return { code: 0, stdout: `log inbox label train: head ${result.id} trained at ${result.head.trainedAt} on ${result.head.counts.rows} chats (${result.head.counts.owner} owner, ${result.head.counts.teacher} teacher); who labels ${result.head.who.labels.join(", ")}${cross !== undefined ? `, cross-validated ${cross}% on who` : ""}. The labeller uses it from the next message.` };
  }
  const labels = pipelineLabels();
  const items: TeachItem[] = [];
  for (const chat of chatsOf(query)) {
    const key = keyOf({ platform: chat.platform, account: chat.account, person: chat.personKey });
    if (chat.storedAsGroup || owned.has(key) || taught.has(key)) continue;
    const said = saidOnly(chat.messages);
    if (!said.some((m) => !m.fromOwner)) continue;
    items.push({ platform: chat.platform, account: chat.account, person: chat.personKey, with: chat.with, state: teachState({ platform: chat.platform, with: chat.with }, windowText(windowOf(said))) });
    if (limit && items.length >= limit) break;
  }
  const plan = teachPlan(items, labels);
  if (!apply || !items.length) {
    const text = `log inbox label teach: a dry run. ${items.length} chats have no owner or SubQ label; asking SubQ once about each is about ${plan.inputTokens.toLocaleString("en-US")} input tokens, about $${plan.usd.toFixed(4)}. Nothing was sent. --apply sends them and stores each answer by ${TEACHER_BY} with its confidence; an owner label always wins.`;
    return { code: 0, stdout: json ? JSON.stringify({ dryRun: true, chats: items.length, inputTokens: plan.inputTokens, usd: plan.usd }, null, 2) : text };
  }
  const answers = await teach(plan, labelDeps.decisions(), labels);
  for (const a of answers) setLabel({ platform: a.platform, account: a.account, chat: a.person }, { who: a.who, where: a.where, confidence: a.confidence, ...(a.candidates.length ? { candidates: a.candidates } : {}) }, TEACHER_BY);
  const tokens = answers.reduce((sum, a) => sum + a.inputTokens, 0);
  if (json) return { code: 0, stdout: JSON.stringify({ dryRun: false, labelled: answers.length, inputTokens: tokens, answers }, null, 2) };
  return { code: 0, stdout: `log inbox label teach: SubQ labelled ${answers.length} of ${items.length} chats (${tokens} input tokens); ${answers.filter((a) => a.candidates.length).length} were unsure and carry candidate labels. log inbox label queue shows what the owner should label next.` };
}

export const inboxCommand: Command = {
  usage: INBOX_USAGE,
  platform: "any",
  name: "inbox",
  effect: "write",
  input: INBOX_INPUT,
  summary: "Chat claims and their action log, who is waiting on a reply, what the watchers heard, quiet the push",
  args: "claim|release|claims|actions|resume|waiting|pending|quiet|ignore|ignored|labels|label [queue|teach|train] [--label <l>] [--as <l>] [--who <w>] [--where <s>] [--apply] [--server <id>] [--undo] [--reader <name>] [--minutes <n>] [--by <who>] [--platform <p>] [--account <a>] [--chat <id|handle>] [--event <id>] [--limit <n>] [--oldest]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(INBOX_INPUT));
    if (!parsed.ok) return refuseInput("inbox", parsed.error, INBOX_USAGE);
    const [sub = "claims", ...rest] = parsed.positionals;
    if (rest.length && !(sub === "label" && rest.length === 1 && ["queue", "teach", "train"].includes(rest[0]))) return { code: 1, error: "inputInvalid", stderr: `log inbox: unexpected argument "${rest[0]}"\n${INBOX_USAGE}` };
    const json = parsed.flags["json"] === true;
    const str = (name: string) => (typeof parsed.flags[name] === "string" ? String(parsed.flags[name]).trim() : "");
    if (sub === "label" && rest.length === 1) return labelTool(rest[0], str, numberOf(parsed, "limit"), parsed.flags["apply"] === true, json);
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
      const query = { platform: platform || undefined, account: str("account") || undefined };
      await refreshed(query);
      const rows = labelsOf({ ...query, ...(label && isLabel(label) ? { label } : {}), ...(str("who") ? { who: str("who") } : {}), ...(str("where") ? { where: str("where") } : {}) });
      const counts = LABELS.map((l) => [l, rows.filter((r) => r.label === l).length] as const).filter(([, n]) => n);
      const tally = (values: (string | null)[]) => Object.fromEntries([...new Set(values.filter((v): v is string => Boolean(v)))].map((v) => [v, values.filter((x) => x === v).length]));
      const whoCounts = tally(rows.map((r) => r.who));
      const whereCounts = tally(rows.map((r) => r.where));
      if (json) return { code: 0, stdout: JSON.stringify({ counts: Object.fromEntries(counts), who: whoCounts, where: whereCounts, people: rows.slice(0, limit) }, null, 2) };
      const listed = (c: Record<string, number>) => Object.entries(c).map(([k, n]) => `${k} ${n}`).join(", ") || "none";
      const fields = (r: Labelled) => (r.who ? `${r.who}${r.where ? `/${r.where}` : ""}` : "?");
      const line = (r: Labelled) => `  ${fields(r).padEnd(20)} ${r.label.padEnd(12)} ${r.platform} ${r.with} · chat ${r.conversationIds[0]} · last ${r.lastAt.slice(0, 10)} ${r.lastFromMe ? "you" : "them"} · ${r.why}`;
      const meanings = pipelineLabels();
      return { code: 0, stdout: [`log inbox labels: ${rows.length} people. who: ${listed(whoCounts)}. where: ${listed(whereCounts)}. old labels: ${counts.map(([l, n]) => `${l} ${n}`).join(", ") || "none"}. Newest first:`, ...rows.slice(0, limit).map(line), "", ...Object.entries(meanings.who).map(([k, v]) => `  who ${k}: ${v}`), ...Object.entries(meanings.where).map(([k, v]) => `  where ${k}: ${v}`), ...LABELS.map((l) => `  ${l}: ${LABEL_MEANS[l]}`)].join("\n") };
    }
    if (sub === "label") {
      const platform = str("platform");
      const account = str("account");
      const chat = str("chat");
      const as = str("as");
      const who = str("who");
      const where = str("where");
      const by = str("by");
      const undo = parsed.flags["undo"] === true;
      const meanings = pipelineLabels();
      if (!PLATFORMS.includes(platform) || !account || !by || (as && !isLabel(as))) return { code: 1, error: "inputInvalid", stderr: `log inbox label: --platform, --account and --by are needed, --as is one of ${LABELS.join(", ")}\n${INBOX_USAGE}` };
      if (who && !(who in meanings.who)) return { code: 0, stdout: `log inbox label: nothing changed, --who is one of ${Object.keys(meanings.who).join(", ")} (the owner's list in settings.json ${PIPELINE_SETTING}).` };
      if (where && !(where in meanings.where)) return { code: 0, stdout: `log inbox label: nothing changed, --where is one of ${Object.keys(meanings.where).join(", ")}.` };
      if (where && !SALES_WHO.includes(who)) return { code: 0, stdout: `log inbox label: nothing changed, only a ${SALES_WHO.join(" or ")} has a --where; ${who ? `a ${who}` : "name the --who too, a bot, friend or partner"} never gets a sales stage.` };
      if (!chat || (!as && !who && !undo)) return { code: 0, stdout: `log inbox label: nothing changed, name a --chat and a --who (or --as, or --undo). log inbox label queue lists the chats to label first.` };
      const entries = setLabel({ platform, account, chat }, undo ? null : who ? { who, where: where || null, ...(as && isLabel(as) ? { label: as } : {}) } : (as as never), by);
      if (json) return { code: 0, stdout: JSON.stringify({ entries }, null, 2) };
      const said = who ? `${who}${where ? `, ${where}` : ""}` : as;
      return { code: 0, stdout: undo ? `log inbox label: ${platform} chat ${chat} is back to its worked out label.` : `log inbox label: ${platform} chat ${chat} is ${said} (set by ${by}). ${entries.filter((e) => e.by !== TEACHER_BY).length} set by hand in all.` };
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
      const tail = numberOf(parsed, "tail");
      if (json) return { code: 0, stdout: JSON.stringify({ waiting: withTail(order(waiting), tail), followUps: withTail(order(followUps), tail), totals: waitingTotals(waiting, followUps) }, null, 2) };
      const counts = PLATFORMS.map((p) => [p, waiting.filter((w) => w.platform === p).length] as const).filter(([, n]) => n).map(([p, n]) => `${p} ${n}`).join(", ");
      const lines = (list: LastWord[]) => withTail(order(list), tail).flatMap((w) => [wordLine(w), ...((w as LastWord & { messages?: { at: string; fromMe?: boolean; fromOwner?: boolean; text: string }[] }).messages ?? []).map((m) => `       ${m.at.slice(0, 16)} ${m.fromMe || m.fromOwner ? "you" : "them"}: ${m.text.replace(/\s+/g, " ").slice(0, 200)}`)]);
      return {
        code: 0,
        stdout: [
          `log inbox waiting: ${waiting.length} waiting on a reply${counts ? ` (${counts})` : ""}, ${oldest ? "oldest" : "newest"} first, from log.db in time order:`,
          ...lines(waiting),
          ...(followUps.length ? [`${followUps.length} reacted to your last message, each a follow-up to send, not a reply they wait on:`, ...lines(followUps)] : []),
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
