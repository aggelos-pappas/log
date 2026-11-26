---
name: memory
description: Find and keep context in log's memory. `log memory search "<query>"` searches every rule, skill, doc, infra note, Claude memory file, page state, account and agent note by keyword and meaning at once; `log memory remember "<text>"` saves what a session learned; `log memory sync` refreshes it. Use before guessing at how something works, where a login lives, what an account is doing or what an earlier session found, and at the end of a session that learned something new.
---

# memory

log's memory is one place for everything log-cli knows: the owner's rules,
the skills, the docs, the infra notes, every agent's memory files, the known
page states, the accounts, and the notes agents save. It lives in the
workspace `log.db` and is searched there, on this machine. It needs no server
or setting, so it always works.

## Hard boundaries

- **Never write a secret into it.** No password, token, API key, PIN, cookie,
  proxy URL or private key, in a note or anywhere else. Say where a login
  lives (a file path), never what it is. The scrubber hides what it can
  recognise, but it is a safety net, not permission.
- **Never mention Meta's or Facebook's rules from it** (rule 38).
  `docs/vendors` and the enforcement research are never collected.
- **Articles are never deleted by a sync.** An article removed from the repo
  stays in `kbArticles`; only chunks whose article is gone are dropped.

## Where it lives

- **Articles:** table `kbArticles` in the workspace `log.db`: `key`, `kind`,
  `title`, `body` (Markdown), `source`, `tags`, `author`, `contentHash`,
  `syncedAt`.
- **Search index:** table `kbChunks` in the same `log.db`: each chunk's text,
  article key, kind, title, source, the content hash and embedding model it
  came from, and its 384-dimension vector.
- Both come from `log.db`'s versioned schema (migration 33, `knowledgeBase`).

## Kinds

| Kind | From |
| --- | --- |
| `rule` | each numbered rule in AGENTS.md (`rule:73`) |
| `section` | each other AGENTS.md section (`agents:howWeFixProblems…`) |
| `skill` | `skills/*/SKILL.md` (`skill:inspect`) |
| `doc` | `docs/**/*.md`, the request docs included (`doc:docs/adsPower.md`) |
| `infra` | `docs/infra/*.md` (`doc:docs/infra/server.md`) |
| `memory` | every Claude Code memory file in `~/.claude/projects/*/memory` (`memory:log-cli/cloudflare-access`) |
| `pageState` | `PAGE_STATES` (`pageState:messengerPinCreate`) |
| `account` | log-cli's accounts (the local account store), status and setup only (`account:10000000000001`) |
| `note` | `log memory remember` |

## Commands

Agents call the MCP tools, never a hand-run `log memory …` (rule 163):

```
memorySearch { query: "why did the tunnel go down" }           best articles, keyword + meaning
memorySearch { query: "messenger pin", kind: "pageState", limit: 3 }
memoryShow { key: "rule:73" }                                  one article in full
memoryRemember { text: "…", tags: ["infra", "server"] }        a note, saved and indexed at once
memorySync {}                                                  refresh from every source (Monitor it, rule 26)
memorySync { noAccounts: true }                                without reading log-cli's accounts
```

In a terminal the same commands are `log memory search|show|remember|sync`. What
each one must do is in the spec, [Memory](../../docs/specs/memory.md).

## How a sync works

1. Collect every source (about 600 articles, under a second), scrubbing
   secrets from each body.
2. Read what `kbArticles` holds, compare each article's content hash, and
   write the new and changed ones in transactions of 200.
3. Re-index every article whose hash differs from the one its chunks carry,
   or whose chunks came from another embedding model, in chunks of about
   1,200 characters embedded with all-MiniLM-L6-v2 on this machine; drop
   chunks whose article is gone.

## How a search works

The chunks of the current model are ranked twice, by BM25 keyword score and
by cosine similarity to the query's embedding, and the two lists are fused
with reciprocal rank fusion. Each article appears once, at its best chunk.

## When a session learns something

Save it before the session ends, in one or two plain sentences with where it
came from:

```
memoryRemember { text: "The tunnel drops when its token file is replaced while it runs; restart the tunnel after changing the token (found 2026-10-27 in the tunnel's own log).", title: "Restart the tunnel after a token change", tags: ["infra", "server"] }
```
