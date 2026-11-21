import type { Database } from 'bun:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chatsOf, lastWordOfMessages, saidOnly } from '../lastWord/index'
import type { LastWordMessage, PersonChat } from '../lastWord/index'
import { READ_TOOLS } from '../nameHints/index'
import { db, UNNAMED } from '../store/index'
import { inboxRoot } from '../watch/client'
import { sinceOf } from '../senders/index'
import { getState, putState } from '../../storage/state/index'
import type { DecisionAnswer, DecisionsClient } from '../../subq/decisions/index'
import {
  AMOUNT,
  ASKED,
  DEBRIEF_MAX_CHARS,
  DEBRIEF_TOP,
  DEBRIEF_TOP_MAX,
  DEFAULT_GOALS,
  DEFAULT_SINCE,
  LABEL_POINTS,
  LAST_FALLBACK,
  LINE_CHARS,
  LINES_PER_THREAD,
  MONEY_DAYS,
  MONEY_WORDS,
  NOTABLE_MAX,
  SAME_LINE_MS,
  SUBQ_LEVELS,
  SUBQ_TOP,
  SUBQ_WHY,
} from './types'
import type { AccountHealth, Debrief, DebriefLine, DebriefQuery, DebriefSettings, DebriefThread, LabelMark, ScoredPerson, ServerItem, XNotable } from './types'

export interface EngineStateLike {
  account: string
  sessionState: string | null
  checkedAt: string | null
  day: string | null
  today: number
  mutations: number
}

export interface DebriefDeps {
  on?: Database
  now?: Date
  states?: () => readonly EngineStateLike[]
  subq?: () => DecisionsClient | null
  settingsFile?: string
}

const PLATFORM_NAMES = ['twitter', 'discord', 'slack', 'instagram', 'reddit', 'linkedin', 'facebook', 'tiktok']

const flat = (text: string, max: number): string => {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

const bump = (all: Record<string, number>, key: string, by = 1): Record<string, number> => ({ ...all, [key]: (all[key] ?? 0) + by })

export function debriefSettingsPath(): string {
  return process.env.LOG_SETTINGS || join(dirname(inboxRoot()), 'settings.json')
}

export function debriefSettings(file: string = debriefSettingsPath()): DebriefSettings {
  try {
    const held = existsSync(file) ? ((JSON.parse(readFileSync(file, 'utf8')) as { debrief?: { goals?: unknown; scoresFile?: unknown } }).debrief ?? {}) : {}
    return {
      goals: typeof held.goals === 'string' && held.goals.trim() ? held.goals.trim() : DEFAULT_GOALS,
      scoresFile: typeof held.scoresFile === 'string' && held.scoresFile.trim() ? held.scoresFile.trim() : null,
    }
  } catch {
    return { goals: DEFAULT_GOALS, scoresFile: null }
  }
}

export function scoredPeople(file: string | null): ScoredPerson[] {
  if (!file || !existsSync(file)) return []
  try {
    const list = JSON.parse(readFileSync(file, 'utf8')) as unknown
    return Array.isArray(list) ? list.filter((p): p is ScoredPerson => Boolean(p) && typeof p === 'object') : []
  } catch {
    return []
  }
}

export function labelMarks(on: Database): LabelMark[] {
  const held = getState<{ entries?: LabelMark[] }>('inboxLabels', 'all', {}, on)
  return Array.isArray(held?.body.entries) ? held.body.entries : []
}

export function lastKeyOf(query: Pick<DebriefQuery, 'platform' | 'account'>): string {
  return `${query.platform || 'all'}:${query.account || 'all'}`
}

export function resolveSince(value: string | undefined, now: Date, on: Database, key: string): { since: string; sinceFrom: Debrief['sinceFrom'] } {
  const text = (value ?? '').trim()
  if (text === 'last') {
    const held = getState<{ at?: string }>('inboxDebrief', key, {}, on)
    if (held?.body.at && !Number.isNaN(Date.parse(held.body.at))) return { since: new Date(held.body.at).toISOString(), sinceFrom: 'last' }
    return { since: sinceOf(LAST_FALLBACK, now) as string, sinceFrom: 'lastMissing' }
  }
  if (!text) return { since: sinceOf(DEFAULT_SINCE, now) as string, sinceFrom: 'default' }
  const since = sinceOf(text, now)
  if (!since) throw new Error(`sinceInvalid: "${text}"`)
  return { since, sinceFrom: 'flag' }
}

export function markDebriefed(key: string, now: Date, on: Database): void {
  putState('inboxDebrief', key, { at: now.toISOString() }, now.getTime(), on)
}

function snippet(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 25)
  return flat(text.slice(start, match.index + match[0].length + 25), 70)
}

