import type { Database as SqlDatabase } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Connection, Database as GraphDatabase } from '@relate/relate'
import { defaultDbPath, openDatabase } from '../../storage/schema/index'
import { claimState, deleteState, getState, putState } from '../../storage/state/index'
import { ensureRings } from '../network/client'
import { EMPTY_NETWORK, mentionedTokens, networkCountsIn, networkCountsOf, paddedPrompt, pointedAt, projectionOf, writeNetwork } from './helpers/index'
import { APPLY_MAX_EVENTS, BUILD_CHILD_MS, CHECKPOINT_ROWS, TXN_ROWS, BUILD_GRACE_MS, CONTEXT_CHARS, PLATFORM_PARAM, QUERY_ROWS, REFRESH_AFTER_MS, GRAPH_FILE_PREFIX, GRAPH_FILE_SUFFIX, KEPT_SNAPSHOTS, KEYED_LABELS, LISTED, MENTIONED_PEOPLE, PRIOR_FLOOR, PRIOR_KAPPA, PRIOR_WEIGHT_NEAR, PRIOR_WEIGHT_SPOKE, PROJECTOR_VERSION, WRITE_BATCH } from './types'
import type { ConnectedContext, GraphCounts, GraphPointer, GraphVerify, PersonFound, Projection, ProjectionScope } from './types'

type Relate = typeof import('@relate/relate')

let relate: Relate | null = null

function relateLib(): Relate {
  relate ??= require('@relate/relate') as Relate
  return relate
}

const opened = new Map<string, GraphDatabase>()

export function graphDir(dbPath: string = defaultDbPath()): string {
  return join(dirname(resolve(dbPath)), 'relate')
}

export function workspaceOf(dbPath: string = defaultDbPath()): string {
  return createHash('sha256').update(resolve(dbPath).toLowerCase()).digest('hex').slice(0, 16)
}

export function pointerOf(dbPath: string = defaultDbPath(), handle: SqlDatabase = openDatabase(dbPath)): GraphPointer | null {
  const pointer = getState<GraphPointer>('relateGraph', workspaceOf(dbPath), {}, handle)?.body ?? null
  if (!pointer || pointer.workspace !== workspaceOf(dbPath) || pointer.projectorVersion !== PROJECTOR_VERSION || !existsSync(pointer.file)) return null
  return pointer
}

export function eventsThrough(handle: SqlDatabase): number {
  return (handle.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
}

export class GraphUnreadable extends Error {
  readonly code = 'graphUnreadable'
}

export function graphConnection(file: string): Connection {
  const held = opened.get(file)
  if (held) return held.connect()
  try {
    const db = relateLib().Database.open(file, { readOnly: true })
    opened.set(file, db)
    return db.connect()
  } catch (error) {
    throw new GraphUnreadable(`graphUnreadable: the Relate graph ${file} can't be opened read-only (${error instanceof Error ? error.message : String(error)}); a process may still hold it open for writing`)
  }
}

function batches<T>(rows: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += WRITE_BATCH) out.push(rows.slice(i, i + WRITE_BATCH) as T[])
  return out
}

function write(conn: Connection, cypher: string, rows: readonly object[]): void {
  for (const batch of batches(rows)) {
    conn.query(cypher, { rows: batch as never })
    conn.commit()
    conn.begin()
  }
}

function batchWriter(conn: Connection): (cypher: string, rows: readonly object[]) => void {
  let pending = 0
  return (cypher, rows) => {
    for (const batch of batches(rows)) {
      conn.query(cypher, { rows: batch as never })
      pending += batch.length
      if (pending < TXN_ROWS) continue
      conn.commit()
      conn.begin()
      pending = 0
    }
  }
}

export function writeEdges(conn: Connection, projection: Projection, merge = false, put: (cypher: string, rows: readonly object[]) => void = (cypher, rows) => write(conn, cypher, rows)): void {
  put('UNWIND $rows AS r MATCH (room:Room {key: r.key}), (s:Server {key: r.serverKey}) CREATE (room)-[:IN_SERVER]->(s)', projection.rooms.filter((r) => r.serverKey))
  put('UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (p:Person {key: r.person}) CREATE (i)-[:LINKED_TO {linkedBy: r.linkedBy, linkedAt: r.linkedAt}]->(p)', projection.links)
  put('UNWIND $rows AS r MATCH (a:Account {key: r.accountKey}), (room:Room {key: r.key}) CREATE (a)-[:HAS_ROOM]->(room)', projection.rooms)
  put(`UNWIND $rows AS r MATCH (a:Account {key: r.accountKey}), (p:Post {key: r.key}) ${merge ? 'MERGE' : 'CREATE'} (a)-[:POSTED]->(p)`, projection.posts)
  put('UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (room:Room {key: r.room}) CREATE (i)-[:MEMBER_OF {firstSeenAt: r.firstSeenAt, lastSeenAt: r.lastSeenAt}]->(room)', projection.members)
  put('UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (room:Room {key: r.room}) CREATE (i)-[:SAID {messages: r.messages, firstAtMs: r.firstAtMs, lastAtMs: r.lastAtMs}]->(room)', projection.said.filter((s) => !s.fromOwner))
  put('UNWIND $rows AS r MATCH (a:Account {key: r.accountKey}), (room:Room {key: r.room}) CREATE (a)-[:SAID {messages: r.messages, firstAtMs: r.firstAtMs, lastAtMs: r.lastAtMs}]->(room)', projection.said.filter((s) => s.fromOwner))
  for (const [rel, rows] of [['REPLIED_TO', projection.replies], ['MENTIONED', projection.mentions]] as const) {
    for (const fromOwner of [false, true]) {
      for (const toOwner of [false, true]) {
        if (fromOwner && toOwner) continue
        put(`UNWIND $rows AS r MATCH (a:${fromOwner ? 'Account' : 'Identity'} {key: r.from}), (b:${toOwner ? 'Account' : 'Identity'} {key: r.to}) CREATE (a)-[:${rel} {room: r.room, times: r.times, firstAtMs: r.firstAtMs, lastAtMs: r.lastAtMs}]->(b)`, rows.filter((x) => x.fromOwner === fromOwner && x.toOwner === toOwner))
      }
    }
  }
  put('UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (p:Post {key: r.post}) CREATE (i)-[:ENGAGED {kind: r.kind, times: r.times, lastAtMs: r.lastAtMs}]->(p)', projection.engaged.filter((e) => e.post))
  put('UNWIND $rows AS r MATCH (i:Identity {key: r.identity}), (a:Account {key: r.accountKey}) CREATE (i)-[:FOLLOWED {kind: r.kind, times: r.times, lastAtMs: r.lastAtMs}]->(a)', projection.engaged.filter((e) => !e.post))
}

