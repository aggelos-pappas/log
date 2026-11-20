import type { Database } from 'bun:sqlite'
import { personKeyOf, saidOnly } from '../lastWord/index'
import type { LastWordMessage } from '../lastWord/index'
import { db } from '../store/index'
import { turnsIn } from '../pipeline/helpers/features'
import { storedRows } from '../pipeline/helpers/store'
import { EMOTION_GROUPS, NEW_TURNS, QUIET_DAYS } from '../pipeline/types'
import { normalText } from '../../voice/conventions/helpers/corpus'
import { lineKey, queueSends, sendRecordIds, sendSpans } from './helpers/sources'
import { mantelHaenszelInterval, matchedWindow, median, oddsRatio, wilson } from './helpers/stats'
import type { Unit } from './helpers/stats'
import { AGENT_CALL_REACH_MS, DAY_MS, FEELING_CHARS, MOVE_WINDOW_MS, ONE_TO_ONE_SHARE, POSITIVE_AT, REPLY_WINDOWS, STAGE_LADDER } from './types'
import type { AgentSend, Comparison, FeelingReader, FoundBy, Matched, OutcomeReport, PlayRow, Positivity, QueueSent, ReplyWindow, Send, SentBy, SideStats } from './types'

export interface OutcomeQuery {
  platform?: string
  account?: string
}

export interface OutcomeDeps {
  now?: number
  agentSends?: AgentSend[]
  feelings?: FeelingReader | null
  reps?: number
}

interface Row {
  platform: string
  account: string
  conversationId: string
  seq: number
  ms: number
  at: string
  fromOwner: number
  senderUserId: string
  senderLabel: string | null
  messageId: string | null
  text: string
}

interface Line extends LastWordMessage {
  messageId: string | null
}

interface Marked {
  by: SentBy
  foundBy: FoundBy
  play: string | null
}

interface StageRow {
  who: string
  where: string | null
  movedMs: number | null
}

const DM_SQL = `SELECT c.platform, c.account, c.conversationId, m.seq, COALESCE(m.sentAtMs, CAST(strftime('%s', m.sentAt) AS INTEGER) * 1000) AS ms, m.sentAt AS at, m.fromOwner, m.senderUserId, m.senderLabel, m.platformMessageId AS messageId, m.text
FROM messages m JOIN chats c ON c.chatId = m.chatId
WHERE c.kind = 'dm' AND (?1 IS NULL OR c.platform = ?1) AND (?2 IS NULL OR c.account = ?2)`

const SEMANTIC_STAGE = new Set(['needFound', 'offered', 'callBooked', 'won', 'lost'])

const DUPLICATE_MS = 5000

const LINK_ONLY_MS = 120_000

export function peopleOf(rows: readonly Row[]): Map<string, { platform: string; account: string; person: string; lines: Line[] }> {
  const people = new Map<string, { platform: string; account: string; person: string; lines: Line[] }>()
  for (const r of rows) {
    const person = personKeyOf(r.conversationId)
    const key = `${r.platform}\u0000${r.account}\u0000${person}`
    const entry = people.get(key) ?? { platform: r.platform, account: r.account, person, lines: [] }
    entry.lines.push({ conversationId: r.conversationId, seq: r.seq, ms: r.ms, at: r.at, fromOwner: r.fromOwner === 1, senderUserId: r.senderUserId, senderLabel: r.senderLabel, text: r.text ?? '', files: 0, messageId: r.messageId })
    people.set(key, entry)
  }
  return people
}

export function oneToOne(lines: readonly Pick<Line, 'fromOwner' | 'senderUserId'>[]): boolean {
  const theirs = new Map<string, number>()
  let owner = 0
  for (const l of lines) {
    if (l.fromOwner) owner++
    else theirs.set(l.senderUserId, (theirs.get(l.senderUserId) ?? 0) + 1)
  }
  const top = Math.max(0, ...theirs.values())
  return lines.length > 0 && (owner + top) / lines.length >= ONE_TO_ONE_SHARE
}

