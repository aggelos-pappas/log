import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { storedNetwork } from '../../extensions/memeTaste/helpers/nicheMap'
import { DEMO_NOW, seedDemoWorld } from '../graph/fixtures/demoWorld'
import { WHO_TO_TALK_TO, buildGraph, queryGraph, verifyGraph } from '../graph/index'
import { NETWORK_FIXTURE } from './fixtures/neutralNetwork'
import { importNetwork, networkDir, networkImported, storedNetworkPeople } from './index'

const root = mkdtempSync(join(tmpdir(), 'network-'))

function fixtureDir(): string {
  const dir = join(root, 'data')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'final_scores.json'), JSON.stringify(NETWORK_FIXTURE.scores))
  writeFileSync(join(dir, 'nicheMap.json'), JSON.stringify(NETWORK_FIXTURE.map))
  return dir
}

const dir = fixtureDir()
const dbPath = join(root, 'log.db')
mkdirSync(join(root, 'plain'), { recursive: true })
const plain = join(root, 'plain', 'log.db')
seedDemoWorld(openDatabase(dbPath))

afterAll(() => {
  openDatabase(dbPath).close()
  openDatabase(plain).close()
  Bun.gc(true)
  rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

describe('the network import', () => {
  test('writes people, leaders, communities, circles and mentions into log.db, around the X account found in the circles', async () => {
    const outcome = importNetwork(openDatabase(dbPath), dir)
    if (!outcome.ok) throw new Error(outcome.problem)
    expect(outcome.summary.account).toBe('builderOwner')
    expect(outcome.summary.counts).toEqual({ people: 7, leaders: 4, communities: 3, runs: 4, circles: 13, mentions: 3, follows: 1 })
    const maya = openDatabase(dbPath).prepare("SELECT ring, band, topThemes, role, followsOwner FROM networkPeople WHERE handleLower = 'maya_ml'").get()
    expect(maya).toEqual({ ring: 2, band: 'member', topThemes: '["graphs","agents","outbound"]', role: 'builder', followsOwner: 1 })
    const kai = openDatabase(dbPath).prepare("SELECT lastPostText FROM networkPeople WHERE handleLower = 'kai_new'").get()
    expect(kai).toEqual({ lastPostText: 'my newest post about graphs' })
  })

  test('reruns safely, replacing the last import rather than adding to it', async () => {
    const again = importNetwork(openDatabase(dbPath), dir)
    expect(again.ok && again.summary.counts.circles).toBe(13)
    expect((openDatabase(dbPath).prepare('SELECT COUNT(*) AS n FROM networkCircles').get() as { n: number }).n).toBe(13)
    expect(networkImported(openDatabase(dbPath))?.source).toBe(dir)
  })

  test('refuses a folder without the two files and changes nothing', async () => {
    const outcome = importNetwork(openDatabase(dbPath), join(root, 'nowhere'))
    expect(outcome.ok).toBe(false)
    expect(networkImported(openDatabase(dbPath))?.counts.people).toBe(7)
  })

  test('finds its folder from LOG_NETWORK_DIR, then the old LOG_NICHE_MAP file', async () => {
    expect(networkDir({ LOG_NETWORK_DIR: '/data/net', LOG_NICHE_MAP: '/old/nicheMap.json' })).toBe('/data/net')
    expect(networkDir({ LOG_NICHE_MAP: '/old/nicheMap.json' }).replace(/\\/g, '/')).toBe('/old')
  })

  test('memeTaste reads its people from log.db once imported', async () => {
    expect(storedNetworkPeople(openDatabase(dbPath)).map((p) => p.handle).sort()).toEqual(['bot_one', 'maya_ml'])
    expect(storedNetwork(dbPath)?.source).toBe(dir)
  })
})

describe('the network in the Relate graph', () => {
  const pointer = (() => {
    importNetwork(openDatabase(dbPath), dir)
    return buildGraph(dbPath, new Date(DEMO_NOW))
  })()

  test('adds leaders, communities and their edges, and verify agrees with log.db', async () => {
    expect(pointer.networkCounts).toEqual({ leaders: 4, communities: 3, inCircleOf: 13, runs: 4, networkMentioned: 2, follows: 1 })
    expect(pointer.counts.identities).toBe(13)
    const result = await verifyGraph(dbPath)
    expect(result.differs).toEqual([])
    expect(result.ok).toBe(true)
  })

  test('merges a network person with the chat identity of the same X handle', async () => {
    const rows = (await queryGraph("MATCH (i:Identity {handleLower: 'maya_ml'}) RETURN i.key AS key, i.band AS band, i.ring AS ring, i.themes AS themes", {}, dbPath)).rows
    expect(rows).toEqual([{ key: 'twitter:2000000005', band: 'member', ring: 1, themes: ['graphs', 'agents', 'outbound'] }])
    expect((await queryGraph("MATCH (i:Identity {handleLower: 'maya_ml'})-[:FOLLOWS]->(a:Account) RETURN a.account AS account", {}, dbPath)).rows).toEqual([{ account: 'builderOwner' }])
    expect((await queryGraph("MATCH (l:Leader {handleLower: 'chart_lead'})-[:RUNS]->(c:Community) RETURN c.name AS name", {}, dbPath)).rows).toEqual([{ name: 'Graph Guild' }])
  })

  test('ranks who to talk to: ring 2 first, then rings 1, 3 and 4, most circles, collaborators and members only, nobody already talked to', async () => {
    const rows = (await queryGraph(WHO_TO_TALK_TO, {}, dbPath)).rows
    expect(rows.map((r) => [r.handle, r.ring, r.why])).toEqual([['kai_new', 2, 'imported'], ['maya_ml', 1, 'repost'], ['linus_k', 1, 'like'], ['linus_k', 1, 'like'], ['rio_far', 4, 'known']])
    expect(rows[0]).toMatchObject({ band: 'collaborator', ring: 2, circles: 3, sameCircleTalksToYou: ['ada_codes'], mentionedBy: ['ada_codes'], lastPost: 'my newest post about graphs' })
  })

  test('a user with no import still gets a ranked list, from their live rings alone', async () => {
    seedDemoWorld(openDatabase(plain))
    buildGraph(plain, new Date(DEMO_NOW))
    const rows = (await queryGraph(WHO_TO_TALK_TO, {}, plain)).rows
    expect(rows.map((r) => [r.handle, r.ring, r.why, r.band ?? null]).sort()).toEqual([['linus_k', 1, 'like', null], ['linus_k', 1, 'like', null], ['maya_ml', 1, 'repost', null]])
  })

  test('the play runs the same Cypher the code tests', async () => {
    expect(readFileSync(join(import.meta.dir, '..', '..', '..', 'docs', 'useCases', 'network', 'whoToTalkTo.md'), 'utf8')).toContain(WHO_TO_TALK_TO)
  })
})
