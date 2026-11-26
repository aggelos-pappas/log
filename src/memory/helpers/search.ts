import { BM25, tokenize } from 'bm25s'
import type { MemoryChunkRow } from '../types'

export function queryTerms(query: string): string[] {
  const tokens = tokenize([query])
  const words = new Map([...tokens.vocab].map(([word, id]) => [id, word]))
  return tokens.ids[0].map((id) => words.get(id) ?? '').filter(Boolean)
}

export function keywordRanks(rows: readonly MemoryChunkRow[], query: string, depth: number): string[] {
  const terms = queryTerms(query)
  const k = Math.min(depth, rows.length)
  if (!terms.length || !k) return []
  const keyword = new BM25()
  keyword.index(tokenize(rows.map((r) => `${r.title}\n${r.text}`)))
  const found = keyword.retrieve([terms], { k })
  return Array.from(found.documents[0])
    .map((n, i) => ({ id: rows[n as number].id, score: Number(found.scores[0][i]) }))
    .filter((s) => s.score > 0)
    .map((s) => s.id)
}

function cosine(a: Float32Array, b: Float32Array): number {
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

export function meaningRanks(rows: readonly MemoryChunkRow[], vector: Float32Array, depth: number): string[] {
  return rows
    .filter((r) => r.vector.length === vector.length)
    .map((r) => ({ id: r.id, score: cosine(r.vector, vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, depth)
    .map((s) => s.id)
}