export function withoutDuplicates<T extends Pick<Line, 'fromOwner' | 'text' | 'ms'>>(lines: readonly T[]): T[] {
  const last = new Map<string, number>()
  return lines.filter((l) => {
    const key = `${l.fromOwner ? 1 : 0}\u0000${normalText(l.text)}`
    const seen = last.get(key)
    last.set(key, l.ms)
    return !(seen !== undefined && l.ms - seen <= DUPLICATE_MS && normalText(l.text))
  })
}

export function stageAt(before: readonly Pick<LastWordMessage, 'fromOwner' | 'ms'>[], atMs: number, row: StageRow | null): string {
  if (row?.where && SEMANTIC_STAGE.has(row.where) && row.movedMs !== null && row.movedMs <= atMs) return row.where
  if (!before.some((m) => !m.fromOwner) || turnsIn(before) < NEW_TURNS) return 'new'
  const last = before[before.length - 1]
  if (last && atMs - last.ms >= QUIET_DAYS * DAY_MS) return 'goneQuiet'
  return 'warming'
}

export function movedForward(from: string, to: string): boolean {
  if (to === 'lost' || to === from) return false
  if (from === 'goneQuiet') return to !== 'new'
  const a = STAGE_LADDER.indexOf(from as (typeof STAGE_LADDER)[number])
  const b = STAGE_LADDER.indexOf(to as (typeof STAGE_LADDER)[number])
  return a >= 0 && b > a
}

function lowerBound<T>(list: readonly T[], value: number, keyOf: (t: T) => number): number {
  let low = 0
  let high = list.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (keyOf(list[mid]) < value) low = mid + 1
    else high = mid
  }
  return low
}

export interface Markers {
  sendRecords: Set<string>
  queues: QueueSent[]
  spans: { platform: string; from: number; to: number }[]
  agent: AgentSend[]
}

export function markerOf(platform: string, account: string, person: string, line: Line, markers: Markers): Marked {
  const play = (): string | null => {
    const near = markers.agent.filter((a) => a.platform === platform && a.ms >= line.ms - AGENT_CALL_REACH_MS && a.ms <= line.ms + 60_000)
    if (!near.length) return null
    const best = near.sort((a, b) => Math.abs(line.ms - a.ms) - Math.abs(line.ms - b.ms))[0]
    return best.play ?? 'noPlay'
  }
  const text = lineKey(line.text)
  const queued = text ? markers.queues.find((q) => q.account === account && q.person === person && Math.abs(q.ms - line.ms) <= DAY_MS && q.lines.some((l) => l === text || (l.length >= 12 && text.includes(l)))) : undefined
  if (queued) return { by: 'log', foundBy: markers.sendRecords.has(`${platform}\u0000${line.messageId}`) ? 'sendRecord' : 'queue', play: queued.play }
  if (line.messageId && markers.sendRecords.has(`${platform}\u0000${line.messageId}`)) return { by: 'log', foundBy: 'sendRecord', play: play() }
  const at = lowerBound(markers.spans, line.ms - 6 * 3_600_000, (s) => s.from)
  for (let k = at; k < markers.spans.length && markers.spans[k].from <= line.ms; k++) {
    const s = markers.spans[k]
    if (s.platform === platform && s.from <= line.ms && line.ms <= s.to) return { by: 'log', foundBy: 'sendSpan', play: play() }
  }
  return { by: 'hand', foundBy: 'none', play: null }
}

