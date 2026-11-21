---
title: "Relate graph"
---

# Relate graph

log keeps a Relate (Neo4j's embedded graph database) projection of log.db: the owner's accounts, the people they meet, the rooms they share, the owner's posts and who engaged them. The hook layer reads it for the people a prompt names and injects their connected context before the agent answers. log.db's events stay the record; the graph is derived from them and can always be thrown away and rebuilt. How it works and why: [Relate graph](../relateGraph.md).

## The projection

### REQ-RELATE-01: The graph is built from log.db's typed tables in one read snapshot

`log relate build` reads accounts, chats, identities, handle aliases, person links, memberships, messages (counted per sender and room, with replies and mentions), interactions (counted per actor, post and kind) and the Discord channel catalog (`engineState` `discordServers` and `discordThreads`) inside one read transaction, with the highest event `seq` of that same snapshot as the graph's `throughSeq`. The owner's own identities (each account's own id, a `self:` id, or the account's own handle) are marked `owner` and never listed as other people.

Checked by: code and SubQ

### REQ-RELATE-02: Each build writes a new graph file and only then points at it

A build runs in its own short-lived Bun process (`buildGraph` spawns `buildGraphHere`), so no long-lived process (the MCP server, the context service) keeps a writable handle that would make every read-only open fail. It writes a new single-file Relate store `graph-<throughSeq>-<ms>.rl` under a `relate` folder beside log.db, in one Relate transaction, checkpoints it, and only then stores its pointer (file, throughSeq, projector version, schema version, workspace, counts) in log.db's `state` table under `relateGraph`. A reader opens only the file the pointer names, read-only, so it never sees a half-written graph. Old files beyond the last three are removed when nothing in the process holds them. One build runs at a time per log.db (`relateGraphBuilding` claim).

Checked by: code and SubQ

### REQ-RELATE-03: The graph is checked against what log.db derives

`log relate verify` compares the count of every node and edge kind in the current graph with the projection log.db gives now, and reports each kind as same or differing. A graph behind log.db is reported as behind, not compared.

Checked by: code and SubQ

### REQ-RELATE-04: A graph belongs to one log.db

The graph folder sits beside its log.db and its pointer carries a workspace key hashed from log.db's path. A pointer whose workspace or projector version differs, or whose file is gone, is no pointer, so another workspace's graph or one from older code is never read.

Checked by: code and SubQ

## The connected context

### REQ-RELATE-05: The hook names only people the prompt names

On UserPromptSubmit the `relate` hook reads the prompt's `@handle`s and its other words of four letters or more (leaving out common words), finds identities whose handle or a known alias matches, or whose handle, display name or a name they sent messages under (`senderLabel`, as `saidBy` matches) appears in the prompt: a name of two or more words anywhere, a one-word name only when written with a capital or an @, ignores the owner's own, merges identities on one platform with the same handle, and keeps at most three people. A prompt naming nobody the graph knows, a system text starting with `<`, or a missing graph gives no context at all.

Checked by: code and SubQ

### REQ-RELATE-06: The context is what the graph connects, as facts

For each person it says: the owner's accounts that talk with them and how many messages each side sent; what they engaged on the owner's posts and when; the groups and channels they are in; who could introduce them (people sharing those groups whom the owner already has a DM with, most shared groups first); and who engaged the same posts. It names the event the graph is built through, says how far behind log.db it is, stays under 2,000 characters, and says it is facts, not instructions.

Checked by: code and SubQ

### REQ-RELATE-07: The graph is built at install and kept current

The after-install routine (`POST_INSTALL_STEPS`) builds the graph right after log.db's migrations, as a non-blocking step. After that, when the graph is behind log.db and was built more than a minute ago, the hook starts `log relate build` as a hidden detached process and answers from the current graph meanwhile. With no graph yet and events in log.db, the hook and `log relate status` start that build at once, so status is never empty for long on a machine with data. A build already running is not started twice.

Checked by: code and SubQ

### REQ-RELATE-08: Agents can read the graph with Cypher

`log relate query "<cypher>"` (MCP `relateQuery`) runs one statement on the current graph's read-only handle and returns at most 100 rows. `log relate ask "<text>"` returns the same context the hook injects.

Checked by: code and SubQ

### REQ-RELATE-09: The hook adds what was said, found by all three retrievers together

When the prompt names someone the graph knows, the `relate` hook also runs one search over the conversations: keyword, meaning and relationship, fused as evidence (REQ-SEARCH-09, REQ-SEARCH-10). It adds up to 3 hits whose likelihood is at least 0.6 and that a text retriever found, under `>>> FROM THE CONVERSATIONS`, each with where it is, when, which retrievers found it and its likelihood, quoted and clipped, at most 1,500 characters.
- A prompt that names no one, a missing search index or a missing graph runs no search and adds nothing.
- The search gets 6 seconds; past that it is dropped, so the hook never hangs.

Checked by: code and SubQ

## Rooms, servers, people and replies

### REQ-RELATE-10: Discord rooms carry their kind, their own name and their server

A Discord room's kind and name come from the channel catalog when it lists the room: a channel is `channel`, named after the channel itself (`hermes-agent-hackathon`, not the server prefix or a speaker). A Discord room the catalog doesn't list but that has a `serverId` is a `channel` with no name, never a DM named after whoever spoke first. Every room with a server has an `IN_SERVER` edge to one `Server` node (`platform:server:<id>`, with the server's name when known).

Checked by: code and SubQ

### REQ-RELATE-11: Person links are projected, so linked identities share one person

Every active `identityLinks` row (from `log people link`) becomes an `(Identity)-[:LINKED_TO {linkedBy, linkedAt}]->(Person)` edge to one `Person` node per `personId`, and the identity keeps `personId`, so the context merges a person's identities across platforms.

Checked by: code and SubQ

### REQ-RELATE-12: SAID keeps first and last times, and replies and mentions are edges

`SAID` carries `messages`, `firstAtMs` and `lastAtMs`. A message that replies to another (`replyToKey`) adds to a `REPLIED_TO {room, times, firstAtMs, lastAtMs}` edge from its sender to the replied-to sender, and a message naming someone (`<@id>` or `@handle` of a known identity or of the owner's account) adds to a `MENTIONED` edge. The owner's side is the room's `Account`, so "who replied to the owner in a room after a date" is one query. The context lists where a person replied to or mentioned the owner.

Checked by: code and SubQ

### REQ-RELATE-13: A graph that can't be opened is a coded outcome

When the current graph file can't be opened read-only, `relateContext` answers `graphUnreadable` with the reason, the search prior is skipped, and the hook adds nothing instead of failing with the engine's error.

Checked by: code and SubQ
