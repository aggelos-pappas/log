---
title: "Conversation search"
---

# Conversation search

Finding context in conversations is a search, never reading every thread. `log search "<query>"` (MCP `search`) runs keyword and meaning search together over every conversation log has read, fused into one ranking, with filters for platform, account, person and day. `log search index` reads the conversations and keeps the indexes on disk; `log search bench` times it. Rule 89 (with rule 88 for X Chat, decrypted with the saved PIN).

## Searching

### REQ-SEARCH-01: Keyword and meaning search run together and are fused

A query runs BM25 keyword ranking (bm25s) and meaning ranking (verso-db HNSW over the query's embedding) in parallel, and fuses the two lists with reciprocal rank fusion. Each hit keeps its keyword rank and its meaning rank.

Checked by: code and SubQ

### REQ-SEARCH-02: Reciprocal rank fusion scores each hit by its ranks

Each chunk's fused score is the sum, over the lists it is in, of one over the constant (60) plus its rank, and hits are ordered by that score.

Checked by: code and SubQ

### REQ-SEARCH-03: The filters keep only matching chunks

`--platform`, `--account`, `--with` (a handle, with or without @, any case) and `--after` (a day, `YYYY-MM-DD`) drop every chunk that doesn't match, from both lists before they are fused. With a filter set, each list is read four times deeper so a filtered search still finds enough.

Checked by: code and SubQ

### REQ-SEARCH-04: The embeddings are local all-MiniLM-L6-v2

Chunks and queries are embedded on this machine with all-MiniLM-L6-v2 (`@huggingface/transformers`, mean pooled and normalised), never through a hosted API.

Checked by: code (anchors)

## Indexing

### REQ-SEARCH-05: The index reads every conversation through the platform's engine

`log search index` reads each account's conversations through its platform's engine in one export read: each signed-in X account's inbox with X Chat decrypted when its PIN is saved (rule 88), and each Discord account's DMs and groups. The conversations are saved in `~/.logCli/conversations` (`LOG_CONVERSATIONS_DIR` moves it), one file each.

Checked by: code and SubQ

### REQ-SEARCH-06: The indexes survive restarts

The chunks, the BM25 index and the vector index are written to `~/.logCli/search` (`LOG_SEARCH_DIR` moves it), and a search opens them from there.

Checked by: code and SubQ

### REQ-SEARCH-07: An update embeds only what changed

An index update embeds only the chunks that are new or whose text changed and removes the ones gone. The whole index is rebuilt when it doesn't exist yet, when the embedding model or its size changed, or with `--rebuild`.

Checked by: code and SubQ

## Timing

### REQ-SEARCH-08: The bench prints p50, p95 and p99, cold and warm, beside a linear scan

`log search bench` times realistic queries once cold and then over `--rounds` warm rounds, prints the p50, p95 and p99 of each, and prints a plain linear scan's time a query beside them.

Checked by: code and SubQ

## Relationship retrieval

### REQ-SEARCH-09: `--fusion bayes` fuses keyword, meaning and relationship as evidence

`log search "<query>" --fusion bayes` fuses the lists with Dempster-Shafer evidence combination, as BayesRAG does (arXiv 2601.07329, appendix A.1), instead of reciprocal rank fusion:
- each retriever's score becomes a belief that the chunk is relevant (0.7 × score), irrelevant (0.6 × (1 − score)) or unsure (the rest);
- keyword and meaning scores are min-max normalized first; a chunk either list missed counts as weak evidence against it (0.3);
- beliefs are combined with Dempster's rule, a combination whose conflict reaches 0.999 scores 0, and the score is the pignistic probability (relevant + unsure / 2);
- each hit reports its likelihood, its prior and the largest conflict between the retrievers.

Reciprocal rank fusion stays the default.

Checked by: code and SubQ

### REQ-SEARCH-10: The relationship retriever votes from the Relate graph

With `--fusion bayes`, when the query names people the Relate graph knows, a third retriever scores every chat by its links to them in the graph:
- 3 for each room they spoke or are a member in, and 1 for each group shared with someone whose DM it is;
- the strength is 1 − e^(−0.5 × links), already a probability, so it is not normalized;
- it is trusted at 0.5, and it has no opinion on chats with no link, so a chunk only the relationship retriever found ranks below one a text retriever found there too.

When the query names no one, or there is no graph, the relationship retriever abstains and the search fuses keyword and meaning alone.

Checked by: code and SubQ

