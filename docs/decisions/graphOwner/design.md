# The Relate graph as one long-lived owner per log.db

The Relate graph is a view derived from log.db. This page sets out how one process owns that view, follows log.db's events, and serves every read. Each rule cites *Designing Data-Intensive Applications* (DDIA) by chapter and section. The before and after numbers were measured on a copy of the owner's log.db.

## What it was

- `refreshGraph` ran on every prompt hook. When the graph was behind and its last build was a minute old, it spawned a detached `bun -e applyGraphHere`.
- That child copied the 71 MB graph file and opened it (about 1.7 s). It applied the new events, wrote a new graph file and moved the pointer.
- Exclusion was the `relateGraphBuilding` claim: a lease on a timer, with no fencing token.
- Every reader opened the file itself: the hook, `relateQuery`, `relateAsk` and the search prior. The context service also cached one open handle per file and never closed it, because the Relate client has no `close()`.

## The design

### 1. One consumer per log.db, reading in order from a stored offset

One graph owner process runs per log.db (`scripts/relate/owner.ts`, then `runGraphOwner`). It opens the current Relate store once, writable, and keeps it in memory. It tails log.db's `events` table in `seq` order on one loop. Its position is the store's `throughSeq`.

- *DDIA ch. 11, "Partitioned Logs", "Consumer offsets":* a consumer that reads a log sequentially only needs to record its offset. Everything below the offset has been processed, and everything above has not. A consumer that restarts resumes from its last recorded offset. Here `events.seq` is the log and `Snapshot.throughSeq` is the consumer offset.
- *DDIA ch. 7, "Actual Serial Execution", "Summary of serial execution":* a single thread needs no concurrency control when every transaction is small and fast and the active data fits in memory. The graph is 71 MB. A batch is bounded (point 2). A rebuild, the one long job, is moved off the loop (point 5).

### 2. Microbatches, with the offset stored in the same transaction as the output

Every `OWNER_BATCH_MS` (200 ms), `applyBatch` takes the events after the offset, at most `OWNER_BATCH_EVENTS` (2,000) of them. It works out again from log.db only the rooms, people and engagement those events touched. It writes them in **one** Relate transaction. That transaction also sets the `Snapshot` node's `throughSeq`, interaction, merge and network-import offsets and the owner generation.

- *DDIA ch. 11, "Fault Tolerance", "Microbatching and checkpointing":* a stream cut into small blocks, each treated as a small batch. 200 ms trades scheduling overhead against delay, as the book describes for roughly one-second microbatches.
- *DDIA ch. 11, "Fault Tolerance", "Idempotence":* "include the offset of the message that triggered the last write with the value". The offset commits atomically with the changes, so a crash either keeps both or neither. Applying a batch again is idempotent because the projection is recomputed state, not added counts: rooms' edges are replaced and nodes are merged. The test `re-applying the same batch is idempotent` rewinds the offset, applies the same batch twice and compares every count with a full build. `a restart resumes from the offset stored in the graph` stops an owner after one batch, starts another, and compares the result node for node and edge for edge with a full build.

### 3. A single owner, fenced by a generation number

Taking ownership raises `owners.generation` (row `relate`/`graph`) inside `BEGIN IMMEDIATE`. This reuses the column the account watchers already use. Before each batch commit, the owner checks that `owners` still names its pid and generation. If not, it rolls back and exits with `graphOwnerFenced`. The heartbeat and pointer writes are fenced the same way. The store records the generation on its `Snapshot` node, and an owner older than the store refuses to write it (`fenceStore`). Relate's own single-writer lease on the file ("storage locked": a second writable open fails) is the store-level fence.

