import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { timed } from "../../../observability/timing/index.ts";
import { chatContextOf } from "../../../inbox/context/index.ts";
import { aiIndexDir, aiTellsDir, embedBounded, JINA_EMBED_MODEL, openAiIndex } from "../../../voice/aiTells/index.ts";
import { closestWording, nearestPairs, openSharedVoiceIndex, profileFor, recentInChat } from "../../../voice/pairs/index.ts";
import type { NearPair, VoicePair, VoiceTarget } from "../../../voice/pairs/index.ts";
import { aiPhrasesNear, packOf, renderPack } from "../../../voice/pack/index.ts";
import type { GroundingPack, PackPair } from "../../../voice/pack/index.ts";
import { fixWords, readCalibration, recordVerdict, saveCalibration, scoreTable, thresholdFrom, weakestSignals } from "../../../voice/score/index.ts";
import type { Calibration } from "../../../voice/score/index.ts";
import { recordPass } from "../../../voice/passes/index.ts";
import { renderCard } from "../../../inbox/card/index.ts";
import type { ConversationCard } from "../../../inbox/card/index.ts";
import type { VoiceEvidence } from "../../../twitter/copy/voice/index.ts";
import type { CommandContext, CommandResult } from "../../runner/types.ts";
import { baselineReplies, evidenceFor, gateReadings, momentAnswered, profileLine, saidOnly, voiceDeps } from "./voice.ts";
import { convergenceLine, hisFacts, styleOf } from "../../../voice/converge/index.ts";
import type { GateReading } from "./voice.ts";

export const PACK_NEAR = 30;
export const OPTIONS_MAX = 5;
export const CALIBRATE_COUNT = 40;
export const CALIBRATE_AT_ONCE = 4;
export const CALIBRATE_AI_DRAFTS = 10;
const FIX_SPANS = 5;
const THEIR_LINES = 30;

export function lastMessageIdOf(platform: string, account: string, who: { conversationId?: string | null; handle?: string | null; userId?: string | null }): string | null {
  try {
    return chatContextOf(platform, account, { conversationId: who.conversationId ?? null, handle: who.handle ?? null, userId: who.userId ?? null }).messages.at(-1)?.id ?? null;
  } catch {
    return null;
  }
}

export function chatWho(chat: { platform: string; conversationId: string; target: VoiceTarget }): { conversationId: string; handle: string | null; userId: null } {
  return { conversationId: chat.conversationId, handle: chat.platform === "twitter" ? chat.target.with?.[0] ?? null : null, userId: null };
}

export function openLinesOf(chat: { platform: string; account: string; conversationId: string; target: VoiceTarget }): string {
  return theirLinesOf(chat.platform, chat.account, chatWho(chat)).said;
}

function theirLinesOf(platform: string, account: string, who: { conversationId: string; handle: string | null; userId: null }): { said: string; theirs: string[]; mine: string[]; lastId: string | null } {
  try {
    const messages = chatContextOf(platform, account, who).messages;
    const said = saidOnly(messages);
    return { said: momentAnswered(said), theirs: said.filter((m) => !m.fromMe).map((m) => m.text).slice(-THEIR_LINES), mine: said.filter((m) => m.fromMe).map((m) => m.text).slice(-THEIR_LINES), lastId: messages.at(-1)?.id ?? null };
  } catch {
    return { said: "", theirs: [], mine: [], lastId: null };
  }
}

function packPairOf(n: NearPair): PackPair {
  return { said: n.pair.said, reply: n.pair.reply, chat: n.pair.chat, tier: n.tier, at: n.pair.at, saidBy: n.pair.saidBy };
}

async function aiLinesNear(text: string): Promise<string[]> {
  const index = openAiIndex(aiIndexDir(), JINA_EMBED_MODEL);
  if (!index || !text.trim()) return [];
  const embedded = await embedBounded([text], () => voiceDeps.aiEmbedder(), null, voiceDeps.jinaMs).catch(() => null);
  const vector = embedded && !embedded.fellBack && embedded.model === index.model ? embedded.vectors[0] : null;
  return aiPhrasesNear(index.phrases, index.vectors, { text, vector });
}

