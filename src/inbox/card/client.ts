import type { Database } from 'bun:sqlite'
import { NOT_SAID, REACTION } from '../lastWord/types'
import { ANSWER_OWED_MS, CARD_LAST, CARD_LINE_CHARS, CARD_OWNER_SAID, CARD_STARTED_WITH, CARD_WINDOW, OWN_CHAT_MESSAGES } from './types'
import type { CardLine, CardWho, ConversationCard } from './types'

const PAIR = /^(\d+)[-:](\d+)$/
const BARE_ID = /^@?\d{6,}$/
const ASKS = /\?|^(?:and |so |but |also )?(?:what|whats|how|hows|is|are|was|were|do|does|did|can|could|would|will|when|where|why|who|any|have|has)\b/i

interface ChatRow {
  chatId: string
  conversationId: string
  kind: string
  name: string | null
}

interface MessageRow {
  seq: number
  label: string | null
  fromOwner: number
  at: string
  text: string
  files: string | null
}

const personKeyOf = (conversationId: string): string => {
  const pair = conversationId.match(PAIR)
  return pair ? [pair[1], pair[2]].sort().join('-') : conversationId
}

const partiesOf = (conversationId: string): string[] => conversationId.match(PAIR)?.slice(1) ?? []

const said = (text: string): string => text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const isSaid = (text: string, files: string | null): boolean => {
  const trimmed = text.trim()
  if (!trimmed) return Boolean(files)
  return !REACTION.test(trimmed) && !NOT_SAID.test(trimmed)
}

function chatsFor(on: Database, platform: string, account: string, who: CardWho): ChatRow[] {
  const chats = on.prepare('SELECT chatId, conversationId, kind, name FROM chats WHERE platform = ? AND account = ?').all(platform, account) as ChatRow[]
  if (who.conversationId) {
    const key = personKeyOf(who.conversationId)
    return chats.filter((c) => personKeyOf(c.conversationId) === key)
  }
  const userIds = new Set([who.userId].filter((id): id is string => Boolean(id)))
  const handle = who.handle?.replace(/^@/, '').toLowerCase()
  if (handle) for (const row of on.prepare('SELECT userId FROM identities WHERE platform = ? AND lower(handle) = ?').all(platform, handle) as { userId: string }[]) userIds.add(row.userId)
  if (!userIds.size) return []
  const byPair = chats.filter((c) => c.kind === 'dm' && partiesOf(c.conversationId).some((id) => userIds.has(id)))
  if (byPair.length) return byPair
  const ids = [...userIds]
  const spoken = new Set((on.prepare(`SELECT DISTINCT m.chatId FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE c.platform = ? AND c.account = ? AND c.kind = 'dm' AND m.senderUserId IN (${ids.map(() => '?').join(', ')})`).all(platform, account, ...ids) as { chatId: string }[]).map((r) => r.chatId))
  return chats.filter((c) => spoken.has(c.chatId))
}

const keyOf = (chats: readonly ChatRow[]): string => chats.map((c) => c.chatId).sort().join('|')

function linesOf(rows: readonly MessageRow[]): CardLine[] {
  const firstSide = new Map<string, boolean>()
  const seen = new Set<string>()
  const lines: CardLine[] = []
  for (const row of rows) {
    if (!isSaid(row.text, row.files)) continue
    const fromOwner = row.fromOwner === 1
    const key = said(row.text)
    if (key.length >= 12) {
      if (firstSide.has(key) && firstSide.get(key) !== fromOwner) continue
      if (!firstSide.has(key)) firstSide.set(key, fromOwner)
      if (seen.has(`${fromOwner}:${key}`)) continue
      seen.add(`${fromOwner}:${key}`)
    }
    const label = String(row.label ?? '').replace(/^@/, '')
    const text = row.text.trim() || `(${row.files})`
    lines.push({ from: fromOwner ? 'the owner' : label && !BARE_ID.test(label) ? label : 'them', fromOwner, text: text.length > CARD_LINE_CHARS ? `${text.slice(0, CARD_LINE_CHARS)}…` : text, at: row.at })
  }
  return lines
}

const MESSAGE_COLUMNS = `m.seq, COALESCE(i.handle, m.senderLabel) AS label, m.fromOwner, m.sentAt AS at, m.text,
  (SELECT group_concat(a.kind, ', ') FROM attachments a WHERE a.messageKey = m.messageKey) AS files
FROM messages m LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId`