- *DDIA ch. 8, "Process Pauses":* a lease holder can pause and wake up still believing it holds the lease.
- *DDIA ch. 8, "The leader and the lock":* a node that believes it is "the chosen one" can corrupt the resource after the others have declared it dead.
- *DDIA ch. 8, "Fencing tokens":* every grant returns a number that increases, and the resource itself rejects a write carrying an older one: "it is not sufficient to rely on clients checking their lock status themselves". `owners.generation` is the token. The store's `Snapshot.generation` and Relate's write lease make the store take part.
- *storageAgainstTheBook item 4:* the process start time is stored with the pid (`pidStartedAt`), so a reused Windows pid is never treated as the owner. A permission error counts as alive. A silent owner is replaced only after **two stale readings `OWNER_STALE_CONFIRM_MS` (10 s) apart**, and is killed only when its start time matches. The test `taking over a silent owner…` covers both the kill and the reused-pid case, and `a replaced owner's commit is refused…` covers the fenced commit.

### 4. Started once, never per call

The hook and the MCP server call `ensureGraphOwner`. It is a single read of the `owners` row: status starting, building or streaming, with a heartbeat younger than `OWNER_STALE_MS`. If the owner is missing, they start it, at most once per `OWNER_START_BACKOFF_MS` (`relateStatus` { owner: start } claim). They never spawn a build or an apply, and `refreshGraph` is gone. A second owner exits at once (`graphOwnerRunning`, exit code 3).

### 5. Long work on a snapshot outside the loop, then catch up and swap

A full rebuild runs `buildFileHere` in a child process on one read snapshot of log.db, at a known `throughSeq`. It is triggered by `log relate build` while the owner runs, a merge, a new network import, more than `APPLY_MAX_EVENTS` new events, or five failed batches in a row. Meanwhile the loop keeps applying batches to the current store, so reads stay fresh. When the file is ready, the owner opens it, applies the events since that snapshot, and swaps it in once in-flight reads on the old store have finished. Then it moves the pointer.

- *DDIA ch. 11, "Change Data Capture", "Initial snapshot":* a snapshot "must correspond to a known position or offset in the change log, so that you know at which point to start applying changes after the snapshot has been processed".
- *DDIA ch. 12, "Unbundling Databases", "Creating an index":* CREATE INDEX scans a consistent snapshot, then processes the backlog of writes since the snapshot, then keeps the index current on every write. The rebuild follows the same three steps.

### 6. Readers ask the owner, and fall back to the last file

The hook, `relateAsk`, `relateQuery`, `relateVerify`, `relateStatus`, `relateMachine` and the search prior (`graphPriorFor`) ask the owner. Each read gets its own Relate connection to the in-memory store and runs through `queryAsync` on a worker thread. The batch also writes through `queryAsync`, so the loop's thread stays free and reads run while a batch applies. Snapshot isolation means a read sees the last committed batch. The test `readers get answers from the owner while a batch is still applying…` holds a batch open before its commit and reads through it. `relateQuery` is checked with `EXPLAIN` and refused when its query type would write (`graphReadOnly`).

If the owner is down, a reader opens the last file read-only for that one read and closes it. It says the result is behind: `served: 'file'`, and the hook line reads "The graph owner is not running, so this is read from the last graph file, N events behind log.db".

**Transport: loopback HTTP with a per-start token, on the port and token columns of the owner's `owners` row.**

| Option | Why it was or wasn't chosen |
| --- | --- |
| `relate serve` (Bolt or MCP) | The `relate` CLI binary isn't in the npm package, and Bolt clients need `neo4j-driver`. The server would also be the store's one writer, so the owner would have to write through Bolt from a second process. That is two processes where one is the point. |
| Named pipe or Unix socket | Bun's Windows named-pipe support for `Bun.serve` is unproven here, and log has no other pipe code. |
| **Loopback HTTP + token** | `Bun.serve` on `127.0.0.1:0`, with the token checked on every request. The account watchers' relays already publish `owners.port` and `owners.token` this way, so discovery and liveness are one row read. Each request has a timeout (`OWNER_READ_MS`, 3 s), after which the reader falls back. |

**Closing a store.** The Relate JS client exposes no `close()`. A read-only handle held by any process blocks the owner's writable open, and the owner must also close the old store at a swap. `src/relate/graph/helpers/store.ts` calls the engine's own `relate_disconnect` and `relate_database_close` through the client's koffi binding.

