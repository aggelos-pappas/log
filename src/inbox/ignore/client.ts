import { getState, putState } from '../../storage/state/index'
import { db } from '../store/index'
import type { InboxMessage } from '../watch/types'
import type { IgnoreEntry, IgnoreList, ServerOf } from './types'

export function ignoredList(): IgnoreEntry[] {
  return getState<IgnoreList>('inboxIgnore', 'all')?.body.entries ?? []
}

function sameTarget(a: Pick<IgnoreEntry, 'platform' | 'server' | 'chat'>, b: Pick<IgnoreEntry, 'platform' | 'server' | 'chat'>): boolean {
  return a.platform === b.platform && (a.server ?? '') === (b.server ?? '') && (a.chat ?? '') === (b.chat ?? '')
}

export function setIgnored(target: Pick<IgnoreEntry, 'platform' | 'server' | 'chat'>, by: string, undo = false, now: Date = new Date()): IgnoreEntry[] {
  const kept = ignoredList().filter((e) => !sameTarget(e, target))
  const entries = undo ? kept : [...kept, { ...target, by, at: now.toISOString() }]
  putState('inboxIgnore', 'all', { entries } satisfies IgnoreList, now.getTime())
  return entries
}

export const serverOfChat: ServerOf = (platform, account, conversationId) => {
  try {
    const row = db().prepare('SELECT serverId FROM chats WHERE platform = ? AND account = ? AND conversationId = ?').get(platform, account, conversationId) as { serverId: string | null } | null
    return row?.serverId ?? null
  } catch {
    return null
  }
}

export function isIgnored(m: InboxMessage, entries: readonly IgnoreEntry[], serverOf: ServerOf = serverOfChat): boolean {
  const mine = entries.filter((e) => e.platform === m.platform)
  if (!mine.length) return false
  if (mine.some((e) => e.chat && e.chat === m.conversationId)) return true
  const servers = mine.filter((e) => e.server)
  if (!servers.length) return false
  const server = m.serverId ?? serverOf(m.platform, m.account, m.conversationId)
  return !!server && servers.some((e) => e.server === server)
}

export function withoutIgnored(messages: readonly InboxMessage[], entries: readonly IgnoreEntry[] = ignoredList(), serverOf: ServerOf = serverOfChat): InboxMessage[] {
  return entries.length ? messages.filter((m) => !isIgnored(m, entries, serverOf)) : [...messages]
}
