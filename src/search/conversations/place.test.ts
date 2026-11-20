import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildIndex, chunkPlace, chunksOf, hashEmbedder, openIndex, placeFromBox, placeMatches, search, whereSaid } from './index'
import type { Conversation, Place } from './index'

const dir = mkdtempSync(join(tmpdir(), 'placeSearch'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const chat = (id: string, platform: string, box: string, people: string[], text: string, place?: Place): Conversation => ({
  platform,
  account: 'someAccount',
  conversationId: id,
  box,
  with: people,
  ...(place ? { place } : {}),
  messages: [{ id: `${id}m0`, at: '2026-11-19T12:00:00Z', from: people[0] ?? null, fromMe: false, text }],
})

describe('where a message was said', () => {
  test('a DM, a group DM and a server channel read differently', () => {
    expect(whereSaid('discord', placeFromBox('discord', 'dm ada'), ['ada'])).toBe('discord dm @ada')
    expect(whereSaid('discord', placeFromBox('discord', 'group builders'), ['ada', 'linus', 'grace'])).toBe('discord group builders (ada, linus, grace)')
    expect(whereSaid('discord', { kind: 'channel', server: 'Scraping Enthusiasts', channel: 'general' }, Array.from({ length: 76 }, (_, i) => `member${i}`))).toBe('discord channel Scraping Enthusiasts #general')
  })

  test('a server channel never prints its member list', () => {
    const line = whereSaid('discord', { kind: 'channel', serverId: '1', channel: 'general' }, ['ada', 'linus'])
    expect(line).not.toContain('ada')
    expect(line).toBe('discord channel server 1 #general')
  })

  test('the account itself is never named as the other side', () => {
    expect(whereSaid('twitter', { kind: 'dm' }, ['someAccount', 'ada'], 'someAccount')).toBe('twitter dm @ada')
  })

  test('every platform maps its chats to the same kinds', () => {
    expect(placeFromBox('twitter', 'xchat', '1-2').kind).toBe('dm')
    expect(placeFromBox('twitter', 'inbox+xchat', '1:2').kind).toBe('dm')
    expect(placeFromBox('twitter', 'xchat', 'g2004865989830476207').kind).toBe('group')
    expect(placeFromBox('slack', 'channel general').kind).toBe('channel')
    expect(placeFromBox('instagram', 'group AI Coworking')).toEqual({ kind: 'group', channel: 'AI Coworking' })
    expect(placeFromBox('reddit', 'post').kind).toBe('post')
    expect(placeFromBox('discord', 'thread').kind).toBe('thread')
  })

  test('a chunk carries the place of its conversation, and an old chunk without one falls back to the names', () => {
    const [chunk] = chunksOf(chat('c', 'discord', 'channel', ['ada'], 'hello', { kind: 'channel', server: 'S', channel: 'general' }))
    expect(chunkPlace(chunk)).toEqual({ kind: 'channel', server: 'S', channel: 'general' })
    expect(whereSaid('discord', chunkPlace({ ...chunk, place: undefined }), ['ada'])).toBe('discord with @ada')
  })

  test('filters match kind, server by name or id, and channel', () => {
    const place: Place = { kind: 'channel', server: 'Scraping Enthusiasts', serverId: '42', channel: 'general' }
    expect(placeMatches(place, { kind: 'channel' })).toBe(true)
    expect(placeMatches(place, { kind: 'dm' })).toBe(false)
    expect(placeMatches(place, { server: 'scraping enthusiasts' })).toBe(true)
    expect(placeMatches(place, { server: '42' })).toBe(true)
    expect(placeMatches(place, { channel: '#general' })).toBe(true)
    expect(placeMatches(null, { kind: 'dm' })).toBe(false)
    expect(placeMatches(null, {})).toBe(true)
  })

  test('a search for DMs only leaves out the channel and the group that say the same thing', async () => {
    const corpus = [
      chat('d', 'discord', 'dm ada', ['ada'], 'the booking page broke after the move'),
      chat('g', 'discord', 'group builders', ['ada', 'linus', 'grace'], 'the booking page broke after the move again'),
      chat('s', 'discord', 'channel', ['linus'], 'the booking page broke after the move for everyone', { kind: 'channel', serverId: '42', server: 'Builders', channel: 'general' }),
    ]
    const embedder = hashEmbedder()
    await buildIndex(corpus, embedder, dir)
    const index = await openIndex(embedder, dir)
    const dms = await search(index, 'booking page broke', { kind: 'dm' })
    const inServer = await search(index, 'booking page broke', { server: 'Builders' })
    const all = await search(index, 'booking page broke')
    await index.close()
    expect(dms.map((h) => h.chunk.conversationId)).toEqual(['d'])
    expect(inServer.map((h) => h.chunk.conversationId)).toEqual(['s'])
    expect(all.length).toBe(3)
  })
})
