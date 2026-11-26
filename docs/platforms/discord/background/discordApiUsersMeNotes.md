# discordApiUsersMeNotes

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/notes` |
| Sends | — |
| Reads | `message`, `code` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 4 time(s) in 3 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 31: wait 60s | 1 | 404 | 354 ms | 241900 ms | — |
| inspect | step 1: goto /login | 1 | 404 | 353 ms | 130419 ms | — |
| inspect | step 2: viewerInput click | 2 | 404 | 344–376 ms | 866–2380 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 404, 353 ms

Sent:

```json
null
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10013
}
```

**runs/inspect/20261120T115645_<name:1>**, step 2: viewerInput click: 404, 376 ms

Sent:

```json
null
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10013
}
```

**runs/inspect/20261028T062914_<name:1>**, step 31: wait 60s: 404, 354 ms

Sent:

```json
null
```

Answered:

```json
{
  "message": "<messageText>",
  "code": 10013
}
```

<!-- facts:end -->

## What it does

Reads the private note the account keeps on a user (`.../notes/<user_id>`).

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

404 means there is no note on that user: normal, not an error.
