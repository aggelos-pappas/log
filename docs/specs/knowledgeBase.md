---
title: "Knowledge base"
---

# Knowledge base

The knowledge base holds everything an agent should look up before it guesses: AGENTS.md's rules and sections, the skills, the docs, the Claude memory files, the known page states and the accounts. It lives in the workspace `log.db`, beside the rest of log's private records (rule 134), and is searched there by keyword and meaning at once, on this machine. It needs no server and no setting, so it always works. `log kb sync`, `log kb search`, `log kb remember` and `log kb show` (MCP `kbSync`, `kbSearch`, `kbRemember`, `kbShow`). Rule 93 (with rule 38 for the pages it leaves out).

## Where it lives

### REQ-KB-01: The articles live in log.db's kbArticles

Every article is a `kbArticles` row in the workspace `log.db`, keyed by its `key`, with its kind, title, body, source, tags, author, content hash and when it was last written (`syncedAt`). The table and its chunk table `kbChunks` are added by schema migration 33 (`knowledgeBase`), through log.db's own versioned migrations.

Checked by: code (anchors)

### REQ-KB-02: It needs no server, login or setting

The knowledge base opens the workspace `log.db` that every other log command uses. There is no host to reach, no API key and no setting that turns it off, so `log kb` never refuses for want of setup.

Checked by: code and SubQ

## Search

### REQ-KB-03: Search is keyword and meaning at once, fused

`log kb search "<query>"` reads the chunks indexed with the current embedder from `kbChunks`, ranks them by BM25 keyword score (the `bm25s` library `log search` uses) and by cosine similarity to the query's local all-MiniLM-L6-v2 embedding, and fuses the two lists with reciprocal rank fusion. `--kind` keeps one kind of article. Each article appears once, at its best chunk.

Checked by: code and SubQ

## Sync

### REQ-KB-04: Sync collects every source

`log kb sync` collects AGENTS.md's numbered rules and its other sections, every skill, every doc under `docs/` (those under `docs/infra/` as infra), every Claude memory file, the known page states, and log-cli's accounts (the local account store; unless `--noAccounts`).

Checked by: code and SubQ

### REQ-KB-05: Some pages and fields are never collected

Docs under `docs/vendors/` are never collected, nor pages about platform enforcement (rule 38). An account's article carries its home, status, states and whether a proxy is attached, never a credential, a proxy URL or a cookie.

Checked by: code and SubQ

### REQ-KB-06: Sync writes only what changed

Each article's content hash decides: a new key is inserted into `kbArticles`, a changed hash is updated, and an unchanged one is left alone. Writes go in transactions of a few hundred articles.

Checked by: code and SubQ

### REQ-KB-07: Chunks are re-indexed from the articles, only what changed

After writing, every article `kbArticles` holds is re-indexed into `kbChunks` (split into chunks of about 1,200 characters, each embedded) when its hash differs from the one its chunks carry or its chunks were embedded by another model. Chunks whose article `kbArticles` no longer has are dropped.

Checked by: SubQ

## Notes and reading

### REQ-KB-08: Remember saves a note and indexes it at once

`log kb remember "<text>"` saves the text as a `note` article with a dated key in `kbArticles` and indexes its chunks in the same call.

Checked by: code and SubQ

### REQ-KB-09: Show reads one article in full

`log kb show <key>` prints one article in full from `kbArticles`, and a key that doesn't exist is refused with `kbArticleMissing`.

Checked by: SubQ

## Secrets

### REQ-KB-10: Secrets are scrubbed before anything is written

Every collected article's body and every note are scrubbed before they are written: named keys, tokens, passwords and PINs, URLs carrying a login, JWTs, private keys and long random strings are replaced with a redaction mark.

Checked by: code and SubQ
