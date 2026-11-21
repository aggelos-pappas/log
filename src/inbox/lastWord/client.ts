import type { Database } from 'bun:sqlite'
import { db, handleOfIdentity, isBareId, namedLabel, UNNAMED } from '../store/index'
import { placeNameOf, serverKindsSql } from '../../storage/platform/index'
import { MIN_MIRROR_CHARS, NOT_SAID, REACTION, RECENT_PER_CHAT } from './types'
import type { LastWord, LastWordMessage, LastWordQuery, PersonChat } from './types'

import { personKeyOf, xPartiesOf } from '../../twitter/dm/person/client'

export { personKeyOf }

const said = (text: string): string => text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const isReaction = (m: LastWordMessage): boolean => REACTION.test(m.text.trim())

const isSaid = (m: LastWordMessage): boolean => !isReaction(m) && !NOT_SAID.test(m.text.trim())

const inOrder = (a: LastWordMessage, b: LastWordMessage): number => a.ms - b.ms || a.seq - b.seq

export function withoutMirrors(messages: readonly LastWordMessage[]): LastWordMessage[] {
  const sorted = [...messages].sort(inOrder)
  const firstSide = new Map<string, boolean>()
  for (const m of sorted) {
    const key = said(m.text)
    if (isSaid(m) && key.length >= MIN_MIRROR_CHARS && !firstSide.has(key)) firstSide.set(key, m.fromOwner)
  }
  return sorted.filter((m) => {
    const key = said(m.text)
    return !(key.length >= MIN_MIRROR_CHARS && firstSide.has(key) && firstSide.get(key) !== m.fromOwner)
  })
}

export function lastWordOfMessages(chat: { platform: string; account: string; kind: LastWord['kind']; with: string; conversationIds: string[]; place?: string }, messages: readonly LastWordMessage[]): LastWord | null {
  const kept = withoutMirrors(messages)
  const last = kept.filter(isSaid).at(-1)
  if (!last) return null
  const after = kept.filter((m) => isReaction(m) && inOrder(m, last) > 0)
  const theirReaction = last.fromOwner ? after.filter((m) => !m.fromOwner).at(-1) : undefined
  const text = last.text.trim() || (last.files ? `(${last.files} file${last.files === 1 ? '' : 's'})` : '(a voice note, image or sticker)')
  return {
    ...chat,
    personKey: personKeyOf(chat.conversationIds[0] ?? ''),
    lastAt: theirReaction?.at ?? last.at,
    lastFromMe: theirReaction ? false : last.fromOwner,
    lastText: theirReaction ? theirReaction.text.trim() : text,
    theyReacted: theirReaction ? (theirReaction.text.trim().match(REACTION)?.[1] ?? '') : null,
    youReactedOnly: !last.fromOwner && after.some((m) => m.fromOwner),
    waiting: !last.fromOwner,
    followUp: Boolean(theirReaction),
  }
}

interface Row {
  platform: string
  account: string
  kind: string
  name: string | null
  conversationId: string
  seq: number
  ms: number
  at: string
  fromOwner: number
  senderUserId: string
  senderLabel: string | null
  text: string
  files: number
}

const ONE_CHAT_SQL = `
SELECT c.platform, c.account, c.kind, c.name, c.conversationId, m.seq, m.sentAtMs AS ms, m.sentAt AS at, m.fromOwner, m.senderUserId,
  COALESCE(i.handle, m.senderLabel) AS senderLabel, m.text,
  (SELECT COUNT(*) FROM attachments a WHERE a.messageKey = m.messageKey) AS files
FROM chats c
JOIN messages m ON m.seq IN (SELECT seq FROM messages WHERE chatId = c.chatId ORDER BY sentAtMs DESC, seq DESC LIMIT ?3)
LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId
WHERE c.kind IN ('dm', 'group') AND c.platform = ?1 AND c.account = ?2 AND c.conversationId IN (SELECT value FROM json_each(?4))`

const RECENT_SQL = `
SELECT c.platform, c.account, c.kind, c.name, c.conversationId, m.seq, m.sentAtMs AS ms, m.sentAt AS at, m.fromOwner, m.senderUserId,
  COALESCE(i.handle, m.senderLabel) AS senderLabel, m.text,
  (SELECT COUNT(*) FROM attachments a WHERE a.messageKey = m.messageKey) AS files
FROM (
  SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.chatId ORDER BY m.sentAtMs DESC, m.seq DESC) AS rn
  FROM messages m JOIN chats c ON c.chatId = m.chatId
  WHERE c.kind IN ('dm', 'group') AND (?1 IS NULL OR c.platform = ?1) AND (?2 IS NULL OR c.account = ?2)
) m
JOIN chats c ON c.chatId = m.chatId
LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId
WHERE m.rn <= ?3`

type Namer = (label: string | null, userId: string) => string

function namerFor(platform: string, account: string, on: Database, thorough: boolean): Namer {
  const known = new Map<string, string>()
  return (label, userId) => {
    if (!isBareId(label)) return String(label).replace(/^@/, '')
    const id = (userId || label || '').replace(/^@/, '')
    const kept = known.get(id)
    if (kept) return kept
    const name = handleOfIdentity(platform, id, on) ?? (thorough ? namedLabel(platform, account, label, id) : UNNAMED)
    known.set(id, name)
    return name
  }
}

