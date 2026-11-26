import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { getState, putState } from '../../storage/state/index'
import { DEMO_NOW, seedDemoWorld } from './fixtures/demoWorld'
import { BUILD_WEEK, CONNECTED_NOW, CONNECTED_OWNER, MAKER_SERVER, seedConnectedWorld } from './fixtures/connectedWorld'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { buildGraph, edgePrior, graphDir, graphPriorFor, pointerOf, queryGraph, relateContext, verifyGraph, workspaceOf } from './index'
import { mentionedTokens } from './helpers/index'
import type { GraphPointer } from './index'
import { FRESH_DB_MS } from '../../../scripts/tests/timeouts.ts'

function demoDb(): string {
  const path = join(mkdtempSync(join(tmpdir(), 'relateGraph-')), 'log.db')
  seedDemoWorld(openDatabase(path))
  return path
}

const built = (() => {
  const path = demoDb()
  const pointer = buildGraph(path, new Date(DEMO_NOW))
  return { path, pointer }
})()

describe('the Relate graph projected from log.db', () => {
  test('holds exactly what the typed tables derive, node for node and edge for edge', async () => {
    const result = await verifyGraph(built.path)
    expect(result.differs).toEqual([])
    expect(result.ok).toBe(true)
    expect(built.pointer.counts).toEqual({ accounts: 2, identities: 9, rooms: 7, posts: 2, memberOf: 11, said: 15, engaged: 8, servers: 0, inServer: 0, persons: 0, linkedTo: 0, repliedTo: 0, mentioned: 0 })
    expect(built.pointer.file.startsWith(graphDir(built.path))).toBe(true)
  })

  test('names who could introduce the owner to someone he has never talked to, through the groups they share', async () => {
    const answer = await relateContext('can you intro me to @linus_k', built.path, DEMO_NOW)
    expect(answer.outcome).toBe('answered')
    expect(answer.text).toContain('@linus_k [2 ids merged by handle] (Linus) on twitter')
    expect(answer.text).toContain('who could introduce: @ada_codes (1 shared group, the owner\'s DM last 5 h ago); @grace_ships (1 shared group, the owner\'s DM last 2 days ago)')
    expect(answer.text).toContain('same orbit (engaged the same posts): @maya_ml (2), @ada_codes (1), @tom_builds (1)')
    expect(answer.text).toContain('@linus_k (Linus) on discord')
    expect(answer.text).toContain('who could introduce: @sam_rust (1 shared group, the owner\'s DM last 20 h ago); @grace_ships (1 shared group, the owner\'s DM last 2 days ago)')
    expect(answer.text).toContain('like "graphs beat vectors for who-knows-whom questions" (builderOwner, 9 h ago)')
    expect(answer.text).not.toMatch(/introduce:[^\n]*builderOwner/)
  })

  test('finds a person named without an @, with the chat both ways and the posts they share with others', async () => {
    const answer = await relateContext('draft a reply to ada_codes', built.path, DEMO_NOW)
    expect(answer.text).toContain('talks: group on builderOwner, they said 1, the owner said 1, last 3 h ago; dm on builderOwner, they said 2, the owner said 1, last 5 h ago')
    expect(answer.text).toContain('engaged the owner: reply "introducing log')
    expect(answer.text).toContain('same orbit (engaged the same posts): @linus_k (1), @maya_ml (1)')
  })

  test('says nothing when the prompt names nobody it knows', async () => {
    expect(await relateContext('fix the failing build please', built.path, DEMO_NOW)).toEqual({ text: '', people: 0, behind: 0, outcome: 'none' })
  })

  test('answers a Cypher query on the current graph', async () => {
    const result = await queryGraph("MATCH (i:Identity {handleLower: 'maya_ml'})-[e:ENGAGED]->(p:Post) RETURN e.kind AS kind ORDER BY kind", {}, built.path)
    expect(result.rows).toEqual([{ kind: 'like' }, { kind: 'repost' }])
  })

  test('marks itself behind when log.db moves on, and says it read the last graph file because no graph owner runs', async () => {
    const path = demoDb()
    buildGraph(path, new Date(DEMO_NOW))
    openDatabase(path).prepare("INSERT INTO events (eventId, platform, account, conversationId, type, receivedAt, appendedAt) VALUES ('demo:new', 'twitter', 'builderOwner', 'x', 'message', ?, ?)").run(new Date(DEMO_NOW).toISOString(), new Date(DEMO_NOW).toISOString())
    const answer = await relateContext('@ada_codes', path, DEMO_NOW)
    expect(answer.behind).toBe(1)
    expect(answer.served).toBe('file')
    expect(answer.text).toContain('The graph owner is not running, so this is read from the last graph file, 1 events behind log.db.')
  }, FRESH_DB_MS)

  test("keeps one workspace's graph out of another's, and drops a graph built by another projector version", async () => {
    const other = join(mkdtempSync(join(tmpdir(), 'relateGraph-')), 'log.db')
    openDatabase(other)
    expect(workspaceOf(other)).not.toBe(workspaceOf(built.path))
    expect(graphDir(other)).not.toBe(graphDir(built.path))
    expect(pointerOf(other)).toBeNull()
    expect((await relateContext('@ada_codes', other, DEMO_NOW)).outcome).toBe('noGraph')
    const path = demoDb()
    buildGraph(path, new Date(DEMO_NOW))
    const handle = openDatabase(path)
    const pointer = getState<GraphPointer>('relateGraph', workspaceOf(path), {}, handle)!.body
    putState('relateGraph', workspaceOf(path), { ...pointer, projectorVersion: 0 }, DEMO_NOW, handle)
    expect(pointerOf(path)).toBeNull()
  }, FRESH_DB_MS)

  test('reads @handles and bare words, and leaves common words out', async () => {
    expect(mentionedTokens('ask @Linus_K. about reply to ada_codes with them')).toEqual({ tagged: ['linus_k'], bare: ['ada_codes'] })
  })
})