export function sendsOfPerson(platform: string, account: string, person: string, lines: readonly Line[], row: StageRow | null, markers: Markers): Send[] {
  const said = withoutDuplicates(saidOnly(lines) as Line[])
  const marks = said.map((l) => (l.fromOwner ? markerOf(platform, account, person, l, markers) : null))
  for (let k = 1; k < said.length; k++) if (marks[k]?.by === 'hand' && marks[k - 1]?.by === 'log' && !lineKey(said[k].text) && said[k].ms - said[k - 1].ms <= LINK_ONLY_MS) marks[k] = marks[k - 1]
  const label = said.find((l) => !l.fromOwner)?.senderLabel ?? person
  const sends: Send[] = []
  let k = 0
  while (k < said.length) {
    const mark = marks[k]
    if (!mark) {
      k++
      continue
    }
    let end = k
    while (end + 1 < said.length && marks[end + 1] && marks[end + 1]!.by === mark.by) end++
    const first = said[k]
    const last = said[end]
    const reply = said.slice(end + 1).find((l) => !l.fromOwner)
    const cutAfter = lowerBound(said, last.ms + MOVE_WINDOW_MS + 1, (l) => l.ms)
    sends.push({
      platform,
      account,
      person,
      with: label,
      who: row?.who ?? null,
      stage: stageAt(said.slice(0, k), first.ms, row),
      by: mark.by,
      foundBy: mark.foundBy,
      play: mark.by === 'log' ? (mark.play ?? 'unknown') : null,
      firstMs: first.ms,
      lastMs: last.ms,
      firstSeq: first.seq,
      lastSeq: last.seq,
      lines: end - k + 1,
      text: said.slice(k, end + 1).map((l) => l.text.replace(/\s+/g, ' ').trim()).join(' / '),
      replyMs: reply ? reply.ms - last.ms : null,
      stageAfter: stageAt(said.slice(0, cutAfter), last.ms + MOVE_WINDOW_MS, row),
      positivity: null,
    })
    k = end + 1
  }
  return sends
}

export function markersOf(on: Database, deps: OutcomeDeps = {}): Markers {
  return { sendRecords: sendRecordIds(on), queues: queueSends(on), spans: sendSpans(on), agent: deps.agentSends ?? [] }
}

export function sendsOf(query: OutcomeQuery = {}, on: Database = db(), deps: OutcomeDeps = {}): Send[] {
  const rows = on.prepare(DM_SQL).all(query.platform ?? null, query.account ?? null) as Row[]
  const markers = markersOf(on, deps)
  const stages = new Map(storedRows(on, query).map((r) => [`${r.platform}\u0000${r.account}\u0000${r.person}`, r]))
  const sends: Send[] = []
  for (const [key, p] of peopleOf(rows)) {
    const stored = stages.get(key)
    if (stored?.who === 'bot' || !oneToOne(p.lines)) continue
    p.lines.sort((a, b) => a.ms - b.ms || a.seq - b.seq)
    const moved = stored?.movedBySeq != null ? (p.lines.find((l) => l.seq === stored.movedBySeq)?.ms ?? null) : null
    sends.push(...sendsOfPerson(p.platform, p.account, p.person, p.lines, stored ? { who: stored.who, where: stored.where, movedMs: moved } : null, markers))
  }
  return sends
}

export async function withFeelings(sends: Send[], read: FeelingReader): Promise<number> {
  let scored = 0
  for (let k = 0; k < sends.length; k += 64) {
    const batch = sends.slice(k, k + 64)
    const rows = await read(batch.map((s) => s.text.slice(0, FEELING_CHARS) || '(nothing)')).catch(() => [])
    batch.forEach((s, i) => {
      const row = rows[i]
      if (!row?.length) return
      s.positivity = Math.round(row.filter((e) => EMOTION_GROUPS.feelsGood.includes(e.label)).reduce((sum, e) => sum + e.score, 0) * 1000) / 1000
      scored++
    })
  }
  return scored
}

const repliedWithin = (s: Send, w: ReplyWindow) => s.replyMs !== null && s.replyMs <= REPLY_WINDOWS[w]

const eligible = (s: Send, w: ReplyWindow, now: number) => now - s.lastMs >= REPLY_WINDOWS[w]

function sideStats(sends: readonly Send[], now: number): SideStats {
  const day = sends.filter((s) => eligible(s, 'day', now))
  const week = sends.filter((s) => eligible(s, 'week', now))
  const times = week.filter((s) => repliedWithin(s, 'week')).map((s) => s.replyMs! / 60_000)
  const m = median(times)
  return {
    sends: sends.length,
    day: wilson(day.filter((s) => repliedWithin(s, 'day')).length, day.length),
    week: wilson(week.filter((s) => repliedWithin(s, 'week')).length, week.length),
    medianReplyMinutes: m === null ? null : Math.round(m),
    replied: times.length,
    movedForward: wilson(week.filter((s) => movedForward(s.stage, s.stageAfter)).length, week.length),
  }
}

