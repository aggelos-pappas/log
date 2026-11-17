import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { getState, putState } from '../../storage/state/index'
import { DEMO_NOW, seedDemoWorld } from './fixtures/demoWorld'
import { buildGraph, graphDir, pointerOf, queryGraph, relateContext, verifyGraph, wantsRebuild, workspaceOf } from './index'
import { mentionedTokens } from './helpers/index'
import type { GraphPointer } from './index'

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
  test('holds exactly what the typed tables derive, node for node and edge for edge', () => {
    const result = verifyGraph(built.path)
    expect(result.differs).toEqual([])
    expect(result.ok).toBe(true)
    expect(built.pointer.counts).toEqual({ accounts: 2, identities: 9, rooms: 7, posts: 2, memberOf: 11, said: 15, engaged: 8 })
    expect(built.pointer.file.startsWith(graphDir(built.path))).toBe(true)
  })

  test('names who could introduce the owner to someone he has never talked to, through the groups they share', () => {
    const answer = relateContext('can you intro me to @linus_k', built.path, DEMO_NOW)
    expect(answer.outcome).toBe('answered')
    expect(answer.text).toContain('@linus_k [2 ids merged by handle] (Linus) on twitter')
    expect(answer.text).toContain('who could introduce: @ada_codes (1 shared group, the owner\'s DM last 5 h ago); @grace_ships (1 shared group, the owner\'s DM last 2 days ago)')
    expect(answer.text).toContain('same orbit (engaged the same posts): @maya_ml (2), @ada_codes (1), @tom_builds (1)')
    expect(answer.text).toContain('@linus_k (Linus) on discord')
    expect(answer.text).toContain('who could introduce: @sam_rust (1 shared group, the owner\'s DM last 20 h ago); @grace_ships (1 shared group, the owner\'s DM last 2 days ago)')
    expect(answer.text).toContain('like "graphs beat vectors for who-knows-whom questions" (builderOwner, 9 h ago)')
    expect(answer.text).not.toMatch(/introduce:[^\n]*builderOwner/)
  })

  test('finds a person named without an @, with the chat both ways and the posts they share with others', () => {
    const answer = relateContext('draft a reply to ada_codes', built.path, DEMO_NOW)
    expect(answer.text).toContain('talks: group on builderOwner, they said 1, the owner said 1, last 3 h ago; dm on builderOwner, they said 2, the owner said 1, last 5 h ago')
    expect(answer.text).toContain('engaged the owner: reply "introducing log')
    expect(answer.text).toContain('same orbit (engaged the same posts): @linus_k (1), @maya_ml (1)')
  })

  test('says nothing when the prompt names nobody it knows', () => {
    expect(relateContext('fix the failing build please', built.path, DEMO_NOW)).toEqual({ text: '', people: 0, behind: 0, outcome: 'none' })
  })

  test('answers a Cypher query on the current graph', () => {
    const result = queryGraph("MATCH (i:Identity {handleLower: 'maya_ml'})-[e:ENGAGED]->(p:Post) RETURN e.kind AS kind ORDER BY kind", {}, built.path)
    expect(result.rows).toEqual([{ kind: 'like' }, { kind: 'repost' }])
  })

  test('marks itself behind when log.db moves on, and only asks for a rebuild of a graph that exists once it is a minute old', () => {
    const path = demoDb()
    const pointer = buildGraph(path, new Date(DEMO_NOW))
    openDatabase(path).prepare("INSERT INTO events (eventId, platform, account, conversationId, type, receivedAt, appendedAt) VALUES ('demo:new', 'twitter', 'builderOwner', 'x', 'message', ?, ?)").run(new Date(DEMO_NOW).toISOString(), new Date(DEMO_NOW).toISOString())
    const answer = relateContext('@ada_codes', path, DEMO_NOW)
    expect(answer.behind).toBe(1)
    expect(answer.text).toContain('It is 1 events behind log.db')
    expect(wantsRebuild(pointer, 1, DEMO_NOW + 10_000)).toBe(false)
    expect(wantsRebuild(pointer, 1, DEMO_NOW + 61_000)).toBe(true)
    expect(wantsRebuild(pointer, 0, DEMO_NOW + 61_000)).toBe(false)
    expect(wantsRebuild(null, 5, DEMO_NOW + 61_000)).toBe(false)
  })

  test("keeps one workspace's graph out of another's, and drops a graph built by another projector version", () => {
    const other = join(mkdtempSync(join(tmpdir(), 'relateGraph-')), 'log.db')
    openDatabase(other)
    expect(workspaceOf(other)).not.toBe(workspaceOf(built.path))
    expect(graphDir(other)).not.toBe(graphDir(built.path))
    expect(pointerOf(other)).toBeNull()
    expect(relateContext('@ada_codes', other, DEMO_NOW).outcome).toBe('noGraph')
    const path = demoDb()
    buildGraph(path, new Date(DEMO_NOW))
    const handle = openDatabase(path)
    const pointer = getState<GraphPointer>('relateGraph', workspaceOf(path), {}, handle)!.body
    putState('relateGraph', workspaceOf(path), { ...pointer, projectorVersion: 0 }, DEMO_NOW, handle)
    expect(pointerOf(path)).toBeNull()
  })

  test('reads @handles and bare words, and leaves common words out', () => {
    expect(mentionedTokens('ask @Linus_K. about reply to ada_codes with them')).toEqual({ tagged: ['linus_k'], bare: ['ada_codes'] })
  })
})
