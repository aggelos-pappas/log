import type { Database } from 'bun:sqlite'
import { dirname, join, resolve } from 'node:path'
import { logHome } from '../../config/logHome/index.ts'
import { missingFiles, readNetworkDir } from './helpers/read'
import { rebuildRingsIn, ringState } from './helpers/rings'
import { blankCounts, countsOf, networkMapOf, peopleOf, platformRingsOf } from './helpers/people'
import { suggestLinks } from '../../people/helpers/match'
import { NETWORK_FORMAT, NETWORK_WRITE_BATCH, RINGS, X_PLATFORM } from './types'
import type { ImportOutcome, NetworkAccount, NetworkCounts, NetworkData, NetworkImport, NetworkRings, RingState, StoredNetworkPerson, SuggestedMatch } from './types'

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

export function networkRings(handle: Database, options: { platform?: string | null } = {}): NetworkRings {
  const platform = options.platform ?? null
  const state = ringState(handle)
  const latestSeq = (handle.query('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
  const map = networkMapOf(handle)
  const people = peopleOf(map, platform)
  const byPlatform = platformRingsOf(map)
  const identities = platform ? (byPlatform.find((p) => p.platform === platform)?.identities ?? 0) : map.identities.size
  const linked = people.filter((p) => p.platforms.length > 1).sort((a, b) => a.ring - b.ring || (a.name ?? a.key).localeCompare(b.name ?? b.key))
  const counts = platform ? (byPlatform.find((p) => p.platform === platform)?.counts ?? blankCounts()) : countsOf(people)
  return { platform, counts, live: countsOf(people, true), people: people.length, identities, byPlatform, linked, imported: map.imported, merged: map.merged, state, latestSeq }
}

export function suggestedMatches(handle: Database, platform: string | null = null): SuggestedMatch[] {
  const map = networkMapOf(handle)
  const accountOf = (i: { platform: string; userId: string; handle: string | null }): NetworkAccount => {
    const held = map.identities.get(`${i.platform}:${i.userId}`)
    return { platform: i.platform, userId: i.userId, handle: i.handle ?? held?.handle ?? null, ring: held?.ring ?? RINGS.known, reason: held?.reason ?? 'known', via: held?.via ?? null }
  }
  return suggestLinks(handle)
    .filter((s) => !platform || s.a.platform === platform || s.b.platform === platform)
    .map((s) => ({ a: accountOf(s.a), b: accountOf(s.b), probability: s.probability, band: s.band }))
}