function compare(group: string, sends: readonly Send[], now: number): Comparison {
  return { group, log: sideStats(sends.filter((s) => s.by === 'log'), now), hand: sideStats(sends.filter((s) => s.by === 'hand'), now) }
}

const stratumOf = (s: Send) => `${s.platform}\u0000${s.account}\u0000${s.person}\u0000${s.stage}`

const clusterOf = (s: Send) => `${s.platform}\u0000${s.account}\u0000${s.person}`

function unitsOf(sends: readonly Send[], w: ReplyWindow, now: number, outcome: (s: Send) => boolean): Unit[] {
  return sends.filter((s) => eligible(s, w, now)).map((s) => ({ stratum: stratumOf(s), cluster: clusterOf(s), log: s.by === 'log', outcome: outcome(s) }))
}

function matchedOf(sends: readonly Send[], now: number, reps?: number): Matched {
  const day = matchedWindow(unitsOf(sends, 'day', now, (s) => repliedWithin(s, 'day')), reps)
  const week = matchedWindow(unitsOf(sends, 'week', now, (s) => repliedWithin(s, 'week')), reps)
  const moved = matchedWindow(unitsOf(sends, 'week', now, (s) => movedForward(s.stage, s.stageAfter)), reps)
  const both = new Set<string>()
  const sides = new Map<string, Set<SentBy>>()
  for (const s of sends.filter((x) => eligible(x, 'week', now))) sides.set(stratumOf(s), (sides.get(stratumOf(s)) ?? new Set()).add(s.by))
  for (const [k, v] of sides) if (v.size === 2) both.add(k)
  const inBoth = sends.filter((s) => eligible(s, 'week', now) && both.has(stratumOf(s)) && repliedWithin(s, 'week'))
  const minutes = (by: SentBy) => inBoth.filter((s) => s.by === by).map((s) => s.replyMs! / 60_000)
  const rounded = (x: number | null) => (x === null ? null : Math.round(x))
  return { day, week, movedForward: moved, medianReplyMinutes: { log: rounded(median(minutes('log'))), hand: rounded(median(minutes('hand'))), logReplies: minutes('log').length, handReplies: minutes('hand').length } }
}

function positivityOf(sends: readonly Send[], now: number, reps?: number): Positivity {
  const w: ReplyWindow = 'week'
  const scored = sends.filter((s) => s.positivity !== null && eligible(s, w, now))
  const pos = scored.filter((s) => s.positivity! >= POSITIVE_AT)
  const neg = scored.filter((s) => s.positivity! < POSITIVE_AT)
  const yes = (list: readonly Send[]) => list.filter((s) => repliedWithin(s, w)).length
  const raw = oddsRatio(yes(pos), pos.length - yes(pos), yes(neg), neg.length - yes(neg))
  const matched = mantelHaenszelInterval(scored.map((s) => ({ stratum: stratumOf(s), cluster: clusterOf(s), exposed: s.positivity! >= POSITIVE_AT, outcome: repliedWithin(s, w) })), reps)
  return { scored: scored.length, positive: wilson(yes(pos), pos.length), notPositive: wilson(yes(neg), neg.length), oddsRatio: raw.ratio, low: raw.low, high: raw.high, matchedOddsRatio: matched.ratio, matchedLow: matched.low, matchedHigh: matched.high, window: w }
}

export function sinceOf(sends: readonly Send[]): Map<string, number> {
  const since = new Map<string, number>()
  for (const s of sends) if (s.by === 'log') since.set(`${s.platform}\u0000${s.account}`, Math.min(since.get(`${s.platform}\u0000${s.account}`) ?? Infinity, s.firstMs))
  return since
}

