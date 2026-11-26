import type { Database } from 'bun:sqlite'
import { KB_KINDS } from '../types'
import type { KbArticle, KbChunk, KbKind, KbStore, KbStoredArticle } from '../types'

interface ArticleRow {
  key: string
  kind: string
  title: string
  body: string
  source: string
  tags: string
  author: string
  contentHash: string
  syncedAt: string
}

interface ChunkRow {
  id: string
  key: string
  kind: string
  title: string
  source: string
  text: string
  vector: Uint8Array
}

export function kindOf(value: unknown): KbKind {
  return KB_KINDS.find((k) => k === value) ?? 'note'
}

function tagsOf(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function toStored(row: ArticleRow): KbStoredArticle {
  return { key: row.key, kind: kindOf(row.kind), title: row.title, body: row.body, source: row.source, tags: tagsOf(row.tags), author: row.author, hash: row.contentHash, syncedAt: row.syncedAt }
}

export function vectorBytes(vector: Float32Array): Uint8Array {
  return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength)
}

export function vectorOf(bytes: Uint8Array): Float32Array {
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

const ARTICLE_COLUMNS = 'key, kind, title, body, source, tags, author, contentHash, syncedAt'

export function logDbKbStore(handle: Database): KbStore {
  const upsert = handle.prepare(`INSERT INTO kbArticles (${ARTICLE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET kind = excluded.kind, title = excluded.title, body = excluded.body, source = excluded.source, tags = excluded.tags, author = excluded.author, contentHash = excluded.contentHash, syncedAt = excluded.syncedAt`)
  const insertChunk = handle.prepare('INSERT OR REPLACE INTO kbChunks (id, key, kind, title, source, text, contentHash, model, vector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const deleteChunks = handle.prepare('DELETE FROM kbChunks WHERE key = ?')
  const saveAll = handle.transaction((items: { article: KbArticle; hash: string }[], syncedAt: string) =>
    items.map(({ article, hash }) => {
      upsert.run(article.key, article.kind, article.title, article.body, article.source, JSON.stringify(article.tags), article.author, hash, syncedAt)
      return { ...article, hash, syncedAt }
    }),
  )
  const putAll = handle.transaction((article: KbStoredArticle, model: string, chunks: KbChunk[], vectors: Float32Array[]) => {
    deleteChunks.run(article.key)
    chunks.forEach((chunk, i) => insertChunk.run(chunk.id, chunk.key, chunk.kind, chunk.title, chunk.source, chunk.text, article.hash, model, vectorBytes(vectors[i])))
  })
  return {
    list() {
      return (handle.prepare(`SELECT ${ARTICLE_COLUMNS} FROM kbArticles`).all() as ArticleRow[]).map(toStored)
    },
    get(key) {
      const row = handle.prepare(`SELECT ${ARTICLE_COLUMNS} FROM kbArticles WHERE key = ?`).get(key) as ArticleRow | null
      return row ? toStored(row) : null
    },
    saveMany(items, now = new Date()) {
      return saveAll(items, now.toISOString())
    },
    indexed(model) {
      const rows = handle.prepare('SELECT key, MIN(contentHash) AS contentHash, MIN(model) AS model, MAX(model) AS lastModel FROM kbChunks GROUP BY key').all() as { key: string; contentHash: string; model: string; lastModel: string }[]
      return new Map(rows.map((r) => [r.key, r.model === model && r.lastModel === model ? r.contentHash : '']))
    },
    putChunks(article, model, chunks, vectors) {
      putAll(article, model, chunks, vectors)
    },
    dropChunks(key) {
      deleteChunks.run(key)
    },
    chunkRows(model, kind) {
      const rows = (kind ? handle.prepare('SELECT id, key, kind, title, source, text, vector FROM kbChunks WHERE model = ? AND kind = ?').all(model, kind) : handle.prepare('SELECT id, key, kind, title, source, text, vector FROM kbChunks WHERE model = ?').all(model)) as ChunkRow[]
      return rows.map((r) => ({ id: r.id, key: r.key, kind: kindOf(r.kind), title: r.title, source: r.source, text: r.text, vector: vectorOf(r.vector) }))
    },
    counts() {
      const articles = (handle.prepare('SELECT COUNT(*) AS n FROM kbArticles').get() as { n: number }).n
      const chunks = (handle.prepare('SELECT COUNT(*) AS n FROM kbChunks').get() as { n: number }).n
      return { articles, chunks }
    },
  }
}

export function kbChunkCount(handle: Database): number | null {
  const table = handle.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kbChunks'").get()
  if (!table) return null
  return (handle.prepare('SELECT COUNT(*) AS n FROM kbChunks').get() as { n: number }).n
}