export function buildCard(on: Database, platform: string, account: string, chats: readonly ChatRow[], now: Date = new Date()): ConversationCard {
  const ids = chats.map((c) => c.chatId)
  const marks = ids.map(() => '?').join(', ')
  const totals = on.prepare(`SELECT COUNT(*) AS messages, COALESCE(SUM(fromOwner), 0) AS fromOwner, MIN(sentAt) AS firstAt, MAX(sentAt) AS lastAt, COALESCE(MAX(seq), 0) AS throughSeq FROM messages WHERE chatId IN (${marks})`).get(...ids) as { messages: number; fromOwner: number; firstAt: string | null; lastAt: string | null; throughSeq: number }
  const recent = (on.prepare(`SELECT ${MESSAGE_COLUMNS} WHERE m.chatId IN (${marks}) ORDER BY m.sentAtMs DESC, m.seq DESC LIMIT ?`).all(...ids, CARD_WINDOW) as MessageRow[]).reverse()
  const first = on.prepare(`SELECT ${MESSAGE_COLUMNS} WHERE m.chatId IN (${marks}) ORDER BY m.sentAtMs ASC, m.seq ASC LIMIT ?`).all(...ids, CARD_STARTED_WITH * 4) as MessageRow[]
  const lines = linesOf(recent)
  const lastOwner = lines.map((l) => l.fromOwner).lastIndexOf(true)
  const lastTheirs = lines.map((l) => l.fromOwner).lastIndexOf(false)
  const tail = lines.at(-1)
  const waitingOn = !tail ? null : tail.fromOwner ? 'them' : 'owner'
  const named = chats.find((c) => c.name)?.name ?? null
  const theirName = [...lines].reverse().find((l) => !l.fromOwner && l.from !== 'them')?.from ?? null
  return {
    key: keyOf(chats),
    platform,
    account,
    kind: chats[0]?.kind ?? 'dm',
    with: named ?? theirName ?? 'someone not named yet',
    conversationIds: chats.map((c) => c.conversationId),
    messages: totals.messages,
    fromOwner: totals.fromOwner,
    firstAt: totals.firstAt,
    lastAt: totals.lastAt,
    waitingOn,
    startedWith: linesOf(first).slice(0, CARD_STARTED_WITH),
    theyAskedOpen: waitingOn === 'owner' ? lines.slice(lastOwner + 1).filter((l) => !l.fromOwner) : [],
    ownerAskedOpen: waitingOn === 'them' ? lines.slice(lastTheirs + 1).filter((l) => l.fromOwner && ASKS.test(l.text)) : [],
    ownerSaid: lines.filter((l) => l.fromOwner).slice(-CARD_OWNER_SAID),
    last: lines.slice(-CARD_LAST),
    throughSeq: totals.throughSeq,
    builtAt: now.toISOString(),
  }
}

function saveCard(on: Database, card: ConversationCard): void {
  on.prepare('INSERT OR REPLACE INTO conversationCards (key, platform, account, throughSeq, card, builtAt) VALUES (?, ?, ?, ?, ?, ?)').run(card.key, card.platform, card.account, card.throughSeq, JSON.stringify(card), card.builtAt)
}

function throughSeqOf(on: Database, chats: readonly ChatRow[]): number {
  const ids = chats.map((c) => c.chatId)
  return (on.prepare(`SELECT COALESCE(MAX(seq), 0) AS seq FROM messages WHERE chatId IN (${ids.map(() => '?').join(', ')})`).get(...ids) as { seq: number }).seq
}

export function cardFor(on: Database, platform: string, account: string, who: CardWho, now: Date = new Date()): ConversationCard | null {
  const chats = chatsFor(on, platform, account, who)
  if (!chats.length) return null
  const stored = on.prepare('SELECT throughSeq, card FROM conversationCards WHERE key = ?').get(keyOf(chats)) as { throughSeq: number; card: string } | null
  if (stored && stored.throughSeq === throughSeqOf(on, chats)) return JSON.parse(stored.card) as ConversationCard
  const card = buildCard(on, platform, account, chats, now)
  saveCard(on, card)
  return card
}

export function refreshWorkedCards(on: Database, platform: string, account: string, conversationId: string, now: Date = new Date()): number {
  const chats = chatsFor(on, platform, account, { conversationId })
  if (!chats.length) return 0
  const kept = on.prepare('SELECT key FROM conversationCards WHERE platform = ? AND account = ?').all(platform, account) as { key: string }[]
  const ours = new Set(chats.map((c) => c.chatId))
  const worked = kept.some((k) => k.key.split('|').some((id) => ours.has(id)))
  const claimed = Boolean(on.prepare('SELECT 1 FROM claims WHERE platform = ? AND account = ? AND conversationId = ? AND expiresAt > ?').get(platform, account, conversationId, now.toISOString()))
  if (!worked && !claimed) return 0
  saveCard(on, buildCard(on, platform, account, chats, now))
  return 1
}

export function scopedToThisChat(card: ConversationCard | null): boolean {
  return Boolean(card && card.fromOwner >= OWN_CHAT_MESSAGES)
}

const lineOf = (l: CardLine): string => `  ${l.from}: ${l.text.replace(/\n/g, ' / ')}`

export function renderCard(card: ConversationCard): string {
  const day = (at: string | null) => (at ? at.slice(0, 10) : '-')
  const waiting = card.waitingOn === 'owner' ? 'they wrote last, so it is the owner to answer' : card.waitingOn === 'them' ? 'the owner wrote last, so it is waiting on them' : 'nothing said yet'
  return [
    `this conversation: ${card.with} (${card.platform} ${card.kind}), ${card.messages} messages from ${day(card.firstAt)} to ${day(card.lastAt)}, ${card.fromOwner} of them the owner's; ${waiting}`,
    ...(card.startedWith.length ? ['how it started:', ...card.startedWith.map(lineOf)] : []),
    ...(card.theyAskedOpen.length ? ['what they said that the owner hasn\'t answered yet (answer this):', ...card.theyAskedOpen.map(lineOf)] : []),
    ...(card.ownerAskedOpen.length ? ['what the owner already asked that they haven\'t answered (never ask it again):', ...card.ownerAskedOpen.map(lineOf)] : []),
    ...(card.ownerSaid.length ? ['what the owner already said here, latest last (never repeat it):', ...card.ownerSaid.map(lineOf)] : []),
    ...(card.last.length ? ['the last messages:', ...card.last.map(lineOf)] : []),
  ].join('\n')
}

export function answerOwed(card: Pick<ConversationCard, 'waitingOn' | 'last'>, now: Date = new Date()): boolean {
  if (card.waitingOn !== 'owner') return false
  const theirs = [...card.last].reverse().find((l) => !l.fromOwner)
  return Boolean(theirs && now.getTime() - Date.parse(theirs.at) <= ANSWER_OWED_MS)
}