export function reportOf(all: readonly Send[], deps: { now?: number; reps?: number } = {}): OutcomeReport {
  const now = deps.now ?? Date.now()
  const since = sinceOf(all)
  const sends = all.filter((s) => (since.get(`${s.platform}\u0000${s.account}`) ?? Infinity) <= s.firstMs)
  const log = sends.filter((s) => s.by === 'log')
  const groups = (keyOf: (s: Send) => string) => [...new Set(sends.map(keyOf))].sort().map((g) => compare(g, sends.filter((s) => keyOf(s) === g), now))
  const moves = new Map<string, { from: string; to: string; log: number; hand: number }>()
  for (const s of sends.filter((x) => eligible(x, 'week', now) && x.stage !== x.stageAfter)) {
    const key = `${s.stage}>${s.stageAfter}`
    const m = moves.get(key) ?? { from: s.stage, to: s.stageAfter, log: 0, hand: 0 }
    m[s.by]++
    moves.set(key, m)
  }
  const hand = sends.filter((s) => s.by === 'hand')
  const plays: PlayRow[] = [...new Set(log.map((s) => s.play ?? 'unknown'))].map((play) => {
    const mine = log.filter((s) => (s.play ?? 'unknown') === play)
    const stats = sideStats(mine, now)
    return { play, sends: mine.length, day: stats.day, week: stats.week, medianReplyMinutes: stats.medianReplyMinutes, movedForward: stats.movedForward, matchedDay: matchedWindow(unitsOf([...mine, ...hand], 'day', now, (s) => repliedWithin(s, 'day')), deps.reps), matchedWeek: matchedWindow(unitsOf([...mine, ...hand], 'week', now, (s) => repliedWithin(s, 'week')), deps.reps) }
  }).sort((a, b) => b.sends - a.sends)
  const scored = sends.some((s) => s.positivity !== null)
  return {
    generatedAt: new Date(now).toISOString(),
    since: Object.fromEntries([...since].map(([k, ms]) => [k.replace('\u0000', ' '), new Date(ms).toISOString()])),
    sends: { log: log.length, hand: hand.length, lines: { log: log.reduce((n, s) => n + s.lines, 0), hand: hand.reduce((n, s) => n + s.lines, 0) } },
    foundBy: { sendRecord: log.filter((s) => s.foundBy === 'sendRecord').length, queue: log.filter((s) => s.foundBy === 'queue').length, sendSpan: log.filter((s) => s.foundBy === 'sendSpan').length },
    raw: [compare('all', sends, now), ...groups((s) => s.platform)],
    matched: matchedOf(sends, now, deps.reps),
    byWho: groups((s) => s.who ?? 'unlabelled'),
    byStage: groups((s) => s.stage),
    moves: [...moves.values()].sort((a, b) => b.log + b.hand - (a.log + a.hand)),
    plays,
    positivity: scored ? { all: positivityOf(sends, now, deps.reps), log: positivityOf(log, now, deps.reps), hand: positivityOf(hand, now, deps.reps) } : null,
    notes: [
      'A send is a run of the owner\'s messages in a one-to-one dm before the person writes again; log sent it when a line matches a send record, a sent queue item or a log send call on that platform.',
      'Only sends since log first sent on each account count, for both sides, so the hand sends come from the same weeks.',
      'Matched compares log and hand sends to the same person at the same stage (Mantel-Haenszel weights); the interval is a bootstrap over people.',
      'Stage at send is the labelled stage once the message that moved the person there was sent, else new, warming or goneQuiet from the history before it; moved forward is a later stage 7 days after.',
      'A send is counted for a window only once the window has passed.',
      'A log send\'s play is the last guide or play skill loaded in the agent session that sent it, or its queue\'s name; unknown means no agent session sent it within 15 minutes (a CLI or another host).',
    ],
  }
}

export async function outcomesOf(query: OutcomeQuery = {}, on: Database = db(), deps: OutcomeDeps = {}): Promise<OutcomeReport> {
  const sends = sendsOf(query, on, deps)
  const now = deps.now ?? Date.now()
  if (deps.feelings) {
    const since = sinceOf(sends)
    await withFeelings(sends.filter((s) => (since.get(`${s.platform}\u0000${s.account}`) ?? Infinity) <= s.firstMs), deps.feelings)
  }
  return reportOf(sends, { now, reps: deps.reps })
}

