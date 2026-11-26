export const KB_KINDS = ['rule', 'section', 'skill', 'doc', 'infra', 'memory', 'pageState', 'account', 'note'] as const
export type KbKind = (typeof KB_KINDS)[number]

export const KB_ARTICLES_TABLE = 'kbArticles'
export const KB_CHUNKS_TABLE = 'kbChunks'
export const KB_CHUNK_CHARS = 1200
export const KB_CHUNK_OVERLAP = 150
export const KB_SEARCH_DEPTH = 50
export const KB_SAVE_BATCH = 200

export interface KbArticle {
  key: string
  kind: KbKind
  title: string
  body: string
  source: string
  tags: string[]
  author: string
}

export interface KbStoredArticle extends KbArticle {
  hash: string
  syncedAt: string
}

export interface KbChunk {
  id: string
  key: string
  kind: KbKind
  title: string
  source: string
  text: string
}

export interface KbChunkRow extends KbChunk {
  vector: Float32Array
}

export interface KbHit {
  rank: number
  score: number
  keywordRank: number | null
  meaningRank: number | null
  key: string
  kind: KbKind
  title: string
  source: string
  text: string
}

export interface KbStore {
  list(): KbStoredArticle[]
  get(key: string): KbStoredArticle | null
  saveMany(items: { article: KbArticle; hash: string }[], now?: Date): KbStoredArticle[]
  indexed(model: string): Map<string, string>
  putChunks(article: KbStoredArticle, model: string, chunks: KbChunk[], vectors: Float32Array[]): void
  dropChunks(key: string): void
  chunkRows(model: string, kind?: KbKind): KbChunkRow[]
  counts(): { articles: number; chunks: number }
}

export interface KbSources {
  repo: string
  memoryRoot: string | null
}

export interface KbSyncReport {
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
