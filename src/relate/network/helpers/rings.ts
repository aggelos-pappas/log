import type { Database } from 'bun:sqlite'
import { pointedAt } from '../../graph/helpers/mentions'
import { ENGAGE_KINDS, FOLLOW_KINDS, RINGS, TALKS_TO } from '../types'
import type { InteractionFacts, MessageFacts, RingRow, RingState } from '../types'
import type { TypedRows } from '../../../storage/platform/types'

export interface Owners {
  ids: Set<string>
  handles: Set<string>
}

export function ownersOf(handle: Database, platform: string): Owners {
  const rows = handle.query('SELECT account, userId FROM accounts WHERE platform = ?').all(platform) as { account: string; userId: string }[]
  const chats = handle.query('SELECT DISTINCT account FROM chats WHERE platform = ?').all(platform) as { account: string }[]
  return { ids: new Set(rows.map((r) => r.userId)), handles: new Set([...rows, ...chats].map((r) => r.account.replace(/^@/, '').toLowerCase())) }
}

const someone = (owners: Owners, userId: string | null | undefined): userId is string => Boolean(userId) && !String(userId).startsWith('unknown:') && !String(userId).startsWith('self:') && !owners.ids.has(String(userId))

export function ringState(handle: Database): RingState | null {
  try {
    return (handle.query('SELECT throughSeq, lastAtMs, builtAt, builtMs FROM networkRingState WHERE id = 1').get() as RingState | null) ?? null
  } catch {
    return null
  }
}

function ringOf(handle: Database, platform: string, userId: string): RingRow | null {
  return (handle.query('SELECT platform, userId, ring, reason, sinceMs, follows, via, seq FROM networkRings WHERE platform = ? AND userId = ?').get(platform, userId) as RingRow | null) ?? null
}

const hub = (row: RingRow | null): boolean => Boolean(row) && (row!.ring === RINGS.engaged || row!.follows === 1)

function spread(handle: Database, platform: string, userId: string, atMs: number | null, seq: number): void {
  const talkers = handle.query('SELECT fromId, firstAtMs FROM networkTalks WHERE platform = ? AND toId = ?').all(platform, userId) as { fromId: string; firstAtMs: number | null }[]
  for (const t of talkers) promote(handle, platform, t.fromId, RINGS.talksTo, TALKS_TO, later(t.firstAtMs, atMs), seq, userId)
}

const later = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b))

const earlier = (a: number | null, b: number | null): boolean => a !== null && (b === null || a < b)