export async function packFor(context: CommandContext, input: { said: string; chat: string }): Promise<{ ok: true; pack: GroundingPack; label: string; card: ConversationCard | null; said: string; profile: string } | { ok: false; result: CommandResult }> {
  return timed("voice.pack", async () => {
    const first = await evidenceFor(context, input.said || input.chat, input.chat, "", PACK_NEAR);
    if (!first.ok) return first;
    const chat = theirLinesOf(first.chat.platform, first.chat.account, chatWho(first.chat));
    const said = input.said || chat.said;
    const found = said && said !== (input.said || input.chat) ? await evidenceFor(context, said, input.chat, "", PACK_NEAR) : first;
    if (!found.ok) return found;
    const aiPhrases = await aiLinesNear(said || found.near[0]?.pair.said || "");
    const his = styleOf(await baselineReplies());
    const hisHere = chat.mine.length ? chat.mine : found.chatReplies;
    const style = his ? { his, hisHere: styleOf(hisHere), theirs: styleOf(chat.theirs) } : null;
    const facts = hisFacts([...hisHere, ...found.near.filter((n) => n.tier === "sameChat" || n.tier === "samePerson").map((n) => n.pair.reply)]);
    const pack = packOf({ chat: found.label, near: found.near.map(packPairOf), chatReplies: found.chatReplies, profile: found.profile, aiPhrases, theirLines: chat.theirs, style, facts });
    return { ok: true, pack, label: found.label, card: found.card, said, profile: found.profile ? profileLine(found.profile) : "no messages of his there yet" };
  });
}

export function renderPackResult(found: { pack: GroundingPack; label: string; card: ConversationCard | null; said: string }, to: string, chat: string): string {
  return [`log voice: ${found.label}`, found.card ? renderCard(found.card) : "no conversation card: nothing of this chat is in log.db yet", ...(found.said ? [`what they said that is open: ${found.said.replace(/\n/g, " / ").slice(0, 300)}`] : []), renderPack(found.pack), `Grade them: voice { to: "${to}", with: "${chat}", options: ["<option 1>", "<option 2>", "<option 3>"] }`].join("\n");
}

export interface RankedOption {
  rank: number;
  option: number;
  text: string;
  pass: boolean;
  score: number;
  reading: GateReading;
}

export function rankOptions(texts: readonly string[], readings: readonly GateReading[]): RankedOption[] {
  return texts.map((text, i) => ({ option: i + 1, text, reading: readings[i], pass: readings[i].pass, score: readings[i].score?.score ?? 0 })).sort((a, b) => Number(b.pass) - Number(a.pass) || b.score - a.score).map((o, i) => ({ ...o, rank: i + 1 }));
}

export function failingSpans(reading: GateReading): { span: string; why: string }[] {
  const out: { span: string; why: string }[] = [];
  for (const phrase of reading.neverSays) out.push({ span: phrase, why: "a phrase he never says" });
  for (const hit of reading.aiTells?.hits ?? []) out.push({ span: hit.match, why: `an AI tell (${hit.rule})` });
  const close = reading.aiTells?.closest[0];
  if (close && reading.aiTells && close.cosine > reading.aiTells.p50) out.push({ span: close.chunk, why: `close to the AI phrase "${close.phrase}"` });
  for (const pair of reading.phrases?.newPhrasing ?? []) out.push({ span: pair, why: "word pair he has never written" });
  for (const item of reading.notHere) out.push({ span: item, why: "he never writes it here" });
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.span) ? false : (seen.add(o.span), true))).slice(0, FIX_SPANS);
}

export async function fixFor(reading: GateReading, target: VoiceTarget): Promise<string[]> {
  const spans = failingSpans(reading);
  const index = spans.length ? await openSharedVoiceIndex(voiceDeps.embedder()).catch(() => null) : null;
  const lines: string[] = [];
  for (const { span, why } of spans) {
    const nearest = index ? (await closestWording(index, span, target, 1).catch(() => []))[0] : undefined;
    lines.push(`  "${span}" (${why}) -> his nearest real phrasing: ${nearest ? `"${nearest.pair.reply.replace(/\n/g, " / ").slice(0, 160)}"` : "none found"}`);
  }
  if (reading.score) for (const signal of weakestSignals(reading.score)) lines.push(`  ${fixWords(signal)}`);
  if (reading.score?.blocks.length) lines.unshift(...reading.score.blocks.map((b) => `  blocked: ${b}`));
  return lines;
}

