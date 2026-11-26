import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const CLIENT = 'src/knowledge/base/client.ts'
const TYPES = 'src/knowledge/base/types.ts'
const COLLECT = 'src/knowledge/base/helpers/collect.ts'
const SCRUB = 'src/knowledge/base/helpers/scrub.ts'
const STORE = 'src/knowledge/base/helpers/store.ts'
const SEARCH = 'src/knowledge/base/helpers/search.ts'
const CHUNK = 'src/knowledge/base/helpers/chunk.ts'
const MIGRATIONS = 'src/storage/schema/helpers/migrations.ts'
const CLI = 'src/cli/kb/index.ts'

export const knowledgeBase = {
  description: 'The knowledge base: articles and their chunks in the workspace log.db, searched there by keyword and meaning, synced from every source with secrets scrubbed',
  specPath: 'docs/specs/knowledgeBase.md',
  codePaths: [
    'src/knowledge/base/client.ts',
    'src/knowledge/base/types.ts',
    'src/knowledge/base/helpers/collect.ts',
    'src/knowledge/base/helpers/scrub.ts',
    'src/knowledge/base/helpers/store.ts',
    'src/knowledge/base/helpers/search.ts',
    'src/knowledge/base/helpers/chunk.ts',
    'src/cli/kb/index.ts',
  ],
  anchors: {
    'REQ-KB-01': [
      { kind: 'value', file: TYPES, name: 'KB_ARTICLES_TABLE', equals: 'kbArticles' },
      { kind: 'value', file: TYPES, name: 'KB_CHUNKS_TABLE', equals: 'kbChunks' },
      { kind: 'symbol', file: MIGRATIONS, name: 'KNOWLEDGE_TABLES' },
      { kind: 'string', file: MIGRATIONS, includes: 'CREATE TABLE IF NOT EXISTS kbArticles' },
      { kind: 'string', file: MIGRATIONS, includes: 'CREATE TABLE IF NOT EXISTS kbChunks' },
      { kind: 'symbol', file: STORE, name: 'logDbKbStore' },
      { kind: 'string', file: STORE, includes: 'key, kind, title, body, source, tags, author, contentHash, syncedAt' },
    ],
    'REQ-KB-02': [
      { kind: 'symbol', file: CLIENT, name: 'openKnowledge' },
      { kind: 'symbol', file: CLIENT, name: 'knowledgeContext' },
    ],
    'REQ-KB-03': [
      { kind: 'symbol', file: CLIENT, name: 'searchKnowledge' },
      { kind: 'symbol', file: SEARCH, name: 'keywordRanks' },
      { kind: 'symbol', file: SEARCH, name: 'meaningRanks' },
      { kind: 'string', file: SEARCH, includes: 'bm25s' },
      { kind: 'string', file: CLI, includes: 'kind' },
    ],
    'REQ-KB-04': [
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
    'REQ-KB-05': [{ kind: 'symbol', file: COLLECT, name: 'SKIPPED_DOCS' }],
    'REQ-KB-06': [
      { kind: 'symbol', file: CHUNK, name: 'articleHash' },
      { kind: 'symbol', file: CLIENT, name: 'syncKnowledge' },
      { kind: 'value', file: TYPES, name: 'KB_SAVE_BATCH', equals: 200 },
    ],
    'REQ-KB-08': [
      { kind: 'symbol', file: CLIENT, name: 'noteArticle' },
      { kind: 'symbol', file: CLIENT, name: 'rememberKnowledge' },
    ],
    'REQ-KB-10': [
      { kind: 'symbol', file: SCRUB, name: 'scrubSecrets' },
      { kind: 'symbol', file: SCRUB, name: 'looksRandom' },
    ],
  },
  rubrics: {
    'REQ-KB-02': noul('Does the kb command get its store from openKnowledge, which opens the workspace log.db through openDatabase, with no host, API key or setting checked and no refusal for missing setup?'),
    'REQ-KB-03': noul('Does searchKnowledge read store.chunkRows for the embedder model (and the kind when one is given), rank them with keywordRanks (bm25s BM25) and meaningRanks (cosine to the query embedding), fuse the two with reciprocalRankFusion, and keep one hit per article key at its best chunk?'),
    'REQ-KB-04': noul('Does collectAll gather collectRules (numbered rules and the other sections of AGENTS.md), collectSkills, collectDocs (docs/infra/ as kind infra), collectMemories, collectPageStates and collectAccounts, and does kb sync pass no accounts when noAccounts is set?'),
    'REQ-KB-05': noul('Does collectDocs skip every path SKIPPED_DOCS matches, the ones under docs/vendors/ and the ones about enforcement, and does the Proxy line of collectAccounts write only the word attached or none, never the value of a.proxy itself, with no line carrying cookies, email, password or totpSecret?'),
    'REQ-KB-06': noul('Does syncKnowledge compare articleHash with the contentHash kbArticles holds for each key, write the new and changed keys with store.saveMany in batches of KB_SAVE_BATCH inside a transaction, and count the rest as unchanged?'),
    'REQ-KB-07 reindex': noul('In syncKnowledge, does the loop over all, built from existing (every article kbArticles holds), call indexArticle for each article whose hash differs from store.indexed(embedder.model).get of its key, where indexed gives an empty hash for chunks embedded by another model?'),
    'REQ-KB-07 drop': noul('In syncKnowledge, does the loop over the indexed keys call store.dropChunks for each key that existing does not have?'),
    'REQ-KB-08': noul('Does rememberKnowledge build a note article with noteArticle (kind note, a key of note: then a timestamp and a slug), save it with store.saveMany and index it with indexArticle in the same call?'),
    'REQ-KB-09': noul('Does kb show print the article for the key in full from store.get, and return code 1 with kbArticleMissing when no article has that key?'),
    'REQ-KB-10': noul('Do both article in collect.ts and noteArticle pass the body through scrubSecrets before it is written, and does scrubSecrets replace JWTs, URLs with user:password@, named api key, secret, token, password and pin values, sk- and ghp- style keys, private key blocks and long random strings?'),
    unspecifiedBehavior: noul('Does the knowledge base code write an article or chunk to log.db without scrubbing it, write account credentials, store it anywhere other than the workspace log.db, or search by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-KB-02': MET,
    'REQ-KB-03': MET,
    'REQ-KB-04': MET,
    'REQ-KB-05': MET,
    'REQ-KB-06': MET,
    'REQ-KB-07 reindex': MET,
    'REQ-KB-07 drop': MET,
    'REQ-KB-08': MET,
    'REQ-KB-09': MET,
    'REQ-KB-10': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