export function writeProjection(conn: Connection, projection: Projection, meta: { workspace: string; builtAt: string }): void {
  for (const label of KEYED_LABELS) conn.query(`CREATE CONSTRAINT ${label.toLowerCase()}Key IF NOT EXISTS FOR (n:${label}) REQUIRE n.key IS UNIQUE`)
  conn.begin()
  try {
    write(conn, 'UNWIND $rows AS r CREATE (n:Account) SET n = r', projection.accounts)
    write(conn, 'UNWIND $rows AS r CREATE (n:Identity) SET n = r', projection.identities)
    write(conn, 'UNWIND $rows AS r CREATE (n:Room) SET n = r', projection.rooms)
    write(conn, 'UNWIND $rows AS r CREATE (n:Post) SET n = r', projection.posts)
    write(conn, 'UNWIND $rows AS r CREATE (n:Server) SET n = r', projection.servers)
    write(conn, 'UNWIND $rows AS r CREATE (n:Person) SET n = r', projection.persons)
    writeEdges(conn, projection)
    writeNetwork(conn, projection.network ?? EMPTY_NETWORK)
    conn.query('CREATE (:Snapshot {key: $key, throughSeq: $throughSeq, schemaVersion: $schemaVersion, projectorVersion: $projectorVersion, workspace: $workspace, builtAt: $builtAt})', { key: 'snapshot', throughSeq: projection.throughSeq, schemaVersion: projection.schemaVersion, projectorVersion: PROJECTOR_VERSION, workspace: meta.workspace, builtAt: meta.builtAt })
    conn.commit()
  } catch (error) {
    try {
      conn.rollback()
    } catch {}
    throw error
  }
}

export function applyProjection(conn: Connection, delta: Projection, builtAt: string): void {
  const rooms = delta.rooms.map((r) => r.key)
  const actors = [...new Set(delta.engaged.map((e) => e.identity))]
  conn.begin()
  const put = batchWriter(conn)
  try {
    put('UNWIND $rows AS r MERGE (n:Account {key: r.key}) SET n = r', delta.accounts)
    put('UNWIND $rows AS r MERGE (n:Server {key: r.key}) SET n = r', delta.servers)
    put('UNWIND $rows AS r MERGE (n:Identity {key: r.key}) SET n = r', delta.identities)
    put('UNWIND $rows AS r MERGE (n:Room {key: r.key}) SET n = r', delta.rooms)
    put('UNWIND $rows AS r MERGE (n:Post {key: r.key}) SET n = r', delta.posts)
    if (rooms.length) {
      conn.query('UNWIND $rooms AS k MATCH (room:Room {key: k})<-[:SAID]-(a) MATCH (a)-[e:REPLIED_TO|MENTIONED]->() WHERE e.room = k DELETE e', { rooms })
      conn.query('UNWIND $rooms AS k MATCH (room:Room {key: k})<-[e:HAS_ROOM|MEMBER_OF|SAID]-() DELETE e', { rooms })
      conn.query('UNWIND $rooms AS k MATCH (room:Room {key: k})-[e:IN_SERVER]->() DELETE e', { rooms })
    }
    if (actors.length) conn.query('UNWIND $actors AS k MATCH (i:Identity {key: k})-[e:ENGAGED|FOLLOWED]->() DELETE e', { actors })
    conn.query('MATCH (p:Person) DETACH DELETE p')
    put('UNWIND $rows AS r CREATE (n:Person) SET n = r', delta.persons)
    const takeovers = delta.network?.takeovers ?? []
    if (takeovers.length) {
      const moved = takeovers.filter((t) => t.moved)
      const pair = 'UNWIND $rows AS r MATCH (o:Identity {key: r.placeholder}) MATCH (n:Identity {key: r.identity})'
      put(`${pair} MATCH (o)-[e:IN_CIRCLE_OF]->(l:Leader) CREATE (n)-[:IN_CIRCLE_OF]->(l) DELETE e`, moved)
      put(`${pair} MATCH (o)-[e:FOLLOWS]->(a:Account) CREATE (n)-[:FOLLOWS]->(a) DELETE e`, moved)
      put('UNWIND $rows AS r MATCH (o:Identity {key: r.placeholder}) DETACH DELETE o', moved)
      put('UNWIND $rows AS r MATCH (l:Leader {handleLower: r.handleLower}) SET l.identity = r.identity', takeovers.filter((t) => t.leader).map((t) => ({ identity: t.identity, handleLower: t.leader! })))
      const keys = takeovers.map((t) => t.identity)
      conn.query("UNWIND $keys AS k MATCH (i:Identity {key: k})-[e:MENTIONED {source: 'network'}]->() DELETE e", { keys })
      conn.query("UNWIND $keys AS k MATCH ()-[e:MENTIONED {source: 'network'}]->(i:Identity {key: k}) DELETE e", { keys })
      put("UNWIND $rows AS r MATCH (a:Identity {key: r.from}), (b:Identity {key: r.to}) CREATE (a)-[:MENTIONED {source: 'network', times: r.times, lastAtMs: r.lastAtMs}]->(b)", delta.network?.mentioned ?? [])
    }
    writeEdges(conn, delta, true, put)
    conn.query('MATCH (s:Snapshot {key: $key}) SET s.throughSeq = $throughSeq, s.builtAt = $builtAt', { key: 'snapshot', throughSeq: delta.throughSeq, builtAt })
    conn.commit()
  } catch (error) {
    try {
      conn.rollback()
    } catch {}
    throw error
  }
}

