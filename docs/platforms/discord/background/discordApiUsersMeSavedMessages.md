# discordApiUsersMeSavedMessages

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/saved-messages` |
| Sends | — |
| Reads | `message`, `code` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 404 | 342 ms | 11824 ms | — |
| inspect | step 5: click e40 | 1 | 404 | 367 ms | 12912 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 404 | 430 ms | 9553 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 404 | 353 ms | 8663 ms | — |
| inspect | step 1: goto /login | 8 | 404 | 327–9780 ms | 18497–1052590 ms | — |
| inspect | step 2: snapshot | 1 | 404 | 454 ms | 51746 ms | — |
| inspect | step 1: goto /quest-home | 2 | 404 | 333–380 ms | 17515–26353 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 404 | 371 ms | 15772 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 404, 355 ms

Sent:

```json
{
  "query": {
    "bookmark_ids": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10133
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 404, 333 ms

Sent:

```json
{
  "query": {
    "bookmark_ids": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10133
}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 404, 371 ms

Sent:

```json
{
  "query": {
    "bookmark_ids": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10133
}
```

<!-- facts:end -->

## What it does

Reads the account's saved (bookmarked) messages.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

404 means the feature isn't on for this account: normal.