describe('the graph prior for search (BayesRAG, appendix A.2.2)', () => {
  test('rooms a named person is in get a high prior, rooms with no link to them keep the floor', async () => {
    const graph = await graphPriorFor('what did @grace_ships say about the launch', built.path)
    expect(graph).not.toBeNull()
    const rooms = (await queryGraph("MATCH (p:Identity {handleLower: 'grace_ships'})-[:MEMBER_OF|SAID]->(r:Room) RETURN DISTINCT r.key AS room", {}, built.path)).rows.map((r) => String(r.room))
    expect(rooms.length).toBeGreaterThan(0)
    for (const room of rooms) expect(graph!.prior(room)).toBeGreaterThan(0.75)
    expect(graph!.prior('nowhere:none:0')).toBeCloseTo(0.1)
  })

  test('a query that names no one gives no prior, so search ranks on the retrievers alone', async () => {
    expect(await graphPriorFor('what was said about the launch', built.path)).toBeNull()
  })

  test('the edge prior saturates: more links help less each time', async () => {
    expect(edgePrior(0)).toBeCloseTo(0.1)
    expect(edgePrior(1)).toBeLessThan(edgePrior(3))
    expect(edgePrior(6) - edgePrior(3)).toBeLessThan(edgePrior(3) - edgePrior(0))
    expect(edgePrior(100)).toBeLessThanOrEqual(1)
  })
})

const connected = (() => {
  const path = join(mkdtempSync(join(tmpdir(), 'relateConnected-')), 'log.db')
  seedConnectedWorld(openDatabase(path))
  return { path, pointer: buildGraph(path, new Date(CONNECTED_NOW)) }
})()

const ask = async (cypher: string) => (await queryGraph(cypher, {}, connected.path)).rows

