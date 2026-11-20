import { db, inWrite } from '../store/client'
import { TYPING_CHECK_MS, TYPING_HOLD_MS, TYPING_LASTS_MS } from './types'
import type { TypingRef, TypingWait } from './types'

export function recordTyping(ref: TypingRef, userId: string, now: Date = new Date()): void {
  inWrite(db(), (handle) => {
    handle.prepare('INSERT INTO typing (platform, account, conversationId, userId, startedAt, untilAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(platform, account, conversationId, userId) DO UPDATE SET untilAt = excluded.untilAt').run(ref.platform, ref.account, ref.conversationId, userId, now.toISOString(), new Date(now.getTime() + TYPING_LASTS_MS).toISOString())
  })
}

export function clearTyping(ref: TypingRef, userId: string): void {
  inWrite(db(), (handle) => {
    handle.prepare('DELETE FROM typing WHERE platform = ? AND account = ? AND conversationId = ? AND userId = ?').run(ref.platform, ref.account, ref.conversationId, userId)
  })
}

export function typingNow(ref: TypingRef, now: Date = new Date()): string[] {
  const rows = db().prepare('SELECT userId FROM typing WHERE platform = ? AND account = ? AND conversationId = ? AND untilAt > ?').all(ref.platform, ref.account, ref.conversationId, now.toISOString()) as { userId: string }[]
  return rows.map((r) => r.userId)
}

export interface TypingDeps {
  typing: () => string[]
  wrote: () => boolean
  wait: (ms: number) => Promise<void>
}

export async function waitOutTyping(deps: TypingDeps, holdMs = TYPING_HOLD_MS, stepMs = TYPING_CHECK_MS): Promise<TypingWait> {
  if (!deps.typing().length) return 'clear'
  let waited = 0
  while (deps.typing().length) {
    if (deps.wrote()) return 'wrote'
    if (waited >= holdMs) return 'stillTyping'
    await deps.wait(stepMs)
    waited += stepMs
  }
  return deps.wrote() ? 'wrote' : 'clear'
}
