import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { insertEventRow } from '../../storage/platform/index'
import { openDatabase } from '../../storage/schema/index'
import { NETWORK_FIXTURE } from '../network/fixtures/neutralNetwork'
import { importNetwork } from '../network/index'
import { DEMO_NOW, DEMO_OWNER, seedDemoWorld } from './fixtures/demoWorld'
import { applyGraph, buildGraph, readFromFile, verifyGraph } from './index'
import type { GraphPointer } from './index'

const root = mkdtempSync(join(tmpdir(), 'relateApply-'))
const dbPath = join(root, 'log.db')

afterAll(() => {
  openDatabase(dbPath).close()
  Bun.gc(true)
  rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

const iso = (minutes: number): string => new Date(DEMO_NOW + minutes * 60_000).toISOString()

async function dump(pointer: GraphPointer): Promise<string[]> {
  const [nodes, edges] = await readFromFile(pointer.file, async (ask) => [await ask('MATCH (n) WHERE NOT n:Snapshot RETURN labels(n) AS labels, properties(n) AS props'), await ask('MATCH (a)-[e]->(b) RETURN type(e) AS type, a.key AS from, b.key AS to, properties(e) AS props')])
  const sorted = (v: unknown): unknown => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, sorted(x)])) : v)
  return [...nodes, ...edges].map((r) => JSON.stringify(sorted(r))).sort()
}

describe('the Relate graph updated in place from new events', () => {
  const dir = join(root, 'data')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'final_scores.json'), JSON.stringify(NETWORK_FIXTURE.scores))
  writeFileSync(join(dir, 'nicheMap.json'), JSON.stringify(NETWORK_FIXTURE.map))
  const handle = openDatabase(dbPath)
  seedDemoWorld(handle)
  importNetwork(handle, dir)
  const x = DEMO_OWNER.xAccount
  insertEventRow(handle, { platform: 'twitter', account: x, conversationId: 'groupAgentBuilders', type: 'message', with: 'ada_codes', text: 'ask @kai_new about graphs', box: 'group', payload: { id: 'm1', senderId: '2000000001' }, sourceAt: iso(1), receivedAt: iso(1), source: 'live' })
  const first = buildGraph(dbPath, new Date(DEMO_NOW + 60_000))

  test('applies only the new events, and equals a full build of the same log.db node for node and edge for edge', async () => {
    insertEventRow(handle, { platform: 'twitter', account: x, conversationId: '', type: 'notification', with: 'kai_new', text: 'kai_new followed you', box: '', payload: { userId: '2000000099', handle: 'kai_new', kind: 'follow', key: 'followKai', at: iso(2) }, sourceAt: iso(2), receivedAt: iso(2), source: 'live' })
    insertEventRow(handle, { platform: 'twitter', account: x, conversationId: '', type: 'notification', with: 'tom_builds', text: 'tom_builds liked', box: '', payload: { userId: '2000000004', handle: 'tom_builds', kind: 'like', key: 'likeTom', postId: 'postLaunch', postText: 'introducing log', at: iso(3) }, sourceAt: iso(3), receivedAt: iso(3), source: 'live' })
    insertEventRow(handle, { platform: 'twitter', account: x, conversationId: 'groupAgentBuilders', type: 'message', with: 'maya_ml', text: 'replying to ada', box: 'group', payload: { id: 'm2', senderId: '2000000005', replyTo: 'm1' }, sourceAt: iso(4), receivedAt: iso(4), source: 'live' })
    insertEventRow(handle, { platform: 'discord', account: DEMO_OWNER.discordAccount, conversationId: 'dmZoe', type: 'message', with: 'zoe_new', text: 'hi, found you through the demo', box: 'dm', payload: { id: 'z1', senderId: '9000000009' }, sourceAt: iso(5), receivedAt: iso(5), source: 'live' })
    const applied = applyGraph(dbPath, new Date(DEMO_NOW + 10 * 60_000))
    expect(applied.mode).toBe('applied')
    expect(applied.applied).toBe(4)
    expect(applied.throughSeq).toBeGreaterThan(first.throughSeq)
    expect((await verifyGraph(dbPath)).differs).toEqual([])
    expect((await verifyGraph(dbPath)).ok).toBe(true)
    const kai = await readFromFile(applied.file, (ask) => ask("MATCH (i:Identity {handleLower: 'kai_new'}) OPTIONAL MATCH (i)-[:IN_CIRCLE_OF]->(l:Leader) RETURN i.key AS key, i.ring AS ring, i.ringReason AS why, count(l) AS circles"))
    expect(kai).toEqual([{ key: 'twitter:2000000099', ring: 2, why: 'imported', circles: 3 }])
    expect(await readFromFile(applied.file, (ask) => ask("MATCH (:Identity {handleLower: 'ada_codes'})-[m:MENTIONED]->(:Identity {key: 'twitter:2000000099'}) WHERE m.source IS NULL RETURN m.times AS times"))).toEqual([{ times: 1 }])
    const incremental = await dump(applied)
    const full = buildGraph(dbPath, new Date(DEMO_NOW + 11 * 60_000))
    expect(full.mode).toBe('full')
    expect(incremental).toEqual(await dump(full))
  })

  test('nothing new means nothing to apply, and the pointer stays', async () => {
    const before = (await verifyGraph(dbPath)).pointer!
    const again = applyGraph(dbPath, new Date(DEMO_NOW + 12 * 60_000))
    expect(again.file).toBe(before.file)
    expect((await verifyGraph(dbPath)).ok).toBe(true)
  })
})
