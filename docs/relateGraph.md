# Relate graph: connected context for the agent

log reads the owner's inboxes into one local database, log.db. Text search over it answers "what was said". It can't answer how people connect: who already talks to someone, who engaged which post, which groups two people share, who could introduce you. log keeps a [Relate](https://github.com/relatedb/relate) graph of exactly those connections, projected from log.db, and its hook puts them in front of the agent the moment a prompt names someone.

```text
"can you intro me to @linus_k"
        │  UserPromptSubmit hook (Claude Code http hook, Codex curl, Hermes pre_llm_call)
        ▼
answerEvent → relateAnswer → relateContext ──► current graph-<seq>.rl (Relate, read-only)
        │                                            ▲
        ▼                                            │ new events applied in place (hidden child
>>> RELATE GRAPH (connected context …)              │ process, one at a time, when log.db moved on)
@linus_k [2 ids merged by handle] (Linus) on twitter │
  talks: group on builderOwner …                     └── log.db (events → typed tables, the record)
  who could introduce: @ada_codes (1 shared group, the owner's DM last 5 h ago); @grace_ships …
  same orbit (engaged the same posts): @maya_ml (2), @ada_codes (1), @tom_builds (1)
```

## How it uses Relate

- **Mode: single file.** Each build writes a new `graph-<throughSeq>-<ms>.rl` beside log.db (`~/.logCli/relate/`), and log.db's `state` table points at the current one. A single file is one immutable snapshot: it is written whole, committed, and only then pointed at, so a reader never sees half a graph. It can be copied, inspected with the `relate` CLI, or thrown away.
- **Updated in place, as a copy.** Between full builds, only the events after the graph's `throughSeq` are applied: the current file is copied, the rooms, people and engagement those events touched are worked out again from log.db (scoped queries, not a rescan) and written into the copy in batches, and the pointer then moves to the copy. Readers keep the old file until they next open one. A full build happens only on `log relate build`, new projector code, an identity merge, a new network import or more than 20,000 new events.
- **Why not one long-lived store:** Relate is single-process with one writer, and on Windows a second process can't open a store another process is writing. log has many processes (the MCP server, the context service, every hook, the account owners), so the writer is a short-lived build process and everyone else opens finished snapshots read-only. Even a finished file can't be opened read-only while any process still holds it writable (the engine answers `internal error`), so `buildGraph` always writes in its own child process, which exits and lets go. A file that still can't be opened is a coded `graphUnreadable` outcome, never a hook error.
- **Embedded:** `@relate/relate` runs in the same Bun process as the hook through its C ABI (koffi). No server. Per Relate's ADR-0079, only the CLI binary sends anonymous usage metrics; the embedded library never phones home.

## What the graph models

| Node | Key | From log.db |
| --- | --- | --- |
| `Account` | `platform:account` | `accounts`, `chats` |
| `Identity` | `platform:userId` | `identities`, `handleAliases` (handle, name and aliases copied for lookup; `owner` marks the owner's own ids) |
| `Room` | `chatId` | `chats` (DM, group, channel), with the channel's own name and server from the Discord channel catalog (`engineState`) |
| `Server` | `platform:server:<id>` | `chats.serverId`, named from the catalog |
| `Person` | `person:<personId>` | `persons`, `identityLinks` (from `log people link`) |
| `Post` | `platform:account:targetRef` | `interactions.targetRef`, `targetText` |
| `Snapshot` | `snapshot` | the event `seq`, schema and projector version it was built from |
| `Leader` | `leader:handle` | `networkLeaders`: the leaders whose circles your network is drawn around |
| `Community` | `community:id` | `networkCommunities`: the communities those leaders run |

| Edge | Meaning | From |
| --- | --- | --- |
| `(Account)-[:HAS_ROOM]->(Room)` | the account sees this chat | `chats` |
| `(Identity)-[:MEMBER_OF]->(Room)` | they are in it | `memberships` |
| `(Identity\|Account)-[:SAID {messages, firstAtMs, lastAtMs}]->(Room)` | how much each side said there, and when | `messages`, counted |
| `(Identity\|Account)-[:REPLIED_TO {room, times, firstAtMs, lastAtMs}]->(Identity\|Account)` | who replied to whom, the owner's side being the room's account | `messages.replyToKey` |
| `(Identity\|Account)-[:MENTIONED {room, times, firstAtMs, lastAtMs}]->(Identity\|Account)` | who named whom (`<@id>`, `@handle`) | `messages.text` |
| `(Room)-[:IN_SERVER]->(Server)` | the channel's server | `chats.serverId` |
| `(Identity)-[:LINKED_TO {linkedBy, linkedAt}]->(Person)` | identities the owner linked as one person | `identityLinks` |
| `(Identity)-[:ENGAGED {kind, times, lastAtMs}]->(Post)` | like, reply, repost, quote, mention | `interactions` |
| `(Identity)-[:FOLLOWED]->(Account)` | a follow | `interactions` |
| `(Account)-[:POSTED]->(Post)` | the owner's post | `interactions` |
| `(Identity)-[:IN_CIRCLE_OF]->(Leader)` | they sit in that leader's circle | `networkCircles` |
| `(Leader)-[:RUNS]->(Community)` | the leader runs it | `networkRuns` |
| `(Identity)-[:MENTIONED {source: 'network', times, lastAtMs}]->(Identity)` | one mentioned the other in a post | `networkMentions` |
| `(Identity)-[:FOLLOWS]->(Account)` | they follow the owner's X account | `networkPeople.followsOwner` |

Message text stays in log.db. The graph holds counts and times, plus the post text people engaged with.

## Your network

Everyone who uses log has a network: the people around their own accounts. It needs no research files and names no offer or marketplace.

**Rings, live.** Every person log knows sits in one ring, kept in log.db (`networkRings`: ring, reason, since, whether they follow you, and who put them in ring 2):

| Ring | Who | From |
| --- | --- | --- |
| 1 | engaged with you: a like, reply, quote, repost, reaction or mention of you, or a DM from them in a one-to-one chat (more than two members is a group), on any platform | `interactions`, `messages` |
| 2 | talks to (replies to or names) one of your followers or a ring-1 person | `messages` replies and mentions (`networkTalks`) |
| 3 | follows you | `interactions` |
| 4 | known, none of these | `identities` |

The store's write path applies each event as a watcher stores it, inside the same transaction, so a new follower is ring 3 and their first reply moves them to ring 1 within the event, with no paid call. Ring 2 is kept from both sides: a reply to someone who is already a follower or ring 1, and an earlier reply to someone who later becomes one. The first `log network status`, `log relate build` or install computes them once from log.db; after that only events move them. `log network status` (`networkStatus`) shows the counts per ring and the last event applied, per person (accounts the owner linked count once, at their closest ring, with every account listed; suggested pairs stay apart) and per platform (`--platform <p>` for one alone). The who-to-talk-to query takes the same `$platform` through `log relate query --platform <p>`.

**An imported network.** `log network import [--from <dir>]` (MCP `networkImport`) reads a research folder (`final_scores.json` and `nicheMap.json`, from `LOG_NETWORK_DIR`, else `LOG_NICHE_MAP`'s folder) into log.db's `network*` tables, replacing the last import. Its field names are read in one import adapter, and its score is stored as a neutral `fit`. A person in it and a chat identity with the same X handle (any case) are one `Identity`, whose ring is the closer of the live one and the imported one.

**In the graph.** Every `Identity` other than the owner's carries `ring` (also as `degree`), `ringReason`, `ringSinceMs` and `followsOwner`; imported people also carry `band`, `fit`, `themes` (the top 3), `passesGates` and their last post. [network/whoToTalkTo.md](useCases/network/whoToTalkTo.md) ranks who to talk to with one query, with or without an import.

## The questions it answers

For each person a prompt names (`@handle`, a known handle without the @, or a display name the way `saidBy` matches one, e.g. `@Max Current` or `Design bakery`), from their node outwards:

1. **Talks:** which of the owner's accounts chat with them and how much each side said.
2. **Engaged the owner:** what they liked, replied to, reposted or followed, and when.
3. **Replied to or mentioned the owner:** where, how often and when last.
4. **In groups:** the groups and channels they are in, as `Server #channel`.
5. **Who could introduce:** people in those groups whom the owner already has a DM with (2 hops: person → room → member → DM room).
6. **Same orbit:** others who engaged the same posts (person → post → person).

Identities on one platform with the same handle are merged (a handle seen before its numeric id was known), and identities linked to one `Person` are one person across platforms. Nobody named means no context: silence beats a guess.

## Setup and run

```bash
bun install
log relate build                   # project ~/.logCli/log.db into a new graph
log relate status                  # which file, through which event, how far behind
log relate verify                  # every node and edge count against what log.db derives
log relate ask "intro me to @someone"
log relate query "MATCH (i:Identity)-[e:ENGAGED]->(p:Post) RETURN i.handle, e.kind, p.text LIMIT 5"
```

Over MCP these are `relateBuild`, `relateStatus`, `relateVerify`, `relateAsk` and `relateQuery`. Install and `log update` build it once (the `relateGraph` after-install step, right after migrations). After that the hook keeps it fresh: it answers from the current graph and, at most once a minute when log.db has moved on, applies the new events in place in the background. With no graph yet, the hook and `log relate status` start the first build at once.

Measured on a real log.db (41,186 people, 84,297 nodes and edges, a 71 MB graph): a full build takes 27 s. Applying the last 100 events takes 2.4 s, of which 0.6 s is the work (scoped projection 0.29 s, writes 0.17 s, counts 0.07 s) and 1.7 s is Relate opening the copied 71 MB file, a cost every reader also pays once per new file; one event takes 2.0 s with 0.24 s of work. The applied graph and a full build of the same log.db were identical, node for node and edge for edge.

One query answers "who replied to the owner in a channel after a date":

```bash
log relate query "MATCH (i:Identity)-[r:REPLIED_TO]->(:Account) WHERE r.room ENDS WITH ':<channelId>' AND r.lastAtMs > <ms> RETURN coalesce(i.name, i.handle) AS who, r.times AS times"
log relate query "MATCH (i:Identity)-[:SAID]->(:Room)-[:IN_SERVER]->(s:Server {name: 'Some Server'}) RETURN DISTINCT i.handle"
```

To try it without any accounts, the demo store is in this repo:

```bash
bun scripts/relate/demoStore.ts    # rebuilds docs/relate/demoGraph.rl from a synthetic log.db
relate --read-only -d docs/relate/demoGraph.rl "MATCH (p:Identity {handleLower:'linus_k', platform:'twitter'})-[:MEMBER_OF]->(r:Room)<-[:MEMBER_OF]-(m:Identity) WHERE NOT m.owner AND m.key <> p.key MATCH (m)-[:MEMBER_OF|SAID]->(:Room {kind:'dm'}) RETURN DISTINCT r.name AS room, m.handle AS introducer"
```

## Where the data lives

- The record: `~/.logCli/log.db` (`LOG_DB` or `LOG_INBOX_STATE` moves it).
- The graph: `~/.logCli/relate/graph-<throughSeq>-<ms>.rl`, the last three kept. Private, never committed.
- The demo: `docs/relate/demoGraph.rl`, built from `src/relate/graph/fixtures/demoWorld.ts` (synthetic people only).

## Keeping it correct (Designing Data-Intensive Applications)

| Risk | What log does |
| --- | --- |
| A second source of truth | The graph is derived only; log.db's events stay the record (`docs/storageAgainstTheBook.md` item 2). Delete every `.rl` and `log relate build` brings it back. |
| Stale context | The graph records the event it is built through; the context says how many events it is behind, and the hook starts a rebuild. |
| Half-written reads | New file per build, pointer moved only after the commit and checkpoint. |
| Retried or concurrent builds | One build per log.db at a time (`relateGraphBuilding` claim); every build starts from an empty file, so a retry can't double edges. |
| Re-keyed identities | An identity merge since the last build means a full build, so a merged handle can't leave a stale node. |
| An update that drifts from a build | The update recomputes whole rooms and people from log.db rather than adding counts, a test builds both ways and compares every node and edge, and `log relate verify` compares the counts. |
| A write-ahead log that grows | Updates write in batches without a checkpoint; once about 20,000 rows have gone in since the last one, the update checkpoints the file, keeping Relate's log well under its limit. |
| A writer that never lets go | Each build runs in its own child process, so a long-lived MCP server or context service never keeps a writable handle that blocks every reader. |
| Schema change | The pointer carries the projector version; a graph from other code is ignored and rebuilt. |
| Another workspace's data | The graph folder sits beside its own log.db and the pointer carries that log.db's workspace key. |
| Drift | `log relate verify` compares every count with log.db. |

What each part must do is in the spec, [Relate graph](specs/relateGraph.md).

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
