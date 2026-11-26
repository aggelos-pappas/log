# People across platforms: one person, every identity, and the first-time interactor (issue #95)

Status: proposal. Builds on the Relate graph (PR #172), the storage work checked against *Designing Data-Intensive Applications* (`docs/storageAgainstTheBook.md`, `docs/storageReadPath.md`, `docs/specs/storage.md`) and the conversation card (`docs/proposals/conversationCard.md`). Chapter references are to the book. The book is not in this repo; where this page cites it beyond what those two pages already quote, it names the section so it can be checked.

## What #95 asks for, in one line

A message lands: who is this person across every platform, what are they to the owner, and is what they ask for inside what they're trusted with? If not, flag it. Nothing is blocked yet.

This page is about the first two parts (who, and what they are), the person card that carries them, and the case #95 leaves open: **someone the owner has never met**.

## What log.db holds today (measured on a copy, 2026-11-17)

| Fact | Number | What it means for the design |
| --- | --- | --- |
| Identities | 1,349 | one row per platform id, never linked to each other |
| `identities.personId` filled | 0 | the column exists (migration 2) and nothing writes it |
| Identities that never sent a message | 789 (471 only liked, replied to a post, followed or mentioned) | most "people" are strangers on a post, not contacts |
| Identities that spoke in one chat / two or more | 457 / 103 | the people a card is for |
| Identities still keyed by handle (`@name`, id not learned yet) | 645 (Discord 332, X 308, Instagram 5) | a link can't be stored against a key that will change |
| `identityMerges` (handle → id re-keys done) | 46 | re-keying is live and ongoing |
| DMs never backfilled | 92 of 620 (and 5 channels) | "never seen them" can be "never read the history" |
| Gaps open or refused | 2 open, 4 refused | an account behind can't say anyone is new |
| The same handle on two platforms | 6 pairs | matching by handle alone finds almost nothing |

## The rules from the book, and what each decides here

### 1. Links are facts in the log; the person table is derived (ch. 11, "State, Streams, and Immutability"; ch. 12, "Designing Applications Around Dataflow")

`storageAgainstTheBook.md` item 2 made `events` the system of record. People follow the same rule, or they become the one table that can't be rebuilt.

- New event types: `personNamed` (create or rename), `identityLinked`, `identityUnlinked`, `personRoleSet`, `personsMerged`, `personForgotten`. Each is written by `insertEventRow` like every other event, with `source = 'owner'` or `'agent'` and who decided it.
- Derived tables, added to `DERIVED_TABLES` so `log storage rebuild` and `verify` cover them:
  - `persons (personId, name, role, createdSeq, updatedSeq)`
  - `identityLinks (personId, platform, userId, evidence, confidence, linkedBy, linkedSeq, revokedSeq)`
- An unlink is a new event that sets `revokedSeq`. It is never a delete. The book's "advantages of immutable events" is exactly this case: a wrong link stays explainable (who linked it, on what evidence, when it was undone).
- `identities.personId` stays unused. Filling it would keep the same fact in two places (ch. 2, "Many-to-One and Many-to-Many Relationships"). Readers join through `identityLinks`.

### 2. Ids that mean nothing, names in one place (ch. 2, "Many-to-One and Many-to-Many Relationships")

- `personId` is `p_` plus a random id, made once in the `personNamed` event and carried in it, so a rebuild makes the same id. It is never a platform id, a handle or a name.
- The person's name lives only on `persons`. Cards, hooks and the graph read it from there.

### 3. A link must survive the handle becoming an id (ch. 11, "Idempotence"; this repo's `rekeyIdentity`)

645 identities are still `@handle`. When `identityLearned` re-keys `@linus_k` to `2000000003`, every row keyed `@linus_k` moves, and `identityMerges` records it.

- `identityLinks` is one of the tables `rekeyIdentity` re-keys, in the same transaction. A link made to `@linus_k` today follows the person when the id is learned tomorrow.
- On replay, the order is the log's: `identityLinked` then `identityLearned` gives the same result as the live run, because both are events and `rebuildDerived` replays in `seq` order.
- If the handle and the id were each linked, to two different people, the re-key does not choose. It keeps the id's link, revokes the handle's, and appends an `identityConflict` alert naming both people. The owner then merges them or not. Silently merging two people the owner kept apart would be the lost update of ch. 7, "Preventing Lost Updates".

### 4. One identity, one person, enforced by the storage (ch. 7, "Write Skew and Phantoms", "Materializing conflicts")

Two sessions can link the same Discord user to two different people at once. A check in code before the insert is the write-skew the book warns about.

- A partial unique index: `identityLinksActive ON identityLinks (platform, userId) WHERE revokedSeq IS NULL`. The second link fails inside its transaction.
- Linking an identity that already belongs to another person is not a link. It is a `personsMerged { from, into }` event, written in one `BEGIN IMMEDIATE` with the check, and `from` keeps pointing at `into` so old references resolve.
- `personsMerged` is undone by a `personsSplit` event, never by editing the merge.

### 5. Order by the log, never by the clock (ch. 8, "Unreliable Clocks", "Timestamps for ordering events")

"First time", "returning" and "who spoke last" are all orderings. Different platforms' clocks and backfill times disagree (`storageAgainstTheBook.md` item 1).

- Every person fact carries the `seq` it was decided at (`createdSeq`, `linkedSeq`, `firstSeenSeq`).
- "First" means the lowest `seq` among the person's events.

### 6. Absence in a derived store isn't evidence (ch. 12, "Timeliness and Integrity"; ch. 11, "Keeping Systems in Sync")

This is the rule that decides the first-time interactor (below). A derived table only knows what was read. 92 DMs were never backfilled and 2 accounts have open gaps, so "no earlier message" can mean "never read".

### 7. Suggestions are derived; decisions are events (ch. 12, "The end-to-end argument")

Matching is probabilistic (the prior art in #95's comment: Splink, dedupe). The graph proposes; only the owner's yes becomes an `identityLinked` event.

- Suggestions live only in the Relate graph, as `SAME_AS_MAYBE {score, evidence}` edges, a different type from the confirmed `IS`. A query can't mistake one for the other.
- The agent may *suggest* a link in context ("maybe the same person as X @linus_k: same handle, both in Graph Club"). It never writes `identityLinked` unless the owner said so in his own words. `linkedBy` records which.

### 8. Additive schema, version on derived data (ch. 4, "Dataflow Through Databases")

Migration 21 adds the two tables and the index only. No column is renamed or dropped. The graph's `PROJECTOR_VERSION` goes to 2, so an old graph is ignored and rebuilt.

### 9. Forgetting is the one exception to immutability (ch. 12, "Doing the Right Thing", "Privacy and Tracking")

If the owner says to forget someone, an immutable log that keeps them forever is the wrong answer.

- `personForgotten { personId }` is appended. The rebuild drops the person and their links. Their raw messages are a separate decision: this event does not delete chats.
- The graph and every card are derived, so they lose the person on their next build.

### 10. Indexed lookups on the hot path (ch. 3, "Other Indexing Structures"; `storageReadPath.md`)

Every inbox event will ask "which person is this?". That must be one index probe, not a scan.

- `identityLinksByIdentity (platform, userId) WHERE revokedSeq IS NULL` (the unique index above serves it) and `identityLinksByPerson (personId)`.
- The person card is cached like the chat card (`conversationCards`, key `person:<personId>`), fresh while its `throughSeq` is the latest message seq across all its chats.

## The first-time interactor

Most people who reach the owner are strangers: 789 of 1,349 identities never sent a message. They need context most, because the owner knows nothing about them, and they must never be guessed at.

### Not every stranger becomes a person

A person row exists only when it is needed: the owner names someone, links them, gives them a role, or confirms a suggestion. Until then an identity is its own implicit person, shown as **unknown**, which is what #95 section 2 asks for. Making 1,349 person rows up front would fill the table with guesses the owner never made.

### Four states, worked out from the log

For an incoming event from identity *i* on account *a*:

| State | When | What the agent is told |
| --- | --- | --- |
| `firstContact` | no earlier event from *i* (or any identity linked to its person) on any of the owner's accounts, **and** the history that would show one is complete | "first time they've reached you" |
| `newHere` | *i*'s person is known through another identity, but this is its first event on this platform or account | "first time on Discord; known from X as @linus_k" |
| `returning` | there are earlier events | the person card |
| `historyUnknown` | no earlier event is stored, but the history isn't complete | "no history stored for them, and the chat was never fully read"; never "first time" |

"Complete" is checked, not assumed (rule 6 above):

- the chat has `backfilledAt` set (it was read from its start, or as far back as the platform keeps), and
- the account has no `open`, `catchingUp` or `refused` gap whose window covers the time before this event.

If either fails, the state is `historyUnknown`. That is the correct answer for 92 of today's DMs. It also stops a wrong "first time, introduce yourself" draft to someone the owner has talked to for months in a chat log never read.

`firstSeenSeq` per identity is derived (the lowest event `seq` naming it, re-keyed with the identity), so the state is the same on a rebuild as live.

### What the context says about a stranger

The graph is where strangers become legible. For a `firstContact` or `historyUnknown` sender the hook adds, from Relate:

1. **How they arrived:** the first thing they did. Examples: "replied to your post 'introducing log…' 2 days ago, then DMed"; "followed you, then DMed"; "in the same Discord server, never spoke there".
2. **Who they're near:** groups they share with the owner, people in those groups the owner already talks to (introducers), others who engaged the same posts (same orbit). These are the queries PR #172 already runs.
3. **Who they might be elsewhere:** `SAME_AS_MAYBE` suggestions with their evidence, labelled as unconfirmed.
4. **Trust:** unknown. When #95 section 3 lands, every spend, access, secret or act-as-the-owner ask from an unknown person is flagged.

Example:

```text
>>> FIRST CONTACT: @ada_codes on X (unknown person)
  arrived: liked and replied to your post "introducing log…" 3 days ago, then DMed 5 h ago
  near: in "Agent Builders" with @grace_ships (you DM her) and @linus_k
  maybe also: Discord ada.codes (same handle, both in Graph Club) - not confirmed
  trust: unknown - spend, access, secrets and acting as you would be flagged
```

### Rules for the agent with a stranger

- Never say or imply the owner knows them.
- A suggestion stays a suggestion until the owner confirms it.
- `historyUnknown` is reported as that, and the read that would settle it is offered (`readSourceFor`, rule 160), never guessed past.

## The person card across platforms

The chat card (`cardFor`) stays exactly as it is. The voice gate still grades a draft only against that chat (REQ-VOICE-26), because how the owner writes on Discord isn't how he writes on X. The person card is a second, wider record, used for **who** and **what's open**, never for voice.

| Field | From |
| --- | --- |
| `personId`, `name`, `role`, `state` (`returning`, `newHere` …) | `persons`, the first-time rule |
| `identities` | each linked identity: platform, handle, which owner accounts talk to it |
| `chats` | one line per chat: platform, account, kind, messages each side, last at, `waitingOn` (from its chat card) |
| `waitingOn` | worked out from the latest message on any of their chats |
| `openAcross` | `theyAskedOpen` and `ownerAskedOpen` from every chat card, each marked with its platform |
| `last` | the last 8 lines across every chat, in `seq` order, each marked `[X]`, `[Discord]` … |
| `engagement` | what they did on the owner's posts, from the graph |
| `throughSeq` | the highest message seq across all their chats; the card is rebuilt when any chat moves past it |

It is cached in `conversationCards` with key `person:<personId>`, so no new table. An identity with no person gets a card keyed `identity:<platform>:<userId>` with the same fields and only its own chats.

Every field, how it is rendered and what proves it right are in "The person card, fully scoped" below.

## How a match is scored, without AI (Fellegi-Sunter record linkage)

Matching people across sources is a solved problem in statistics: probabilistic record linkage (Fellegi and Sunter, 1969), implemented by [Splink](https://moj-analytical-services.github.io/splink/topic_guides/theory/fellegi_sunter.html). It uses no model calls and no embeddings, only counted evidence, and every score can be explained. log uses that model.

- **Comparisons with levels.** Each kind of evidence is a comparison with a few named levels, each worked out by code:

  | Comparison | Levels |
  | --- | --- |
  | `sharesOwnPosts` | 5+ times / 2–4 times / once / never (with "asks to like or share" as its own level above each) |
  | `profileLink` | they link to the other profile and it links back (the IndieWeb `rel=me` / Mastodon verified-link idea) / one way only / none |
  | `handle` | the same / the same without digits, `_` and `.` / different |
  | `displayName` | the same / Jaro-Winkler at least 0.92 (a string measure, not an embedding) / different |
  | `sharedRooms` | 2 or more rooms together on both platforms / 1 / none |
  | `twentyEmail` | the same email / none |
  | `ownerSaid` | the owner said so in a chat / no |

- **Each level has a Bayes factor:** how much more often it happens for the same person than for two different people (`m / u`, [Robin Linacre's explanation](https://www.robinlinacre.com/m_and_u_values)). log starts with fixed values written in `types.ts`. Once the owner has answered enough suggestions, his yeses estimate `m` and random pairs estimate `u`. The number stays explainable either way.
- **The match weight is the sum of `log2` of the Bayes factors** plus a prior, so each piece of evidence adds or subtracts bits. It converts to a probability.
- **Two thresholds, as Fellegi-Sunter and every clerical-review system use** ([Statistics Canada](https://www.statcan.gc.ca/en/conferences/symposium2016/program/14743-eng.pdf), [Coleridge textbook ch. 3](https://textbook.coleridgeinitiative.org/chap-link.html)):
  - above the upper one: `strong`;
  - between them: `review`;
  - below: not shown.

  log adds one rule on top: even `strong` waits for the owner's yes (rule 7 above).
- **Exclusions run before scoring:** bots (Discord's `bot` flag, known bot names); the owner's own accounts and repos as someone else's (sharing *your* repo is not *being* you); and a link whose surrounding text recommends someone else ("this dude", "check out his").

### What a suggestion returns (the waterfall, as data)

Splink's [waterfall chart](https://moj-analytical-services.github.io/splink/charts/waterfall_chart.html) breaks a pair's match weight into one bar per comparison: the prior, then each comparison with its values, level, Bayes factor and weight, then the total and its probability. log returns that breakdown as data, with every piece of evidence pointing back at its source rows (a real case from the owner's DMs, with the names changed, with the factors from the table in "Where the numbers come from" below):

```json
{
  "suggestionId": "sg_9f2c…",
  "a": { "platform": "discord", "userId": "1000000000000000007", "handle": "linus_k", "name": null, "person": null },
  "b": { "platform": "twitter", "userId": "2000000000000000003", "handle": "linus_k1", "name": "Linus K", "person": null, "ownerAccount": true },
  "prior": -12.8,
  "comparisons": [
    { "comparison": "sharesOwnPosts", "level": "5+ with asks", "values": ["discord linus_k", "x.com/linus_k1"], "bayesFactor": 18200, "matchWeight": 14.2,
      "count": 20, "asks": 11, "firstAt": "2026-07-30", "lastAt": "2026-11-10",
      "sources": [ { "messageKey": "discord:…:…", "chat": "Discord DM", "at": "2026-11-10T…", "text": "https://x.com/linus_k1/status/… Please Like and share Kindly" } ] },
    { "comparison": "handle", "level": "same without digits and _", "values": ["linus_k", "linus_k1"], "bayesFactor": 9200, "matchWeight": 13.2 },
    { "comparison": "sharedRooms", "level": "none", "values": [0], "bayesFactor": 0.95, "matchWeight": -0.07 }
  ],
  "matchWeight": 14.48,
  "probability": 0.99996,
  "band": "strong",
  "throughSeq": 156323,
  "decision": null
}
```

- `sources` holds at most 3 messages, newest first, with the `messageKey` that opens the whole message. Counts cover all of them.
- `decision` is null until the owner answers. Then it is `{ "answer": "yes" | "no", "seq": …, "by": "owner" }`, and a "no" is kept so the pair is never suggested again with the same evidence.

### Where the numbers come from (measured on a copy of log.db, 2026-11-17)

`u` (how often a level occurs between two *different* people) is measured, not chosen. Almost every one of the 368,109 cross-platform identity pairs is two different people, so the share of pairs at each level is `u`. Splink estimates `u` from random pairs the same way.

`m` (how often it occurs for the *same* person) needs known matches. Until the owner has answered enough suggestions, it is set conservatively low, which makes each factor smaller, not larger.

| Level | Pairs at this level | `u` (measured) | `m` (set) | Bayes factor `m/u` | Weight (bits) |
| --- | --- | --- | --- | --- | --- |
| handle the same | 6 | 0.0000163 | 0.30 | 18,400 | 14.2 |
| handle the same without digits, `_`, `.` | 4 | 0.0000109 | 0.10 | 9,200 | 13.2 |
| shares the other's own posts 5+ times | 1 | 0.0000027 | 0.05 | 18,200 | 14.2 |
| … 2 to 4 times | 7 | 0.0000192 | 0.10 | 5,200 | 12.3 |
| … once | 49 | 0.000134 | 0.15 | 1,100 | 10.1 |

**Prior:** about 50 real cross-platform people among 368,109 pairs, so λ ≈ 0.00014, which is −12.8 bits.

**What that gives:**
- **The example above:** −12.8 + 14.2 (shares 5+) + 13.2 (handle) ≈ 14.55 bits, probability 0.99996: `strong`.
- **The same handle and nothing else:** −12.8 + 14.2 = 1.35 bits, probability 0.72: `review`.
- **A near-identical handle alone:** 0.4 bits, probability 0.57: `review`.
- **One shared post and nothing else:** −2.7 bits, probability 0.13: not shown.

That is the behaviour wanted: two independent signals make a strong suggestion, and one signal alone is at most "worth a look".

Two refinements, both from Splink:
- **Term frequency:** a common handle (`john`, `alex`) matches by chance far more often than a rare handle, so the handle factor is divided by how many identities share that handle.
- **Estimating `m` without labels:** expectation-maximisation can estimate it, but with about 10 likely matches today it would be unstable. So `m` moves from the set values to estimates only once the owner has answered 30 or more suggestions, and both sets of values are kept, so a score can always be recomputed.

### The decision ledger

Identity products keep merges as a history, not just a current state:

- Segment's [`id_graph_updates` → `profile_merges`](https://segment.com/docs/unify/profiles-sync/tables/) records the canonical id and the event that triggered each merge.
- Amperity's [stitch summary](http://docs.amperity.com/reference/stitch_summary.html) lists every id as added, deleted, merged or split.

log's events are that ledger already: `identityLinked`, `identityUnlinked`, `personsMerged`, `personsSplit`. Each carries the `suggestionId` and the comparisons it was accepted on, so `log people why <who>` can answer "linked on Nov 17 by the owner, from these 20 shares and the handle".

## Returning context to the agent

[Zep's context API](https://help.getzep.com/sdk-reference/graph/get-context) is the closest published shape for "context about people, for an agent". It returns three things: `context` (an assembled string within a character budget), `results` (the structured items it was built from, on request) and `truncated` (whether the budget cut it). Zep says to pass the string through the model's untrusted-data channel, and its facts carry `valid_at` / `invalid_at` so a superseded fact is never presented as current ([Facts](https://help.getzep.com/facts)).

log's person context follows the same split:

| Part | Holds |
| --- | --- |
| `text` | the rendered block the hook injects, under its budget (2,000 characters per provider, rule in `docs/contextLayer.md`), labelled as facts not instructions |
| `items` | the structured card, suggestions and their `sources`, so a tool or the agent can follow any line to its message |
| `truncated` | whether the budget dropped anything, and what (`dropped: ["sameOrbit", "last[5..8]"]`) |
| `throughSeq`, `behind` | how current it is (from the graph pointer, as now) |
| `validity` | every link with `linkedSeq` and, when undone, `revokedSeq`; a revoked link is never shown as current |

Third-party text (their messages, bios, link text) only ever appears inside quotes in `text`, never as a line of its own, so a message can't pose as an instruction.

## The person card, fully scoped

### When it is built and read

- **Built:** on demand, by `personCardFor(personId | identity)`, from the chat cards of every linked identity plus the graph. It is cached in `conversationCards` under `person:<personId>` or `identity:<platform>:<userId>`, valid while its `throughSeq` equals the highest message `seq` across all its chats (one indexed lookup, as `cardFor` does today).
- **Read by:**
  - the `relate` hook, for people a prompt names;
  - the inbox hook, for every incoming message's sender;
  - `log people show` and MCP `peopleShow`;
  - the writer, beside the chat card, for *who* and *what's open*. The voice gate never reads it: voice stays per chat, REQ-VOICE-26.

### Fields

| Field | Type | From |
| --- | --- | --- |
| `personId` | `p_…` or null | `persons` |
| `name`, `role` | text | `persons` (null and `unknown` without a person) |
| `state` | `firstContact`, `newHere`, `returning`, `historyUnknown` | the first-time rule |
| `identities[]` | `{ platform, userId, handle, name, ownerAccounts[], linkedSeq, evidence }` | `identityLinks` and `identities` |
| `chats[]` | `{ platform, account, kind, name, messages, fromOwner, lastAt, waitingOn, backfilled }` | each chat card, plus `chats.backfilledAt` |
| `waitingOn` | `owner`, `them` or null | the latest message across all chats |
| `openAcross[]` | `{ side: "they" or "owner", platform, text, at, messageKey }` | `theyAskedOpen` and `ownerAskedOpen` of every chat card |
| `last[]` | `{ platform, from, text, at, messageKey }`, 8 lines in `seq` order | every chat |
| `engagement[]` | `{ account, kind, times, post, lastAt }` | the graph (`ENGAGED`, `FOLLOWED`) |
| `near` | `{ groups[], introducers[], sameOrbit[] }` | the graph |
| `suggestions[]` | the suggestion shape above, `review` and `strong` only, at most 3 | the graph (`SAME_AS_MAYBE`) |
| `arrived` | the first event: `{ kind, platform, at, text }` | the lowest `seq` for this person |
| `throughSeq`, `builtAt`, `behind` | numbers | the card and the graph pointer |

### Rendered for the hook (`text`), in priority order under the budget

1. A header: name or handle, role, state, and every identity on one line.
2. `waitingOn` and `openAcross`, since that's what the owner acts on.
3. `last`, up to 8 lines, each marked `[X]`, `[Discord]` and so on.
4. `engagement`.
5. `near`: groups, introducers, same orbit.
6. `suggestions`, each marked "not confirmed".

When the budget runs out, the lowest-priority parts drop first, and `truncated` names them.

### Acceptance (what proves the card right)

- **Identical on rebuild:** a card built after `log storage rebuild` and a graph rebuild is byte-identical to the live one, except `builtAt`.
- **Follows a re-key:** a person whose X handle becomes an id keeps every chat and line.
- **Only confirmed links:** an unlinked suggestion never adds a chat or a line to the card.
- **Revoked links disappear:** after `identityUnlinked`, the next card has none of that identity's chats.
- **Never claims first contact without the history:** a DM never backfilled gives `historyUnknown`.
- **Within budget:** `text` stays under 2,000 characters, and whatever was cut is named in `truncated`.
- **Every line traces back:** each line in `last` and `openAcross` resolves through its `messageKey` to a row in `messages`.

## The graph (Relate) side

PR #172's projection gains:

- `(:Person {key: personId, name, role})-[:IS {linkedSeq, evidence}]->(:Identity)` from active `identityLinks`.
- `(:Identity)-[:SAME_AS_MAYBE {score, evidence}]->(:Identity)`, computed at build time from:
  - the same handle or display name on another platform;
  - shared groups on both platforms (in the same Discord server and X group as the same people);
  - a bio or profile naming the other handle (`identityProfiles`);
  - the same email in Twenty.
- Every context query starts from the person when there is one (`MATCH (p:Person)-[:IS]->(i)`), so talks, introducers and orbit cover all their platforms.
- `log people suggest` reads the `SAME_AS_MAYBE` edges, best score first, with their evidence. The owner answers yes or no.

## Surface

| Command | MCP | What it does |
| --- | --- | --- |
| `log people` | `peopleList` | everyone with a person row: name, role, identities |
| `log people show <who>` | `peopleShow` | the person card (or an identity's card) |
| `log people suggest` | `peopleSuggest` | unconfirmed matches with evidence |
| `log people link <who> <identity>` | `peopleLink` | appends `identityLinked` (or `personsMerged` when it already has a person) |
| `log people unlink <identity>` | `peopleUnlink` | appends `identityUnlinked` |
| `log people name <who> "<name>"` / `role <who> <role>` | `peopleName` / `peopleRole` | `personNamed`, `personRoleSet` |
| `log people forget <who>` | `peopleForget` | `personForgotten`, after the owner confirms |

Every write takes the owner's words (`approvedBy`), like the live sends do. The agent can call `suggest` and `show` freely.

## Order of work

1. **Record:** migration 21; the event types; derivation in `deriveInternal`; `identityLinks` in `rekeyIdentity`; the unique index; `persons` and `identityLinks` in `DERIVED_TABLES` and `derivedFingerprint`. Tests: link, then the handle becomes an id, and the link follows; two links to one identity fail; merge, then split; rebuild gives identical rows.
2. **First-time rule:** derived `firstSeenSeq`; the four states with the completeness check (backfill and gaps). Tests: a never-backfilled DM gives `historyUnknown`, never `firstContact`; an open gap does the same; a linked person on a new platform gives `newHere`.
3. **Person card:** `personCardFor`, cached under `person:` keys, built from the chat cards. Tests: lines from two platforms in `seq` order; `waitingOn` from the latest across platforms; the voice gate still reads only the chat card.
4. **Graph:** `Person`, `IS`, `SAME_AS_MAYBE`; context queries from the person; `PROJECTOR_VERSION` 2.
5. **Surface and hook:** `log people …`; the hook says person, role and state on every inbox event and prompt; spec `docs/specs/people.md` (rule 117).
6. **Later (#95 sections 3 and 4):** role and trust, then flags.

## Questions for the owner

1. **Roles:** keep #95's list (`owner`, `teammate`, `caller`, `client`, `friend`, `unknown`)?
2. **Auto-creating people:** should replying to someone a few times make them a person automatically (role `unknown`), or only when you say so?
3. **Suggestions in context:** show "maybe the same as …" lines inline in the hook, or only in `log people suggest`?
4. **Forget:** should forgetting a person also delete their messages, or only the person record and links?