### 7. No dual writes

Nothing writes the graph except the owner. A one-shot `log relate build` with no owner running takes the same owner claim for its run. Every writer appends to log.db, and the owner projects.

- *DDIA ch. 11, "Keeping Systems in Sync", Figure 11-4:* two writers updating two systems can apply the writes in different orders and leave the systems permanently inconsistent. Making the graph a follower of log.db's single order removes the race.

### 8. Lag is visible

`log relate status`, `log relate owner status` and the hook context report "N events behind" as log.db's highest `seq` minus the owner's offset.

- *DDIA ch. 11, "Partitioned Logs", "When consumers cannot keep up with producers":* "You can monitor how far a consumer is behind the head of the log, and raise an alert if it falls behind significantly."

## Numbers (a fresh copy of the owner's log.db: 41k identities, 72 MB graph, about 209k events)

Measured on the branch merged with main, one run after another on the same copy.

| What | Before (main) | After |
| --- | --- | --- |
| Event-to-visible, 1 new event | p50 2.31 s, p95 3.04 s, p99 3.04 s (15 runs), counted from the apply starting; the apply only starts on a prompt, at most once a minute | p50 228 ms, p95 320 ms, p99 343 ms (30 runs) |
| Event-to-visible, 100 new events | p50 2.90 s, p95 3.38 s, p99 3.38 s (8 runs) | p50 690 ms, p95 763 ms, p99 763 ms (15 runs) |
| Event-to-visible, 1,000 new events | p50 3.04 s, p95 3.31 s, p99 3.31 s (4 runs) | p50 881 ms, p95 1.88 s, p99 1.88 s (8 runs) |
| Hook relate time per prompt (graph context, search stubbed, fresh process) | p50 2.47 s, p95 2.72 s, p99 4.43 s (20 prompts; includes the file open) | p50 686 ms, p95 738 ms, p99 806 ms (100 prompts, served by the owner) |
| Apply processes started per 100 prompts | 42.7 (the old rule replayed over the owner's last 2,012 real prompts in 13.2 days); 1 in a 20-prompt burst, because of the one-minute gate | 0 (100 measured prompts) |
| Owner start (bun, open the graph, fence) | n/a | 2.24 s, once |
| Full rebuild while serving | 31 s in an earlier run, readers blocked from the new file until it was pointed at | 33.1 s on a snapshot, with 55 reads answered during it (p50 331 ms, p95 557 ms, p99 2.17 s at the swap); verify then matched log.db exactly |

With 1 or 100 events, the "before" apply time is mostly the per-apply process start, the 72 MB file copy and the open. The "after" p95 for 1,000 events includes the checkpoint the owner runs once about 20,000 rows have gone in since the last one. The hook's remaining 0.7 s is the Cypher itself (`findPeople` scans every identity), not I/O.

## Not done here

- Over MCP the owner is `relateStatus` with `owner: start` or `owner: stop`, not three new `relateOwner*` tools. A new tool tips a tied golden ask in the tool router (`search` and `tregCall` both score 10.81 for "find where … talked about pricing"), and the router test pins the count. The CLI keeps `log relate owner status|start|stop`.

- `relateMachine` (the relationship state machine) asks the owner too, on its own `machine` route with a longer timeout (`MACHINE_READ_MS`), because the network view reads every identity (about 25 s on the copy). Its queries run through `queryAsync`, so the owner keeps answering status and other reads meanwhile. `log network` reads only log.db's ring tables.
- The commit itself is synchronous in the Relate client (there is no `commitAsync`), so a slow commit pauses HTTP reads for its duration.
- Processes still on the old code (an MCP server or context service started before the update) keep opening graph files read-only until they reload. While the owner holds the file, they get `graphUnreadable`.

## Related

- Up: [Decisions](../README.md)
- [The Relate graph](../../relateGraph.md) · [Its spec](../../specs/relateGraph.md) · [Storage against the book](../../storageAgainstTheBook.md)