export async function gradeOptions(context: CommandContext, input: { to: string; said: string; chat: string; options: string[]; guide: string; spoken?: boolean; json?: boolean }): Promise<CommandResult> {
  let evidence: VoiceEvidence | undefined;
  let card: ConversationCard | null = null;
  let said = input.said;
  let lastId: string | null = null;
  let target: VoiceTarget = { with: [input.to.replace(/^@/, "")] };
  if (input.chat) {
    const found = await evidenceFor(context, said || input.options[0], input.chat, input.options[0]);
    if (found.ok) {
      evidence = found.evidence;
      card = found.card;
      target = found.chat.target;
      const chat = theirLinesOf(found.chat.platform, found.chat.account, chatWho(found.chat));
      said ||= chat.said;
      lastId = chat.lastId;
    }
  }
  const readings = await gateReadings(context, { to: input.to, said, guide: input.guide, card, ...(evidence ? { evidence } : {}), ...(input.spoken ? { spoken: true } : {}) }, input.options);
  const ranked = rankOptions(input.options, readings);
  for (const o of ranked) {
    recordVerdict(o.text, lastId, { pass: o.pass, score: o.score, threshold: o.reading.score?.threshold ?? 0, voice: o.reading.voice });
    if (o.pass) recordPass(o.text, input.to, o.reading.voice);
  }
  const best = ranked[0];
  const anyPass = best.pass;
  const fix = anyPass ? [] : await fixFor(best.reading, target);
  if (input.json) return { code: anyPass ? 0 : 1, stdout: JSON.stringify({ pass: anyPass, threshold: best.reading.score?.threshold, options: ranked.map((o) => ({ rank: o.rank, option: o.option, text: o.text, pass: o.pass, score: o.score, signals: o.reading.score?.rows, blocks: o.reading.score?.blocks, convergence: o.reading.convergence })), fix }, null, 2) };
  const lines = [
    `log voice: ${input.options.length} options for @${input.to.replace(/^@/, "")}, ranked; ${anyPass ? `${ranked.filter((o) => o.pass).length} pass, send option ${best.option}` : "none passes"}`,
    ...ranked.map((o) => `  ${o.rank}. ${o.pass ? "PASS" : "fail"} ${o.score.toFixed(2)}  (option ${o.option}) ${o.text.replace(/\n/g, " / ")}`),
    ...(best.reading.score ? [scoreTable(best.reading.score)] : []),
    ...(best.reading.convergence ? [`  ${convergenceLine(best.reading.convergence)}`] : []),
    ...(anyPass ? [] : [`the fix for the best one (option ${best.option}):`, ...fix]),
  ];
  return { code: anyPass ? 0 : 1, stdout: lines.join("\n") };
}

