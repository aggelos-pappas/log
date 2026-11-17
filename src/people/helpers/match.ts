import type { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { ASKS, BOT_NAMES, HANDLE_MIN, M_PROBABILITIES, PRIOR_MATCH_SHARE, RECOMMENDS, REVIEW_BITS, SOURCES_KEPT, STRONG_BITS } from '../types'
import type { Band, Comparison, IdentityInfo, IdentityRef, MessageSource, Suggestion } from '../types'
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

const isBot = (row: Row): boolean => {
  const text = `${row.handle ?? ''} ${row.displayName ?? ''}`.toLowerCase().trim()
  return BOT_NAMES.some((b) => text === b || text.startsWith(`${b} `) || text.endsWith(` ${b}`)) || /(?:^|[\s_-])bot$/.test(row.handle?.toLowerCase() ?? '')
}

const bits = (x: number): number => Math.log2(x)

function shareLevel(n: number): keyof typeof M_PROBABILITIES.sharesOwnPosts {
  return n >= 5 ? 'fivePlus' : n >= 2 ? 'twoToFour' : n === 1 ? 'once' : 'never'
}

export function suggestLinks(handle: Database): Suggestion[] {
  const all = (handle.prepare('SELECT platform, userId, handle, displayName FROM identities WHERE userId NOT LIKE \'self:%\'').all() as Row[]).filter((r) => r.platform !== 'log')
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
  const refused = new Set((handle.prepare('SELECT platformA, userIdA, platformB, userIdB FROM identityNotLinked').all() as { platformA: string; userIdA: string; platformB: string; userIdB: string }[]).map((n) => `${n.platformA}:${n.userIdA}|${n.platformB}:${n.userIdB}`))
  const throughSeq = (handle.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
  const platforms = [...new Set(rows.map((r) => r.platform))]
  const perPlatform = new Map(platforms.map((p) => [p, rows.filter((r) => r.platform === p).length]))
  let pairs = 0
  for (let i = 0; i < platforms.length; i++) for (let j = i + 1; j < platforms.length; j++) pairs += perPlatform.get(platforms[i])! * perPlatform.get(platforms[j])!
  if (!pairs) return []

  const resolve = (ref: IdentityRef): Row => {
    if (ref.userId.startsWith('@')) return byHandle.get(`${ref.platform}:${ref.userId.slice(1)}`) ?? { platform: ref.platform, userId: ref.userId, handle: ref.userId.slice(1), displayName: null }
    return byKey.get(keyOf(ref)) ?? { platform: ref.platform, userId: ref.userId, handle: null, displayName: null }
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
    }
  }

  const looseHandles = new Map<string, Set<string>>()
  for (const r of rows) {
    const l = loose(r.handle)
    if (l.length < HANDLE_MIN) continue
    const k = `${r.platform}:${l}`
    looseHandles.set(k, (looseHandles.get(k) ?? new Set()).add(r.handle!.replace(/^@/, '').toLowerCase()))
  }
  const handleChoices = (platform: string, handle: string): number => looseHandles.get(`${platform}:${loose(handle)}`)?.size ?? 1
  const candidates = new Set<string>()
  for (const k of shares.keys()) candidates.add(k)
  const byLoose = new Map<string, Row[]>()
  for (const r of rows) { const l = loose(r.handle); if (l.length >= HANDLE_MIN) byLoose.set(l, [...(byLoose.get(l) ?? []), r]) }
  for (const group of byLoose.values()) for (const a of group) for (const b of group) if (a.platform < b.platform) candidates.add(`${keyOf(a)}|${keyOf(b)}`)

  let exactPairs = 0
  let loosePairs = 0
  let namePairs = 0
  for (const group of byLoose.values()) for (const a of group) for (const b of group) {
    if (a.platform >= b.platform) continue
    if (a.handle?.replace(/^@/, '').toLowerCase() === b.handle?.replace(/^@/, '').toLowerCase()) exactPairs++
    else loosePairs++
  }
  const byName = new Map<string, Row[]>()
  for (const r of rows) { const n = r.displayName?.trim().toLowerCase(); if (n && n.length >= HANDLE_MIN) byName.set(n, [...(byName.get(n) ?? []), r]) }
  for (const group of byName.values()) for (const a of group) for (const b of group) if (a.platform < b.platform) namePairs++
  const shareCounts = { fivePlus: 0, twoToFour: 0, once: 0 }
  for (const s of shares.values()) { const l = shareLevel(s.count); if (l !== 'never') shareCounts[l]++ }
  const smooth = (n: number): number => (n + 1) / (pairs + 2)
  const U = {
    handle: { same: smooth(exactPairs), sameLoose: smooth(loosePairs), different: 1 - smooth(exactPairs) - smooth(loosePairs) },
    displayName: { same: smooth(namePairs), different: 1 - smooth(namePairs) },
    sharesOwnPosts: { fivePlus: smooth(shareCounts.fivePlus), twoToFour: smooth(shareCounts.twoToFour), once: smooth(shareCounts.once), never: 1 - smooth(shareCounts.fivePlus) - smooth(shareCounts.twoToFour) - smooth(shareCounts.once) },
  }
  const lambda = Math.min(0.5, Math.max(1, rows.length * PRIOR_MATCH_SHARE) / pairs)
  const prior = bits(lambda / (1 - lambda))

  const out: Suggestion[] = []
  const seen = new Set<string>()
  for (const pair of candidates) {
    const [ka, kb] = pair.split('|')
    const [first, second] = [ka, kb].sort()
    const id = `${first}|${second}`
    if (seen.has(id) || refused.has(id)) continue
    seen.add(id)
    const a = byKey.get(first)
    const b = byKey.get(second)
    if (!a || !b || a.platform === b.platform || isBot(a) || isBot(b)) continue
    if (linked.get(first) && linked.get(first) === linked.get(second)) continue
    const handleA = a.handle?.replace(/^@/, '').toLowerCase() ?? ''
    const handleB = b.handle?.replace(/^@/, '').toLowerCase() ?? ''
    const sameLoose = loose(handleA).length >= HANDLE_MIN && loose(handleA) === loose(handleB)
    if ((runBy.has(first) || runBy.has(second)) && !sameLoose) continue
    const comparisons: Comparison[] = []
    const add = (c: Omit<Comparison, 'bayesFactor' | 'matchWeight'>, divide = 1): void => {
      const bayesFactor = c.m / c.u / divide
      comparisons.push({ ...c, bayesFactor, matchWeight: bits(bayesFactor) })
    }
    const ab = shares.get(`${first}|${second}`)
    const ba = shares.get(`${second}|${first}`)
    const s = (ab?.count ?? 0) >= (ba?.count ?? 0) ? ab : ba
    const shareKey = shareLevel(s?.count ?? 0)
    add({ comparison: 'sharesOwnPosts', level: shareKey, values: s ? [`${s === ab ? first : second} shared posts by ${s === ab ? second : first}`] : [], m: M_PROBABILITIES.sharesOwnPosts[shareKey], u: U.sharesOwnPosts[shareKey], ...(s ? { count: s.count, asks: s.asks, sources: s.sources } : {}) })
    const handleKey = handleA && handleA === handleB ? 'same' : sameLoose ? 'sameLoose' : 'different'
    add({ comparison: 'handle', level: handleKey, values: [handleA, handleB], m: M_PROBABILITIES.handle[handleKey], u: U.handle[handleKey] }, handleKey === 'different' ? 1 : Math.max(handleChoices(a.platform, handleA), handleChoices(b.platform, handleB)))
    const nameA = a.displayName?.trim().toLowerCase() ?? ''
    const nameB = b.displayName?.trim().toLowerCase() ?? ''
    if (nameA && nameB) {
      const nameKey = nameA === nameB && nameA.length >= HANDLE_MIN ? 'same' : 'different'
      add({ comparison: 'displayName', level: nameKey, values: [a.displayName!, b.displayName!], m: M_PROBABILITIES.displayName[nameKey], u: U.displayName[nameKey] })
    }
    const matchWeight = prior + comparisons.reduce((n, c) => n + c.matchWeight, 0)
    const band: Band = matchWeight >= STRONG_BITS ? 'strong' : matchWeight >= REVIEW_BITS ? 'review' : 'hidden'
    if (band === 'hidden') continue
    const info = (r: Row): IdentityInfo => ({ platform: r.platform, userId: r.userId, handle: r.handle?.replace(/^@/, '') ?? null, name: r.displayName, personId: linked.get(keyOf(r)) ?? null, runByLogAs: runBy.get(keyOf(r)) ?? null })
    out.push({ suggestionId: `sg_${createHash('sha256').update(id).digest('hex').slice(0, 12)}`, a: info(a), b: info(b), prior, comparisons, matchWeight, probability: 1 / (1 + 2 ** -matchWeight), band, throughSeq })
  }
  return out.sort((x, y) => y.matchWeight - x.matchWeight || x.suggestionId.localeCompare(y.suggestionId))
}
