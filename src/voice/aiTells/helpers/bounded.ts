import { timed } from '../../../observability/timing/index'
import { JINA_GATE_MS } from '../types'
import type { AiEmbedder, BoundedEmbedding, LocalEmbedder } from '../types'

export function withinMs<T>(ms: number, work: () => Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${what} took longer than ${ms} ms`), { code: 'jinaTimeout' })), ms)
  })
  const running = work()
  running.catch(() => {})
  return Promise.race([running, late]).finally(() => clearTimeout(timer))
}

function toArrays(vectors: ArrayLike<number>[]): number[][] {
  return vectors.map((v) => Array.from(v))
}

export async function embedBounded(texts: string[], primary: (() => AiEmbedder) | null, fallback: (() => LocalEmbedder) | null, ms = JINA_GATE_MS): Promise<BoundedEmbedding> {
  if (!texts.length) return { model: 'none', vectors: [], fellBack: false }
  let why = 'no Jina key'
  if (primary) {
    try {
      const embedder = primary()
      const vectors = await withinMs(ms, () => embedder.embed(texts), 'jina embeddings')
      return { model: embedder.model, vectors, fellBack: false }
    } catch (error) {
      why = error instanceof Error ? error.message : String(error)
    }
  }
  if (!fallback) throw Object.assign(new Error(`jina embeddings failed (${why}) and there is no local embedder`), { code: 'jinaTimeout' })
  return timed('voice.jinaFallback', async (span) => {
    span.attrs.why = why.slice(0, 120)
    const local = fallback()
    return { model: local.model, vectors: toArrays(await local.embed(texts)), fellBack: true, why }
  })
}

export async function rerankBounded(query: string, documents: string[], primary: (() => AiEmbedder) | null, ms = JINA_GATE_MS): Promise<number[] | null> {
  if (!documents.length || !primary) return null
  try {
    const embedder = primary()
    return await withinMs(ms, () => embedder.rerank(query, documents), 'jina rerank')
  } catch {
    return null
  }
}

export function cosineOf(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}
