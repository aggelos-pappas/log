# discordApiUsersMeCollectiblesMarketing

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/collectibles-marketing` |
| Sends | — |
| Reads | `marketings.0`, `marketings.2` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 334 ms | 11814 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 358 ms | 12899 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 438 ms | 9545 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 362 ms | 8655 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 328–9793 ms | 18485–1052571 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 394 ms | 51734 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 357–401 ms | 17511–26350 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 374 ms | 15761 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 373 ms

Sent:

```json
{
  "query": {
    "platform": "0"
  },
  "body": null
}
```

Answered:

```json
{}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 357 ms

Sent:

```json
{
  "query": {
    "platform": "0"
  },
  "body": null
}
```

Answered:

```json
{}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 374 ms

Sent:

```json
{
  "query": {
    "platform": "0"
  },
  "body": null
}
```

Answered:

```json
{}
```

<!-- facts:end -->

## What it does

Reads the shop's collectibles promo for the account.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