export function expectedCounts(projection: Projection): GraphCounts {
  return {
    accounts: projection.accounts.length,
    identities: projection.identities.length,
    rooms: projection.rooms.length,
    posts: projection.posts.length,
    memberOf: projection.members.length,
    said: projection.said.length,
    engaged: projection.engaged.length,
    servers: projection.servers.length,
    inServer: projection.rooms.filter((r) => r.serverKey).length,
    persons: projection.persons.length,
    linkedTo: projection.links.length,
    repliedTo: projection.replies.length,
    mentioned: projection.mentions.length,
  }
}

export function countsIn(conn: Connection): GraphCounts {
  const one = (cypher: string) => Number(conn.query(cypher).rows[0]?.n ?? 0)
  return {
    accounts: one('MATCH (n:Account) RETURN count(n) AS n'),
    identities: one('MATCH (n:Identity) RETURN count(n) AS n'),
    rooms: one('MATCH (n:Room) RETURN count(n) AS n'),
    posts: one('MATCH (n:Post) RETURN count(n) AS n'),
    memberOf: one('MATCH ()-[r:MEMBER_OF]->() RETURN count(r) AS n'),
    said: one('MATCH ()-[r:SAID]->() RETURN count(r) AS n'),
    engaged: one('MATCH ()-[r:ENGAGED|FOLLOWED]->() RETURN count(r) AS n'),
    servers: one('MATCH (n:Server) RETURN count(n) AS n'),
    inServer: one('MATCH ()-[r:IN_SERVER]->() RETURN count(r) AS n'),
    persons: one('MATCH (n:Person) RETURN count(n) AS n'),
    linkedTo: one('MATCH ()-[r:LINKED_TO]->() RETURN count(r) AS n'),
    repliedTo: one('MATCH ()-[r:REPLIED_TO]->() RETURN count(r) AS n'),
    mentioned: one('MATCH ()-[r:MENTIONED]->() WHERE r.source IS NULL RETURN count(r) AS n'),
  }
}

function prune(dir: string, keep: string): string[] {
  const files = readdirSync(dir).filter((f) => f.startsWith(GRAPH_FILE_PREFIX) && f.endsWith(GRAPH_FILE_SUFFIX)).sort().reverse()
  const removed: string[] = []
  for (const name of files.slice(KEPT_SNAPSHOTS)) {
    const path = join(dir, name)
    if (resolve(path) === resolve(keep) || opened.has(path)) continue
    try {
      rmSync(path, { force: true })
      removed.push(name)
    } catch {}
  }
  return removed
}

function spawnHere(fn: 'buildGraphHere' | 'applyGraphHere', dbPath: string, now: Date): GraphPointer {
  const entry = pathToFileURL(join(import.meta.dir, 'index.ts')).href
  const script = `const m = await import(${JSON.stringify(entry)}); process.stdout.write(JSON.stringify(m.${fn}(process.argv[1], new Date(Number(process.argv[2])))))`
  const done = spawnSync(process.execPath, ['-e', script, resolve(dbPath), String(now.getTime())], { encoding: 'utf8', windowsHide: true, timeout: BUILD_CHILD_MS, env: process.env })
  if (done.error) throw done.error
  if (done.status !== 0) throw new Error((done.stderr || done.stdout || `the graph build exited ${done.status}`).trim().split('\n').filter(Boolean).slice(-3).join(' | '))
  return JSON.parse(done.stdout.trim().split('\n').pop() ?? '') as GraphPointer
}

export function buildGraph(dbPath: string = defaultDbPath(), now: Date = new Date()): GraphPointer {
  return spawnHere('buildGraphHere', dbPath, now)
}

export function applyGraph(dbPath: string = defaultDbPath(), now: Date = new Date()): GraphPointer {
  return spawnHere('applyGraphHere', dbPath, now)
}

interface Stamps {
  interactionsThrough: number
  mergesThrough: number
  networkStamp: string | null
}

function stampsOf(handle: SqlDatabase): Stamps {
  const one = (sql: string) => (handle.prepare(sql).get() as { n: number | string | null } | null)?.n ?? null
  return { interactionsThrough: Number(one('SELECT COALESCE(MAX(seq), 0) AS n FROM interactions')), mergesThrough: Number(one('SELECT COALESCE(MAX(seq), 0) AS n FROM identityMerges')), networkStamp: (one('SELECT importedAt AS n FROM networkImports WHERE id = 1') as string | null) ?? null }
}