export interface RuleInput {
  chat: Pick<PersonChat, 'platform' | 'account' | 'kind' | 'with' | 'personKey'>
  said: readonly LastWordMessage[]
  waiting: boolean
  followUp: boolean
  lastAt: string
  newCount: number
}

export function ruleScore(input: RuleInput, marks: readonly LabelMark[], scores: readonly ScoredPerson[], now: Date): { score: number; reason: string } {
  const parts: { points: number; why: string }[] = []
  const recent = input.said.slice(-12).filter((m) => now.getTime() - m.ms <= MONEY_DAYS * 86_400_000)
  const amount = recent.map((m) => ({ m, hit: AMOUNT.exec(m.text) })).filter((x) => x.hit).at(-1)
  const words = amount ? null : recent.map((m) => ({ m, hit: MONEY_WORDS.exec(m.text) })).filter((x) => x.hit).at(-1)
  if (amount?.hit) parts.push({ points: 30, why: `money: "${snippet(amount.m.text, amount.hit)}"` })
  else if (words?.hit) parts.push({ points: 20, why: `money words: "${snippet(words.m.text, words.hit)}"` })
  const mark = marks.find((e) => e.platform === input.chat.platform && e.account === input.chat.account && e.person === input.chat.personKey)
  if (mark && LABEL_POINTS[mark.label] !== undefined && LABEL_POINTS[mark.label] !== 0) parts.push({ points: LABEL_POINTS[mark.label], why: `labelled ${mark.label}` })
  const who = input.chat.with.replace(/^@/, '').toLowerCase()
  const scored = scores.find((p) => [p.handle, p.name].some((n) => typeof n === 'string' && n.replace(/^@/, '').toLowerCase() === who))
  if (scored && typeof scored.score === 'number') parts.push({ points: Math.round(Math.max(0, Math.min(100, scored.score)) * 0.3), why: `scored ${scored.band ? `${scored.band} ` : ''}${scored.score}` })
  const hours = Math.max(0, (now.getTime() - Date.parse(input.lastAt)) / 3_600_000)
  if (input.waiting) {
    parts.push({ points: 15, why: 'waiting on you' })
    if (hours <= 72) parts.push({ points: Math.round((hours / 72) * 10), why: `waited ${Math.round(hours)}h` })
  }
  if (input.followUp) parts.push({ points: 8, why: 'reacted to your last message' })
  if (hours > 21 * 24) parts.push({ points: -15, why: `quiet for ${Math.round(hours / 24)} days` })
  const theirLast = input.said.filter((m) => !m.fromOwner).at(-1)
  const askedBefore = theirLast ? input.said.filter((m) => m.fromOwner && m.ms <= theirLast.ms).at(-1) : undefined
  if (input.waiting && askedBefore && ASKED.test(askedBefore.text.trim())) parts.push({ points: 10, why: 'answered your question' })
  if (input.newCount > 0) parts.push({ points: Math.min(10, 4 + input.newCount), why: `${input.newCount} new` })
  if (input.said.length >= 8) parts.push({ points: 5, why: `long thread (${input.said.length})` })
  if (!input.said.some((m) => m.fromOwner)) parts.push({ points: -5, why: 'you never wrote' })
  if (input.chat.kind === 'group') parts.push({ points: -10, why: 'group chat' })
  const score = Math.max(0, Math.min(100, parts.reduce((sum, p) => sum + p.points, 0)))
  const reason = [...parts].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 4).map((p) => p.why).join('; ')
  return { score, reason }
}

