# discordAssetsVersionStableJson

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/assets/version.stable.json` |
| Sends | — |
| Reads | `hash`, `required` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 65 ms | 11817 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 63 ms | 12907 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 67 ms | 9552 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 56 ms | 8661 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 62–9781 ms | 18492–1052583 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 95 ms | 51740 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 57–272 ms | 17515–26351 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 85 ms | 15771 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 62 ms

Sent:

```json
{
  "query": {
    "_": "5983919"
  },
  "body": null
}
```

Answered:

```json
{
  "hash": "a2fdecaddfade9c67280032ef26ac65d295be8ce",
  "required": false
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 57 ms

Sent:

```json
{
  "query": {
    "_": "5983910"
  },
  "body": null
}
```

Answered:

```json
{
  "hash": "a2fdecaddfade9c67280032ef26ac65d295be8ce",
  "required": false
}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 85 ms

Sent:

```json
{
  "query": {
    "_": "5983886"
  },
  "body": null
}
```

Answered:

```json
{
  "hash": "a2fdecaddfade9c67280032ef26ac65d295be8ce",
  "required": false
}
```

<!-- facts:end -->

## What it does

Says which build of the web client is current, so an open tab knows to reload for an update.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
