import type { Database } from 'bun:sqlite'
import { hostname } from 'node:os'
import { killTree, ownStartedAt, processAlive, processStartedAt, sameProcess } from '../../../inbox/watch/index'
import { OWNER_ACCOUNT, OWNER_LIVE_STATUSES, OWNER_PLATFORM, OWNER_STALE_CONFIRM_MS, OWNER_STALE_MS } from '../types'
import type { OwnerClaim, OwnerRow } from '../types'

export class GraphOwnerFenced extends Error {
  readonly code = 'graphOwnerFenced'
}

const ROW = 'SELECT pid, generation, heartbeat, status, port, token, startedAt, pidStartedAt, staleSeenAt FROM owners WHERE platform = ? AND account = ?'

export function ownerRowOf(handle: Database): OwnerRow | null {
  return (handle.prepare(ROW).get(OWNER_PLATFORM, OWNER_ACCOUNT) as OwnerRow | null) ?? null
}

export function ownerAlive(row: OwnerRow | null, now: number = Date.now(), staleMs: number = OWNER_STALE_MS): row is OwnerRow {
  return Boolean(row && OWNER_LIVE_STATUSES.includes(row.status) && now - Date.parse(row.heartbeat) < staleMs)
}

function immediate<T>(handle: Database, work: () => T): T {
  handle.exec('BEGIN IMMEDIATE')
  try {
    const out = work()
    handle.exec('COMMIT')
    return out
  } catch (error) {
    try {
      handle.exec('ROLLBACK')
    } catch {}
    throw error
  }
}

type Verdict = { take: true; seen: number | null } | { take: false; holder: number; reason: string } | { wait: true } | { replace: OwnerRow }

export interface ClaimDeps {
  pid?: number
  alive?: (pid: number) => boolean
  startedOf?: (pid: number) => string | null
  kill?: (pid: number) => void
  sleep?: (ms: number) => Promise<void>
  staleMs?: number
  confirmMs?: number
  log?: (line: string) => void
  now?: () => number
}

function take(handle: Database, pid: number, seen: number | null, now: number): OwnerClaim {
  return immediate(handle, () => {
    const row = ownerRowOf(handle)
    if ((row?.generation ?? null) !== seen) return { ok: false as const, holder: row?.pid ?? 0, reason: `another graph owner (pid ${row?.pid}) claimed it first` }
    const generation = (row?.generation ?? 0) + 1
    const stamp = new Date(now).toISOString()
    handle.prepare("INSERT INTO owners (platform, account, pid, hostname, startedAt, heartbeat, status, port, token, subscribers, generation, pidStartedAt, staleSeenAt) VALUES (?, ?, ?, ?, ?, ?, 'starting', 0, '', 0, ?, ?, NULL) ON CONFLICT(platform, account) DO UPDATE SET pid = excluded.pid, hostname = excluded.hostname, startedAt = excluded.startedAt, heartbeat = excluded.heartbeat, status = 'starting', port = 0, token = '', subscribers = 0, generation = excluded.generation, pidStartedAt = excluded.pidStartedAt, staleSeenAt = NULL").run(OWNER_PLATFORM, OWNER_ACCOUNT, pid, hostname(), stamp, stamp, generation, pid === process.pid ? ownStartedAt() : null)
    return { ok: true as const, generation }
  })
}

export async function claimGraphOwner(handle: Database, deps: ClaimDeps = {}): Promise<OwnerClaim> {
  const pid = deps.pid ?? process.pid
  const alive = deps.alive ?? processAlive
  const startedOf = deps.startedOf ?? processStartedAt
  const kill = deps.kill ?? killTree
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)))
  const staleMs = deps.staleMs ?? OWNER_STALE_MS
  const confirmMs = deps.confirmMs ?? OWNER_STALE_CONFIRM_MS
  const clock = deps.now ?? Date.now
  for (;;) {
    const now = clock()
    const verdict = immediate(handle, (): Verdict => {
      const row = ownerRowOf(handle)
      if (!row || row.status === 'stopped' || row.pid === pid || !alive(row.pid)) return { take: true, seen: row?.generation ?? null }
      if (now - Date.parse(row.heartbeat) < staleMs) return { take: false, holder: row.pid, reason: `pid ${row.pid} is already the graph owner for this log.db (generation ${row.generation})` }
      if (!row.staleSeenAt) {
        handle.prepare('UPDATE owners SET staleSeenAt = ? WHERE platform = ? AND account = ? AND pid = ? AND generation = ?').run(new Date(now).toISOString(), OWNER_PLATFORM, OWNER_ACCOUNT, row.pid, row.generation)
        return { wait: true }
      }
      if (now - Date.parse(row.staleSeenAt) < confirmMs) return { wait: true }
      return { replace: row }
    })
    if ('wait' in verdict) {
      deps.log?.(`graph owner: the owner's heartbeat is stale; checking again in ${Math.round(confirmMs / 1000)} s before taking over`)
      await sleep(confirmMs)
      continue
    }
    if ('replace' in verdict) {
      const row = verdict.replace
      if (sameProcess(row.pidStartedAt, startedOf(row.pid))) {
        deps.log?.(`graph owner: pid ${row.pid} sent no heartbeat on two readings ${Math.round(confirmMs / 1000)} s apart, so it is stopped and replaced`)
        kill(row.pid)
      } else deps.log?.(`graph owner: pid ${row.pid} is gone and its pid now belongs to another process, so nothing is killed`)
      return take(handle, pid, row.generation, clock())
    }
    if (verdict.take) return take(handle, pid, verdict.seen, now)
    return { ok: false, holder: verdict.holder, reason: verdict.reason }
  }
}

export function checkGraphFence(handle: Database, generation: number, pid: number = process.pid): void {
  const row = handle.prepare('SELECT pid, generation FROM owners WHERE platform = ? AND account = ?').get(OWNER_PLATFORM, OWNER_ACCOUNT) as { pid: number; generation: number } | null
  if (row && row.generation === generation && row.pid === pid) return
  throw new GraphOwnerFenced(`graphOwnerFenced: this graph owner (pid ${pid}) held generation ${generation}, but ${row ? `pid ${row.pid} holds generation ${row.generation} now` : 'no owner row is left'}, so its commit was refused`)
}

export function fencedWrite<T>(handle: Database, generation: number, work: () => T, pid: number = process.pid): T {
  return immediate(handle, () => {
    checkGraphFence(handle, generation, pid)
    return work()
  })
}

export function beatGraphOwner(handle: Database, generation: number, fields: { status: string; port: number; token: string }, now: number = Date.now(), pid: number = process.pid): void {
  const changed = handle.prepare('UPDATE owners SET heartbeat = ?, staleSeenAt = NULL, status = ?, port = ?, token = ? WHERE platform = ? AND account = ? AND pid = ? AND generation = ?').run(new Date(now).toISOString(), fields.status, fields.port, fields.token, OWNER_PLATFORM, OWNER_ACCOUNT, pid, generation)
  if (changed.changes === 0) checkGraphFence(handle, generation, pid)
}

export function releaseGraphOwner(handle: Database, generation: number, pid: number = process.pid): void {
  handle.prepare("UPDATE owners SET status = 'stopped', port = 0, token = '', heartbeat = ? WHERE platform = ? AND account = ? AND pid = ? AND generation = ?").run(new Date().toISOString(), OWNER_PLATFORM, OWNER_ACCOUNT, pid, generation)
}
