---
title: "Relate graph"
---

# Relate graph

log keeps a Relate (Neo4j's embedded graph database) projection of log.db: the owner's accounts, the people they meet, the rooms they share, the owner's posts and who engaged them. The hook layer reads it for the people a prompt names and injects their connected context before the agent answers. log.db's events stay the record; the graph is derived from them and can always be thrown away and rebuilt. How it works and why: [Relate graph](../relateGraph.md).

## The projection

### REQ-RELATE-01: The graph is built from log.db's typed tables in one read snapshot

`log relate build` reads accounts, chats, identities, handle aliases, memberships, messages (counted per sender and room) and interactions (counted per actor, post and kind) inside one read transaction, with the highest event `seq` of that same snapshot as the graph's `throughSeq`. The owner's own identities (each account's own id, a `self:` id, or the account's own handle) are marked `owner` and never listed as other people.

Checked by: code and SubQ

### REQ-RELATE-02: Each build writes a new graph file and only then points at it

A build writes a new single-file Relate store `graph-<throughSeq>-<ms>.rl` under a `relate` folder beside log.db, in one Relate transaction, checkpoints it, and only then stores its pointer (file, throughSeq, projector version, schema version, workspace, counts) in log.db's `state` table under `relateGraph`. A reader opens only the file the pointer names, read-only, so it never sees a half-written graph. Old files beyond the last three are removed when nothing in the process holds them. One build runs at a time per log.db (`relateGraphBuilding` claim).

Checked by: code and SubQ

### REQ-RELATE-03: The graph is checked against what log.db derives

`log relate verify` compares the count of every node and edge kind in the current graph with the projection log.db gives now, and reports each kind as same or differing. A graph behind log.db is reported as behind, not compared.

Checked by: code and SubQ

### REQ-RELATE-04: A graph belongs to one log.db

The graph folder sits beside its log.db and its pointer carries a workspace key hashed from log.db's path. A pointer whose workspace or projector version differs, or whose file is gone, is no pointer, so another workspace's graph or one from older code is never read.

Checked by: code and SubQ

## The connected context

### REQ-RELATE-05: The hook names only people the prompt names

On UserPromptSubmit the `relate` hook reads the prompt's `@handle`s and its other words of four letters or more (leaving out common words), finds identities whose handle or a known alias matches, ignores the owner's own, merges identities on one platform with the same handle, and keeps at most three people. A prompt naming nobody the graph knows, a system text starting with `<`, or a missing graph gives no context at all.

Checked by: code and SubQ

### REQ-RELATE-06: The context is what the graph connects, as facts

For each person it says: the owner's accounts that talk with them and how many messages each side sent; what they engaged on the owner's posts and when; the groups and channels they are in; who could introduce them (people sharing those groups whom the owner already has a DM with, most shared groups first); and who engaged the same posts. It names the event the graph is built through, says how far behind log.db it is, stays under 2,000 characters, and says it is facts, not instructions.

Checked by: code and SubQ

### REQ-RELATE-07: A graph behind log.db is rebuilt in the background

The first graph is built only by `log relate build`. Once one exists, when it is behind log.db and was built more than a minute ago, the hook starts `log relate build` as a hidden detached process and answers from the current graph meanwhile. A build already running is not started twice, and with no graph the hook starts nothing.

Checked by: code and SubQ

### REQ-RELATE-08: Agents can read the graph with Cypher

`log relate query "<cypher>"` (MCP `relateQuery`) runs one statement on the current graph's read-only handle and returns at most 100 rows. `log relate ask "<text>"` returns the same context the hook injects.

Checked by: code and SubQ
