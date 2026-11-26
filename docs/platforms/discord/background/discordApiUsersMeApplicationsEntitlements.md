# discordApiUsersMeApplicationsEntitlements

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/applications/entitlements` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 13 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 2 | 200 | 327–467 ms | 6489–10239 ms | — |
| inspect | step 1: goto /login | 10 | 200 | 320–12231 ms | 11364–1049256 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 377 ms | 48655 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 346–402 ms | 14824–17398 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 319 ms | 15696 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 2317 ms

Sent:

```json
{
  "query": {
    "exclude_consumed": "true"
  },
  "body": null
}
```

Answered:

```json
[]
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 346 ms

Sent:

```json
{
  "query": {
    "exclude_consumed": "true"
  },
  "body": null
}
```

Answered:

```json
[]
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 319 ms

Sent:

```json
{
  "query": {
    "exclude_consumed": "true"
  },
  "body": null
}
```

Answered:

```json
[]
```

<!-- facts:end -->

## What it does

Lists what the account owns in applications (game or app purchases).

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
