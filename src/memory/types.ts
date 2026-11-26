export const MEMORY_KINDS = ['rule', 'section', 'skill', 'doc', 'infra', 'memory', 'pageState', 'account', 'note'] as const
export type MemoryKind = (typeof MEMORY_KINDS)[number]

export const MEMORY_ARTICLES_TABLE = 'kbArticles'
export const MEMORY_CHUNKS_TABLE = 'kbChunks'
export const MEMORY_CHUNK_CHARS = 1200
export const MEMORY_CHUNK_OVERLAP = 150
export const MEMORY_SEARCH_DEPTH = 50
export const MEMORY_SAVE_BATCH = 200

export interface MemoryArticle {
  key: string
  kind: MemoryKind
  title: string
  body: string
  source: string
  tags: string[]
  author: string
}

export interface MemoryStoredArticle extends MemoryArticle {
  hash: string
  syncedAt: string
}

export interface MemoryChunk {
  id: string
  key: string
  kind: MemoryKind
  title: string
  source: string
  text: string
}

export interface MemoryChunkRow extends MemoryChunk {
  vector: Float32Array
}

export interface MemoryHit {
  rank: number
  score: number
  keywordRank: number | null
  meaningRank: number | null
  key: string
  kind: MemoryKind
  title: string
  source: string
  text: string
}

export interface MemoryStore {
  list(): MemoryStoredArticle[]
  get(key: string): MemoryStoredArticle | null
  saveMany(items: { article: MemoryArticle; hash: string }[], now?: Date): MemoryStoredArticle[]
  indexed(model: string): Map<string, string>
  putChunks(article: MemoryStoredArticle, model: string, chunks: MemoryChunk[], vectors: Float32Array[]): void
  dropChunks(key: string): void
  chunkRows(model: string, kind?: MemoryKind): MemoryChunkRow[]
  counts(): { articles: number; chunks: number }
}

export interface MemorySources {
  repo: string
  memoryRoot: string | null
}

export interface MemorySyncReport {
  collected: number
  created: number
  updated: number
  unchanged: number
  indexed: number
  chunks: number
  dropped: number
  byKind: Record<string, number>
  ms: number
}
