import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from 'bun:sqlite'
import { logHome } from '../config/logHome/index'
import { hashEmbedder } from '../search/conversations/helpers/embed'
import { openDatabase, schemaVersionOf, SCHEMA_VERSION } from '../storage/schema/index'
import { articleHash, chunksOf, collectAll, collectRules, memoryChunkCount, kindOf, logDbMemoryStore, noteArticle, rememberNote, scrubSecrets, searchMemory, splitText, syncMemory, vectorBytes, vectorOf } from './index'
import type { MemoryArticle, MemoryStore } from './index'

let opened = 0

function freshStore(): MemoryStore & { handle: Database } {
  const handle = openDatabase(join(logHome(), 'memoryTests', `memory${++opened}.db`))
  return Object.assign(logDbMemoryStore(handle), { handle })
}

const note = (key: string, title: string, body: string, kind: MemoryArticle['kind'] = 'doc'): MemoryArticle => ({ key, kind, title, body, source: 'test', tags: [], author: 'sync' })

describe('memory', () => {
  test('secrets are scrubbed before anything is written', () => {
    const text = 'password=hunter2hunter2 token: abcdefghijklmnop url redis://default:s3cretPass@kbhost:6380 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U key Sv30aZ9kQ2mN8xLpR4tY7uW1eB5cV6dF0gH3jK'
    const out = scrubSecrets(text)
    expect(out).not.toContain('hunter2')
    expect(out).not.toContain('s3cretPass')
    expect(out).not.toContain('eyJhbGci')
    expect(out).not.toContain('Sv30aZ9k')
    expect(scrubSecrets('useMWEncryptedBackupsFetchBackupIdsV2Query src/memory/helpers/collect.ts 2026-10-27T03:03:50Z')).toBe('useMWEncryptedBackupsFetchBackupIdsV2Query src/memory/helpers/collect.ts 2026-10-27T03:03:50Z')
  })

  test('long text is split on breaks with overlap, short text stays whole', () => {
    expect(splitText('one line')).toEqual(['one line'])
    const parts = splitText(Array.from({ length: 60 }, (_, i) => `Paragraph ${i} says something about the stack.`).join('\n\n'), 400, 50)
    expect(parts.length).toBeGreaterThan(3)
    expect(parts.every((p) => p.length <= 400)).toBe(true)
  })

  test('AGENTS.md rules become one article each', () => {
    const repo = mkdtempSync(join(tmpdir(), 'memoryRepo'))
    writeFileSync(join(repo, 'AGENTS.md'), '# AGENTS\n\n## Rule one\n\nRead the API.\n\n## Hard rules (from the owner)\n\n1. 2026-10-18 · camelCase everywhere, never kebab-case.\n2. 2026-10-18 · Code lives in src.\n   More text.\n\n## Checks\n\n- run it\n')
    const rules = collectRules(repo)
    expect(rules.filter((r) => r.kind === 'rule').map((r) => r.key)).toEqual(['rule:1', 'rule:2'])
    expect(rules.find((r) => r.key === 'rule:2')?.body).toContain('More text.')
    expect(rules.filter((r) => r.kind === 'section').map((r) => r.title)).toEqual(['Rule one', 'Checks'])
  })

  test('collects skills, docs, memory files and page states, never vendor files', () => {
    const repo = mkdtempSync(join(tmpdir(), 'memoryRepo'))
    mkdirSync(join(repo, 'skills', 'inspect'), { recursive: true })
    writeFileSync(join(repo, 'skills', 'inspect', 'SKILL.md'), '---\nname: inspect\ndescription: Look at a page step by step.\n---\n# inspect\n\nSteps.')
    mkdirSync(join(repo, 'docs', 'vendors'), { recursive: true })
    mkdirSync(join(repo, 'docs', 'infra'), { recursive: true })
    writeFileSync(join(repo, 'docs', 'vendors', 'order.md'), '# Order\n\nlogin details')
    writeFileSync(join(repo, 'docs', 'infra', 'server.md'), '# Server\n\nThe server.')
    const memoryRoot = mkdtempSync(join(tmpdir(), 'memoryRoot'))
    mkdirSync(join(memoryRoot, 'C--Users-tester-projects-log-cli', 'memory'), { recursive: true })
    writeFileSync(join(memoryRoot, 'C--Users-tester-projects-log-cli', 'memory', 'cloudflare.md'), '---\nname: cloudflare\ndescription: Where the token lives\nmetadata:\n  type: reference\n---\n\nThe file path.')
    writeFileSync(join(memoryRoot, 'C--Users-tester-projects-log-cli', 'memory', 'MEMORY.md'), '- index')
    const all = collectAll({ repo, memoryRoot })
    const keys = all.map((a) => a.key)
    expect(keys).toContain('skill:inspect')
    expect(keys).toContain('doc:docs/infra/server.md')
    expect(all.find((a) => a.key === 'doc:docs/infra/server.md')?.kind).toBe('infra')
    expect(keys).toContain('memory:log-cli/cloudflare')
    expect(all.find((a) => a.key === 'memory:log-cli/cloudflare')?.tags).toContain('reference')
    expect(keys.some((k) => k.includes('vendors'))).toBe(false)
    expect(keys.some((k) => k.endsWith('MEMORY'))).toBe(false)
    expect(keys.some((k) => k.startsWith('pageState:'))).toBe(true)
  })

  test('log.db holds the memory tables at the latest schema version', () => {
    const store = freshStore()
    expect(schemaVersionOf(store.handle)).toBe(SCHEMA_VERSION)
    expect(memoryChunkCount(store.handle)).toBe(0)
    expect(store.counts()).toEqual({ articles: 0, chunks: 0 })
  })

  test('kinds and vectors round-trip through log.db', () => {
    expect(kindOf('pageState')).toBe('pageState')
    expect(kindOf('SOMETHING')).toBe('note')
    const v = new Float32Array([0.25, -1, 3.5])
    expect([...vectorOf(vectorBytes(v))]).toEqual([0.25, -1, 3.5])
  })

  test('sync writes only what changed and indexes only what changed', async () => {
    const store = freshStore()
    const embedder = hashEmbedder()
    const articles = [note('doc:a', 'Proxy gate', 'No browser opens without its proxy in the home country.'), note('doc:b', 'Launch budget', 'At most 8 opens a day, 10 minutes apart.')]
    const first = await syncMemory(articles, store, embedder, { now: new Date('2026-11-01T00:00:00Z') })
    expect([first.created, first.updated, first.unchanged, first.indexed]).toEqual([2, 0, 0, 2])
    expect(store.get('doc:a')).toMatchObject({ title: 'Proxy gate', tags: [], author: 'sync', hash: articleHash(articles[0]), syncedAt: '2026-11-01T00:00:00.000Z' })
    const second = await syncMemory(articles, store, embedder)
    expect([second.created, second.updated, second.unchanged, second.indexed]).toEqual([0, 0, 2, 0])
    const third = await syncMemory([articles[0], { ...articles[1], body: 'At most 8 opens a day.' }], store, embedder)
    expect([third.updated, third.indexed]).toEqual([1, 1])
    expect(store.get('doc:b')?.body).toBe('At most 8 opens a day.')
    expect(store.counts().articles).toBe(2)
  })

  test('an article in log.db without chunks is indexed, a changed model re-indexes, and orphan chunks are dropped', async () => {
    const store = freshStore()
    const embedder = hashEmbedder()
    store.saveMany([{ article: note('note:pricing', 'Pricing', 'Charge per listing.', 'note'), hash: '' }])
    expect((await syncMemory([], store, embedder)).indexed).toBe(1)
    expect((await syncMemory([], store, { ...hashEmbedder(32), model: 'other' })).indexed).toBe(1)
    store.handle.prepare('DELETE FROM kbArticles WHERE key = ?').run('note:pricing')
    expect((await syncMemory([], store, embedder)).dropped).toBe(1)
    expect(memoryChunkCount(store.handle)).toBe(0)
  })

  test('search fuses keyword and meaning and returns each article once', async () => {
    const store = freshStore()
    const embedder = hashEmbedder()
    const long = Array.from({ length: 40 }, () => 'The tunnel needs its token in the env file to connect.').join('\n\n')
    await syncMemory([note('doc:tunnel', 'Cloudflare tunnel', long, 'infra'), note('doc:proxy', 'Proxy gate', 'The proxy must exit in the home country.'), note('rule:12', 'Rule 12', 'No browser opens unless its proxy is attached.', 'rule')], store, embedder)
    const hits = await searchMemory(store, embedder, 'tunnel token env', { limit: 5 })
    expect(hits[0].key).toBe('doc:tunnel')
    expect(hits[0].keywordRank).toBe(1)
    expect(new Set(hits.map((h) => h.key)).size).toBe(hits.length)
    const rules = await searchMemory(store, embedder, 'proxy browser', { kind: 'rule' })
    expect(rules.map((h) => h.key)).toEqual(['rule:12'])
    expect(await searchMemory(freshStore(), embedder, 'anything')).toEqual([])
  })

  test('remember saves a scrubbed note and indexes it at once', async () => {
    const store = freshStore()
    const saved = await rememberNote({ text: 'server kb-redis password=abcdef123456 lives in the env', tags: ['infra'], now: new Date('2026-10-27T03:00:00Z') }, store, hashEmbedder())
    expect(saved.key).toBe('note:20261027T030000Z-serverKbRedisPasswordRedactedLives')
    expect(saved.body).not.toContain('abcdef123456')
    expect(store.get(saved.key)?.tags).toEqual(['infra'])
    expect(store.chunkRows('hash').some((c) => c.key === saved.key)).toBe(true)
  })

  test('article hash and chunks are stable', () => {
    const a = note('doc:x', 'X', 'body')
    expect(articleHash(a)).toBe(articleHash({ ...a }))
    expect(chunksOf(a)[0].id).toMatch(/^[0-9a-f]{20}:0$/)
    expect(noteArticle({ text: 'First line\nmore', now: new Date('2026-01-01T00:00:00Z') }).title).toBe('First line')
  })
})