function readCall(platform: string, account: string, withWho: string, conversationId: string): string {
  const tool = READ_TOOLS[platform]
  if (!tool) return ''
  const value = tool.key === 'with' ? withWho.replace(/^@/, '') : conversationId
  return `${tool.tool} { account: "${account}", ${tool.key}: "${value}" }`
}

function linesOf(said: readonly LastWordMessage[]): DebriefLine[] {
  const once = said.filter((m, i) => !said.slice(0, i).some((p) => p.fromOwner === m.fromOwner && p.text === m.text && Math.abs(p.ms - m.ms) <= SAME_LINE_MS))
  return once.slice(-LINES_PER_THREAD).map((m) => ({ at: m.at, who: m.fromOwner ? 'you' : 'them', text: flat(m.text || '(a file)', LINE_CHARS) }))
}

export function threadsOf(chats: readonly PersonChat[], sinceMs: number, now: Date, marks: readonly LabelMark[], scores: readonly ScoredPerson[]): DebriefThread[] {
  const out: DebriefThread[] = []
  for (const chat of chats) {
    const word = lastWordOfMessages(chat, chat.messages)
    if (!word) continue
    const said = saidOnly(chat.messages)
    const newCount = said.filter((m) => !m.fromOwner && m.ms >= sinceMs).length
    if (!word.waiting && !word.followUp && newCount === 0) continue
    const withWho = word.with === UNNAMED ? chat.named() : word.with
    const { score, reason } = ruleScore({ chat: { ...chat, with: withWho }, said, waiting: word.waiting, followUp: word.followUp, lastAt: word.lastAt, newCount }, marks, scores, now)
    out.push({ platform: chat.platform, account: chat.account, with: withWho, kind: chat.kind, conversationIds: chat.conversationIds, lastAt: word.lastAt, waiting: word.waiting, followUp: word.followUp, newCount, score, reason, read: readCall(chat.platform, chat.account, withWho, chat.conversationIds[0] ?? ''), lines: linesOf(said) })
  }
  return out.sort((a, b) => b.score - a.score || Date.parse(b.lastAt) - Date.parse(a.lastAt))
}

export function inboundCounts(on: Database, sinceMs: number, platform?: string, account?: string): Debrief['inbound'] {
  const rows = on
    .prepare(`SELECT c.platform, c.account, COUNT(*) AS n FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE m.fromOwner = 0 AND m.sentAtMs >= ?1 AND (?2 IS NULL OR c.platform = ?2) AND (?3 IS NULL OR c.account = ?3) GROUP BY c.platform, c.account`)
    .all(sinceMs, platform ?? null, account ?? null) as { platform: string; account: string; n: number }[]
  return rows.reduce<Debrief['inbound']>((all, r) => ({ total: all.total + r.n, byPlatform: bump(all.byPlatform, r.platform, r.n), byAccount: bump(all.byAccount, `${r.platform} ${r.account}`, r.n) }), { total: 0, byPlatform: {}, byAccount: {} })
}

export function xNotifications(on: Database, since: string, account?: string): Debrief['x'] {
  const rows = on
    .prepare(`SELECT receivedAt, payload FROM events WHERE platform = 'twitter' AND type = 'notification' AND receivedAt >= ?1 AND (?2 IS NULL OR account = ?2) ORDER BY seq`)
    .all(since, account ?? null) as { receivedAt: string; payload: string }[]
  const seen = new Map<string, XNotable & { key: string }>()
  for (const r of rows) {
    let p: Record<string, unknown> = {}
    try {
      p = JSON.parse(r.payload) as Record<string, unknown>
    } catch {}
    const at = typeof p.at === 'string' ? p.at : r.receivedAt
    if (at < since) continue
    const key = String(p.key ?? `${p.kind}:${p.userId}:${p.postId ?? ''}`)
    seen.set(key, { key, at, kind: String(p.kind ?? 'other'), handle: String(p.handle ?? p.userId ?? '?'), followers: typeof p.followers === 'number' ? p.followers : null, text: flat(String(p.text ?? p.postText ?? ''), 120) })
  }
  const all = [...seen.values()]
  const talk = all.filter((n) => ['reply', 'quote', 'mention'].includes(n.kind)).sort((a, b) => b.at.localeCompare(a.at))
  const follows = all.filter((n) => n.kind === 'follow').sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
  const notable = [...talk, ...follows].slice(0, NOTABLE_MAX).map(({ key: _key, ...n }) => n)
  return { byKind: all.reduce<Record<string, number>>((c, n) => bump(c, n.kind), {}), notable }
}

