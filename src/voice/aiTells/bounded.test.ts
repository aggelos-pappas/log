import { describe, expect, test } from 'bun:test'
import { embedBounded, readAiTells, rerankBounded, withinMs } from './index'
import type { AiEmbedder, AiIndex } from './index'

const hanging: AiEmbedder = { model: 'jina', dimensions: 2, embed: () => new Promise(() => {}), rerank: () => new Promise(() => {}) }
const local = { model: 'local', dimensions: 2, embed: async (texts: string[]) => texts.map((t) => Float32Array.from([t.length, 1])) }

describe('every Jina call inside the gate is bounded and falls back to the local embedder', () => {
  test('a Jina embeddings call that never answers falls back to the local embedder within the bound', async () => {
    const started = Date.now()
    const out = await embedBounded(['camera ok?', 'the weather is grim'], () => hanging, () => local, 50)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(out.fellBack).toBe(true)
    expect(out.model).toBe('local')
    expect(out.vectors).toEqual([[10, 1], [19, 1]])
  })

  test('a Jina embeddings call that answers in time is used as it is', async () => {
    const quick: AiEmbedder = { ...hanging, embed: async (texts) => texts.map(() => [1, 0]) }
    expect(await embedBounded(['a'], () => quick, () => local, 50)).toEqual({ model: 'jina', vectors: [[1, 0]], fellBack: false })
  })

  test('a missing Jina key falls back to the local embedder too', async () => {
    const out = await embedBounded(['a'], () => { throw new Error('JINA_API_KEY is not set') }, () => local, 50)
    expect(out.fellBack).toBe(true)
    expect(out.why).toContain('JINA_API_KEY')
  })

  test('a rerank that never answers gives no scores instead of waiting', async () => {
    const started = Date.now()
    expect(await rerankBounded('q', ['a', 'b'], () => hanging, 50)).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })

  test('withinMs refuses with jinaTimeout once the bound passes', async () => {
    await expect(withinMs(20, () => new Promise(() => {}), 'jina embeddings')).rejects.toMatchObject({ code: 'jinaTimeout' })
  })

  test('the AI tells reading skips the closeness, keeps the rule hits and never waits past the bound', async () => {
    const index: AiIndex = { model: 'jina', dimensions: 2, builtAt: '2026-11-20T00:00:00Z', phrases: [{ text: 'delve into the details', source: 'test' }], vectors: [Float32Array.from([1, 0])], baseline: { messages: 1, p50: 0.5, p99: 0.9, mutedRules: [] } }
    const rules = [{ name: 'Delve', message: 'avoid %s', tokens: ['delve'], exceptions: [], ignorecase: true, nonword: false }]
    const started = Date.now()
    const reading = await readAiTells('lets delve into it bro', index, hanging, rules, new Map(), 8, 50)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(reading.skipped).toContain('longer than 50 ms')
    expect(reading.closest).toEqual([])
    expect(reading.hits.map((h) => h.match)).toEqual(['delve'])
    expect(reading.pass).toBe(false)
  })
})
