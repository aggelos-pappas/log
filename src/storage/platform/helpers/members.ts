import type { Database } from 'bun:sqlite'
import { extenderOf } from './extenders'

export const GROUP_OTHERS = 2

const OTHERS_SQL = "SELECT COUNT(*) AS n FROM memberships m WHERE m.platform = ?1 AND m.roomId = ?2 AND m.userId NOT LIKE 'self:%' AND m.userId NOT LIKE 'unknown:%' AND m.userId NOT IN (SELECT userId FROM accounts WHERE platform = ?1) AND lower(m.userId) NOT IN (SELECT '@' || lower(ltrim(account, '@')) FROM accounts WHERE platform = ?1 UNION SELECT '@' || lower(ltrim(account, '@')) FROM chats WHERE chatId = ?2)"

export function othersIn(handle: Database, platform: string, chatId: string): number {
  return (handle.prepare(OTHERS_SQL).get(platform, chatId) as { n: number }).n
}

export function groupByMembers(handle: Database, platform: string, chatId: string): boolean {
  if (!extenderOf(platform).kindFromMembers) return false
  const chat = handle.prepare('SELECT kind FROM chats WHERE chatId = ?').get(chatId) as { kind: string } | null
  if (chat?.kind !== 'dm' || othersIn(handle, platform, chatId) < GROUP_OTHERS) return false
  return handle.prepare("UPDATE chats SET kind = 'group' WHERE chatId = ? AND kind = 'dm'").run(chatId).changes > 0
}

export function repairChatGroups(handle: Database): number {
  const rows = handle.prepare("SELECT chatId, platform FROM chats WHERE kind = 'dm'").all() as { chatId: string; platform: string }[]
  let regrouped = 0
  for (const r of rows) if (groupByMembers(handle, r.platform, r.chatId)) regrouped += 1
  return regrouped
}
