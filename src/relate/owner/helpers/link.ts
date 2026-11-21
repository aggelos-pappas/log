import type { Database } from 'bun:sqlite'
import { OWNER_READ_MS } from '../types'
import type { OwnerReply } from '../types'
import { ownerAlive, ownerRowOf } from './fence'

export async function ownerRequest<T>(handle: Database, route: string, body: unknown = {}, timeoutMs: number = OWNER_READ_MS, now: number = Date.now()): Promise<OwnerReply<T> | null> {
  const row = ownerRowOf(handle)
  if (!ownerAlive(row, now) || row.status !== 'streaming' || !row.port || !row.token) return null
  try {
    const answer = await fetch(`http://127.0.0.1:${row.port}/${route}`, { method: 'POST', headers: { authorization: `Bearer ${row.token}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) })
    if (answer.status === 401 || answer.status === 404) return null
    return (await answer.json()) as OwnerReply<T>
  } catch {
    return null
  }
}
