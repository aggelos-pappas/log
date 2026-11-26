export interface ConversationMessage {
  id: string
  at: string | null
  from: string | null
  fromMe: boolean
  text: string
  attachments?: ConversationAttachment[]
}

export interface ConversationAttachment {
  name: string
  type?: string
  duration?: number
}

export const PLACE_KINDS = ['dm', 'group', 'channel', 'thread', 'forumPost', 'replies', 'post'] as const

export type PlaceKind = (typeof PLACE_KINDS)[number]

export interface Place {
  kind: PlaceKind
  server?: string
  serverId?: string
  channel?: string
}

export interface Conversation {
  platform: string
  account: string
  conversationId: string
  box: string
  with: string[]
  place?: Place
  messages: ConversationMessage[]
}

export interface Chunk {
  id: string
  platform: string
  account: string
  conversationId: string
  with: string[]
  place?: Place
  at: string | null
  messageIds: string[]
  text: string
}

export interface SearchFilters {
  platform?: string
  account?: string
  with?: string
  after?: string
  kind?: string
  server?: string
  channel?: string
}

export type Fusion = 'rrf' | 'bayes'

export interface SearchOptions extends SearchFilters {
  limit?: number
  depth?: number
  fusion?: Fusion
  prior?: (chunk: Chunk) => number
  relation?: (chunk: Chunk) => number
}

export interface SearchHit {
  rank: number
  score: number
  keywordRank: number | null
  meaningRank: number | null
  relationRank?: number | null
  chunk: Chunk
  likelihood?: number
  prior?: number
  conflict?: number
}

export interface Embedder {
  model: string
  dimensions: number
  embed(texts: string[]): Promise<Float32Array[]>
  stop?(): void
}

export interface Latency {
  p50: number
  p95: number
  p99: number
  runs: number
}

export const CHUNK_MESSAGES = 4
export const CHUNK_OVERLAP = 1
export const RRF_K = 60
export const BAYES_ALPHA = 0.7
export const BAYES_BETA = 0.6
export const BAYES_CONFLICT_MAX = 0.999
export const RELATION_TRUST = 0.5
export const MISSED_NO = 0.3
export const SEARCH_DEPTH = 50
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_DIMENSIONS = 384
export const EMBEDDER_UNAVAILABLE = 'embedderUnavailable'