describe('rooms, servers, people and replies in the graph (#266)', () => {
  test('a server channel stored as a DM named after a speaker is a channel with its own name, under its Server', async () => {
    const room = `discord:${CONNECTED_OWNER.account}:${BUILD_WEEK}`
    expect(await ask(`MATCH (r:Room {key: '${room}'})-[:IN_SERVER]->(s:Server) RETURN r.kind AS kind, r.name AS name, r.server AS server, s.name AS serverName, s.serverId AS serverId`)).toEqual([{ kind: 'channel', name: 'buildWeek', server: MAKER_SERVER.name, serverName: MAKER_SERVER.name, serverId: MAKER_SERVER.id }])
    expect(await ask("MATCH (r:Room {conversationId: 'chanUnlisted'}) RETURN r.kind AS kind, r.name AS name")).toEqual([{ kind: 'channel', name: null }])
    expect(await ask("MATCH (r:Room {conversationId: 'dmOak'}) RETURN r.kind AS kind, r.name AS name")).toEqual([{ kind: 'dm', name: 'Oak Bench' }])
    expect((await ask(`MATCH (i:Identity)-[:SAID]->(:Room)-[:IN_SERVER]->(:Server {serverId: '${MAKER_SERVER.id}'}) RETURN DISTINCT i.handle AS handle ORDER BY handle`)).map((r) => r.handle)).toEqual(['oak_bench', 'pine_cart', 'quill_maker'])
    expect(connected.pointer.counts).toMatchObject({ servers: 2, inServer: 3, persons: 1, linkedTo: 2 })
  })

  test('identities the owner linked share one Person, and the context merges them', async () => {
    expect(await ask("MATCH (i:Identity)-[:LINKED_TO]->(p:Person) RETURN p.name AS person, i.platform AS platform ORDER BY platform")).toEqual([{ person: 'Quill Maker', platform: 'discord' }, { person: 'Quill Maker', platform: 'twitter' }])
    expect((await relateContext('reply to @quillmaker', connected.path, CONNECTED_NOW)).text).toContain('[one person across 2 identities, linked by the owner]')
  })

  test('ask finds people by display name, the way saidBy does, and by handle', async () => {
    const answer = await relateContext('@Quill Maker and Oak Bench', connected.path, CONNECTED_NOW)
    expect(answer.people).toBe(2)
    expect(answer.text).toContain('@quill_maker')
    expect(answer.text).toContain('@oak_bench')
    expect((await relateContext('what did Pine Cart want', connected.path, CONNECTED_NOW)).text).toContain('@pine_cart')
    expect((await relateContext('the pine cart', connected.path, CONNECTED_NOW)).outcome).toBe('answered')
    expect((await relateContext('fix the oak table', connected.path, CONNECTED_NOW)).outcome).toBe('none')
  })

  test('SAID keeps first and last times, and replies and mentions point at the owner or the person', async () => {
    const room = `discord:${CONNECTED_OWNER.account}:${BUILD_WEEK}`
    expect(await ask(`MATCH (i:Identity {handle: 'quill_maker'})-[s:SAID]->(:Room {key: '${room}'}) RETURN s.messages AS messages, s.firstAtMs AS firstAtMs, s.lastAtMs AS lastAtMs`)).toEqual([{ messages: 2, firstAtMs: CONNECTED_NOW - 55 * 60_000, lastAtMs: CONNECTED_NOW - 20 * 60_000 }])
    expect(await ask(`MATCH (i:Identity)-[r:REPLIED_TO {room: '${room}'}]->(a:Account) WHERE r.lastAtMs > ${CONNECTED_NOW - 3_600_000} RETURN i.handle AS handle, a.account AS account`)).toEqual([{ handle: 'quill_maker', account: CONNECTED_OWNER.account }])
    expect(await ask('MATCH (i:Identity)-[r:REPLIED_TO]->(j:Identity) RETURN i.handle AS from, j.handle AS to')).toEqual([{ from: 'quill_maker', to: 'oak_bench' }])
    expect(await ask('MATCH (i:Identity)-[r:MENTIONED]->(a:Account) RETURN i.handle AS from, a.account AS to')).toEqual([{ from: 'oak_bench', to: CONNECTED_OWNER.account }])
    expect(await ask('MATCH (i:Identity)-[r:MENTIONED]->(j:Identity) RETURN i.handle AS from, j.handle AS to')).toEqual([{ from: 'pine_cart', to: 'quill_maker' }])
    expect((await relateContext('@oak_bench', connected.path, CONNECTED_NOW)).text).toContain('replied to or mentioned the owner: 1x in "Maker Guild #buildWeek" (last 40 min ago)')
  })

  test('a build leaves no writable handle behind, so another process can read the graph at once', async () => {
    const script = `const { Database } = require('@relate/relate'); const db = Database.open(process.argv[1], { readOnly: true }); process.stdout.write(String(db.connect().query('MATCH (s:Server) RETURN count(s) AS n').rows[0].n))`
    const read = spawnSync(process.execPath, ['-e', script, connected.pointer.file], { encoding: 'utf8', cwd: join(import.meta.dir, '..', '..', '..') })
    expect(read.stderr).toBe('')
    expect(read.stdout).toBe('2')
  })

  test('a graph file that cannot be opened is a coded outcome, never a thrown hook error', async () => {
    const path = demoDb()
    buildGraph(path, new Date(DEMO_NOW))
    const handle = openDatabase(path)
    const pointer = getState<GraphPointer>('relateGraph', workspaceOf(path), {}, handle)!.body
    const broken = join(graphDir(path), 'graph-broken.rl')
    writeFileSync(broken, 'not a graph')
    putState('relateGraph', workspaceOf(path), { ...pointer, file: broken }, DEMO_NOW, handle)
    const answer = await relateContext('@ada_codes', path, DEMO_NOW)
    expect(answer.outcome).toBe('graphUnreadable')
    expect(answer.detail).toStartWith('graphUnreadable:')
    expect(await graphPriorFor('@ada_codes', path)).toBeNull()
  }, FRESH_DB_MS)
})
