import type { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import type { Embedder } from '../../search/conversations/types'
import { ASKS, BOT_NAMES, EM_PRIOR_STRENGTH, EM_ROUNDS, HANDLE_MIN, M_PRIORS, MEANING_LINES, MY_PLATFORM, NAME_GROUP_MAX, PRIOR_MATCH_SHARE, RANDOM_PAIRS, RANDOM_PROFILES, RECOMMENDS, REVIEW_BITS, SIMILARITY_FALLBACK, SIMILARITY_LEVELS, SOURCES_KEPT, STRONG_BITS } from '../types'
import type { Band, Cluster, Comparison, ComparisonName, IdentityInfo, IdentityRef, LinkReport, MessageSource, Recheck, Suggestion } from '../types'
import { circleOf, denseCosine, enoughText, mentionsIn, overlap, profileOf, realName, sparseCosine } from './evidence'
import type { Profile } from './evidence'
import { keyOf } from './identity'

const LINKS: readonly (readonly [string, RegExp])[] = [
  ['twitter', /(?:^|[^\w.])(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/\d+/gi],
  ['instagram', /(?:^|[^\w.])instagram\.com\/([A-Za-z0-9_.]{2,30})\/?(?=[\s?#)\]]|$)/gi],
  ['discord', /(?:^|[^\w.])discord(?:app)?\.com\/users\/(\d{15,20})/gi],
]

const NOT_HANDLES = new Set(['i', 'home', 'search', 'intent', 'explore', 'settings', 'messages', 'p', 'reel', 'reels', 'stories', 'accounts', 'direct'])

export function linksIn(text: string): IdentityRef[] {
  const out: IdentityRef[] = []
  for (const [platform, re] of LINKS) {
    for (const match of text.matchAll(re)) {
      const found = match[1].replace(/\.$/, '')
      if (NOT_HANDLES.has(found.toLowerCase())) continue
      out.push({ platform, userId: platform === 'discord' ? found : `@${found.toLowerCase()}` })
    }
  }
  return out
}

export function sharedLinkTo(handle: Database, ref: IdentityRef): MessageSource | null {
  const word = ref.userId.replace(/^@/, '')
  if (!word) return null
  const rows = handle.prepare('SELECT messageKey, chatId, sentAt, text FROM messages WHERE fromOwner = 0 AND senderPlatform != ? AND text LIKE ? ORDER BY seq DESC').all(ref.platform, `%${word}%`) as { messageKey: string; chatId: string; sentAt: string | null; text: string }[]
  const found = rows.find((m) => !RECOMMENDS.test(m.text) && linksIn(m.text).some((r) => keyOf(r).toLowerCase() === keyOf(ref).toLowerCase()))
  return found ? { messageKey: found.messageKey, chatId: found.chatId, at: found.sentAt, text: found.text.replace(/\s+/g, ' ').slice(0, 160) } : null
}

export const loose = (handle: string | null): string => (handle ?? '').toLowerCase().replace(/^@/, '').replace(/[0-9_.\-]/g, '')

interface Row {
  platform: string
  userId: string
  handle: string | null
  displayName: string | null
}

interface Shares {
  count: number
  asks: number
  sources: MessageSource[]
}

interface Mentions {
  handedOver: number
  claimsOwn: number
  mentioned: number
  sources: MessageSource[]
}

type Similar = 'writingStyle' | 'meaning' | 'activeHours' | 'topicsWithOwner'

const SIMILAR: readonly Similar[] = ['writingStyle', 'meaning', 'activeHours', 'topicsWithOwner']

const BLOCKED_ON: Readonly<Record<string, ComparisonName>> = { handle: 'handle', shares: 'sharesOwnPosts', mention: 'mentionsHandle', name: 'displayName' }

const isBot = (row: Row): boolean => {
  const text = `${row.handle ?? ''} ${row.displayName ?? ''}`.toLowerCase().replace(/-/g, ' ').trim()
  return BOT_NAMES.some((b) => text === b || text.startsWith(`${b} `) || text.endsWith(` ${b}`)) || /(?:^|[\s_-])bot$/.test(row.handle?.toLowerCase() ?? '')
}

const bits = (x: number): number => Math.log2(x)

function shareLevel(n: number): 'fivePlus' | 'twoToFour' | 'once' | 'never' {
  return n >= 5 ? 'fivePlus' : n >= 2 ? 'twoToFour' : n === 1 ? 'once' : 'never'
}

const pairIdOf = (x: string, y: string): string => [x, y].sort().join('|')

const platformOf = (key: string): string => key.slice(0, key.indexOf(':'))

const sorted2 = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x])

export interface LinkContext {
  handle: Database
  rows: Row[]
  byKey: Map<string, Row>
  runBy: Map<string, string>
  linked: Map<string, string>
  members: Map<string, string[]>
  refused: Set<string>
  throughSeq: number
  pairs: number
  prior: number
  shares: Map<string, Shares>
  mentions: Map<string, Mentions>
  candidates: Map<string, Set<string>>
  handleChoices: (platform: string, handle: string) => number
  u: Record<string, Record<string, number>>
  thresholds: Record<string, readonly number[]>
  profiles: Map<string, Profile>
  circles: Map<string, Set<string> | null>
  ownerChats: Set<string>
  ignore: Set<string>
  looseOf: (platform: string, userId: string) => string | null
  sample: [string, string][]
  saysMy: Map<string, Set<string>>
}

function profile(ctx: LinkContext, key: string): Profile {
  let p = ctx.profiles.get(key)
  if (!p) {
    p = profileOf(ctx.handle, platformOf(key), key.slice(key.indexOf(':') + 1), ctx.ownerChats)
    ctx.profiles.set(key, p)
  }
  return p
}

function circle(ctx: LinkContext, key: string): Set<string> | null {
  if (!ctx.circles.has(key)) ctx.circles.set(key, circleOf(ctx.handle, platformOf(key), key.slice(key.indexOf(':') + 1), ctx.looseOf, ctx.ignore))
  return ctx.circles.get(key) ?? null
}

function similarity(ctx: LinkContext, kind: Similar, a: string, b: string, meaning?: ReadonlyMap<string, Float32Array>): number | null {
  if (kind === 'meaning') {
    const x = meaning?.get(a)
    const y = meaning?.get(b)
    return x && y ? denseCosine(x, y) : null
  }
  const pa = profile(ctx, a)
  const pb = profile(ctx, b)
  if (kind === 'activeHours') return pa.stamped >= 8 && pb.stamped >= 8 ? denseCosine(pa.hours, pb.hours) : null
  if (!enoughText(pa) || !enoughText(pb)) return null
  if (kind === 'writingStyle') return sparseCosine(pa.grams, pb.grams)
  return pa.topics.size >= 5 && pb.topics.size >= 5 ? sparseCosine(pa.topics, pb.topics) : null
}

const levelOf = (value: number, [close, near]: readonly number[]): 'close' | 'near' | 'far' => (value >= close ? 'close' : value >= near ? 'near' : 'far')

const smooth = (n: number, of: number): number => (n + 1) / (of + 2)

function circleLevel(n: number): 'many' | 'some' | 'none' {
  return n >= 3 ? 'many' : n >= 1 ? 'some' : 'none'
}

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function linkCandidates(handle: Database): LinkContext {
  const all = (handle.prepare("SELECT platform, userId, handle, displayName FROM identities WHERE userId NOT LIKE 'self:%'").all() as Row[]).filter((r) => r.platform !== 'log')
  const withId = new Set(all.filter((r) => !r.userId.startsWith('@') && r.handle).map((r) => `${r.platform}:${r.handle!.replace(/^@/, '').toLowerCase()}`))
  const rows = all.filter((r) => !(r.userId.startsWith('@') && withId.has(`${r.platform}:${r.userId.slice(1).toLowerCase()}`)))
  const byKey = new Map(rows.map((r) => [keyOf(r), r]))
  const byHandle = new Map<string, Row>()
  for (const r of rows) {
    if (!r.handle) continue
    const k = `${r.platform}:${r.handle.replace(/^@/, '').toLowerCase()}`
    const held = byHandle.get(k)
    if (!held || (held.userId.startsWith('@') && !r.userId.startsWith('@'))) byHandle.set(k, r)
  }
  const accounts = handle.prepare('SELECT platform, account, userId FROM accounts').all() as { platform: string; account: string; userId: string }[]
  const runBy = new Map(accounts.map((a) => [`${a.platform}:${a.userId}`, a.account]))
  const linked = new Map((handle.prepare('SELECT platform, userId, personId FROM identityLinks WHERE revokedAt IS NULL').all() as { platform: string; userId: string; personId: string }[]).map((l) => [`${l.platform}:${l.userId}`, l.personId]))
  const members = new Map<string, string[]>()
  for (const [k, p] of linked) members.set(p, [...(members.get(p) ?? []), k])
  const refused = new Set((handle.prepare('SELECT platformA, userIdA, platformB, userIdB FROM identityNotLinked').all() as { platformA: string; userIdA: string; platformB: string; userIdB: string }[]).map((n) => pairIdOf(`${n.platformA}:${n.userIdA}`, `${n.platformB}:${n.userIdB}`)))
  const throughSeq = (handle.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
  const platforms = [...new Set(rows.map((r) => r.platform))]
  const perPlatform = new Map(platforms.map((p) => [p, rows.filter((r) => r.platform === p).length]))
  let pairs = 0
  for (let i = 0; i < platforms.length; i++) for (let j = i + 1; j < platforms.length; j++) pairs += perPlatform.get(platforms[i])! * perPlatform.get(platforms[j])!

  const resolve = (ref: IdentityRef): Row => {
    if (ref.userId.startsWith('@')) return byHandle.get(`${ref.platform}:${ref.userId.slice(1)}`) ?? { platform: ref.platform, userId: ref.userId, handle: ref.userId.slice(1), displayName: null }
    return byKey.get(keyOf(ref)) ?? { platform: ref.platform, userId: ref.userId, handle: null, displayName: null }
  }

  const candidates = new Map<string, Set<string>>()
  const addCandidate = (x: string, y: string, source: string): void => {
    const id = pairIdOf(x, y)
    candidates.set(id, (candidates.get(id) ?? new Set()).add(source))
  }

  const shares = new Map<string, Shares>()
  const posts = handle.prepare("SELECT messageKey, chatId, senderPlatform, senderUserId, sentAt, text FROM messages WHERE fromOwner = 0 AND (text LIKE '%x.com/%' OR text LIKE '%twitter.com/%' OR text LIKE '%instagram.com/%' OR text LIKE '%discord.com/users/%') ORDER BY seq").all() as { messageKey: string; chatId: string; senderPlatform: string; senderUserId: string; sentAt: string | null; text: string }[]
  for (const m of posts) {
    if (RECOMMENDS.test(m.text)) continue
    const targets = new Map<string, Row>()
    for (const ref of linksIn(m.text)) if (ref.platform !== m.senderPlatform) { const t = resolve(ref); targets.set(keyOf(t), t) }
    for (const t of targets.values()) {
      const k = `${m.senderPlatform}:${m.senderUserId}|${keyOf(t)}`
      const s = shares.get(k) ?? { count: 0, asks: 0, sources: [] }
      s.count++
      if (ASKS.test(m.text)) s.asks++
      s.sources.unshift({ messageKey: m.messageKey, chatId: m.chatId, at: m.sentAt, text: m.text.replace(/\s+/g, ' ').slice(0, 160) })
      s.sources.length = Math.min(s.sources.length, SOURCES_KEPT)
      shares.set(k, s)
      if (!byKey.has(keyOf(t))) byKey.set(keyOf(t), t)
      addCandidate(`${m.senderPlatform}:${m.senderUserId}`, keyOf(t), 'shares')
    }
  }

  const targets = new Map<string, { platform: string; key: string }[]>()
  for (const r of rows) {
    const h = r.handle?.replace(/^@/, '').toLowerCase()
    if (!h || h.length < HANDLE_MIN || isBot(r)) continue
    targets.set(h, [...(targets.get(h) ?? []), { platform: r.platform, key: keyOf(r) }])
  }
  const dmChats = new Set((handle.prepare("SELECT chatId FROM chats WHERE kind = 'dm'").all() as { chatId: string }[]).map((r) => r.chatId))
  const dmSenders = new Set((handle.prepare("SELECT DISTINCT m.senderPlatform AS platform, m.senderUserId AS userId FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE c.kind = 'dm' AND m.fromOwner = 0").all() as { platform: string; userId: string }[]).map((r) => `${r.platform}:${r.userId}`))
  const mentions = new Map<string, Mentions>()
  for (const m of mentionsIn(handle, targets)) {
    if (m.from === m.to) continue
    const id = pairIdOf(m.from, m.to)
    const held = mentions.get(id) ?? { handedOver: 0, claimsOwn: 0, mentioned: 0, sources: [] }
    if (m.claimsOwn && dmChats.has(m.source.chatId) && dmSenders.has(m.to)) held.handedOver++
    else if (m.claimsOwn) held.claimsOwn++
    else held.mentioned++
    if (!held.sources.some((s) => s.messageKey === m.source.messageKey)) held.sources.unshift(m.source)
    held.sources.length = Math.min(held.sources.length, SOURCES_KEPT)
    mentions.set(id, held)
    addCandidate(m.from, m.to, 'mention')
  }

  const saysMy = new Map<string, Set<string>>()
  const owned = handle.prepare("SELECT senderPlatform, senderUserId, text FROM messages WHERE fromOwner = 0 AND lower(text) LIKE '%my %' AND (lower(text) LIKE '%insta%' OR lower(text) LIKE '%my ig%' OR lower(text) LIKE '%twitter%' OR lower(text) LIKE '%my x %' OR lower(text) LIKE '%discord%' OR lower(text) LIKE '%slack%' OR lower(text) LIKE '%reddit%')").all() as { senderPlatform: string; senderUserId: string; text: string }[]
  for (const m of owned) for (const [platform, re] of MY_PLATFORM) if (platform !== m.senderPlatform && re.test(m.text)) saysMy.set(`${m.senderPlatform}:${m.senderUserId}`, (saysMy.get(`${m.senderPlatform}:${m.senderUserId}`) ?? new Set()).add(platform))

  const looseHandles = new Map<string, Set<string>>()
  const byLoose = new Map<string, Row[]>()
  for (const r of rows) {
    const l = loose(r.handle)
    if (l.length < HANDLE_MIN) continue
    looseHandles.set(`${r.platform}:${l}`, (looseHandles.get(`${r.platform}:${l}`) ?? new Set()).add(r.handle!.replace(/^@/, '').toLowerCase()))
    byLoose.set(l, [...(byLoose.get(l) ?? []), r])
  }
  const handleChoices = (platform: string, h: string): number => looseHandles.get(`${platform}:${loose(h)}`)?.size ?? 1
  let exactPairs = 0
  let loosePairs = 0
  for (const group of byLoose.values()) for (const a of group) for (const b of group) {
    if (a.platform >= b.platform) continue
    addCandidate(keyOf(a), keyOf(b), 'handle')
    if (a.handle?.replace(/^@/, '').toLowerCase() === b.handle?.replace(/^@/, '').toLowerCase()) exactPairs++
    else loosePairs++
  }
  const byName = new Map<string, Row[]>()
  for (const r of rows) { const n = r.displayName?.trim().toLowerCase(); if (n && n.length >= HANDLE_MIN) byName.set(n, [...(byName.get(n) ?? []), r]) }
  let namePairs = 0
  for (const group of byName.values()) for (const a of group) for (const b of group) {
    if (a.platform >= b.platform) continue
    namePairs++
    if (group.length <= NAME_GROUP_MAX) addCandidate(keyOf(a), keyOf(b), 'name')
  }
  const shareCounts = { fivePlus: 0, twoToFour: 0, once: 0 }
  for (const s of shares.values()) { const l = shareLevel(s.count); if (l !== 'never') shareCounts[l]++ }
  let handedPairs = 0
  let claimPairs = 0
  let mentionPairs = 0
  for (const m of mentions.values()) {
    if (m.handedOver) handedPairs++
    else if (m.claimsOwn) claimPairs++
    else mentionPairs++
  }
  const of = Math.max(pairs, 1)
  const u: Record<string, Record<string, number>> = {
    handle: { same: smooth(exactPairs, of), sameLoose: smooth(loosePairs, of), different: 1 - smooth(exactPairs, of) - smooth(loosePairs, of) },
    displayName: { same: smooth(namePairs, of), different: 1 - smooth(namePairs, of) },
    sharesOwnPosts: { fivePlus: smooth(shareCounts.fivePlus, of), twoToFour: smooth(shareCounts.twoToFour, of), once: smooth(shareCounts.once, of), never: 1 - smooth(shareCounts.fivePlus, of) - smooth(shareCounts.twoToFour, of) - smooth(shareCounts.once, of) },
    mentionsHandle: { handedOver: smooth(handedPairs, of), claimsOwn: smooth(claimPairs, of), mentioned: smooth(mentionPairs, of), never: 1 - smooth(handedPairs, of) - smooth(claimPairs, of) - smooth(mentionPairs, of) },
  }
  const lambda = Math.min(0.5, Math.max(1, rows.length * PRIOR_MATCH_SHARE) / of)
  const looseById = new Map(rows.map((r) => [keyOf(r), loose(r.handle)]))
  const ignore = new Set(accounts.map((a) => `${a.platform}:${a.userId}`))
  const ownerChats = new Set((handle.prepare('SELECT DISTINCT chatId FROM messages WHERE fromOwner = 1').all() as { chatId: string }[]).map((r) => r.chatId))
  const active = (handle.prepare('SELECT senderPlatform AS platform, senderUserId AS userId, COUNT(*) AS n FROM messages WHERE fromOwner = 0 GROUP BY senderPlatform, senderUserId HAVING n >= 8').all() as { platform: string; userId: string }[]).map((r) => `${r.platform}:${r.userId}`).filter((k) => byKey.has(k) && !ignore.has(k))
  const random = seeded(rows.length * 7919 + pairs)
  const byPlatform = new Map<string, string[]>()
  for (const k of active) byPlatform.set(platformOf(k), [...(byPlatform.get(platformOf(k)) ?? []), k])
  for (const [p, list] of byPlatform) {
    const shuffled = [...list]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    byPlatform.set(p, shuffled.slice(0, RANDOM_PROFILES))
  }
  const names = [...byPlatform.keys()]
  const sample: [string, string][] = []
  if (names.length >= 2) {
    for (let n = 0; n < RANDOM_PAIRS * 3 && sample.length < RANDOM_PAIRS; n++) {
      const p = names[Math.floor(random() * names.length)]
      const q = names[Math.floor(random() * names.length)]
      if (p === q) continue
      const x = byPlatform.get(p)!
      const y = byPlatform.get(q)!
      const pair: [string, string] = [x[Math.floor(random() * x.length)], y[Math.floor(random() * y.length)]]
      if (!candidates.has(pairIdOf(...pair))) sample.push(pair)
    }
  }
  return {
    handle, rows, byKey, runBy, linked, members, refused, throughSeq, pairs, prior: bits(lambda / (1 - lambda)), shares, mentions, candidates, handleChoices, u,
    thresholds: {}, profiles: new Map(), circles: new Map(), ownerChats, ignore, sample, saysMy,
    looseOf: (platform, userId) => {
      const l = looseById.get(`${platform}:${userId}`)
      return l && l.length >= HANDLE_MIN ? l : null
    },
  }
}

function calibrate(ctx: LinkContext, meaning?: ReadonlyMap<string, Float32Array>): void {
  for (const kind of SIMILAR) {
    const values = ctx.sample.map(([a, b]) => similarity(ctx, kind, a, b, meaning)).filter((v): v is number => v !== null).sort((x, y) => x - y)
    const at = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))]
    const enough = values.length >= 30
    const thresholds = enough ? [Math.max(at(SIMILARITY_LEVELS.close), at(SIMILARITY_LEVELS.near) + 1e-6), at(SIMILARITY_LEVELS.near)] : [...SIMILARITY_FALLBACK[kind]]
    ctx.thresholds[kind] = thresholds.map((t) => Math.round(t * 1e4) / 1e4)
    const counts = { close: 0, near: 0, far: 0 }
    for (const v of values) counts[levelOf(v, ctx.thresholds[kind])]++
    const n = values.length
    ctx.u[kind] = enough ? { close: smooth(counts.close, n), near: smooth(counts.near, n), far: 1 - smooth(counts.close, n) - smooth(counts.near, n) } : { close: 0.02, near: 0.1, far: 0.88 }
  }
  const says = ctx.sample.filter(([a, b]) => claimsPlatformOf(ctx, a, b) === 'says').length
  ctx.u.claimsPlatform = ctx.sample.length >= 30 ? { says: smooth(says, ctx.sample.length), never: 1 - smooth(says, ctx.sample.length) } : { says: 0.02, never: 0.98 }
  const circles = ctx.sample.map(([a, b]) => {
    const x = circle(ctx, a)
    const y = circle(ctx, b)
    return x && y ? overlap(x, y) : null
  }).filter((v): v is number => v !== null)
  const counts = { many: 0, some: 0, none: 0 }
  for (const v of circles) counts[circleLevel(v)]++
  const n = circles.length
  ctx.u.sharedCircle = n >= 30 ? { many: smooth(counts.many, n), some: smooth(counts.some, n), none: 1 - smooth(counts.many, n) - smooth(counts.some, n) } : { many: 0.02, some: 0.1, none: 0.88 }
}

function claimsPlatformOf(ctx: LinkContext, a: string, b: string): 'says' | 'never' {
  return ctx.saysMy.get(a)?.has(platformOf(b)) || ctx.saysMy.get(b)?.has(platformOf(a)) ? 'says' : 'never'
}

interface Gamma {
  comparison: ComparisonName
  level: string
  values: string[]
  divide: number
  extra?: Partial<Comparison>
}

function gammasOf(ctx: LinkContext, first: string, second: string, meaning?: ReadonlyMap<string, Float32Array>): Gamma[] {
  const a = ctx.byKey.get(first)!
  const b = ctx.byKey.get(second)!
  const out: Gamma[] = []
  const ab = ctx.shares.get(`${first}|${second}`)
  const ba = ctx.shares.get(`${second}|${first}`)
  const s = (ab?.count ?? 0) >= (ba?.count ?? 0) ? ab : ba
  out.push({ comparison: 'sharesOwnPosts', level: shareLevel(s?.count ?? 0), values: s ? [`${s === ab ? first : second} shared posts by ${s === ab ? second : first}`] : [], divide: 1, ...(s ? { extra: { count: s.count, asks: s.asks, sources: s.sources } } : {}) })
  const handleA = a.handle?.replace(/^@/, '').toLowerCase() ?? ''
  const handleB = b.handle?.replace(/^@/, '').toLowerCase() ?? ''
  const sameLoose = loose(handleA).length >= HANDLE_MIN && loose(handleA) === loose(handleB)
  const handleKey = handleA && handleA === handleB ? 'same' : sameLoose ? 'sameLoose' : 'different'
  out.push({ comparison: 'handle', level: handleKey, values: [handleA, handleB], divide: handleKey === 'different' ? 1 : Math.max(ctx.handleChoices(a.platform, handleA), ctx.handleChoices(b.platform, handleB)) })
  const nameA = a.displayName?.trim().toLowerCase() ?? ''
  const nameB = b.displayName?.trim().toLowerCase() ?? ''
  if (nameA && nameB) out.push({ comparison: 'displayName', level: nameA === nameB && nameA.length >= HANDLE_MIN ? 'same' : 'different', values: [a.displayName!, b.displayName!], divide: 1 })
  const m = ctx.mentions.get(pairIdOf(first, second))
  out.push({ comparison: 'mentionsHandle', level: m ? (m.handedOver ? 'handedOver' : m.claimsOwn ? 'claimsOwn' : 'mentioned') : 'never', values: m ? [`${m.handedOver} handed over in a dm, ${m.claimsOwn} as their own, ${m.mentioned} in passing`] : [], divide: 1, ...(m ? { extra: { count: m.handedOver + m.claimsOwn + m.mentioned, sources: m.sources } } : {}) })
  const claims = claimsPlatformOf(ctx, first, second)
  out.push({ comparison: 'claimsPlatform', level: claims, values: claims === 'says' ? [`one of them says "my ${platformOf(ctx.saysMy.get(first)?.has(platformOf(second)) ? second : first)}"`] : [], divide: 1 })
  for (const kind of SIMILAR) {
    const v = similarity(ctx, kind, first, second, meaning)
    if (v === null) continue
    out.push({ comparison: kind, level: levelOf(v, ctx.thresholds[kind]), values: [v.toFixed(3)], divide: 1 })
  }
  const x = circle(ctx, first)
  const y = circle(ctx, second)
  if (x && y) {
    const n = overlap(x, y)
    out.push({ comparison: 'sharedCircle', level: circleLevel(n), values: [`${n} people in common`], divide: 1 })
  }
  return out
}

function emSession(ctx: LinkContext, items: readonly { gammas: Gamma[] }[], skip: ComparisonName | null): { sums: Record<string, Record<string, number>>; totals: Record<string, number>; share: number; rounds: number } {
  const m: Record<string, Record<string, number>> = Object.fromEntries(Object.entries(M_PRIORS).map(([k, v]) => [k, { ...v }]))
  let share = 0.3
  let rounds = 0
  let sums: Record<string, Record<string, number>> = {}
  let totals: Record<string, number> = {}
  const ratio = (g: Gamma): number => (g.comparison === skip ? 1 : (m[g.comparison]?.[g.level] ?? 1e-6) / Math.max(1e-12, ctx.u[g.comparison]?.[g.level] ?? 1) / g.divide)
  for (; rounds < EM_ROUNDS && items.length; rounds++) {
    const p = items.map((it) => {
      const odds = (share / (1 - share)) * it.gammas.reduce((n, g) => n * ratio(g), 1)
      return Number.isFinite(odds) ? odds / (1 + odds) : 1
    })
    sums = {}
    totals = {}
    for (const [comparison, prior] of Object.entries(M_PRIORS)) {
      if (comparison === skip) continue
      const level: Record<string, number> = Object.fromEntries(Object.keys(prior).map((l) => [l, 0]))
      let total = 0
      items.forEach((it, i) => {
        const g = it.gammas.find((x) => x.comparison === comparison)
        if (!g || !(g.level in level)) return
        level[g.level] += p[i]
        total += p[i]
      })
      sums[comparison] = level
      totals[comparison] = total
      m[comparison] = Object.fromEntries(Object.entries(prior).map(([l, m0]) => [l, (level[l] + EM_PRIOR_STRENGTH * m0) / (total + EM_PRIOR_STRENGTH)]))
    }
    share = Math.min(0.99, Math.max(0.01, p.reduce((a, b) => a + b, 0) / p.length))
  }
  return { sums, totals, share, rounds }
}

function learnM(ctx: LinkContext, items: readonly { gammas: Gamma[]; sources: Set<string> }[]): { m: Record<string, Record<string, number>>; matchShare: number; rounds: number; sessions: number } {
  const pooled: Record<string, Record<string, number>> = {}
  const pooledTotal: Record<string, number> = {}
  const shares: number[] = []
  let rounds = 0
  let sessions = 0
  for (const [source, blocked] of Object.entries(BLOCKED_ON)) {
    const inSession = items.filter((it) => it.sources.has(source))
    if (!inSession.length) continue
    const run = emSession(ctx, inSession, blocked)
    sessions++
    rounds += run.rounds
    shares.push(run.share)
    for (const [comparison, level] of Object.entries(run.sums)) {
      pooled[comparison] ??= {}
      for (const [l, v] of Object.entries(level)) pooled[comparison][l] = (pooled[comparison][l] ?? 0) + v
      pooledTotal[comparison] = (pooledTotal[comparison] ?? 0) + run.totals[comparison]
    }
  }
  const m = Object.fromEntries(Object.entries(M_PRIORS).map(([comparison, prior]) => [comparison, Object.fromEntries(Object.entries(prior).map(([l, m0]) => [l, ((pooled[comparison]?.[l] ?? 0) + EM_PRIOR_STRENGTH * m0) / ((pooledTotal[comparison] ?? 0) + EM_PRIOR_STRENGTH)]))]))
  return { m, matchShare: shares.length ? Math.round((shares.reduce((a, b) => a + b, 0) / shares.length) * 1000) / 1000 : 0, rounds, sessions }
}

function namesDiffer(a: string | null, b: string | null): string | null {
  const na = realName(a)
  const nb = realName(b)
  return na && nb && !na.some((w) => nb.includes(w)) ? `different real names (${a} and ${b})` : null
}

function talkedTogether(ctx: LinkContext, x: string, y: string): string | null {
  const theirs = profile(ctx, y).chats
  const shared = [...profile(ctx, x).chats].find((c) => theirs.has(c))
  return shared ? `${x} and ${y} talk in the same chat (${shared}), so they are two people` : null
}

function vetoOf(ctx: LinkContext, first: string, second: string): string | null {
  const names = namesDiffer(ctx.byKey.get(first)!.displayName, ctx.byKey.get(second)!.displayName)
  if (names) return names
  const side = (k: string): Set<string> => new Set([k, ...(ctx.linked.get(k) ? ctx.members.get(ctx.linked.get(k)!) ?? [] : [])])
  for (const x of side(first)) for (const y of side(second)) {
    if (x === y || platformOf(x) !== platformOf(y)) continue
    const together = talkedTogether(ctx, x, y)
    if (together) return together
  }
  return null
}

function comparisonsOf(ctx: LinkContext, gammas: readonly Gamma[], m: Record<string, Record<string, number>>): Comparison[] {
  return gammas.map((g) => {
    const mm = m[g.comparison]?.[g.level] ?? 1e-6
    const uu = ctx.u[g.comparison]?.[g.level] ?? 1
    const bayesFactor = mm / uu / g.divide
    return { comparison: g.comparison, level: g.level, values: g.values, m: Math.round(mm * 1e4) / 1e4, u: uu, bayesFactor, matchWeight: bits(bayesFactor), ...(g.extra ?? {}) }
  })
}

function info(ctx: LinkContext, key: string): IdentityInfo {
  const r = ctx.byKey.get(key)!
  return { platform: r.platform, userId: r.userId, handle: r.handle?.replace(/^@/, '') ?? null, name: r.displayName, personId: ctx.linked.get(key) ?? null, runByLogAs: ctx.runBy.get(key) ?? null }
}

function allowed(ctx: LinkContext, first: string, second: string): boolean {
  const a = ctx.byKey.get(first)
  const b = ctx.byKey.get(second)
  if (!a || !b || a.platform === b.platform || isBot(a) || isBot(b) || ctx.refused.has(pairIdOf(first, second))) return false
  if (ctx.linked.get(first) && ctx.linked.get(second)) return false
  const sameLoose = loose(a.handle).length >= HANDLE_MIN && loose(a.handle) === loose(b.handle)
  return !((ctx.runBy.has(first) || ctx.runBy.has(second)) && !sameLoose)
}

export function identitiesIn(ctx: LinkContext): string[] {
  const keys = new Set<string>()
  for (const id of ctx.candidates.keys()) {
    const [x, y] = id.split('|')
    if (allowed(ctx, x, y)) keys.add(x).add(y)
  }
  for (const [x, y] of ctx.sample) keys.add(x).add(y)
  return [...keys]
}

export async function meaningOf(ctx: LinkContext, embedder: Pick<Embedder, 'embed'>, keys: Iterable<string> = identitiesIn(ctx)): Promise<Map<string, Float32Array>> {
  const out = new Map<string, Float32Array>()
  for (const key of keys) {
    const lines = profile(ctx, key).texts.filter((t) => t.trim().length >= 8).slice(0, MEANING_LINES)
    if (lines.length < 5) continue
    const vectors = await embedder.embed(lines)
    const mean = new Float32Array(vectors[0]?.length ?? 0)
    for (const v of vectors) for (let i = 0; i < mean.length; i++) mean[i] += v[i] / vectors.length
    out.set(key, mean)
  }
  return out
}

export function scoreLinks(ctx: LinkContext, meaning?: ReadonlyMap<string, Float32Array>): LinkReport {
  calibrate(ctx, meaning)
  const scored = [...ctx.candidates].flatMap(([id, sources]) => {
    const [first, second] = id.split('|')
    return allowed(ctx, first, second) ? [{ first, second, sources, gammas: gammasOf(ctx, first, second, meaning) }] : []
  })
  const learned = learnM(ctx, scored)
  const build = (first: string, second: string): Suggestion => {
    const comparisons = comparisonsOf(ctx, gammasOf(ctx, first, second, meaning), learned.m)
    const matchWeight = ctx.prior + comparisons.reduce((n, c) => n + c.matchWeight, 0)
    const band: Band = matchWeight >= STRONG_BITS ? 'strong' : matchWeight >= REVIEW_BITS ? 'review' : 'hidden'
    return { suggestionId: `sg_${createHash('sha256').update(`${first}|${second}`).digest('hex').slice(0, 12)}`, a: info(ctx, first), b: info(ctx, second), prior: ctx.prior, comparisons, matchWeight, probability: 1 / (1 + 2 ** -matchWeight), band, throughSeq: ctx.throughSeq, veto: null }
  }
  const shown: Suggestion[] = []
  const vetoed: Suggestion[] = []
  const place = (s: Suggestion): void => {
    if (s.band === 'hidden') return
    const veto = vetoOf(ctx, `${s.a.platform}:${s.a.userId}`, `${s.b.platform}:${s.b.userId}`)
    if (veto) vetoed.push({ ...s, veto })
    else shown.push(s)
  }
  for (const s of scored) place(build(s.first, s.second))
  const done = new Set(scored.map((s) => pairIdOf(s.first, s.second)))
  const ends = new Map<string, Set<string>>()
  for (const s of shown) {
    const x = `${s.a.platform}:${s.a.userId}`
    const y = `${s.b.platform}:${s.b.userId}`
    ends.set(x, (ends.get(x) ?? new Set()).add(y))
    ends.set(y, (ends.get(y) ?? new Set()).add(x))
  }
  for (const near of [...ends.values()]) for (const x of near) for (const y of near) {
    if (x >= y || done.has(pairIdOf(x, y)) || !allowed(ctx, x, y)) continue
    done.add(pairIdOf(x, y))
    place(build(...sorted2(x, y)))
  }
  const rechecks: Recheck[] = []
  for (const [personId, keys] of ctx.members) {
    const known = keys.filter((k) => ctx.byKey.has(k))
    for (const x of known) for (const y of known) {
      if (x >= y) continue
      if (platformOf(x) === platformOf(y)) {
        const together = talkedTogether(ctx, x, y)
        if (together) rechecks.push({ personId, a: info(ctx, x), b: info(ctx, y), matchWeight: 0, veto: together, comparisons: [] })
        continue
      }
      const s = build(...sorted2(x, y))
      const veto = namesDiffer(s.a.name, s.b.name)
      if (veto || s.band === 'hidden') rechecks.push({ personId, a: s.a, b: s.b, matchWeight: s.matchWeight, veto, comparisons: s.comparisons })
    }
  }
  const order = (list: Suggestion[]) => list.sort((x, y) => y.matchWeight - x.matchWeight || x.suggestionId.localeCompare(y.suggestionId))
  return { suggestions: order(shown), vetoed: order(vetoed), clusters: clustersOf(ctx, shown), rechecks, learned: { rounds: learned.rounds, sessions: learned.sessions, candidates: scored.length, matchShare: learned.matchShare, m: learned.m, u: ctx.u, thresholds: ctx.thresholds }, throughSeq: ctx.throughSeq }
}

function clustersOf(ctx: LinkContext, shown: readonly Suggestion[]): Cluster[] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let at = x
    while (parent.has(at) && parent.get(at) !== at) at = parent.get(at)!
    return at
  }
  const join = (x: string, y: string): void => {
    if (!parent.has(x)) parent.set(x, x)
    if (!parent.has(y)) parent.set(y, y)
    parent.set(find(x), find(y))
  }
  for (const s of shown) join(`${s.a.platform}:${s.a.userId}`, `${s.b.platform}:${s.b.userId}`)
  for (const keys of ctx.members.values()) {
    const inside = keys.filter((k) => parent.has(k))
    if (inside.length) for (const other of keys) if (ctx.byKey.has(other)) join(inside[0], other)
  }
  const groups = new Map<string, Set<string>>()
  for (const k of parent.keys()) groups.set(find(k), (groups.get(find(k)) ?? new Set()).add(k))
  return [...groups.values()].filter((g) => g.size >= 3).map((g) => {
    const inside = shown.filter((s) => g.has(`${s.a.platform}:${s.a.userId}`))
    const identities = [...g].sort().map((k) => info(ctx, k))
    return { identities, suggestionIds: inside.map((s) => s.suggestionId), weakestBits: Math.min(...inside.map((s) => s.matchWeight)), personIds: [...new Set(identities.map((i) => i.personId).filter((p): p is string => Boolean(p)))] }
  }).sort((x, y) => y.identities.length - x.identities.length || y.weakestBits - x.weakestBits)
}

export async function linkReport(handle: Database, options: { embedder?: Pick<Embedder, 'embed'> | null } = {}): Promise<LinkReport> {
  const ctx = linkCandidates(handle)
  const meaning = options.embedder ? await meaningOf(ctx, options.embedder).catch(() => undefined) : undefined
  return scoreLinks(ctx, meaning)
}

export function suggestLinks(handle: Database): Suggestion[] {
  return scoreLinks(linkCandidates(handle)).suggestions
}