function promote(handle: Database, platform: string, userId: string, ring: number, reason: string, atMs: number | null, seq: number, via: string | null = null, follows = false): void {
  const held = ringOf(handle, platform, userId)
  const wasHub = hub(held)
  if (!held) {
    handle.query('INSERT INTO networkRings (platform, userId, ring, reason, sinceMs, follows, via, seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(platform, userId, ring, reason, atMs, follows ? 1 : 0, via, seq)
  } else {
    const closer = ring < held.ring || (ring === held.ring && earlier(atMs, held.sinceMs))
    if (closer) handle.query('UPDATE networkRings SET ring = ?, reason = ?, sinceMs = ?, via = ?, seq = ? WHERE platform = ? AND userId = ?').run(ring, reason, atMs, via, seq, platform, userId)
    if (follows && held.follows !== 1) handle.query('UPDATE networkRings SET follows = 1, seq = ? WHERE platform = ? AND userId = ?').run(seq, platform, userId)
  }
  if (!wasHub && (ring === RINGS.engaged || follows)) spread(handle, platform, userId, atMs, seq)
}

function talk(handle: Database, platform: string, fromId: string, toId: string, atMs: number | null, seq: number): void {
  if (fromId === toId) return
  handle.query('INSERT INTO networkTalks (platform, fromId, toId, times, firstAtMs) VALUES (?, ?, ?, 1, ?) ON CONFLICT(platform, fromId, toId) DO UPDATE SET times = times + 1, firstAtMs = CASE WHEN excluded.firstAtMs IS NOT NULL AND (networkTalks.firstAtMs IS NULL OR excluded.firstAtMs < networkTalks.firstAtMs) THEN excluded.firstAtMs ELSE networkTalks.firstAtMs END').run(platform, fromId, toId, atMs)
  const to = ringOf(handle, platform, toId)
  if (hub(to)) promote(handle, platform, fromId, RINGS.talksTo, TALKS_TO, later(atMs, to!.sinceMs), seq, toId)
}

function knownId(handle: Database, platform: string, userId: string): boolean {
  return Boolean(handle.query('SELECT 1 FROM identities WHERE platform = ? AND userId = ?').get(platform, userId))
}

function idOfHandle(handle: Database, platform: string, name: string): string | null {
  const alias = handle.query('SELECT userId FROM handleAliases WHERE platform = ? AND handle = ? ORDER BY lastSeenAt DESC LIMIT 1').get(platform, name) as { userId: string } | null
  if (alias) return alias.userId
  const row = handle.query('SELECT userId FROM identities WHERE platform = ? AND handle = ? COLLATE NOCASE LIMIT 1').get(platform, name) as { userId: string } | null
  return row?.userId ?? null
}

export function ringsFromInteraction(handle: Database, facts: InteractionFacts, seq: number, owners: Owners = ownersOf(handle, facts.platform)): void {
  if (!someone(owners, facts.userId)) return
  if (FOLLOW_KINDS.includes(facts.kind)) promote(handle, facts.platform, facts.userId, RINGS.follows, facts.kind, facts.atMs, seq, null, true)
  else if (ENGAGE_KINDS.includes(facts.kind)) promote(handle, facts.platform, facts.userId, RINGS.engaged, facts.kind, facts.atMs, seq)
}

export function ringsFromMessage(handle: Database, facts: MessageFacts, seq: number, owners: Owners = ownersOf(handle, facts.platform)): void {
  if (!someone(owners, facts.userId)) return
  const { platform, userId, atMs } = facts
  if (facts.chatKind === 'dm') promote(handle, platform, userId, RINGS.engaged, 'dm', atMs, seq)
  if (facts.replyTo) {
    if (facts.replyTo.fromOwner || owners.ids.has(facts.replyTo.userId)) promote(handle, platform, userId, RINGS.engaged, 'reply', atMs, seq)
    else if (someone(owners, facts.replyTo.userId)) talk(handle, platform, userId, facts.replyTo.userId, atMs, seq)
  }
  if (!facts.text.includes('@')) return
  const { ids, handles } = pointedAt(facts.text)
  const named = new Set<string>()
  let toOwner = false
  for (const id of ids) {
    if (owners.ids.has(id)) toOwner = true
    else if (knownId(handle, platform, id)) named.add(id)
  }
  for (const h of handles) {
    if (owners.handles.has(h)) toOwner = true
    else {
      const id = idOfHandle(handle, platform, h)
      if (id && owners.ids.has(id)) toOwner = true
      else if (id) named.add(id)
    }
  }
  if (toOwner) promote(handle, platform, userId, RINGS.engaged, 'mention', atMs, seq)
  for (const id of named) if (someone(owners, id)) talk(handle, platform, userId, id, atMs, seq)
}

export function markRingsThrough(handle: Database, seq: number, atMs: number | null): void {
  handle.query('UPDATE networkRingState SET throughSeq = MAX(throughSeq, ?), lastAtMs = COALESCE(?, lastAtMs) WHERE id = 1').run(seq, atMs)
}

export function rebuildRingsIn(handle: Database, now: Date = new Date()): RingState {
  const started = performance.now()
  const throughSeq = (handle.query('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
  const owners = new Map<string, Owners>()
  const ownersFor = (platform: string): Owners => {
    if (!owners.has(platform)) owners.set(platform, ownersOf(handle, platform))
    return owners.get(platform)!
  }
  handle.exec('DELETE FROM networkRings')
  handle.exec('DELETE FROM networkTalks')
  const interactions = handle.query('SELECT platform, actorUserId AS userId, kind, MIN(atMs) AS atMs FROM interactions GROUP BY platform, actorUserId, kind').all() as InteractionFacts[]
  for (const i of interactions) ringsFromInteraction(handle, i, throughSeq, ownersFor(i.platform))
  const messages = handle.query("SELECT m.senderPlatform AS platform, m.senderUserId AS userId, m.sentAtMs AS atMs, c.kind AS chatKind, m.text AS text, t.senderUserId AS toId, t.fromOwner AS toOwner FROM messages m JOIN chats c ON c.chatId = m.chatId LEFT JOIN messages t ON t.messageKey = m.replyToKey WHERE m.fromOwner = 0 AND (c.kind = 'dm' OR t.messageKey IS NOT NULL OR m.text LIKE '%@%') ORDER BY m.seq").all() as { platform: string; userId: string; atMs: number | null; chatKind: string; text: string; toId: string | null; toOwner: number | null }[]
  for (const m of messages) ringsFromMessage(handle, { platform: m.platform, userId: m.userId, atMs: m.atMs, chatKind: m.chatKind, text: m.text ?? '', replyTo: m.toId === null ? null : { userId: m.toId, fromOwner: m.toOwner === 1 } }, throughSeq, ownersFor(m.platform))
  const lastAtMs = (handle.query('SELECT receivedAtMs AS at FROM events WHERE seq = ?').get(throughSeq) as { at: number | null } | null)?.at ?? null
  const state: RingState = { throughSeq, lastAtMs, builtAt: now.toISOString(), builtMs: Math.round(performance.now() - started) }
  handle.query('INSERT INTO networkRingState (id, throughSeq, lastAtMs, builtAt, builtMs) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET throughSeq = excluded.throughSeq, lastAtMs = excluded.lastAtMs, builtAt = excluded.builtAt, builtMs = excluded.builtMs').run(state.throughSeq, state.lastAtMs, state.builtAt, state.builtMs)
  return state
}

export function moveRings(handle: Database, platform: string, fromId: string, toId: string): void {
  if (!ringState(handle)) return
  const from = ringOf(handle, platform, fromId)
  if (from) {
    const to = ringOf(handle, platform, toId)
    if (!to) handle.query('UPDATE networkRings SET userId = ? WHERE platform = ? AND userId = ?').run(toId, platform, fromId)
    else {
      const closer = from.ring < to.ring || (from.ring === to.ring && earlier(from.sinceMs, to.sinceMs))
      if (closer) handle.query('UPDATE networkRings SET ring = ?, reason = ?, sinceMs = ?, via = ? WHERE platform = ? AND userId = ?').run(from.ring, from.reason, from.sinceMs, from.via, platform, toId)
      if (from.follows) handle.query('UPDATE networkRings SET follows = 1 WHERE platform = ? AND userId = ?').run(platform, toId)
      handle.query('DELETE FROM networkRings WHERE platform = ? AND userId = ?').run(platform, fromId)
    }
  }
  handle.query('UPDATE OR IGNORE networkTalks SET fromId = ? WHERE platform = ? AND fromId = ?').run(toId, platform, fromId)
  handle.query('UPDATE OR IGNORE networkTalks SET toId = ? WHERE platform = ? AND toId = ?').run(toId, platform, fromId)
  handle.query('DELETE FROM networkTalks WHERE platform = ? AND (fromId = ? OR toId = ?)').run(platform, fromId, fromId)
}

const msAt = (at: string | null | undefined): number | null => {
  const ms = at ? Date.parse(at) : NaN
  return Number.isFinite(ms) ? ms : null
}

export function ringsFromEvent(handle: Database, platform: string, rows: Pick<TypedRows, 'chat' | 'message' | 'interaction'>, seq: number, atMs: number | null): boolean {
  if (!ringState(handle)) return false
  try {
    const owners = ownersOf(handle, platform)
    const i = rows.interaction
    if (i) ringsFromInteraction(handle, { platform, userId: i.actorUserId, kind: i.kind, atMs: msAt(i.at) ?? atMs }, seq, owners)
    const m = rows.message
    if (m && !m.fromOwner) {
      const chatKind = (handle.query('SELECT kind FROM chats WHERE chatId = ?').get(m.chatId) as { kind: string } | null)?.kind ?? rows.chat?.kind ?? null
      const target = m.replyToKey ? (handle.query('SELECT senderUserId, fromOwner FROM messages WHERE messageKey = ?').get(m.replyToKey) as { senderUserId: string; fromOwner: number } | null) : null
      ringsFromMessage(handle, { platform, userId: m.senderUserId, atMs: m.sentAtMs ?? atMs, chatKind, text: m.text ?? '', replyTo: target ? { userId: target.senderUserId, fromOwner: target.fromOwner === 1 } : null }, seq, owners)
    }
    markRingsThrough(handle, seq, atMs)
    return true
  } catch {
    return false
  }
}
