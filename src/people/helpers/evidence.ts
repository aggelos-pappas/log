import type { Database } from 'bun:sqlite'
import { CIRCLE_ROOM_MAX, CLAIM_CUE, HANDLE_MIN, MENTION_COMMON, PROFILE_MESSAGES, PROFILE_MIN_CHARS, PROFILE_MIN_MESSAGES, STOP_WORDS } from '../types'
import type { MessageSource } from '../types'

export interface Profile {
  key: string
  messages: number
  stamped: number
  chars: number
  grams: Map<string, number>
  hours: number[]
  topics: Map<string, number>
  chats: Set<string>
  texts: string[]
}

const URL = /https?:\/\/\S+/g

const PLACEHOLDER = /^\s*(?:\([^)]*\)|>\s*\*[^*]+\*|\[[^\]]*\])\s*$/

export function gramsOf(texts: readonly string[], n = 3): Map<string, number> {
  const out = new Map<string, number>()
  for (const raw of texts) {
    const t = ` ${raw.replace(URL, ' ').toLowerCase().replace(/\s+/g, ' ').trim()} `
    for (let i = 0; i + n <= t.length; i++) {
      const g = t.slice(i, i + n)
      out.set(g, (out.get(g) ?? 0) + 1)
    }
  }
  for (const [g, c] of out) out.set(g, 1 + Math.log(c))
  return out
}

export function wordsOf(texts: readonly string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const raw of texts) for (const w of raw.replace(URL, ' ').toLowerCase().match(/[\p{L}][\p{L}\p{N}']{3,}/gu) ?? []) if (!STOP_WORDS.has(w)) out.set(w, (out.get(w) ?? 0) + 1)
  return out
}

export function sparseCosine(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  let dot = 0
  for (const [k, v] of small) dot += v * (big.get(k) ?? 0)
  let na = 0
  let nb = 0
  for (const v of a.values()) na += v * v
  for (const v of b.values()) nb += v * v
  return dot / Math.sqrt(na * nb)
}

export function denseCosine(a: readonly number[] | Float32Array, b: readonly number[] | Float32Array): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * (b[i] ?? 0)
    na += a[i] * a[i]
    nb += (b[i] ?? 0) * (b[i] ?? 0)
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function enoughText(p: Profile | undefined): p is Profile {
  return Boolean(p && p.messages >= PROFILE_MIN_MESSAGES && p.chars >= PROFILE_MIN_CHARS)
}

export function profileOf(handle: Database, platform: string, userId: string, ownerChats: ReadonlySet<string>): Profile {
  const rows = handle.prepare('SELECT chatId, sentAtMs, text FROM messages WHERE senderPlatform = ? AND senderUserId = ? AND fromOwner = 0 ORDER BY sentAtMs DESC LIMIT ?').all(platform, userId, PROFILE_MESSAGES) as { chatId: string; sentAtMs: number | null; text: string }[]
  const said = rows.filter((r) => r.text.replace(URL, '').trim().length > 0 && !PLACEHOLDER.test(r.text))
  const hours = new Array(24).fill(0)
  for (const r of rows) if (r.sentAtMs) hours[new Date(r.sentAtMs).getUTCHours()]++
  const chats = new Set((handle.prepare("SELECT DISTINCT m.chatId FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE m.senderPlatform = ? AND m.senderUserId = ? AND c.kind IN ('dm', 'group')").all(platform, userId) as { chatId: string }[]).map((r) => r.chatId))
  return {
    key: `${platform}:${userId}`,
    messages: said.length,
    stamped: rows.filter((r) => r.sentAtMs).length,
    chars: said.reduce((n, r) => n + r.text.length, 0),
    grams: gramsOf(said.map((r) => r.text)),
    hours,
    topics: wordsOf(said.filter((r) => ownerChats.has(r.chatId)).map((r) => r.text)),
    chats,
    texts: said.map((r) => r.text.replace(/\s+/g, ' ').slice(0, 200)),
  }
}

export interface Mention {
  from: string
  to: string
  claimsOwn: boolean
  source: MessageSource
}

export function mentionsIn(handle: Database, targets: ReadonlyMap<string, readonly { platform: string; key: string }[]>): Mention[] {
  const rows = handle.prepare('SELECT messageKey, chatId, senderPlatform, senderUserId, sentAt, text FROM messages WHERE fromOwner = 0 AND length(text) BETWEEN ? AND 600').all(HANDLE_MIN) as { messageKey: string; chatId: string; senderPlatform: string; senderUserId: string; sentAt: string | null; text: string }[]
  const hits: { row: (typeof rows)[number]; token: string; bare: boolean }[] = []
  const df = new Map<string, number>()
  for (const row of rows) {
    const plain = row.text.replace(URL, ' ').replace(/\S+@\S+\.\S+/g, ' ').toLowerCase()
    const tokens = new Set((plain.match(/[a-z0-9_.]{4,30}/g) ?? []).map((t) => t.replace(/^\.+|\.+$/g, '')))
    const bare = plain.trim().replace(/^@/, '').replace(/[.!]+$/, '')
    for (const token of tokens) {
      if (!targets.has(token)) continue
      df.set(token, (df.get(token) ?? 0) + 1)
      hits.push({ row, token, bare: bare === token })
    }
  }
  const out: Mention[] = []
  for (const { row, token, bare } of hits) {
    const claimsOwn = bare || CLAIM_CUE.test(row.text)
    if (!claimsOwn && (df.get(token) ?? 0) > MENTION_COMMON) continue
    const all = targets.get(token)!
    if (!claimsOwn && all.some((t) => t.platform === row.senderPlatform)) continue
    for (const t of all) {
      if (t.platform === row.senderPlatform) continue
      out.push({ from: `${row.senderPlatform}:${row.senderUserId}`, to: t.key, claimsOwn, source: { messageKey: row.messageKey, chatId: row.chatId, at: row.sentAt, text: row.text.replace(/\s+/g, ' ').slice(0, 160) } })
    }
  }
  return out
}

export function circleOf(handle: Database, platform: string, userId: string, looseOf: (platform: string, userId: string) => string | null, ignore: ReadonlySet<string>): Set<string> | null {
  const rooms = (handle.prepare('SELECT roomId FROM memberships WHERE platform = ? AND userId = ?').all(platform, userId) as { roomId: string }[]).map((r) => r.roomId)
  if (!rooms.length) return null
  const circle = new Set<string>()
  const members = handle.prepare('SELECT userId FROM memberships WHERE platform = ? AND roomId = ? LIMIT ?')
  for (const room of rooms) {
    const list = members.all(platform, room, CIRCLE_ROOM_MAX + 1) as { userId: string }[]
    if (list.length > CIRCLE_ROOM_MAX) continue
    for (const m of list) {
      if (m.userId === userId || ignore.has(`${platform}:${m.userId}`)) continue
      const l = looseOf(platform, m.userId)
      if (l) circle.add(l)
    }
  }
  return circle
}

export function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

export function realName(name: string | null): string[] | null {
  const text = (name ?? '').trim()
  if (!/^[\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){1,3}$/u.test(text)) return null
  return text.toLowerCase().split(/\s+/)
}
