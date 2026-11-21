# Relate graph: connected context for the agent

log reads the owner's inboxes into one local database, log.db. Text search over it answers "what was said". It can't answer how people connect: who already talks to someone, who engaged which post, which groups two people share, who could introduce you. log keeps a [Relate](https://github.com/relatedb/relate) graph of exactly those connections, projected from log.db, and its hook puts them in front of the agent the moment a prompt names someone.

```text
"can you intro me to @linus_k"
        │  UserPromptSubmit hook (Claude Code http hook, Codex curl, Hermes pre_llm_call)
        ▼
answerEvent → relateAnswer → relateContext ──► current graph-<seq>.rl (Relate, read-only)
        │                                            ▲
        ▼                                            │ log relate build (hidden child process,
>>> RELATE GRAPH (connected context …)              │ one at a time, when log.db moved on)
@linus_k [2 ids merged by handle] (Linus) on twitter │
  talks: group on builderOwner …                     └── log.db (events → typed tables, the record)
  who could introduce: @ada_codes (1 shared group, the owner's DM last 5 h ago); @grace_ships …
  same orbit (engaged the same posts): @maya_ml (2), @ada_codes (1), @tom_builds (1)
```

## How it uses Relate

- **Mode: single file.** Each build writes a new `graph-<throughSeq>-<ms>.rl` beside log.db (`~/.logCli/relate/`), and log.db's `state` table points at the current one. A single file is one immutable snapshot: it is written whole, checkpointed, and only then pointed at, so a reader never sees half a graph. It can be copied, inspected with the `relate` CLI, or thrown away.
- **Why not one long-lived store:** Relate is single-process with one writer, and on Windows a second process can't open a store another process is writing. log has many processes (the MCP server, the context service, every hook, the account owners), so the writer is a short-lived build process and everyone else opens finished snapshots read-only.
- **Embedded:** `@relate/relate` runs in the same Bun process as the hook through its C ABI (koffi). No server. Per Relate's ADR-0079, only the CLI binary sends anonymous usage metrics; the embedded library never phones home.

## What the graph models

| Node | Key | From log.db |
| --- | --- | --- |
| `Account` | `platform:account` | `accounts`, `chats` |
| `Identity` | `platform:userId` | `identities`, `handleAliases` (handle, name and aliases copied for lookup; `owner` marks the owner's own ids) |
| `Room` | `chatId` | `chats` (DM, group, channel) |
| `Post` | `platform:account:targetRef` | `interactions.targetRef`, `targetText` |
| `Snapshot` | `snapshot` | the event `seq`, schema and projector version it was built from |
| `Leader` | `leader:handle` | `networkLeaders`: the leaders whose circles your network is drawn around |
| `Community` | `community:id` | `networkCommunities`: the communities those leaders run |

| Edge | Meaning | From |
| --- | --- | --- |
| `(Account)-[:HAS_ROOM]->(Room)` | the account sees this chat | `chats` |
| `(Identity)-[:MEMBER_OF]->(Room)` | they are in it | `memberships` |
| `(Identity\|Account)-[:SAID {messages, lastAtMs}]->(Room)` | how much each side said there | `messages`, counted |
| `(Identity)-[:ENGAGED {kind, times, lastAtMs}]->(Post)` | like, reply, repost, quote, mention | `interactions` |
| `(Identity)-[:FOLLOWED]->(Account)` | a follow | `interactions` |
| `(Account)-[:POSTED]->(Post)` | the owner's post | `interactions` |
| `(Identity)-[:IN_CIRCLE_OF]->(Leader)` | they sit in that leader's circle | `networkCircles` |
| `(Leader)-[:RUNS]->(Community)` | the leader runs it | `networkRuns` |
| `(Identity)-[:MENTIONED {times, lastAtMs}]->(Identity)` | one mentioned the other in a post | `networkMentions` |
| `(Identity)-[:FOLLOWS]->(Account)` | they follow the owner's X account | `networkPeople.followsOwner` |

Message text stays in log.db. The graph holds counts and times, plus the post text people engaged with.

**Your network.** `log network import [--from <dir>]` (MCP `networkImport`) reads your network into log.db's `network*` tables, replacing the last import, and `log network status` (`networkStatus`) shows what is there; the next `log relate build` projects it. It is imported from the niche map research files (`final_scores.json` and `nicheMap.json`, from `LOG_NETWORK_DIR`, else `LOG_NICHE_MAP`'s folder). A person in your network and a chat identity with the same X handle (any case) are one `Identity`, which then carries `band`, `ring` (also as `degree`: 1 engaged with you, 2 talks to your followers, 3 follows you, 4 new), `score`, `themes` (the top 3), `passesGates` and their last post. [network/whoToTalkTo.md](useCases/network/whoToTalkTo.md) ranks who to talk to with one query.

## The questions it answers

For each person a prompt names (`@handle`, or a known handle without the @), from their node outwards:

1. **Talks:** which of the owner's accounts chat with them and how much each side said.
2. **Engaged the owner:** what they liked, replied to, reposted or followed, and when.
3. **In groups:** the groups and channels they are in.
4. **Who could introduce:** people in those groups whom the owner already has a DM with (2 hops: person → room → member → DM room).
5. **Same orbit:** others who engaged the same posts (person → post → person).

Identities on one platform with the same handle are merged (a handle seen before its numeric id was known). Nobody named means no context: silence beats a guess.

## Setup and run

```bash
bun install
log relate build                   # project ~/.logCli/log.db into a new graph
log relate status                  # which file, through which event, how far behind
log relate verify                  # every node and edge count against what log.db derives
log relate ask "intro me to @someone"
log relate query "MATCH (i:Identity)-[e:ENGAGED]->(p:Post) RETURN i.handle, e.kind, p.text LIMIT 5"
```

Over MCP these are `relateBuild`, `relateStatus`, `relateVerify`, `relateAsk` and `relateQuery`. Run `log relate build` once; after that the hook keeps it fresh: it answers from the current graph and starts a rebuild in the background when log.db has moved on (at most once a minute). With no graph built, the hook says nothing and builds nothing.

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
| Re-keyed identities | Rebuilt whole, never patched, so a merged handle can't leave a stale node. |
| Schema change | The pointer carries the projector version; a graph from other code is ignored and rebuilt. |
| Another workspace's data | The graph folder sits beside its own log.db and the pointer carries that log.db's workspace key. |
| Drift | `log relate verify` compares every count with log.db. |

What each part must do is in the spec, [Relate graph](specs/relateGraph.md).

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
