# discordApiApplicationsAssets

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/applications/assets` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:4>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:4>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:4>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:4>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 1 time(s) in 1 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me | 1 | 200 | 40 ms | 25094 ms | — |

### What it sent and what came back (the newest 1 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T091412_<name:4>**, step 1: goto /channels/@me: 200, 40 ms

Sent:

```json
null
```

Answered:

```json
[
  {
    "id": "<id:1>",
    "type": 1,
    "name": "<name:1>"
  },
  {
    "id": "<id:2>",
    "type": 1,
    "name": "<name:2>"
  },
  {
    "id": "<id:3>",
    "type": 1,
    "name": "<name:3>"
  }
]
```

<!-- facts:end -->

## What it does

Loads the image assets (icons, artwork) for apps and games shown in the client.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
