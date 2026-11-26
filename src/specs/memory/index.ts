import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const CLIENT = 'src/memory/client.ts'
const TYPES = 'src/memory/types.ts'
const COLLECT = 'src/memory/helpers/collect.ts'
const SCRUB = 'src/memory/helpers/scrub.ts'
const STORE = 'src/memory/helpers/store.ts'
const SEARCH = 'src/memory/helpers/search.ts'
const CHUNK = 'src/memory/helpers/chunk.ts'
const MIGRATIONS = 'src/storage/schema/helpers/migrations.ts'
const CLI = 'src/cli/memory/index.ts'

export const memory = {
  description: "log's memory: articles and their chunks in the workspace log.db, searched there by keyword and meaning, synced from every source with secrets scrubbed",
  specPath: 'docs/specs/memory.md',
  codePaths: [
    'src/memory/client.ts',
    'src/memory/types.ts',
    'src/memory/helpers/collect.ts',
    'src/memory/helpers/scrub.ts',
    'src/memory/helpers/store.ts',
    'src/memory/helpers/search.ts',
    'src/memory/helpers/chunk.ts',
    'src/cli/memory/index.ts',
  ],
  anchors: {
    'REQ-MEMORY-01': [
      { kind: 'value', file: TYPES, name: 'MEMORY_ARTICLES_TABLE', equals: 'kbArticles' },
      { kind: 'value', file: TYPES, name: 'MEMORY_CHUNKS_TABLE', equals: 'kbChunks' },
      { kind: 'symbol', file: MIGRATIONS, name: 'MEMORY_TABLES' },
      { kind: 'string', file: MIGRATIONS, includes: 'CREATE TABLE IF NOT EXISTS kbArticles' },
      { kind: 'string', file: MIGRATIONS, includes: 'CREATE TABLE IF NOT EXISTS kbChunks' },
      { kind: 'symbol', file: STORE, name: 'logDbMemoryStore' },
      { kind: 'string', file: STORE, includes: 'key, kind, title, body, source, tags, author, contentHash, syncedAt' },
    ],
    'REQ-MEMORY-02': [
      { kind: 'symbol', file: CLIENT, name: 'openMemory' },
      { kind: 'symbol', file: CLIENT, name: 'memoryContext' },
    ],
    'REQ-MEMORY-03': [
      { kind: 'symbol', file: CLIENT, name: 'searchMemory' },
      { kind: 'symbol', file: SEARCH, name: 'keywordRanks' },
      { kind: 'symbol', file: SEARCH, name: 'meaningRanks' },
      { kind: 'string', file: SEARCH, includes: 'bm25s' },
      { kind: 'string', file: CLI, includes: 'kind' },
    ],
    'REQ-MEMORY-04': [
      { kind: 'symbol', file: COLLECT, name: 'collectAll' },
      { kind: 'symbol', file: COLLECT, name: 'collectRules' },
      { kind: 'symbol', file: COLLECT, name: 'collectSkills' },
      { kind: 'symbol', file: COLLECT, name: 'collectDocs' },
      { kind: 'symbol', file: COLLECT, name: 'collectMemories' },
      { kind: 'symbol', file: COLLECT, name: 'collectPageStates' },
      { kind: 'symbol', file: COLLECT, name: 'collectAccounts' },
      { kind: 'string', file: COLLECT, includes: 'docs/infra/' },
      { kind: 'string', file: CLI, includes: 'noAccounts' },
    ],
    'REQ-MEMORY-05': [{ kind: 'symbol', file: COLLECT, name: 'SKIPPED_DOCS' }],
    'REQ-MEMORY-06': [
      { kind: 'symbol', file: CHUNK, name: 'articleHash' },
      { kind: 'symbol', file: CLIENT, name: 'syncMemory' },
      { kind: 'value', file: TYPES, name: 'MEMORY_SAVE_BATCH', equals: 200 },
    ],
    'REQ-MEMORY-08': [
      { kind: 'symbol', file: CLIENT, name: 'noteArticle' },
      { kind: 'symbol', file: CLIENT, name: 'rememberNote' },
    ],
    'REQ-MEMORY-10': [
      { kind: 'symbol', file: SCRUB, name: 'scrubSecrets' },
      { kind: 'symbol', file: SCRUB, name: 'looksRandom' },
    ],
  },
  rubrics: {
    'REQ-MEMORY-02': noul('Does the memory command get its store from openMemory, which opens the workspace log.db through openDatabase, with no host, API key or setting checked and no refusal for missing setup?'),
    'REQ-MEMORY-03': noul('Does searchMemory read store.chunkRows for the embedder model (and the kind when one is given), rank them with keywordRanks (bm25s BM25) and meaningRanks (cosine to the query embedding), fuse the two with reciprocalRankFusion, and keep one hit per article key at its best chunk?'),
    'REQ-MEMORY-04': noul('Does collectAll gather collectRules (numbered rules and the other sections of AGENTS.md), collectSkills, collectDocs (docs/infra/ as kind infra), collectMemories, collectPageStates and collectAccounts, and does memory sync pass no accounts when noAccounts is set?'),
    'REQ-MEMORY-05': noul('Does collectDocs skip every path SKIPPED_DOCS matches, the ones under docs/vendors/ and the ones about enforcement, and does the Proxy line of collectAccounts write only the word attached or none, never the value of a.proxy itself, with no line carrying cookies, email, password or totpSecret?'),
    'REQ-MEMORY-06': noul('Does syncMemory compare articleHash with the contentHash kbArticles holds for each key, write the new and changed keys with store.saveMany in batches of MEMORY_SAVE_BATCH inside a transaction, and count the rest as unchanged?'),
    'REQ-MEMORY-07 reindex': noul('In syncMemory, does the loop over all, built from existing (every article kbArticles holds), call indexArticle for each article whose hash differs from store.indexed(embedder.model).get of its key, where indexed gives an empty hash for chunks embedded by another model?'),
    'REQ-MEMORY-07 drop': noul('In syncMemory, does the loop over the indexed keys call store.dropChunks for each key that existing does not have?'),
    'REQ-MEMORY-08': noul('Does rememberNote build a note article with noteArticle (kind note, a key of note: then a timestamp and a slug), save it with store.saveMany and index it with indexArticle in the same call?'),
    'REQ-MEMORY-09': noul('Does memory show print the article for the key in full from store.get, and return code 1 with memoryArticleMissing when no article has that key?'),
    'REQ-MEMORY-10': noul('Do both article in collect.ts and noteArticle pass the body through scrubSecrets before it is written, and does scrubSecrets replace JWTs, URLs with user:password@, named api key, secret, token, password and pin values, sk- and ghp- style keys, private key blocks and long random strings?'),
    unspecifiedBehavior: noul('Does the memory code write an article or chunk to log.db without scrubbing it, write account credentials, store it anywhere other than the workspace log.db, or search by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-MEMORY-02': MET,
    'REQ-MEMORY-03': MET,
    'REQ-MEMORY-04': MET,
    'REQ-MEMORY-05': MET,
    'REQ-MEMORY-06': MET,
    'REQ-MEMORY-07 reindex': MET,
    'REQ-MEMORY-07 drop': MET,
    'REQ-MEMORY-08': MET,
    'REQ-MEMORY-09': MET,
    'REQ-MEMORY-10': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
