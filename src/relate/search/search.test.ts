import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { buildIndex, hashEmbedder } from '../../search/conversations/index'
import type { Conversation } from '../../search/conversations/index'
import { relateAnswer } from '../../agentHooks/answers/index'
import { DEMO_NOW, DEMO_OWNER, seedDemoWorld } from '../graph/fixtures/demoWorld'
import { buildGraph } from '../graph/index'
import { connectedSearch, renderSearched } from './index'

const message = (id: string, from: string | null, text: string, at: string) => ({ id, at, from, fromMe: from === null, text })

const conversations: Conversation[] = [
  { platform: 'twitter', account: DEMO_OWNER.xAccount, conversationId: `${DEMO_OWNER.xUserId}-2000000002`, box: 'inbox', with: ['grace_ships'], messages: [message('g1', 'grace_ships', 'want to pair on the relate hackathon?', '2026-11-15T08:00:00Z'), message('g2', null, 'yes, next week works', '2026-11-15T10:00:00Z')] },
  { platform: 'twitter', account: DEMO_OWNER.xAccount, conversationId: 'strangerDm', box: 'inbox', with: ['stranger'], messages: [message('s1', 'stranger', 'hackathon hackathon who is going to the hackathon', '2026-11-16T08:00:00Z')] },
  { platform: 'twitter', account: DEMO_OWNER.xAccount, conversationId: `${DEMO_OWNER.xUserId}-2000000004`, box: 'inbox', with: ['tom_builds'], messages: [message('t1', 'tom_builds', 'is there a hosted version?', '2026-11-09T08:00:00Z')] },
]

const world = await (async () => {
  const root = mkdtempSync(join(tmpdir(), 'relateSearch-'))
  const dbPath = join(root, 'log.db')
  seedDemoWorld(openDatabase(dbPath))
  buildGraph(dbPath, new Date(DEMO_NOW))
  const indexDir = join(root, 'index')
  await buildIndex(conversations, hashEmbedder(), indexDir)
  return { dbPath, indexDir, deps: { dbPath, indexDir, embedder: () => hashEmbedder() } }
})()

describe('one search: keyword, meaning and relationship fused, for the hook', () => {
  test('a person and a topic find that person\'s chat over a stranger who says the word more', async () => {
    const found = await connectedSearch('what did grace_ships say about the hackathon', world.deps)
    expect(found).not.toBeNull()
    expect(found!.people.map((p) => p.handle)).toContain('grace_ships')
    expect(found!.hits[0].chunk.with).toEqual(['grace_ships'])
    expect(found!.hits[0].relationRank).not.toBeNull()
    expect(found!.text).toContain('>>> FROM THE CONVERSATIONS')
    expect(found!.text).toContain('relate hackathon')
  })

  test('a prompt that names no one runs nothing and injects nothing', async () => {
    expect(await connectedSearch('fix the failing build please', world.deps)).toBeNull()
  })

  test('no search index means no search, never an error', async () => {
    expect(await connectedSearch('grace_ships hackathon', { ...world.deps, indexDir: join(world.indexDir, 'missing') })).toBeNull()
  })

  test('a search that runs past its budget is dropped, so the hook never hangs', async () => {
    const slow = { ...world.deps, budgetMs: 0 }
    expect(await connectedSearch('grace_ships hackathon', slow)).toBeNull()
  })

  test('nothing is rendered when nothing passed', () => {
    expect(renderSearched([])).toBe('')
  })

  test('the hook injects the relationship card and the fused search together', async () => {
    const answer = await relateAnswer(JSON.stringify({ prompt: 'reply to @grace_ships about the hackathon' }), '.', () => connectedSearch('reply to @grace_ships about the hackathon', world.deps), world.dbPath)
    expect(answer.context).toContain('>>> RELATE GRAPH')
    expect(answer.context).toContain('>>> FROM THE CONVERSATIONS')
  })
})
