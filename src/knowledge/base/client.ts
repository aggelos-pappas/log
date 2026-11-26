import { reciprocalRankFusion } from '../../search/conversations/helpers/fuse'
import type { Embedder } from '../../search/conversations/types'
import { defaultDbPath, openDatabase } from '../../storage/schema/index'
import { articleHash, chunksOf } from './helpers/chunk'
import { scrubSecrets } from './helpers/scrub'
import { keywordRanks, meaningRanks } from './helpers/search'
import { kbChunkCount, logDbKbStore } from './helpers/store'
import { KB_SAVE_BATCH, KB_SEARCH_DEPTH } from './types'
import type { KbArticle, KbHit, KbKind, KbStore, KbStoredArticle, KbSyncReport } from './types'

export function openKnowledge(path: string = defaultDbPath()): KbStore {
  return logDbKbStore(openDatabase(path))
}

export function knowledgeContext(path: string = defaultDbPath()): string {
  let reach: string
  try {
    const count = kbChunkCount(openDatabase(path))
    reach = count ? `${count} indexed chunks` : 'empty until the first kbSync'
  } catch (error) {
    reach = `not readable right now (${error instanceof Error ? error.message : String(error)})`
  }
  return `log-cli knowledge base: every AGENTS.md rule, skill, doc, infra note, memory file, page state, account and agent note, kept in the workspace log.db and searched there by keyword and meaning, ${reach}. The MCP tools read it: \`kbSearch\` { query } finds what an earlier session found or how something works, \`kbShow\` { key } reads one entry, and \`kbRemember\` { text } saves what this session learns, never a secret.`
}

const embedText = (title: string, text: string) => `${title}
${text}`

async function indexArticle(store: KbStore, embedder: Embedder, article: KbStoredArticle): Promise<number> {
  const chunks = chunksOf(article)
  if (!chunks.length) {
    store.dropChunks(article.key)
    return 0
  }
  const vectors: Float32Array[] = []
  for (let i = 0; i < chunks.length; i += 32) vectors.push(...(await embedder.embed(chunks.slice(i, i + 32).map((c) => embedText(c.title, c.text)))))
  store.putChunks(article, embedder.model, chunks, vectors)
  return chunks.length
}

export interface SyncOptions {
  progress?: (line: string) => void
  now?: Date
}

export async function syncKnowledge(collected: readonly KbArticle[], store: KbStore, embedder: Embedder, options: SyncOptions = {}): Promise<KbSyncReport> {
  const started = performance.now()
  const say = options.progress ?? (() => {})
  const report: KbSyncReport = { collected: collected.length, created: 0, updated: 0, unchanged: 0, indexed: 0, chunks: 0, dropped: 0, byKind: {}, ms: 0 }
  say(`kb: ${collected.length} articles collected; reading what log.db already holds`)
  const existing = new Map(store.list().map((a) => [a.key, a]))
  const writes: { article: KbArticle; hash: string }[] = []
  for (const article of collected) {
    report.byKind[article.kind] = (report.byKind[article.kind] ?? 0) + 1
    const hash = articleHash(article)
    const have = existing.get(article.key)
    if (!have) report.created++
    else if (have.hash !== hash) report.updated++
    else {
      report.unchanged++
      continue
    }
    writes.push({ article, hash })
  }
  say(`kb: ${report.created} new and ${report.updated} changed articles to write to log.db, ${report.unchanged} unchanged`)
  for (let i = 0; i < writes.length; i += KB_SAVE_BATCH) {
    for (const saved of store.saveMany(writes.slice(i, i + KB_SAVE_BATCH), options.now)) existing.set(saved.key, saved)
  }
  say(`kb: log.db articles written; indexing what changed with ${embedder.model}`)
  const indexed = store.indexed(embedder.model)
  const all = [...existing.values()].map((a) => ({ ...a, hash: articleHash(a) }))
  let i = 0
  for (const article of all) {
    i++
    if (indexed.get(article.key) === article.hash) continue
    report.chunks += await indexArticle(store, embedder, article)
    report.indexed++
    if (report.indexed % 25 === 0) say(`kb: indexed ${i}/${all.length} (${report.indexed} articles, ${report.chunks} chunks)`)
  }
  for (const key of indexed.keys()) {
    if (existing.has(key)) continue
    store.dropChunks(key)
    report.dropped++
  }
  report.ms = performance.now() - started
  return report
}

export interface KbSearchOptions {
  kind?: KbKind
  limit?: number
  depth?: number
}

export async function searchKnowledge(store: KbStore, embedder: Embedder, query: string, options: KbSearchOptions = {}): Promise<KbHit[]> {
  const depth = options.depth ?? KB_SEARCH_DEPTH
  const rows = store.chunkRows(embedder.model, options.kind)
  if (!rows.length) return []
  const [vector] = await embedder.embed([query])
  const fused = reciprocalRankFusion([keywordRanks(rows, query, depth), meaningRanks(rows, vector, depth)])
  const chunks = new Map(rows.map((c) => [c.id, c]))
  const hits: KbHit[] = []
  const seen = new Set<string>()
  for (const f of fused) {
    const chunk = chunks.get(f.id)
    if (!chunk || seen.has(chunk.key)) continue
    seen.add(chunk.key)
    hits.push({ rank: hits.length + 1, score: f.score, keywordRank: f.ranks[0], meaningRank: f.ranks[1], key: chunk.key, kind: chunk.kind, title: chunk.title, source: chunk.source, text: chunk.text })
    if (hits.length >= (options.limit ?? 8)) break
  }
  return hits
}

export interface RememberInput {
  text: string
  title?: string
  tags?: string[]
  author?: string
  now?: Date
}

export function noteArticle(input: RememberInput): KbArticle {
  const now = input.now ?? new Date()
  const body = scrubSecrets(input.text.trim())
  const title = (input.title?.trim() || body.split('\n')[0]).slice(0, 160)
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 6).map((w, i) => (i ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join('')
  return { key: `note:${stamp}${slug ? `-${slug}` : ''}`, kind: 'note', title, body, source: 'agent', tags: input.tags ?? [], author: input.author ?? 'agent' }
}

export async function rememberKnowledge(input: RememberInput, store: KbStore, embedder: Embedder): Promise<KbStoredArticle> {
  const article = noteArticle(input)
  const [saved] = store.saveMany([{ article, hash: articleHash(article) }], input.now)
  await indexArticle(store, embedder, saved)
  return saved
}