export function heldOutSample(pairs: readonly VoicePair[], count = CALIBRATE_COUNT): VoicePair[] {
  const usable = pairs.filter((p) => p.kind === "dm" && p.said.trim() && p.reply.trim().split(/\s+/).length >= 3 && p.with.length === 1).sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  const picked: VoicePair[] = [];
  const chats = new Set<string>();
  for (const p of usable) {
    if (picked.length >= count) break;
    if (chats.has(`${p.platform}:${p.conversationId}`)) continue;
    chats.add(`${p.platform}:${p.conversationId}`);
    picked.push(p);
  }
  for (const p of usable) {
    if (picked.length >= count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked;
}

export function aiWrittenDrafts(dir = join(aiTellsDir(), "aiExamples"), count = CALIBRATE_AI_DRAFTS): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const file of readdirSync(dir).sort()) for (const sentence of readFileSync(join(dir, file), "utf8").replace(/[#*>`_]/g, " ").split(/(?<=[.!?])\s+|\n+/)) {
    const clean = sentence.replace(/\s+/g, " ").trim();
    const words = clean.split(" ").length;
    if (words >= 6 && words <= 25 && !out.includes(clean)) out.push(clean);
  }
  const step = Math.max(1, Math.floor(out.length / count));
  return out.filter((_, i) => i % step === 0).slice(0, count);
}

function heldOutEvidence(near: NearPair[], wording: NearPair[], recent: VoicePair[], pair: VoicePair, profile: unknown): VoiceEvidence {
  const keep = (p: VoicePair) => p.id !== pair.id && p.reply.trim() !== pair.reply.trim();
  return {
    chat: pair.chat,
    platform: pair.platform,
    kind: pair.kind,
    profile,
    replies: near.filter((n) => keep(n.pair)).map((n) => ({ said: n.pair.said, reply: n.pair.reply, chat: n.pair.chat, tier: n.tier })),
    wording: wording.filter((n) => keep(n.pair)).map((n) => ({ reply: n.pair.reply, chat: n.pair.chat, tier: n.tier })),
    recent: recent.filter(keep).map((p) => ({ said: p.said, reply: p.reply })),
  };
}

async function inBatches<T, R>(items: readonly T[], size: number, work: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await work(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

export function calibrationOf(owner: readonly { score: number; strictPass: boolean; blocked: boolean; blocks?: string[] }[], ai: readonly { score: number; strictPass: boolean; blocked: boolean }[], now = new Date()): Calibration {
  const scores = owner.filter((o) => !o.blocked).map((o) => o.score);
  const threshold = thresholdFrom(scores);
  const passes = (o: { score: number; blocked: boolean }) => !o.blocked && o.score >= threshold;
  const share = (n: number, of: number) => (of ? Number((n / of).toFixed(3)) : 0);
  return {
    threshold,
    measuredAt: now.toISOString(),
    heldOut: owner.length,
    passBefore: share(owner.filter((o) => o.strictPass).length, owner.length),
    passAfter: share(owner.filter(passes).length, owner.length),
    aiDrafts: ai.length,
    aiFailedBefore: share(ai.filter((o) => !o.strictPass).length, ai.length),
    aiFailedAfter: share(ai.filter((o) => !passes(o)).length, ai.length),
    scores: owner.map((o) => o.score),
    blocked: owner.flatMap((o) => o.blocks ?? []),
  };
}

export function calibrationLine(c: Calibration): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return [
    `log voice calibrate: threshold ${c.threshold.toFixed(3)} stored ${c.measuredAt.slice(0, 16)}`,
    `  his held-out replies: ${c.heldOut}; pass with today's every-check gate ${pct(c.passBefore)}, with the one score ${pct(c.passAfter)}`,
    `  AI-written lines graded against the same chats: ${c.aiDrafts}; failed before ${pct(c.aiFailedBefore)}, after ${pct(c.aiFailedAfter)}`,
    ...(c.blocked?.length ? [`  his replies stopped by a hard block: ${c.blocked.length}`] : []),
  ].join("\n");
}

export async function calibrate(context: CommandContext, input: { guide: string; count?: number; json?: boolean }): Promise<CommandResult> {
  const index = await openSharedVoiceIndex(voiceDeps.embedder());
  const sample = heldOutSample(index.pairs, input.count ?? CALIBRATE_COUNT);
  if (!sample.length) return { code: 1, stdout: "log voice calibrate: no replies of his in the voice index to hold out; build it with `log voice index`" };
  const aiTexts = aiWrittenDrafts(undefined, Math.min(CALIBRATE_AI_DRAFTS, sample.length));
  context.err(`voice calibrate: grading ${sample.length} of his own replies held out of the evidence, and ${aiTexts.length} AI-written lines against the same chats, ${CALIBRATE_AT_ONCE} at a time`);
  const evidenceOf = async (pair: VoicePair) => {
    const target: VoiceTarget = { platform: pair.platform, conversationId: pair.conversationId, with: pair.with };
    const [near, wording] = await Promise.all([nearestPairs(index, pair.said, target, 12), closestWording(index, pair.reply, target, 10)]);
    return heldOutEvidence(near, wording, recentInChat(index, target, 10), pair, profileFor(index, target));
  };
  const grade = async (pair: VoicePair, text: string, leaveOut: boolean) => {
    try {
      const evidence = await evidenceOf(pair);
      const [reading] = await gateReadings(context, { to: pair.with[0], said: pair.said, guide: input.guide, evidence, skipEverywhere: true, ...(leaveOut ? { leaveOut: { id: pair.id, reply: pair.reply } } : {}) }, [text]);
      return { score: reading.score?.score ?? 0, strictPass: reading.strictPass === true, blocked: !!reading.score?.blocks.length, blocks: (reading.score?.blocks ?? []).map((b) => `${b} (in: ${text.replace(/\n/g, " / ").slice(0, 60)})`) };
    } catch (error) {
      context.err(`voice calibrate: skipped one (${error instanceof Error ? error.message : String(error)})`);
      return null;
    }
  };
  const owner = (await inBatches(sample, CALIBRATE_AT_ONCE, (pair) => grade(pair, pair.reply, true))).filter((o): o is NonNullable<typeof o> => !!o);
  const ai = (await inBatches(aiTexts, CALIBRATE_AT_ONCE, (text, i) => grade(sample[i % sample.length], text, false))).filter((o): o is NonNullable<typeof o> => !!o);
  const before = readCalibration();
  const calibration = calibrationOf(owner, ai);
  saveCalibration(calibration);
  if (input.json) return { code: 0, stdout: JSON.stringify({ ...calibration, previous: before ? { threshold: before.threshold, measuredAt: before.measuredAt } : null }, null, 2) };
  return { code: 0, stdout: `${calibrationLine(calibration)}${before ? `\n  previous threshold ${before.threshold.toFixed(3)} from ${before.measuredAt.slice(0, 16)}` : ""}` };
}
