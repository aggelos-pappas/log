import type { Database } from 'bun:sqlite'
import { getState, putState } from '../../storage/state/index'
import { db } from '../store/index'
import { localTime } from '../watch/index'
import { ownItemsAfter, ownLine } from '../../twitter/ownActivity/index'
import type { OwnSeen } from '../../twitter/ownActivity/types'
import { UNREADABLE, HAND_MAX_ROWS, HAND_SETTLE_MS, HAND_SHOWN, HAND_TEXT_CHARS } from './types'
import type { ByHandDeps, ByHandRead, HandSend } from './types'

export const byHandDeps: ByHandDeps = { handle: db, now: () => Date.now() }

export function sentByLogIds(handle: Database, platforms: readonly string[]): Set<string> {
  if (!platforms.length) return new Set()
  const marks = platforms.map(() => '?').join(', ')
  const rows = handle.prepare(`SELECT platform, json_extract(detail, '$.messageId') AS id FROM actions WHERE kind = 'partSent' AND platform IN (${marks}) AND json_valid(detail)`).all(...platforms) as { platform: string; id: string | number | null }[]
  return new Set(rows.filter((r) => r.id !== null && r.id !== '').map((r) => `${r.platform}\u0000${r.id}`))
}

export function sentByLog(ids: ReadonlySet<string>, platform: string, messageId: string | null | undefined): boolean {
  return Boolean(messageId) && ids.has(`${platform}\u0000${messageId}`)
}

export function ownerLabel(ids: ReadonlySet<string>, platform: string, messageId: string | null | undefined): string {
  return sentByLog(ids, platform, messageId) ? 'the owner (sent by log)' : 'the owner (by hand)'
}

function latestOwnerSeq(handle: Database): number {
  const row = handle.prepare('SELECT MAX(seq) AS seq FROM messages').get() as { seq: number | null }
  return row.seq ?? 0
}

export function handSendsAfter(handle: Database, after: number, settledBefore: string): { sends: HandSend[]; through: number } {
  const rows = handle.prepare(`SELECT m.seq, c.platform, c.account, c.conversationId, COALESCE(c.name, c.conversationId) AS who, m.platformMessageId AS messageId, m.senderUserId AS me, m.sentAt AS at, m.text, m.receivedAt FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE m.seq > ? AND m.fromOwner = 1 AND m.source = 'live' ORDER BY m.seq LIMIT ?`).all(after, HAND_MAX_ROWS) as { seq: number; platform: string; account: string; conversationId: string; who: string; messageId: string | null; me: string; at: string; text: string; receivedAt: string }[]
  const settled = rows.filter((r) => r.receivedAt <= settledBefore)
  const firstUnsettled = rows.find((r) => r.receivedAt > settledBefore)
  const through = firstUnsettled ? Math.max(after, firstUnsettled.seq - 1) : (settled.at(-1)?.seq ?? after)
  const handleOf = handle.prepare('SELECT handle FROM identities WHERE platform = ? AND userId = ? AND handle IS NOT NULL LIMIT 1')
  const nameOf = (r: { platform: string; conversationId: string; who: string; me: string }) => {
    if (r.who !== r.conversationId) return r.who
    const other = r.conversationId.split(/[:-]/).find((part) => part && part !== r.me)
    const row = other ? (handleOf.get(r.platform, other) as { handle: string } | null) : null
    return row?.handle ?? r.who
  }
  const ids = sentByLogIds(handle, [...new Set(settled.map((r) => r.platform))])
  const sends = settled
    .filter((r) => r.seq <= through && (r.text ?? '').trim() && !UNREADABLE.test(r.text) && !sentByLog(ids, r.platform, r.messageId))
    .map((r) => ({ seq: r.seq, platform: r.platform, account: r.account, conversationId: r.conversationId, with: nameOf(r), at: r.at, text: r.text }))
  return { sends, through }
}

export function handLines(sends: readonly HandSend[], open: readonly OwnSeen[] = []): string | null {
  if (!sends.length && !open.length) return null
  const shown = sends.slice(-HAND_SHOWN)
  const shownOpen = open.slice(-HAND_SHOWN)
  return [
    `>>> THE OWNER WROTE BY HAND (${sends.length + open.length}), outside log (his phone, the app or the web): log didn't send these, so he is talking to these people himself right now. Read the chat or their posts before sending anything to them, and hold any queued or planned send to these people that this changes (rule 109). Don't repeat what he just said or did.`,
    ...shownOpen.map((o) => `  ${o.platform} ${o.account} in public: ${ownLine(o.item, o.seenAt)}`),
    ...(open.length > shownOpen.length ? [`  (${open.length - shownOpen.length} earlier public ones left out)`] : []),
    ...shown.map((s) => `  ${localTime(s.at)} ${s.platform} ${s.account} to ${s.with} (chat ${s.conversationId}): "${s.text.replace(/\s+/g, ' ').slice(0, HAND_TEXT_CHARS)}"`),
    ...(sends.length > shown.length ? [`  (${sends.length - shown.length} earlier left out)`] : []),
  ].join('\n')
}

export function readByHand(reader: string, deps: ByHandDeps = byHandDeps): ByHandRead {
  const handle = deps.handle()
  const settledBefore = new Date(deps.now() - HAND_SETTLE_MS).toISOString()
  const open = readOwn(reader, handle, deps.now(), settledBefore)
  const held = getState<number>('byHandSeen', reader, {}, handle)
  if (!held) {
    putState('byHandSeen', reader, latestOwnerSeq(handle), deps.now(), handle)
    return { sends: [], public: open, text: handLines([], open) }
  }
  const { sends, through } = handSendsAfter(handle, held.body, settledBefore)
  if (through !== held.body) putState('byHandSeen', reader, through, deps.now(), handle)
  return { sends, public: open, text: handLines(sends, open) }
}

function latestEventSeq(handle: Database): number {
  const row = handle.prepare('SELECT MAX(seq) AS seq FROM events').get() as { seq: number | null }
  return row.seq ?? 0
}

function readOwn(reader: string, handle: Database, now: number, settledBefore: string): OwnSeen[] {
  const held = getState<number>('byHandOwnSeen', reader, {}, handle)
  if (!held) {
    putState('byHandOwnSeen', reader, latestEventSeq(handle), now, handle)
    return []
  }
  const { items, through } = ownItemsAfter(handle, held.body, settledBefore)
  if (through !== held.body) putState('byHandOwnSeen', reader, through, now, handle)
  return items
}
