import { getState, pruneState, putState } from '../../storage/state/index'
import { join } from 'node:path'
import type { Offsets, SessionOffsets } from './types'

export const SHARED_SESSION = 'shared'

export const SESSION_KEYS = ['session_id', 'sessionId', 'sessionID', 'conversation_id', 'conversationId'] as const
const KEEP_MS = 3 * 24 * 3600 * 1000

export function sessionIdOf(raw: string): string {
  try {
    const input = JSON.parse(raw || '{}') as Record<string, unknown>
    const found = SESSION_KEYS.map((key) => input[key]).find((value) => typeof value === 'string' && value.trim())
    const id = typeof found === 'string' ? found : ''
    return id ? id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || SHARED_SESSION : SHARED_SESSION
  } catch {
    return SHARED_SESSION
  }
}

const sessionsDir = (dir: string) => join(dir, '.hookSessions')
const sessionPath = (dir: string, session: string) => join(sessionsDir(dir), `${session}.json`)

const offsetsKey = (dir: string, session: string) => `${dir}|${session}`

export function readSessionOffsets(dir: string, session: string): SessionOffsets {
  const row = getState<Offsets>('hookOffsets', offsetsKey(dir, session), { legacyFile: sessionPath(dir, session) })
  return row ? { offsets: row.body, firstLook: false } : { offsets: {}, firstLook: true }
}

export function writeSessionOffsets(dir: string, session: string, offsets: Offsets, now: number = Date.now()): void {
  putState('hookOffsets', offsetsKey(dir, session), offsets, now)
  pruneState('hookOffsets', `${dir}|`, now - KEEP_MS)
}