export function serverMentions(on: Database, since: string, account?: string): Debrief['servers'] {
  const rows = on
    .prepare(`SELECT receivedAt, account, box, withWho, conversationId, text FROM events WHERE platform = 'discord' AND type = 'message' AND box IN ('mention', 'reply', 'talk') AND receivedAt >= ?1 AND (?2 IS NULL OR account = ?2) ORDER BY seq DESC`)
    .all(since, account ?? null) as { receivedAt: string; account: string; box: string; withWho: string; conversationId: string; text: string }[]
  const rank = (box: string) => (box === 'mention' ? 0 : box === 'reply' ? 1 : 2)
  const items: ServerItem[] = [...rows].sort((a, b) => rank(a.box) - rank(b.box)).slice(0, NOTABLE_MAX).map((r) => ({ at: r.receivedAt, account: r.account, box: r.box, from: r.withWho, channel: r.conversationId, text: flat(r.text, 120) }))
  return { byBox: rows.reduce<Record<string, number>>((c, r) => bump(c, r.box), {}), items }
}

export function healthOf(on: Database, states: readonly EngineStateLike[], now: Date, platform?: string, account?: string): AccountHealth[] {
  const gaps = on.prepare(`SELECT platform, account, fromAt, reason FROM gaps WHERE status != 'closed' ORDER BY id`).all() as { platform: string; account: string; fromAt: string; reason: string }[]
  const behind = new Map(gaps.map((g) => [`${g.platform} ${g.account}`, g]))
  const today = now.toISOString().slice(0, 10)
  const rows = new Map<string, AccountHealth>()
  for (const s of states) {
    const [first, ...rest] = s.account.split(' ')
    const [p, a] = rest.length && PLATFORM_NAMES.includes(first) ? [first, rest.join(' ')] : ['facebook', s.account]
    const gap = behind.get(`${p} ${a}`)
    rows.set(`${p} ${a}`, { platform: p, account: a, session: s.sessionState, checkedAt: s.checkedAt, requestsToday: s.day === today ? s.today : 0, writesToday: s.day === today ? s.mutations : 0, behindFrom: gap?.fromAt ?? null, behindReason: gap?.reason ?? null })
  }
  for (const g of gaps) {
    if (!PLATFORM_NAMES.includes(g.platform) || rows.has(`${g.platform} ${g.account}`)) continue
    rows.set(`${g.platform} ${g.account}`, { platform: g.platform, account: g.account, session: null, checkedAt: null, requestsToday: 0, writesToday: 0, behindFrom: g.fromAt, behindReason: g.reason })
  }
  return [...rows.values()].filter((h) => (!platform || h.platform === platform) && (!account || h.account === account))
}

function subqState(threads: readonly DebriefThread[], goals: string): string {
  const blocks = threads.map((t, i) => [`T${i + 1}: ${t.platform} ${t.kind} with ${t.with}; rules: ${t.reason}`, ...t.lines.map((l) => `  ${l.who}: ${l.text}`)].join('\n'))
  return `The owner's goals: ${goals}.\nThese are the conversations waiting on the owner this morning, each with its last lines. Judge each one only by what it could bring the owner against those goals.\n\n${blocks.join('\n\n')}`
}

