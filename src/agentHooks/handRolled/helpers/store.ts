import type { Database } from 'bun:sqlite'
import { getState, putState } from '../../../storage/state/index'
import { defaultDbPath, openDatabase } from '../../../storage/schema/index'
import { HAND_ROLLED_SCOPE } from '../types'
import type { HandRolledRecord, HandRolledVerdict } from '../types'

export function handRolledKey(verdict: Pick<HandRolledVerdict, 'kinds' | 'target'>): string {
  return `${verdict.kinds.join('+')} ${verdict.target}`
}

export function recordHandRolled(verdict: HandRolledVerdict, now: number = Date.now(), handle: Database = openDatabase(defaultDbPath())): number {
  if (!verdict.handRolled) return 0
  const key = handRolledKey(verdict)
  const held = getState<HandRolledRecord>(HAND_ROLLED_SCOPE, key, {}, handle)?.body
  const record: HandRolledRecord = {
    kinds: verdict.kinds,
    target: verdict.target,
    targets: [...new Set([...(held?.targets ?? []), ...verdict.targets])],
    tools: [...new Set([...(held?.tools ?? []), verdict.tool])],
    count: (held?.count ?? 0) + 1,
    firstAt: held?.firstAt ?? now,
    lastAt: now,
    why: verdict.why.slice(0, 400),
    sample: verdict.sample,
  }
  putState(HAND_ROLLED_SCOPE, key, record, now, handle)
  return record.count
}

export function listHandRolled(handle: Database = openDatabase(defaultDbPath())): HandRolledRecord[] {
  const rows = handle.prepare('SELECT body FROM state WHERE scope = ?').all(HAND_ROLLED_SCOPE) as { body: string }[]
  const out: HandRolledRecord[] = []
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.body) as HandRolledRecord)
    } catch {}
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
}
