import type { Database } from 'bun:sqlite'
import { dirname, join, resolve } from 'node:path'
import { logHome } from '../../config/logHome/index.ts'
import { missingFiles, readNetworkDir } from './helpers/read'
import { rebuildRingsIn, ringState } from './helpers/rings'
import { NETWORK_FORMAT, NETWORK_WRITE_BATCH, RINGS, X_PLATFORM } from './types'
import type { ImportOutcome, NetworkCounts, NetworkData, NetworkImport, NetworkRings, RingCounts, RingState, StoredNetworkPerson } from './types'

export function networkDir(env: Record<string, string | undefined> = process.env): string {
  const dir = env.LOG_NETWORK_DIR?.trim()
  if (dir) return dir
  const file = env.LOG_NICHE_MAP?.trim()
  return file ? dirname(file) : join(logHome(), 'network')
}

function insertAll<T extends object>(handle: Database, table: string, rows: readonly T[]): void {
  if (!rows.length) return
  const columns = Object.keys(rows[0]!)
  const statement = handle.prepare(`INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
  for (let i = 0; i < rows.length; i += NETWORK_WRITE_BATCH) {
    for (const row of rows.slice(i, i + NETWORK_WRITE_BATCH)) statement.run(...(columns.map((c) => (row as Record<string, unknown>)[c] ?? null) as never[]))
  }
}

export function ownerAccountOf(handle: Database, data: Pick<NetworkData, 'circleCounts'>, asked?: string | null): string | null {
  const accounts = (handle.prepare('SELECT account FROM accounts WHERE platform = ?').all(X_PLATFORM) as { account: string }[]).map((a) => a.account.replace(/^@/, ''))
  if (asked) return asked.replace(/^@/, '')
  const ranked = accounts.map((a) => ({ a, n: data.circleCounts.get(a.toLowerCase()) ?? 0 })).sort((x, y) => y.n - x.n)
  if (ranked[0] && ranked[0].n > 0) return ranked[0].a
  return accounts.length === 1 ? accounts[0]! : null
}

export function importNetwork(handle: Database, from: string, options: { account?: string | null; now?: Date } = {}): ImportOutcome {
  const dir = resolve(from)
  const missing = missingFiles(dir)
  if (missing.length) return { ok: false, problem: `${dir} has no ${missing.join(' or ')}; point --from at the network's data folder` }
  const started = performance.now()
  const data = readNetworkDir(dir)
  const account = ownerAccountOf(handle, data, options.account)
  const own = account?.toLowerCase()
  const leaders = data.leaders.filter((l) => l.handleLower !== own)
  const circles = data.circles.filter((c) => c.leaderLower !== own && c.personLower !== own)
  const runs = data.runs.filter((r) => r.leaderLower !== own)
  const people = data.people.filter((p) => p.handleLower !== own)
  const counts: NetworkCounts = { people: people.length, leaders: leaders.length, communities: data.communities.length, runs: runs.length, circles: circles.length, mentions: data.mentions.length, follows: people.filter((p) => p.followsOwner).length }
  const importedAt = (options.now ?? new Date()).toISOString()
  handle.exec('BEGIN IMMEDIATE')
  try {
    for (const table of ['networkPeople', 'networkLeaders', 'networkCommunities', 'networkRuns', 'networkCircles', 'networkMentions', 'networkImports']) handle.exec(`DELETE FROM ${table}`)
    insertAll(handle, 'networkPeople', people)
    insertAll(handle, 'networkLeaders', leaders)
    insertAll(handle, 'networkCommunities', data.communities)
    insertAll(handle, 'networkRuns', runs)
    insertAll(handle, 'networkCircles', circles)
    insertAll(handle, 'networkMentions', data.mentions)
    const summary: NetworkImport = { formatVersion: NETWORK_FORMAT, mapVersion: data.mapVersion, generatedAt: data.generatedAt, source: dir, account, counts, ms: Math.round(performance.now() - started), importedAt }
    handle.prepare('INSERT INTO networkImports (id, formatVersion, mapVersion, generatedAt, source, account, counts, ms, importedAt) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)').run(summary.formatVersion, summary.mapVersion, summary.generatedAt, summary.source, summary.account, JSON.stringify(counts), summary.ms, importedAt)
    handle.exec('COMMIT')
    return { ok: true, summary }
  } catch (error) {
    handle.exec('ROLLBACK')
    throw error
  }
}

export function networkImported(handle: Database): NetworkImport | null {
  const row = handle.prepare('SELECT formatVersion, mapVersion, generatedAt, source, account, counts, ms, importedAt FROM networkImports WHERE id = 1').get() as (Omit<NetworkImport, 'counts'> & { counts: string }) | null
  return row ? { ...row, counts: JSON.parse(row.counts) as NetworkCounts } : null
}

export function storedNetworkPeople(handle: Database): StoredNetworkPerson[] {
  const rows = handle.prepare('SELECT handle, name, role, degree, ring, followsOwner, bio, followers, tieStrength FROM networkPeople WHERE role IS NOT NULL').all() as (Omit<StoredNetworkPerson, 'followsOwner'> & { followsOwner: number })[]
  return rows.map((r) => ({ ...r, followsOwner: r.followsOwner === 1 }))
}

export function rebuildRings(handle: Database, now: Date = new Date()): RingState {
  if (handle.inTransaction) return rebuildRingsIn(handle, now)
  handle.exec('BEGIN IMMEDIATE')
  try {
    const state = rebuildRingsIn(handle, now)
    handle.exec('COMMIT')
    return state
  } catch (error) {
    handle.exec('ROLLBACK')
    throw error
  }
}

export function ensureRings(handle: Database, now: Date = new Date()): RingState {
  return ringState(handle) ?? rebuildRings(handle, now)
}

const blankCounts = (): RingCounts => ({ '1': 0, '2': 0, '3': 0, '4': 0 })

const bump = (counts: RingCounts, ring: number): void => {
  const key = String(Math.min(Math.max(ring, RINGS.engaged), RINGS.known)) as keyof RingCounts
  counts[key] += 1
}

export function networkRings(handle: Database): NetworkRings {
  const state = ringState(handle)
  const latestSeq = (handle.query('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
  const accounts = handle.query('SELECT platform, account, userId FROM accounts').all() as { platform: string; account: string; userId: string }[]
  const ownerIds = new Set(accounts.map((a) => `${a.platform}:${a.userId}`))
  const ownerHandles = new Set(accounts.map((a) => `${a.platform}:${a.account.replace(/^@/, '').toLowerCase()}`))
  const ring = new Map<string, number>()
  const byHandle = new Map<string, string>()
  const usable = (userId: string) => !userId.startsWith('unknown:') && !userId.startsWith('self:')
  for (const i of handle.query('SELECT platform, userId, handle FROM identities').all() as { platform: string; userId: string; handle: string | null }[]) {
    const key = `${i.platform}:${i.userId}`
    const lower = i.handle?.replace(/^@/, '').toLowerCase() ?? null
    if (!usable(i.userId) || ownerIds.has(key) || (lower && ownerHandles.has(`${i.platform}:${lower}`))) continue
    ring.set(key, RINGS.known)
    if (i.platform === X_PLATFORM && lower && !byHandle.has(lower)) byHandle.set(lower, key)
  }
  for (const a of handle.query('SELECT handle, userId FROM handleAliases WHERE platform = ?').all(X_PLATFORM) as { handle: string; userId: string }[]) {
    const key = `${X_PLATFORM}:${a.userId}`
    if (ring.has(key) && !byHandle.has(a.handle)) byHandle.set(a.handle, key)
  }
  for (const r of handle.query('SELECT platform, userId, ring FROM networkRings').all() as { platform: string; userId: string; ring: number }[]) {
    const key = `${r.platform}:${r.userId}`
    if (!ownerIds.has(key)) ring.set(key, Math.min(ring.get(key) ?? RINGS.known, r.ring))
  }
  const live = blankCounts()
  for (const r of ring.values()) bump(live, r)
  let imported = 0
  let merged = 0
  for (const p of handle.query('SELECT handleLower, ring FROM networkPeople').all() as { handleLower: string; ring: number | null }[]) {
    const key = byHandle.get(p.handleLower)
    if (key) {
      merged += 1
      ring.set(key, Math.min(ring.get(key)!, p.ring ?? RINGS.known))
    } else {
      imported += 1
      ring.set(`${X_PLATFORM}:@${p.handleLower}`, p.ring ?? RINGS.known)
    }
  }
  const counts = blankCounts()
  for (const r of ring.values()) bump(counts, r)
  return { counts, live, imported, merged, state, latestSeq }
}