export async function rankWithSubq(threads: readonly DebriefThread[], goals: string, client: DecisionsClient | null): Promise<{ threads: DebriefThread[]; note: string; ok: boolean }> {
  const head = threads.slice(0, SUBQ_TOP)
  const rest = threads.slice(SUBQ_TOP)
  if (!head.length) return { threads: [...threads], note: 'nothing to rank', ok: true }
  if (!client) return { threads: [...threads], note: 'SubQ has no key, so the rules order is kept', ok: false }
  const questions = Object.fromEntries(
    head.flatMap((t, i) => [
      [`s${i}`, { type: 'score' as const, instructions: `How much is T${i + 1} (${t.with}) worth to the owner against the goals?`, criteria: SUBQ_LEVELS }],
      [`w${i}`, { type: 'choice' as const, instructions: `What best describes T${i + 1} (${t.with}) for the owner?`, criteria: { ...SUBQ_WHY } }],
    ]),
  )
  try {
    const answer = await client({ state: subqState(head, goals), questions })
    const scoreOf = (a: DecisionAnswer | undefined) => (a?.type === 'score' ? a.score : -1)
    const ranked = head
      .map((t, i) => {
        const s = scoreOf(answer.answers[`s${i}`])
        const w = answer.answers[`w${i}`]
        const level = s >= 0 ? SUBQ_LEVELS[Math.max(0, Math.min(SUBQ_LEVELS.length - 1, Math.round(s)))] : 'not scored'
        const kind = w?.type === 'choice' ? (SUBQ_WHY[w.choice] ?? w.choice) : ''
        return { t: { ...t, why: `${level} (${s >= 0 ? s.toFixed(1) : '?'}/${SUBQ_LEVELS.length - 1})${kind ? `: ${kind}` : ''}` }, s }
      })
      .sort((a, b) => b.s - a.s || b.t.score - a.t.score)
      .map((x) => x.t)
    return { threads: [...ranked, ...rest], note: `SubQ ordered the top ${head.length} against the goals: ${goals}`, ok: true }
  } catch (error) {
    const e = error as { code?: string; message?: string }
    return { threads: [...threads], note: `SubQ failed (${e.code ?? flat(String(e.message ?? error), 120)}), so the rules order is kept`, ok: false }
  }
}

export async function buildDebrief(query: DebriefQuery, deps: DebriefDeps = {}): Promise<Debrief> {
  const on = deps.on ?? db()
  const now = deps.now ?? new Date()
  const key = lastKeyOf(query)
  const { since, sinceFrom } = resolveSince(query.since, now, on, key)
  const sinceMs = Date.parse(since)
  const settings = debriefSettings(deps.settingsFile)
  const chats = chatsOf({ platform: query.platform, account: query.account }, on)
  const all = threadsOf(chats, sinceMs, now, labelMarks(on), scoredPeople(settings.scoresFile))
  const top = Math.max(1, Math.min(DEBRIEF_TOP_MAX, query.top ?? DEBRIEF_TOP))
  const rankBy = query.rank ?? 'rules'
  const ranked = rankBy === 'subq' ? await rankWithSubq(all, settings.goals, deps.subq ? deps.subq() : null) : { threads: all, note: 'rules over log.db', ok: true }
  const waiting = all.filter((t) => t.waiting)
  const debrief: Debrief = {
    since,
    until: now.toISOString(),
    sinceFrom,
    inbound: inboundCounts(on, sinceMs, query.platform, query.account),
    waiting: { waiting: waiting.length, followUps: all.filter((t) => t.followUp).length, byPlatform: waiting.reduce<Record<string, number>>((c, t) => bump(c, t.platform), {}) },
    threads: ranked.threads.slice(0, top),
    x: !query.platform || query.platform === 'twitter' ? xNotifications(on, since, query.account) : { byKind: {}, notable: [] },
    servers: !query.platform || query.platform === 'discord' ? serverMentions(on, since, query.account) : { byBox: {}, items: [] },
    health: healthOf(on, deps.states ? deps.states() : [], now, query.platform, query.account),
    rank: { by: rankBy === 'subq' && ranked.ok ? 'subq' : 'rules', note: ranked.note },
  }
  if (sinceFrom === 'last' || sinceFrom === 'lastMissing') markDebriefed(key, now, on)
  return fitDebrief(debrief)
}

