import { noteProviderAnswer, withCreditNote } from '../../../billing/balance/helpers/answers'
import { saveVectors, vectorsFor } from '../../../inbox/store/index'
import { JINA_BATCHES_AT_ONCE, JINA_DIMENSIONS, JINA_EMBED_MODEL, JINA_RERANK_MODEL } from '../types'
import type { AiEmbedder } from '../types'

export interface JinaLimits {
  timeoutMs?: number
  retries?: number
}

async function call(path: string, key: string, body: unknown, limits: JinaLimits = {}): Promise<Record<string, unknown>> {
  const retries = limits.retries ?? 3
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`https://api.jina.ai/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(limits.timeoutMs ? { signal: AbortSignal.timeout(limits.timeoutMs) } : {}) })
    if (response.ok) {
      noteProviderAnswer('jina', response.status)
      return (await response.json()) as Record<string, unknown>
    }
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
      continue
    }
    const said = withCreditNote('jina', response.status, (await response.text()).slice(0, 200))
    throw new Error(`jina ${path} answered ${response.status}: ${said}`)
  }
}

export function jinaEmbedder(key = process.env.JINA_API_KEY ?? '', batch = 256, limits: JinaLimits = {}): AiEmbedder {
  if (!key) throw Object.assign(new Error('JINA_API_KEY is not set (log-cli/.env.local)'), { code: 'jinaKeyMissing' })
  return {
    model: JINA_EMBED_MODEL,
    dimensions: JINA_DIMENSIONS,
    async embed(texts) {
      const held = vectorsFor(JINA_EMBED_MODEL, JINA_DIMENSIONS, texts)
      const missing = [...new Set(texts.filter((_, i) => !held[i]))]
      const made = new Map<string, number[]>()
      const slices: string[][] = []
      for (let start = 0; start < missing.length; start += batch) slices.push(missing.slice(start, start + batch))
      let next = 0
      const worker = async () => {
        while (next < slices.length) {
          const slice = slices[next++]
          const answer = await call('embeddings', key, { model: JINA_EMBED_MODEL, task: 'text-matching', dimensions: JINA_DIMENSIONS, input: slice }, limits)
          const data = (answer.data as { index: number; embedding: number[] }[]).sort((a, b) => a.index - b.index)
          data.forEach((d, i) => made.set(slice[i], d.embedding))
          saveVectors(JINA_EMBED_MODEL, JINA_DIMENSIONS, data.map((d, i) => ({ text: slice[i], vector: d.embedding })))
        }
      }
      await Promise.all(Array.from({ length: Math.min(JINA_BATCHES_AT_ONCE, slices.length) }, worker))
      return texts.map((text, i) => (held[i] ? Array.from(held[i]!) : made.get(text)!))
    },
    async rerank(query, documents) {
      if (!documents.length) return []
      const answer = await call('rerank', key, { model: JINA_RERANK_MODEL, query, documents, top_n: documents.length }, limits)
      const scores = new Array<number>(documents.length).fill(0)
      for (const r of answer.results as { index: number; relevance_score: number }[]) scores[r.index] = r.relevance_score
      return scores
    },
  }
}
