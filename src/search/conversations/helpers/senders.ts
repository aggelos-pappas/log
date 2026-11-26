import type { Database } from 'bun:sqlite'
import { chatIdOf } from '../../../storage/platform/helpers/ids'
import type { Chunk } from '../types'

export interface ChunkSender {
  label: string | null
  userId: string
}

export function sendersOf(handle: Database, chunk: Pick<Chunk, 'platform' | 'account' | 'conversationId' | 'messageIds'>): ChunkSender[] {
  if (!chunk.messageIds.length) return []
  const marks = chunk.messageIds.map(() => '?').join(', ')
  try {
    const rows = handle.prepare(`SELECT COALESCE(i.handle, m.senderLabel) AS label, m.senderUserId AS userId FROM messages m LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId WHERE m.chatId = ? AND m.fromOwner = 0 AND (m.platformMessageId IN (${marks}) OR m.messageKey IN (${marks})) ORDER BY m.sentAtMs, m.seq`).all(chatIdOf(chunk.platform, chunk.account, chunk.conversationId), ...chunk.messageIds, ...chunk.messageIds) as { label: string | null; userId: string | null }[]
    const seen = new Map<string, ChunkSender>()
    for (const row of rows) if (row.userId && !row.userId.startsWith('unknown:') && !seen.has(row.userId)) seen.set(row.userId, { label: row.label, userId: row.userId })
    return [...seen.values()]
  } catch {
    return []
  }
}
