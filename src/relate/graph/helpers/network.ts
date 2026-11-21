import type { Database } from 'bun:sqlite'
import type { Connection } from '@relate/relate'
import { NETWORK_LIMIT, WRITE_BATCH } from '../types'
import type { AccountRow, IdentityRow, NetworkGraphCounts, NetworkProjection } from '../types'

const X = 'twitter'

const parseList = (v: string | null): string[] => {
  try {
    const out = JSON.parse(v ?? '[]') as unknown
    return Array.isArray(out) ? out.map(String) : []
  } catch {
    return []
  }
}

export const EMPTY_NETWORK: NetworkProjection = { account: null, leaders: [], communities: [], inCircle: [], runs: [], mentioned: [], follows: [] }

function hasTable(handle: Database, name: string): boolean {
  return Boolean(handle.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
}

export function networkProjectionOf(handle: Database, identities: Map<string, IdentityRow>, accounts: readonly AccountRow[]): NetworkProjection {
  if (!hasTable(handle, 'networkImports')) return EMPTY_NETWORK
  const imported = handle.prepare('SELECT account FROM networkImports WHERE id = 1').get() as { account: string | null } | null
  if (!imported) return EMPTY_NETWORK
  const byHandle = new Map<string, string>()
  for (const row of identities.values()) {
    if (row.platform !== X || row.owner) continue
    for (const h of [row.handleLower, ...row.aliases]) if (h && !byHandle.has(h)) byHandle.set(h, row.key)
  }
  const people = handle.prepare('SELECT handleLower, handle, name, followers, ring, band, score, topThemes, workflowStage, passesGates, followsOwner, role, lastPostText, lastPostAtMs FROM networkPeople').all() as { handleLower: string; handle: string; name: string | null; followers: number | null; ring: number | null; band: string | null; score: number | null; topThemes: string | null; workflowStage: string | null; passesGates: number | null; followsOwner: number; role: string | null; lastPostText: string | null; lastPostAtMs: number | null }[]
  const keyOf = new Map<string, string>()
  for (const p of people) {
    let key = byHandle.get(p.handleLower)
    if (!key) {
      key = `${X}:@${p.handleLower}`
      identities.set(key, { key, platform: X, userId: `@${p.handleLower}`, handle: p.handle, handleLower: null, name: p.name, nameLower: null, labels: [], aliases: [], owner: false, personId: null, personNames: [] })
      byHandle.set(p.handleLower, key)
    }
    const row = identities.get(key)!
    Object.assign(row, { inNetwork: true, band: p.band, ring: p.ring, degree: p.ring, score: p.score, themes: parseList(p.topThemes), workflowStage: p.workflowStage, passesGates: p.passesGates === 1, role: p.role, networkFollowers: p.followers, followsOwner: p.followsOwner === 1, lastPost: p.lastPostText ? p.lastPostText.slice(0, NETWORK_LIMIT.postChars) : null, lastPostAtMs: p.lastPostAtMs })
    row.name ??= p.name
    keyOf.set(p.handleLower, key)
  }
  const leaderRows = handle.prepare('SELECT handleLower, handle, name, followers, world FROM networkLeaders').all() as { handleLower: string; handle: string; name: string | null; followers: number | null; world: string | null }[]
  const leaders = leaderRows.map((l) => ({ key: `leader:${l.handleLower}`, handle: l.handle, handleLower: l.handleLower, name: l.name, followers: l.followers, world: l.world, identity: keyOf.get(l.handleLower) ?? byHandle.get(l.handleLower) ?? null }))
  const communities = (handle.prepare('SELECT communityId, name, url, platform, topic FROM networkCommunities').all() as { communityId: string; name: string | null; url: string | null; platform: string | null; topic: string | null }[]).map((c) => ({ key: `community:${c.communityId}`, ...c }))
  const inCircle = (handle.prepare('SELECT personLower, leaderLower FROM networkCircles').all() as { personLower: string; leaderLower: string }[]).flatMap((c) => {
    const identity = keyOf.get(c.personLower)
    return identity ? [{ identity, leader: `leader:${c.leaderLower}` }] : []
  })
  const runs = (handle.prepare('SELECT leaderLower, communityId FROM networkRuns').all() as { leaderLower: string; communityId: string }[]).map((r) => ({ leader: `leader:${r.leaderLower}`, community: `community:${r.communityId}` }))
  const mentioned = (handle.prepare('SELECT fromLower, toLower, times, lastAtMs FROM networkMentions').all() as { fromLower: string; toLower: string; times: number; lastAtMs: number | null }[]).flatMap((m) => {
    const from = byHandle.get(m.fromLower)
    const to = byHandle.get(m.toLower)
    return from && to && from !== to ? [{ from, to, times: m.times, lastAtMs: m.lastAtMs }] : []
  })
  const account = imported.account ? accounts.find((a) => a.platform === X && a.account.replace(/^@/, '').toLowerCase() === imported.account!.toLowerCase()) ?? null : null
  const follows = account ? people.filter((p) => p.followsOwner === 1 && keyOf.has(p.handleLower)).map((p) => ({ identity: keyOf.get(p.handleLower)!, accountKey: account.key })) : []
  return { account: account?.key ?? null, leaders, communities, inCircle, runs, mentioned, follows }
}

function write(conn: Connection, cypher: string, rows: readonly object[]): void {
  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    conn.query(cypher, { rows: rows.slice(i, i + WRITE_BATCH) as never })
    conn.commit()
    conn.begin()
  }
}

