import { inboxTextWithVoiceNotes } from '../../media/voiceNotes/index'
import { claimContext } from '../claims/index'
import { chatMessages } from '../dbRead/index'
import type { DbMessage } from '../dbRead/types'
import { inboxContext, localTime, storedInboxContext, takeAlerts, takePending, twitterAccounts } from '../watch/index'
import type { InboxMessage } from '../watch/types'
import type { ChatRead, PendingRead } from './types'

export const ONE_PROCESS_LINE = '>>> ONE PROCESS PER ACCOUNT, NEVER TWO (rule 105): a second watcher tried to start and was refused. Every session shares the one watcher per account through the inbox; another is never started. The owner is told now.'

export const READER_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

export const CONVERSATION_LINES = 12

function chatKeyOf(m: InboxMessage): string {
  return `${m.platform}\u0000${m.account}\u0000${m.conversationId}`
}

function safeRead(read: ChatRead, m: InboxMessage): DbMessage[] {
  try {
    return read(m.platform, m.account, m.conversationId, CONVERSATION_LINES)
  } catch {
    return []
  }
}

function rowText(r: DbMessage): string {
  const text = r.text || (r.attachments?.length ? `[${r.attachments.map((a) => a.name).join(', ')}]` : '(no text)')
  return text.replace(/\s+/g, ' ').slice(0, 240)
}

export function againstTheDb(messages: readonly InboxMessage[], read: ChatRead = chatMessages): { fresh: InboxMessage[]; behind: InboxMessage[]; conversations: string[] } {
  const chats = new Map<string, InboxMessage[]>()
  for (const m of messages) chats.set(chatKeyOf(m), [...(chats.get(chatKeyOf(m)) ?? []), m])
  const fresh: InboxMessage[] = []
  const behind: InboxMessage[] = []
  const conversations: string[] = []
  for (const group of chats.values()) {
    const rows = safeRead(read, group[0])
    const lastOwn = [...rows].reverse().find((r) => r.fromMe)
    const ownMs = lastOwn ? Date.parse(lastOwn.at) : NaN
    const isBehind = (m: InboxMessage) => Number.isFinite(ownMs) && Date.parse(m.at) < ownMs
    const live = group.filter((m) => !isBehind(m))
    behind.push(...group.filter(isBehind))
    fresh.push(...live)
    if (!live.length || !rows.length) continue
    const { with: who, platform, account, conversationId } = group[0]
    conversations.push([
      `>>> THE CONVERSATION WITH ${who} NOW (${platform} ${account}, chat ${conversationId}), read from the .db as this turn starts, newest last. Answer this, not the single lines above: everything they sent since the owner last wrote is the context.`,
      ...rows.map((r) => `  ${localTime(r.at)} ${r.fromMe ? 'the owner' : r.from}: ${rowText(r)}`),
    ].join('\n'))
  }
  return { fresh, behind, conversations }
}

export function behindLine(behind: readonly InboxMessage[]): string | null {
  if (!behind.length) return null
  const who = [...new Set(behind.map((m) => `${m.with} (${m.platform}, chat ${m.conversationId})`))].join(', ')
  return `>>> ALREADY BEHIND THE OWNER'S LAST MESSAGE (${behind.length}): ${who}. They landed late and the owner wrote in that chat after them, so there is nothing to answer and nothing to report one by one.`
}

export function readPending(reader: string, options: { stored?: boolean; read?: ChatRead } = {}): PendingRead {
  const alerts = takeAlerts(reader)
  const messages = takePending(reader).map((m) => ({ ...m, text: inboxTextWithVoiceNotes(m) }))
  const { fresh, behind, conversations } = againstTheDb(messages, options.read)
  const loud = alerts.length ? [ONE_PROCESS_LINE, ...alerts].join('\n') : ''
  const text = [loud, inboxContext(fresh), ...conversations, behindLine(behind), claimContext(fresh), options.stored ? storedInboxContext(twitterAccounts()) : null].filter(Boolean).join('\n\n')
  return { reader, messages, alerts, text: text || null }
}
