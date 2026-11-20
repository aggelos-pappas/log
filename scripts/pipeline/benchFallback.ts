#!/usr/bin/env bun
import { resolve } from 'node:path'
import { logHome } from '../../src/config/logHome/index'
import { labelList } from '../../src/inbox/label/index'
import { chatsOf } from '../../src/inbox/lastWord/index'
import { applyLayer, botVerdict, FALLBACK_BELOW, FEATURE_NAMES, headInput, humanTalk, pipelineLabels, SUBQ_DAILY_USD, SUBQ_USD_PER_MILLION_INPUT, storedRows, TEACHER_BY, TEACHER_TRAIN_FLOOR, teachContext, teachItemOf, teachPlan, trainingSet, uvTrainer } from '../../src/inbox/pipeline/index'
import type { PipelineRow } from '../../src/inbox/pipeline/index'
import { db } from '../../src/inbox/store/index'

const live = resolve(logHome(), 'log.db').toLowerCase()
if (!process.env.LOG_DB || resolve(process.env.LOG_DB).toLowerCase() === live) {
  process.stderr.write('benchFallback: set LOG_DB to a copy of log.db, never the live one\n')
  process.exit(2)
}
const FOLDS = 5
const BARS = [0.3, 0.4, 0.5, 0.6, 0.7]
const DAY = 86_400_000
const on = db()
const labels = pipelineLabels()
const entries = labelList()
const keyOf = (r: { platform: string; account: string; person: string }) => `${r.platform}\u0000${r.account}\u0000${r.person}`
const teacher = new Map(entries.filter((e) => e.by === TEACHER_BY && e.who && (e.confidence ?? 0) >= TEACHER_TRAIN_FLOOR).map((e) => [keyOf(e), e]))
const rows = storedRows(on).filter((r) => r.vector && r.source !== 'group' && teacher.has(keyOf(r)))
const foldOf = (r: PipelineRow): number => {
  let h = 2166136261
  for (const c of keyOf(r)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) % FOLDS
}
const top = (scores: Record<string, number>): [string, number] => Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
const said = new Map(chatsOf({}, on).map((c) => [keyOf({ platform: c.platform, account: c.account, person: c.personKey }), c]))
const scored: { row: PipelineRow; truth: string; raw: string; guarded: string; confidence: number }[] = []
for (let k = 0; k < FOLDS; k++) {
  const train = rows.filter((r) => foldOf(r) !== k)
  const test = rows.filter((r) => foldOf(r) === k)
  const head = await uvTrainer({ model: 'bench', features: [...FEATURE_NAMES], rows: trainingSet(train, entries, labels) })
  for (const r of test) {
    const scores = applyLayer(head.who, headInput(r.vector!, r.features, head))
    const [raw, confidence] = top(scores)
    const truth = teacher.get(keyOf(r))!.who!
    const chat = said.get(keyOf(r))
    const talking = chat ? humanTalk(chat.messages.filter((m) => m.text || m.files)) : false
    const allowBot = botVerdict(r.features, { teacherSaysBot: truth === 'bot', humanTalk: talking })
    const guarded = raw === 'bot' && !allowBot ? top(Object.fromEntries(Object.entries(scores).filter(([l]) => l !== 'bot')))[0] : raw
    scored.push({ row: r, truth, raw, guarded, confidence })
  }
}
const pct = (n: number, of: number) => Math.round((n / Math.max(of, 1)) * 1000) / 10
const agreeRaw = scored.filter((s) => s.raw === s.truth).length
const agreeGuarded = scored.filter((s) => s.guarded === s.truth).length
const bars = BARS.map((bar) => {
  const sent = scored.filter((s) => s.confidence < bar)
  const served = scored.filter((s) => (s.confidence < bar ? true : s.guarded === s.truth)).length
  return { bar, sentToSubqPercent: pct(sent.length, scored.length), servedAgreementPercent: pct(served, scored.length), headAgreementOnKeptPercent: pct(scored.filter((s) => s.confidence >= bar && s.guarded === s.truth).length, scored.length - sent.length) }
})
const stored = storedRows(on)
const botBefore = stored.filter((r) => r.who === 'bot')
const botAfter = botBefore.filter((r) => {
  const c = said.get(keyOf(r))
  const t = teacher.get(keyOf(r))
  return botVerdict(r.features, { teacherSaysBot: t?.who === 'bot', humanTalk: c ? humanTalk(c.messages) : false })
})
const now = Date.now()
const recent = (on.prepare("SELECT c.platform, c.account, c.conversationId, COUNT(DISTINCT date(m.sentAt)) AS days FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE c.kind = 'dm' AND m.fromOwner = 0 AND m.sentAtMs >= ? GROUP BY c.chatId").all(now - 14 * DAY) as { days: number }[])
const chatDays = recent.reduce((n, r) => n + r.days, 0) / 14
const context = teachContext(entries, labels, on)
const sample = [...said.values()].filter((c) => !c.storedAsGroup).slice(0, 60).map((c) => teachItemOf(c, context)).filter((i): i is NonNullable<typeof i> => Boolean(i))
const perChat = teachPlan(sample, labels).usd / Math.max(sample.length, 1)
const share = bars.find((b) => b.bar === FALLBACK_BELOW)!.sentToSubqPercent / 100
process.stdout.write(`${JSON.stringify({
  heldOut: { chats: scored.length, folds: FOLDS, kinds: [...new Set(scored.map((s) => s.truth))].length },
  before: { headAgreementPercent: pct(agreeRaw, scored.length) },
  after: { headWithBotGuardAgreementPercent: pct(agreeGuarded, scored.length), withFallbackAtBar: bars.find((b) => b.bar === FALLBACK_BELOW) },
  bars,
  bots: { storedBotVerdictsBefore: botBefore.length, keptByGuard: botAfter.length, dropped: botBefore.length - botAfter.length },
  cost: { dmChatsWithNewInboundPerDay: Math.round(chatDays * 10) / 10, sentShareAtBar: share, usdPerChat: Math.round(perChat * 1e7) / 1e7, usdPerDay: Math.round(chatDays * share * perChat * 1e6) / 1e6, dailyCapUsd: SUBQ_DAILY_USD, priceUsdPerMillionInput: SUBQ_USD_PER_MILLION_INPUT },
}, null, 2)}\n`)