export function writeNetwork(conn: Connection, network: NetworkProjection): void {
  write(conn, 'UNWIND $rows AS r CREATE (n:Leader) SET n = r', network.leaders)
  write(conn, 'UNWIND $rows AS r CREATE (n:Community) SET n = r', network.communities)
  write(conn, 'UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (l:Leader {key: r.leader}) CREATE (i)-[:IN_CIRCLE_OF]->(l)', network.inCircle)
  write(conn, 'UNWIND $rows AS r MATCH (l:Leader {key: r.leader}), (c:Community {key: r.community}) CREATE (l)-[:RUNS]->(c)', network.runs)
  write(conn, "UNWIND $rows AS r MATCH (a:Identity {key: r.from}), (b:Identity {key: r.to}) CREATE (a)-[:MENTIONED {source: 'network', times: r.times, lastAtMs: r.lastAtMs}]->(b)", network.mentioned)
  write(conn, 'UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (a:Account {key: r.accountKey}) CREATE (i)-[:FOLLOWS]->(a)', network.follows)
}

export function networkCountsOf(network: NetworkProjection): NetworkGraphCounts {
  return { leaders: network.leaders.length, communities: network.communities.length, inCircleOf: network.inCircle.length, runs: network.runs.length, networkMentioned: network.mentioned.length, follows: network.follows.length }
}

export function networkCountsIn(conn: Connection): NetworkGraphCounts {
  const one = (cypher: string) => Number(conn.query(cypher).rows[0]?.n ?? 0)
  return {
    leaders: one('MATCH (n:Leader) RETURN count(n) AS n'),
    communities: one('MATCH (n:Community) RETURN count(n) AS n'),
    inCircleOf: one('MATCH ()-[r:IN_CIRCLE_OF]->() RETURN count(r) AS n'),
    runs: one('MATCH ()-[r:RUNS]->() RETURN count(r) AS n'),
    networkMentioned: one("MATCH ()-[r:MENTIONED {source: 'network'}]->() RETURN count(r) AS n"),
    follows: one('MATCH ()-[r:FOLLOWS]->() RETURN count(r) AS n'),
  }
}

export const WHO_TO_TALK_TO = "MATCH (i:Identity)-[:IN_CIRCLE_OF]->(l:Leader) WHERE i.inNetwork AND i.passesGates AND NOT i.owner AND i.band IN ['collaborator', 'member'] AND NOT (i)-[:SAID|MEMBER_OF]->(:Room {kind: 'dm'}) WITH i, count(DISTINCT l) AS circles, collect(DISTINCT l.handle)[0..5] AS leaders ORDER BY CASE WHEN i.ring = 2 THEN 0 ELSE 1 END, circles DESC, i.score DESC, coalesce(i.lastPostAtMs, 0) DESC LIMIT 25 OPTIONAL MATCH (i)-[:IN_CIRCLE_OF]->(:Leader)<-[:IN_CIRCLE_OF]-(c:Identity)-[:SAID]->(:Room {kind: 'dm'}) WITH i, circles, leaders, collect(DISTINCT c.handle)[0..3] AS sameCircleTalksToYou OPTIONAL MATCH (m:Identity)-[:MENTIONED]->(i) WITH i, circles, leaders, sameCircleTalksToYou, collect(DISTINCT m.handle)[0..3] AS mentionedBy RETURN i.handle AS handle, i.band AS band, i.ring AS ring, circles, leaders, sameCircleTalksToYou, mentionedBy, i.score AS score, i.themes AS themes, i.followsOwner AS followsYou, i.lastPost AS lastPost, i.lastPostAtMs AS lastPostAtMs ORDER BY CASE WHEN ring = 2 THEN 0 ELSE 1 END, circles DESC, score DESC, coalesce(lastPostAtMs, 0) DESC"
