---
title: "People across platforms"
---

# People across platforms

One person often has several identities: a Discord account, an X account, an Instagram account. log keeps them apart until the owner says they are one person. From then on, the person card, the Relate graph and the hook treat them as one. Links are events in log.db, never edits, so every link can be explained and undone. Suggestions come from Fellegi-Sunter record linkage, the model Splink implements, over evidence log already stores. There are no model calls and no embeddings. The design and its reasoning: [People across platforms](../proposals/peopleAcrossPlatforms.md).

## The record

### REQ-PEOPLE-01: Links are events, and the tables are derived from them

`log people link` appends a `personNamed` event when it starts a person or names one, and an `identityLinked` event for each identity, under platform `log` and account `people`. `log people unlink` appends `identityUnlinked`, and `log people different` appends `identityNotLinked`. They write `persons`, `identityLinks` and `identityNotLinked`, which are derived tables: `log storage rebuild` replays them from the events and gives the same rows. An unlink sets `revokedAt` on the link and never deletes it.

Checked by: code and SubQ

### REQ-PEOPLE-02: One identity belongs to at most one person, enforced by the database

A partial unique index allows one active link per identity (`identityLinksActive`, where `revokedAt` is null). Linking identities that already belong to two different people is refused; merging people isn't built. A replayed link to an identity that is already linked is ignored, so replay is deterministic.

Checked by: code and SubQ

### REQ-PEOPLE-03: A link follows an identity when its id is learned

When `identityLearned` re-keys a handle-keyed identity (`@name`) to its id, `rekeyIdentity` moves its links with it in the same transaction. If the id was already linked too, the handle's link is revoked (`rekeyConflict`), never merged silently.

Checked by: code and SubQ

## Suggestions

### REQ-PEOPLE-04: Suggestions are scored with Fellegi-Sunter record linkage, weights learned by EM

`log people suggest` compares identities on different platforms. Candidates (blocking, `linkCandidates`) are pairs whose handles match once digits, `_` and `.` are dropped, pairs where one identity's messages link to the other platform's posts (`x.com/<handle>/status/…`, Instagram profiles, Discord user links), pairs where one identity writes the other's handle in a message (`mentionsIn`), and pairs with the same display name. Each pair is scored on these comparisons:
- **sharesOwnPosts:** 5+ / 2–4 / once / never, counting the times they asked to like or share;
- **handle:** same / same without digits, `_` and `.` / different;
- **displayName:** same / different;
- **mentionsHandle:** handed over in a DM with the owner (a message that is only the handle, or says "my insta is …", and the other account also DMs the owner) / said as their own / in passing / never;
- **claimsPlatform:** one of them says "my <the other's platform>" / never;
- **writingStyle:** character 3-gram cosine of their messages; **meaning:** cosine of the mean MiniLM vector of their messages; **activeHours:** cosine of their UTC hour histograms; **topicsWithOwner:** word cosine of what they say in chats with the owner. Each is close / near / far, cut at the 99th and 90th percentile of random cross-platform pairs, and left out when either side has too little text;
- **sharedCircle:** people in common in their group chats, 3+ / 1–2 / none.

`u` is measured from log.db: the share of all cross-platform identity pairs at that level, smoothed, or of random pairs for the similarity levels. `m` is learned by expectation maximisation (Splink-style): one session per blocking rule, the blocked comparison left out of that session, starting from `M_PRIORS` with prior strength `EM_PRIOR_STRENGTH`, pooled. A handle match is divided by how many distinct handles on that platform reduce to the same letters. The match weight is the prior, log2 of 4% of identities over all pairs, plus the sum of log2 of the factors. At 4 bits or more a pair is `strong`, at 0 or more it's `review`, and below that it's hidden. Each suggestion returns every comparison with its level, m, u, factor and weight, and up to 3 source messages by `messageKey`; `log people suggest` prints every factor.

Checked by: code and SubQ

### REQ-PEOPLE-05: What never becomes a suggestion

These are never suggested:
- bots;
- links in messages recommending someone else ("check out his", "this dude");
- a pair involving an account log runs, unless the handles match;
- a pair the owner marked `different`;
- a pair already linked to one person.

A handle-keyed identity whose handle already has an id on that platform is the same identity waiting to be re-keyed, so it is not compared separately. Nothing is linked without the owner: every write needs `--approvedBy` with his words.

Checked by: code and SubQ

## The person card

### REQ-PEOPLE-06: One card across every platform of a person

`log people show <who>` resolves a person id, a linked person's name, or `platform:handle`. When an identity is linked, the card covers every identity of its person. The card holds:
- **Per platform:** the one-to-one chats, with each side's message count; the groups together; and engagement with the owner's accounts.
- **Waiting:** who spoke last.
- **Arrival:** when they were first seen.
- **The last 8 lines** from one-to-one chats, in time order, each tagged with its platform.

A chat counts as one-to-one when no other sender wrote twice, or when the two of them wrote 95% of it. Chats on an account log runs for that person are left out and counted. Lines stored twice are shown once, an empty line shows as `[attachment]`, and chats never read from the start are flagged.

Checked by: code and SubQ

### REQ-PEOPLE-07: The hook and the graph see a person, not one identity

When a prompt names a linked person, by a handle on any platform or by a word of their name, the `relate` hook adds their card, at most 2 people and 2,000 characters each. The Relate graph marks every linked identity with its `personId` and the person's name words. `findPeople` groups identities by person, expands to all of the person's identities, and matches by name. So the connected context and the relationship retriever cover every platform.

Checked by: code and SubQ

### REQ-PEOPLE-08: Vetoes, merge re-checks, accounts together, and SubQ on the review band

Two hard vetoes drop a pair whatever its score: both display names are real names with no word in common, or two identities on one platform, one from each side (with every identity already linked to either side), talk in the same DM or group. Links the owner already made are scored again and listed when they fall below `REVIEW_BITS` or hit a veto. Suggested pairs that share an identity are joined into one person across several accounts (`clustersOf`), the pairs between their other ends are scored too, and the output gives one `log people link` for all of them. `--check` asks SubQ, for up to `REVIEW_CHECKS` review-band pairs, whether one person runs both accounts, from `REVIEW_LINES` of each one's messages and the measured evidence; when the first answer is under `REVIEW_SURE` it asks again with more lines. The answer is shown beside the pair; nothing is linked until the owner says yes.

Checked by: code and SubQ