function newFileOf(dir: string, throughSeq: number, now: Date): string {
  return join(dir, `${GRAPH_FILE_PREFIX}${String(throughSeq).padStart(12, '0')}-${now.getTime()}${GRAPH_FILE_SUFFIX}`)
}

function buildIn(handle: SqlDatabase, dbPath: string, workspace: string, now: Date): GraphPointer {
  const started = performance.now()
  ensureRings(handle, now)
  const stamps = stampsOf(handle)
  const projection = projectionOf(handle)
  const dir = graphDir(dbPath)
  mkdirSync(dir, { recursive: true })
  const file = newFileOf(dir, projection.throughSeq, now)
  const db = relateLib().Database.open(file)
  const conn = db.connect()
  writeProjection(conn, projection, { workspace, builtAt: now.toISOString() })
  db.checkpoint()
  const pointer: GraphPointer = { file, throughSeq: projection.throughSeq, projectorVersion: PROJECTOR_VERSION, schemaVersion: projection.schemaVersion, workspace, builtAt: now.toISOString(), ms: Math.round(performance.now() - started), counts: countsIn(conn), networkCounts: networkCountsIn(conn), mode: 'full', applied: 0, walRows: 0, ...stamps }
  putState('relateGraph', workspace, pointer, now.getTime(), handle)
  prune(dir, file)
  return pointer
}

export function buildGraphHere(dbPath: string = defaultDbPath(), now: Date = new Date()): GraphPointer {
  const handle = openDatabase(dbPath)
  const workspace = workspaceOf(dbPath)
  if (!claimState('relateGraphBuilding', workspace, { pid: process.pid }, BUILD_GRACE_MS, now.getTime(), handle)) throw new Error('another process is building the Relate graph for this log.db right now')
  try {
    return buildIn(handle, dbPath, workspace, now)
  } finally {
    deleteState('relateGraphBuilding', workspace, handle)
  }
}

export function deltaScopeOf(handle: SqlDatabase, pointer: GraphPointer): ProjectionScope {
  const after = pointer.throughSeq
  const rooms = handle.prepare('SELECT c.chatId AS id FROM events e JOIN chats c ON c.platform = e.platform AND c.account = e.account AND c.conversationId = e.conversationId WHERE e.seq > ?1 UNION SELECT m.chatId AS id FROM events e JOIN messages m ON m.messageKey = e.messageKey WHERE e.seq > ?1 AND e.messageKey IS NOT NULL').all(after) as { id: string }[]
  const actors = handle.prepare("SELECT DISTINCT platform || ':' || actorUserId AS id FROM interactions WHERE seq > ?").all(pointer.interactionsThrough ?? 0) as { id: string }[]
  const ringed = handle.prepare("SELECT platform || ':' || userId AS id FROM networkRings WHERE seq > ?").all(after) as { id: string }[]
  return { rooms: new Set(rooms.map((r) => r.id)), actors: new Set(actors.map((r) => r.id)), identities: new Set(ringed.map((r) => r.id)) }
}

interface Renamed {
  handles: Set<string>
  ids: Set<string>
  keys: Set<string>
  same: Set<string>
  placeholders: Set<string>
}

