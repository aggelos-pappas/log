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

export interface SearchOptions extends SearchFilters {
  limit?: number
  depth?: number
}

export interface SearchHit {
  rank: number
  score: number
  keywordRank: number | null
  meaningRank: number | null
  chunk: Chunk
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
export const SEARCH_DEPTH = 50
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_DIMENSIONS = 384