function labelOf(kind: 'dm' | 'group', rows: readonly Row[], name: Namer): string {
  const names = [...new Set(rows.map((r) => r.name).filter((n): n is string => Boolean(n)))]
  if (kind === 'group') {
    if (names[0]) return names[0]
    const people = [...new Set(rows.filter((r) => !r.fromOwner).map((r) => name(r.senderLabel, r.senderUserId)))]
    return people.slice(0, 4).join(', ') || UNNAMED
  }
  const theirs = [...rows].filter((r) => !r.fromOwner).sort((a, b) => b.ms - a.ms || b.seq - a.seq)[0]
  if (theirs) return name(theirs.senderLabel, theirs.senderUserId)
  const mine = new Set(rows.filter((r) => r.fromOwner).map((r) => r.senderUserId))
  const other = rows.flatMap((r) => xPartiesOf(r.conversationId)).find((id) => !mine.has(id))
  return name(names[0] ?? null, other ?? '')
}

export function chatsOf(query: LastWordQuery = {}, on: Database = db(), perChat: number = RECENT_PER_CHAT): PersonChat[] {
  const rows = (query.conversationIds && query.platform && query.account ? on.prepare(ONE_CHAT_SQL).all(query.platform, query.account, perChat, JSON.stringify(query.conversationIds)) : on.prepare(RECENT_SQL).all(query.platform ?? null, query.account ?? null, perChat)) as Row[]
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${r.platform}\u0000${r.account}\u0000${personKeyOf(r.conversationId)}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const namers = new Map<string, { quick: Namer; thorough: Namer }>()
  return [...groups.values()].map((group) => {
    const { platform, account } = group[0]
    const namer = namers.get(`${platform}\u0000${account}`) ?? { quick: namerFor(platform, account, on, false), thorough: namerFor(platform, account, on, true) }
    namers.set(`${platform}\u0000${account}`, namer)
    const others = new Set(group.filter((r) => !r.fromOwner).map((r) => r.senderUserId))
    const kind: 'dm' | 'group' = group.some((r) => r.kind === 'group') || others.size > 1 ? 'group' : 'dm'
    const conversationIds = [...new Set(group.map((r) => r.conversationId))]
    const messages = group.map((r) => ({ conversationId: r.conversationId, seq: r.seq, ms: r.ms, at: r.at, fromOwner: r.fromOwner === 1, senderUserId: r.senderUserId, senderLabel: r.senderLabel, text: r.text ?? '', files: r.files }))
    const quick = labelOf(kind, group, namer.quick)
    return { platform, account, kind, storedAsGroup: group.some((r) => r.kind === 'group'), with: quick, personKey: personKeyOf(group[0].conversationId), conversationIds, messages, named: () => (quick === UNNAMED ? labelOf(kind, group, namer.thorough) : quick) }
  })
}

export function lastWordOf(query: LastWordQuery = {}, on: Database = db()): LastWord[] {
  const words: LastWord[] = []
  for (const chat of chatsOf(query, on)) {
    const word = lastWordOfMessages(chat, chat.messages)
    if (!word) continue
    words.push(word.with === UNNAMED && (word.waiting || word.followUp) ? { ...word, with: chat.named() } : word)
  }
  return words.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt))
}

export function saidOnly(messages: readonly LastWordMessage[]): LastWordMessage[] {
  return withoutMirrors(messages).filter(isSaid)
}

export function waitingOf(words: readonly LastWord[]): { waiting: LastWord[]; followUps: LastWord[] } {
  return { waiting: words.filter((w) => w.waiting), followUps: words.filter((w) => w.followUp) }
}

const channelSql = () => `
SELECT c.platform, c.account, c.kind, c.name, c.conversationId, m.seq, m.sentAtMs AS ms, m.sentAt AS at, m.fromOwner, m.senderUserId,
  COALESCE(i.handle, m.senderLabel) AS senderLabel, m.text,
  (SELECT COUNT(*) FROM attachments a WHERE a.messageKey = m.messageKey) AS files
FROM (
  SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.chatId ORDER BY m.sentAtMs DESC, m.seq DESC) AS rn
  FROM messages m JOIN chats c ON c.chatId = m.chatId
  WHERE c.kind IN (${serverKindsSql()}) AND (?1 IS NULL OR c.platform = ?1) AND (?2 IS NULL OR c.account = ?2)
) m
JOIN chats c ON c.chatId = m.chatId
LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId
WHERE m.rn <= ?3`

export function channelWordsOf(query: LastWordQuery = {}, on: Database = db(), perChat: number = RECENT_PER_CHAT): LastWord[] {
  const rows = on.prepare(channelSql()).all(query.platform ?? null, query.account ?? null, perChat) as Row[]
  const chats = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${r.platform}\u0000${r.account}\u0000${r.conversationId}`
    chats.set(key, [...(chats.get(key) ?? []), r])
  }
  const words: LastWord[] = []
  for (const group of chats.values()) {
    if (!group.some((r) => r.fromOwner === 1)) continue
    const { platform, account, conversationId } = group[0]
    const name = namerFor(platform, account, on, false)
    const messages = group.map((r) => ({ conversationId: r.conversationId, seq: r.seq, ms: r.ms, at: r.at, fromOwner: r.fromOwner === 1, senderUserId: r.senderUserId, senderLabel: r.senderLabel, text: r.text ?? '', files: r.files }))
    const theirs = saidOnly(messages).filter((m) => !m.fromOwner).at(-1)
    const place = placeNameOf(on, platform, account, conversationId) ?? group[0].name ?? conversationId
    const word = lastWordOfMessages({ platform, account, kind: 'channel', with: theirs ? name(theirs.senderLabel, theirs.senderUserId) : UNNAMED, conversationIds: [conversationId], place }, messages)
    if (word) words.push(word)
  }
  return words.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt))
}