const canonical = (v: unknown): string => JSON.stringify(Object.entries((v ?? {}) as Record<string, unknown>).filter(([, x]) => x !== null && x !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

function renamedIn(conn: Connection, delta: Projection): Renamed {
  const held = new Map(conn.query('UNWIND $keys AS k MATCH (i:Identity {key: k}) RETURN i.key AS key, properties(i) AS props', { keys: delta.identities.map((i) => i.key) }).rows.map((r) => [String(r.key), r.props as Record<string, unknown>]))
  const renamed: Renamed = { handles: new Set(), ids: new Set(), keys: new Set(), same: new Set(), placeholders: new Set() }
  for (const row of delta.identities) {
    const before = held.get(row.key)
    if (!before) {
      renamed.ids.add(row.key)
      renamed.keys.add(row.key)
    } else if (canonical(before) === canonical(row)) renamed.same.add(row.key)
    const had = new Set([before?.handleLower, ...((before?.aliases as string[] | null) ?? [])].filter(Boolean) as string[])
    for (const h of [row.handleLower, ...row.aliases]) {
      if (!h || had.has(h)) continue
      renamed.handles.add(`${row.platform}:${h}`)
      renamed.keys.add(row.key)
    }
  }
  const asked = (delta.network?.takeovers ?? []).filter((t) => renamed.keys.has(t.identity)).map((t) => t.placeholder)
  if (asked.length) for (const r of conn.query('UNWIND $keys AS k MATCH (o:Identity {key: k}) RETURN o.key AS key, o.placeholder AS placeholder', { keys: asked }).rows) if (r.placeholder === true) renamed.placeholders.add(String(r.key))
  return renamed
}

function rowsOf(delta: Projection): number {
  return delta.accounts.length + delta.identities.length + delta.rooms.length + delta.posts.length + delta.servers.length + delta.persons.length + delta.members.length + delta.said.length + delta.engaged.length + delta.replies.length + delta.mentions.length + delta.links.length + (delta.network?.mentioned.length ?? 0) + 4 * (delta.network?.takeovers?.length ?? 0)
}

function onlyChanged(delta: Projection, renamed: Renamed): Projection {
  const identities = delta.identities.filter((i) => !renamed.same.has(i.key))
  if (!delta.network) return { ...delta, identities }
  const takeovers = (delta.network.takeovers ?? []).filter((t) => renamed.keys.has(t.identity)).map((t) => ({ ...t, moved: renamed.placeholders.has(t.placeholder) }))
  const keys = new Set(takeovers.map((t) => t.identity))
  return { ...delta, identities, network: { ...delta.network, takeovers, mentioned: delta.network.mentioned.filter((m) => keys.has(m.from) || keys.has(m.to)) } }
}

function roomsNaming(handle: SqlDatabase, named: { handles: Set<string>; ids: Set<string> }): string[] {
  if (!named.handles.size && !named.ids.size) return []
  const rows = handle.prepare("SELECT m.chatId, m.senderPlatform AS platform, m.text FROM messages m WHERE m.text LIKE '%@%'").all() as { chatId: string; platform: string; text: string }[]
  const out = new Set<string>()
  for (const r of rows) {
    const { ids, handles } = pointedAt(r.text)
    if (handles.some((h) => named.handles.has(`${r.platform}:${h}`)) || ids.some((id) => named.ids.has(`${r.platform}:${id}`))) out.add(r.chatId)
  }
  return [...out]
}

export function applyGraphHere(dbPath: string = defaultDbPath(), now: Date = new Date()): GraphPointer {
  const handle = openDatabase(dbPath)
  const workspace = workspaceOf(dbPath)
  if (!claimState('relateGraphBuilding', workspace, { pid: process.pid }, BUILD_GRACE_MS, now.getTime(), handle)) throw new Error('another process is building the Relate graph for this log.db right now')
  try {
    const pointer = pointerOf(dbPath, handle)
    const latest = eventsThrough(handle)
    if (pointer && latest <= pointer.throughSeq) return pointer
    const stamps = stampsOf(handle)
    const full = !pointer || pointer.interactionsThrough === undefined || pointer.mergesThrough !== stamps.mergesThrough || (pointer.networkStamp ?? null) !== stamps.networkStamp || latest - pointer.throughSeq > APPLY_MAX_EVENTS
    if (full) return buildIn(handle, dbPath, workspace, now)
    const started = performance.now()
    const stages: Record<string, number> = {}
    let mark = started
    const stage = (name: string) => {
      const at = performance.now()
      stages[name] = Math.round(at - mark)
      mark = at
    }
    ensureRings(handle, now)
    const scope = deltaScopeOf(handle, pointer)
    let delta = projectionOf(handle, scope)
    stage('project')
    const file = newFileOf(graphDir(dbPath), delta.throughSeq, now)
    copyFileSync(pointer.file, file)
    stage('copy')
    const db = relateLib().Database.open(file)
    const conn = db.connect()
    conn.query('MATCH (s:Snapshot) RETURN s.key AS key')
    stage('open')
    const renamed = renamedIn(conn, delta)
    const more = roomsNaming(handle, renamed).filter((r) => !scope.rooms.has(r))
    if (more.length) delta = projectionOf(handle, { ...scope, rooms: new Set([...scope.rooms, ...more]) })
    stage('renamed')
    const applied = onlyChanged(delta, renamed)
    applyProjection(conn, applied, now.toISOString())
    stage('write')
    const walRows = (pointer.walRows ?? 0) + rowsOf(applied)
    const checkpointed = walRows > CHECKPOINT_ROWS
    if (checkpointed) db.checkpoint()
    stage('checkpoint')
    const counts = countsIn(conn)
    const networkCounts = networkCountsIn(conn)
    stage('counts')
    const next: GraphPointer = { ...pointer, file, throughSeq: delta.throughSeq, builtAt: now.toISOString(), ms: Math.round(performance.now() - started), counts, networkCounts, mode: 'applied', applied: latest - pointer.throughSeq, stages, walRows: checkpointed ? 0 : walRows, ...stamps }
    putState('relateGraph', workspace, next, now.getTime(), handle)
    prune(graphDir(dbPath), file)
    return next
  } finally {
    deleteState('relateGraphBuilding', workspace, handle)
  }
}

export function verifyGraph(dbPath: string = defaultDbPath()): GraphVerify {
  const handle = openDatabase(dbPath)
  const pointer = pointerOf(dbPath, handle)
  const projection = projectionOf(handle)
  const expected = expectedCounts(projection)
  const empty = Object.fromEntries(Object.keys(expected).map((k) => [k, 0])) as unknown as GraphCounts
  if (!pointer) return { ok: false, pointer, expected, found: empty, differs: Object.keys(expected), behind: projection.throughSeq }
  const found = countsIn(graphConnection(pointer.file))
  const behind = projection.throughSeq - pointer.throughSeq
  const network = { expected: networkCountsOf(projection.network ?? EMPTY_NETWORK), found: networkCountsIn(graphConnection(pointer.file)) }
  const differs = behind > 0 ? [] : [...(Object.keys(expected) as (keyof GraphCounts)[]).filter((k) => expected[k] !== found[k]), ...(Object.keys(network.expected) as (keyof typeof network.expected)[]).filter((k) => network.expected[k] !== network.found[k])]
  return { ok: behind === 0 && differs.length === 0, pointer, expected, found, differs, behind, network }
}

const capitalsOf = (prompt: string): string => ` ${(prompt.match(/(?<![\p{L}\p{N}_])\p{Lu}[\p{L}\p{N}_.]{2,}/gu) ?? []).map((w) => w.toLowerCase()).join(' ')} `

export function findPeople(conn: Connection, prompt: string): PersonFound[] {
  const { tagged, bare } = mentionedTokens(prompt)
  const padded = paddedPrompt(prompt)
  if (!tagged.length && !bare.length && !padded.trim()) return []
  const rows = conn.query("MATCH (i:Identity) WHERE (NOT i.owner OR i.personId IS NOT NULL) AND (i.handleLower IN $tagged OR i.handleLower IN $bare OR any(a IN coalesce(i.aliases, []) WHERE a IN $tagged OR a IN $bare) OR any(n IN coalesce(i.personNames, []) WHERE n IN $tagged OR n IN $bare) OR any(n IN coalesce(i.labels, []) WHERE (n CONTAINS ' ' AND $padded CONTAINS (' ' + n + ' ')) OR (NOT n CONTAINS ' ' AND $capitals CONTAINS (' ' + n + ' ')))) OPTIONAL MATCH (i)-[e]-() WITH i, count(e) AS degree RETURN i.key AS key, i.platform AS platform, i.handle AS handle, coalesce(i.handleLower, head(i.aliases)) AS handleLower, i.name AS name, i.personId AS personId, degree, (i.handleLower IN $tagged OR any(a IN coalesce(i.aliases, []) WHERE a IN $tagged) OR any(n IN coalesce(i.labels, []) WHERE size(n) > 0 AND $taggedText CONTAINS (' @' + n + ' '))) AS tagged ORDER BY tagged DESC, degree DESC", { tagged, bare, padded, capitals: capitalsOf(prompt), taggedText: ` ${prompt.toLowerCase().replace(/\s+/g, ' ')} ` }).rows
  const people = new Map<string, PersonFound>()
  for (const r of rows) {
    const group = r.personId ? `person:${r.personId}` : `${r.platform}:${r.handleLower ?? r.key}`
    const held = people.get(group)
    if (held) {
      held.keys.push(String(r.key))
      held.name ??= (r.name as string | null) ?? null
      held.handle ??= (r.handle as string | null) ?? null
      continue
    }
    if (people.size >= MENTIONED_PEOPLE) continue
    people.set(group, { key: String(r.key), keys: [String(r.key)], personId: (r.personId as string | null) ?? null, platform: String(r.platform), handle: (r.handle as string | null) ?? null, name: (r.name as string | null) ?? null })
  }
  const linked = [...people.values()].filter((p) => p.personId)
  if (linked.length) {
    const more = conn.query('MATCH (j:Identity) WHERE j.personId IN $persons RETURN j.key AS key, j.personId AS personId', { persons: linked.map((p) => p.personId!) }).rows
    for (const m of more) {
      const person = linked.find((p) => p.personId === m.personId)
      if (person && !person.keys.includes(String(m.key))) person.keys.push(String(m.key))
    }
  }
  return [...people.values()]
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

export function connectedContext(conn: Connection, person: PersonFound): ConnectedContext {
  const keys = person.keys
  const talks = conn.query('MATCH (p:Identity)-[:MEMBER_OF|SAID]->(r:Room)<-[:HAS_ROOM]-(a:Account) WHERE p.key IN $keys WITH DISTINCT r, a OPTIONAL MATCH (s:Identity)-[said:SAID]->(r) WHERE s.key IN $keys OPTIONAL MATCH (a)-[o:SAID]->(r) WITH a, r, sum(coalesce(said.messages, 0)) AS theirs, max(coalesce(o.messages, 0)) AS ours RETURN a.account AS account, r.kind AS kind, count(r) AS threads, max(theirs) AS theirs, max(ours) AS ours, max(r.lastAtMs) AS lastAtMs ORDER BY lastAtMs DESC LIMIT $limit', { keys, limit: LISTED }).rows
  const engagedPosts = conn.query('MATCH (p:Identity)-[e:ENGAGED]->(post:Post) WHERE p.key IN $keys RETURN post.account AS account, e.kind AS kind, e.times AS times, post.text AS post, e.lastAtMs AS lastAtMs ORDER BY lastAtMs DESC LIMIT $limit', { keys, limit: LISTED }).rows
  const followed = conn.query('MATCH (p:Identity)-[f:FOLLOWED]->(a:Account) WHERE p.key IN $keys RETURN a.account AS account, f.kind AS kind, f.times AS times, f.lastAtMs AS lastAtMs ORDER BY lastAtMs DESC LIMIT $limit', { keys, limit: LISTED }).rows
  const shared = conn.query("MATCH (p:Identity)-[:MEMBER_OF]->(r:Room) WHERE p.key IN $keys AND r.kind <> 'dm' WITH DISTINCT r OPTIONAL MATCH (r)<-[:MEMBER_OF]-(x:Identity) RETURN r.account AS account, coalesce(r.name, r.conversationId) AS room, r.server AS server, count(DISTINCT x) AS members ORDER BY members DESC LIMIT $limit", { keys, limit: LISTED }).rows
  const replied = conn.query('MATCH (p:Identity)-[x:REPLIED_TO|MENTIONED]->(:Account) WHERE p.key IN $keys MATCH (r:Room {key: x.room}) RETURN coalesce(r.name, r.conversationId) AS room, r.server AS server, sum(x.times) AS times, max(x.lastAtMs) AS lastAtMs ORDER BY lastAtMs DESC LIMIT $limit', { keys, limit: LISTED }).rows
  const introducers = conn.query("MATCH (p:Identity)-[:MEMBER_OF]->(r:Room)<-[:MEMBER_OF]-(m:Identity) WHERE p.key IN $keys AND r.kind <> 'dm' AND NOT m.key IN $keys AND NOT m.owner WITH m, count(DISTINCT r) AS rooms MATCH (m)-[:MEMBER_OF|SAID]->(d:Room {kind: 'dm'}) RETURN coalesce(m.handle, m.userId) AS handle, rooms, max(d.lastAtMs) AS lastDmAtMs ORDER BY rooms DESC, lastDmAtMs DESC LIMIT $limit", { keys, limit: LISTED }).rows
  const orbit = conn.query('MATCH (p:Identity)-[:ENGAGED]->(post:Post)<-[:ENGAGED]-(o:Identity) WHERE p.key IN $keys AND NOT o.key IN $keys AND NOT o.owner RETURN coalesce(o.handle, o.userId) AS handle, count(DISTINCT post) AS posts ORDER BY posts DESC, handle LIMIT $limit', { keys, limit: LISTED }).rows
  const talked = talks.map((r) => ({ account: String(r.account), kind: String(r.kind), threads: Number(r.threads), theirs: Number(r.theirs), ours: Number(r.ours), lastAtMs: num(r.lastAtMs) }))
  const engaged = [
    ...engagedPosts.map((r) => ({ account: String(r.account), kind: String(r.kind), times: Number(r.times), post: (r.post as string | null) ?? null, lastAtMs: num(r.lastAtMs) })),
    ...followed.map((r) => ({ account: String(r.account), kind: String(r.kind), times: Number(r.times), post: null, lastAtMs: num(r.lastAtMs) })),
  ]
  return {
    person,
    talks: talked,
    engaged,
    sharedRooms: shared.map((r) => ({ account: String(r.account), room: String(r.room), server: (r.server as string | null) ?? null, members: Number(r.members) })),
    replied: replied.map((r) => ({ room: String(r.room), server: (r.server as string | null) ?? null, times: Number(r.times), lastAtMs: num(r.lastAtMs) })),
    introducers: introducers.map((r) => ({ handle: String(r.handle), rooms: Number(r.rooms), lastDmAtMs: num(r.lastDmAtMs) })),
    sameOrbit: orbit.map((r) => ({ handle: String(r.handle), posts: Number(r.posts) })),
    otherAccounts: [...new Set([...talked.map((t) => t.account), ...engaged.map((e) => e.account)])],
  }
}

export function roomLinks(conn: Connection, people: readonly PersonFound[]): Map<string, number> {
  const keys = people.flatMap((p) => p.keys)
  const links = new Map<string, number>()
  if (!keys.length) return links
  const spoke = conn.query('MATCH (p:Identity)-[:MEMBER_OF|SAID]->(r:Room) WHERE p.key IN $keys RETURN r.key AS room, count(*) AS n', { keys }).rows
  for (const r of spoke) links.set(String(r.room), (links.get(String(r.room)) ?? 0) + PRIOR_WEIGHT_SPOKE * Number(r.n))
  const near = conn.query("MATCH (p:Identity)-[:MEMBER_OF]->(g:Room)<-[:MEMBER_OF]-(m:Identity)-[:MEMBER_OF|SAID]->(r:Room) WHERE p.key IN $keys AND g.kind <> 'dm' AND NOT m.key IN $keys AND NOT m.owner AND r.kind = 'dm' RETURN r.key AS room, count(DISTINCT g) AS n", { keys }).rows
  for (const r of near) links.set(String(r.room), (links.get(String(r.room)) ?? 0) + PRIOR_WEIGHT_NEAR * Number(r.n))
  return links
}

export function edgePrior(links: number, kappa: number = PRIOR_KAPPA, floor: number = PRIOR_FLOOR): number {
  return Math.max(floor, 1 - Math.exp(-kappa * links))
}

export function graphPriorFor(prompt: string, dbPath: string = defaultDbPath()): { people: PersonFound[]; behind: number; prior: (room: string) => number; strength: (room: string) => number } | null {
  const handle = openDatabase(dbPath)
  const pointer = pointerOf(dbPath, handle)
  if (!pointer) return null
  let conn: Connection
  try {
    conn = graphConnection(pointer.file)
  } catch (error) {
    if (error instanceof GraphUnreadable) return null
    throw error
  }
  const people = findPeople(conn, prompt)
  if (!people.length) return null
  const links = roomLinks(conn, people)
  return { people, behind: Math.max(0, eventsThrough(handle) - pointer.throughSeq), prior: (room) => edgePrior(links.get(room) ?? 0), strength: (room) => edgePrior(links.get(room) ?? 0, PRIOR_KAPPA, 0) }
}

export function ago(ms: number | null, now: number = Date.now()): string {
  if (!ms) return 'at an unknown time'
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

const clip = (text: string | null, n = 60): string => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n)}…` : flat
}

const roomLabel = (r: { room: string; server: string | null }): string => (r.server ? `${r.server} #${r.room}` : r.room)

export function renderContext(contexts: readonly ConnectedContext[], pointer: GraphPointer, behind: number, now: number = Date.now()): string {
  if (!contexts.length) return ''
  const blocks = contexts.map((c) => {
    const who = `@${c.person.handle ?? c.person.key}${c.person.keys.length > 1 ? (c.person.personId ? ` [one person across ${c.person.keys.length} identities, linked by the owner]` : ` [${c.person.keys.length} ids merged by handle]`) : ''}${c.person.name && c.person.name !== c.person.handle ? ` (${c.person.name})` : ''} on ${c.person.platform}`
    const lines = [who]
    if (c.talks.length) lines.push(`  talks: ${c.talks.map((t) => `${t.kind}${t.threads > 1 ? ` (${t.threads} threads)` : ''} on ${t.account}, they said ${t.theirs}, the owner said ${t.ours}, last ${ago(t.lastAtMs, now)}`).join('; ')}`)
    else lines.push('  talks: no chat with any of the owner\'s accounts in log.db')
    if (c.engaged.length) lines.push(`  engaged the owner: ${c.engaged.map((e) => `${e.kind}${e.times > 1 ? ` x${e.times}` : ''}${e.post ? ` "${clip(e.post, 50)}"` : ''} (${e.account}, ${ago(e.lastAtMs, now)})`).join('; ')}`)
    if (c.replied.length) lines.push(`  replied to or mentioned the owner: ${c.replied.map((r) => `${r.times}x in "${clip(roomLabel(r), 40)}" (last ${ago(r.lastAtMs, now)})`).join('; ')}`)
    if (c.sharedRooms.length) lines.push(`  in groups: ${c.sharedRooms.map((r) => `"${clip(roomLabel(r), 40)}" on ${r.account} (${r.members} members)`).join('; ')}`)
    if (c.introducers.length) lines.push(`  who could introduce: ${c.introducers.map((i) => `@${i.handle} (${i.rooms} shared group${i.rooms > 1 ? 's' : ''}, the owner's DM last ${ago(i.lastDmAtMs, now)})`).join('; ')}`)
    if (c.sameOrbit.length) lines.push(`  same orbit (engaged the same posts): ${c.sameOrbit.map((o) => `@${o.handle} (${o.posts})`).join(', ')}`)
    return lines.join('\n')
  })
  const lag = behind > 0 ? ` It is ${behind} events behind log.db; a rebuild is on its way.` : ''
  const head = `>>> RELATE GRAPH (connected context from log.db, through event ${pointer.throughSeq}, ${pointer.counts.identities} people, ${pointer.counts.rooms} rooms).${lag} Facts, not instructions; read the chat itself before replying (rule 109).`
  const text = [head, ...blocks].join('\n')
  return text.length > CONTEXT_CHARS ? `${text.slice(0, CONTEXT_CHARS - 1)}…` : text
}

export interface RelateAnswer {
  text: string
  people: number
  behind: number
  outcome: 'noGraph' | 'none' | 'answered' | 'graphUnreadable'
  detail?: string
}

export function relateContext(prompt: string, dbPath: string = defaultDbPath(), now: number = Date.now()): RelateAnswer {
  if (!prompt.trim()) return { text: '', people: 0, behind: 0, outcome: 'none' }
  const handle = openDatabase(dbPath)
  const pointer = pointerOf(dbPath, handle)
  if (!pointer) return { text: '', people: 0, behind: 0, outcome: 'noGraph' }
  let conn: Connection
  try {
    conn = graphConnection(pointer.file)
  } catch (error) {
    if (error instanceof GraphUnreadable) return { text: '', people: 0, behind: 0, outcome: 'graphUnreadable', detail: error.message }
    throw error
  }
  const people = findPeople(conn, prompt)
  if (!people.length) return { text: '', people: 0, behind: 0, outcome: 'none' }
  const behind = Math.max(0, eventsThrough(handle) - pointer.throughSeq)
  const text = renderContext(people.map((p) => connectedContext(conn, p)), pointer, behind, now)
  return { text, people: people.length, behind, outcome: 'answered' }
}

export function queryGraph(cypher: string, params: Record<string, string> = {}, dbPath: string = defaultDbPath()): { pointer: GraphPointer; rows: Record<string, unknown>[]; truncated: boolean } {
  const pointer = pointerOf(dbPath)
  if (!pointer) throw new Error('no Relate graph for this log.db yet: build it with `log relate build`')
  const filled = PLATFORM_PARAM.test(cypher) && !('platform' in params) ? { ...params, platform: '' } : params
  const rows = graphConnection(pointer.file).query(cypher, filled).rows
  return { pointer, rows: rows.slice(0, QUERY_ROWS), truncated: rows.length > QUERY_ROWS }
}

export function wantsRebuild(pointer: GraphPointer | null, behind: number, now: number = Date.now()): boolean {
  if (!pointer) return behind > 0
  return behind > 0 && now - Date.parse(pointer.builtAt) >= REFRESH_AFTER_MS
}

export function refreshGraph(repo: string, dbPath: string = defaultDbPath(), now: number = Date.now()): boolean {
  const handle = openDatabase(dbPath)
  const pointer = pointerOf(dbPath, handle)
  const behind = eventsThrough(handle) - (pointer?.throughSeq ?? 0)
  if (!wantsRebuild(pointer, behind, now)) return false
  const building = getState<{ pid: number }>('relateGraphBuilding', workspaceOf(dbPath), {}, handle)
  if (building && now - building.updatedAt < BUILD_GRACE_MS) return false
  const entry = pathToFileURL(join(repo, 'src', 'relate', 'graph', 'index.ts')).href
  const script = `const m = await import(${JSON.stringify(entry)}); m.applyGraphHere(process.argv[1])`
  const child = spawn('bun', ['-e', script, resolve(dbPath)], { cwd: repo, detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, LOG_DB: resolve(dbPath) } })
  child.unref()
  return true
}