export function fitDebrief(debrief: Debrief, max: number = DEBRIEF_MAX_CHARS): Debrief {
  let fitted = debrief
  for (const keep of [LINES_PER_THREAD, 2, 1, 0]) {
    fitted = { ...debrief, threads: debrief.threads.map((t) => ({ ...t, lines: t.lines.slice(t.lines.length - Math.min(keep, t.lines.length)) })) }
    if (JSON.stringify(fitted).length <= max && debriefText(fitted).length <= max) return fitted
  }
  while (fitted.threads.length > 1 && (JSON.stringify(fitted).length > max || debriefText(fitted).length > max)) fitted = { ...fitted, threads: fitted.threads.slice(0, -1) }
  return fitted
}

const clock = (at: string): string => at.replace('T', ' ').slice(0, 16)

const counts = (c: Record<string, number>): string =>
  Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(', ')

function threadBlock(t: DebriefThread, i: number): string[] {
  const state = t.waiting ? 'waiting on you' : t.followUp ? 'a follow-up to send' : 'new'
  return [
    `${String(i + 1).padStart(2)}. [${t.score}] ${t.platform} ${t.account} · ${t.with}${t.kind === 'group' ? ' (group)' : ''} · ${state} since ${clock(t.lastAt)}${t.newCount ? ` · ${t.newCount} new` : ''}`,
    `    rules: ${t.reason}`,
    ...(t.why ? [`    SubQ: ${t.why}`] : []),
    ...t.lines.map((l) => `    ${clock(l.at)} ${l.who}: ${l.text}`),
    ...(t.read ? [`    read: ${t.read}`] : []),
  ]
}

function healthLine(h: AccountHealth): string {
  const behind = h.behindFrom ? `, behind since ${clock(h.behindFrom)} (${h.behindReason})` : ''
  return `  ${h.platform} ${h.account}: session ${h.session ?? 'not read yet'}${h.checkedAt ? ` (checked ${clock(h.checkedAt)})` : ''}, ${h.requestsToday} requests and ${h.writesToday} writes today${behind}`
}

export function debriefText(d: Debrief): string {
  const from = d.sinceFrom === 'last' ? ' (since the last debrief)' : d.sinceFrom === 'lastMissing' ? ` (no debrief before, so the last ${LAST_FALLBACK})` : ''
  const lines = [
    `log inbox debrief: ${clock(d.since)} to ${clock(d.until)} UTC${from}, from log.db only; nothing was fetched or sent.`,
    `New messages to you: ${d.inbound.total}${d.inbound.total ? ` (${counts(d.inbound.byAccount)})` : ''}.`,
    `Waiting on you: ${d.waiting.waiting}${d.waiting.waiting ? ` (${counts(d.waiting.byPlatform)})` : ''}; ${d.waiting.followUps} reacted to your last message.`,
    `Top ${d.threads.length} to answer, ranked by ${d.rank.by === 'subq' ? 'SubQ after the rules' : 'the rules'} (${d.rank.note}):`,
    ...d.threads.flatMap(threadBlock),
  ]
  const xKinds = counts(d.x.byKind)
  if (xKinds) lines.push(`X notifications: ${xKinds}.`, ...d.x.notable.map((n) => `  ${clock(n.at)} ${n.kind} @${n.handle}${n.followers !== null ? ` (${n.followers} followers)` : ''}${n.text ? `: ${n.text}` : ''}`))
  const boxes = counts(d.servers.byBox)
  if (boxes) lines.push(`Discord servers: ${boxes}.`, ...d.servers.items.map((s) => `  ${clock(s.at)} ${s.box} from ${s.from} in ${s.channel}: ${s.text}`))
  if (d.health.length) lines.push('Accounts (from what log already keeps):', ...d.health.map(healthLine))
  return lines.join('\n')
}
