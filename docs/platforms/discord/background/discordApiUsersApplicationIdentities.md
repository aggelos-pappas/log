# discordApiUsersApplicationIdentities

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/application-identities` |
| Sends | — |
| Reads | `identities` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 2 time(s) in 1 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 1 | 200 | 425 ms | 130427 ms | — |
| inspect | step 2: viewerInput click | 1 | 200 | 378 ms | 1106 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 425 ms

Sent:

```json
{
  "query": {
    "with_profiles": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "identities": []
}
```

**runs/inspect/20261120T115645_<name:1>**, step 2: viewerInput click: 200, 378 ms

Sent:

```json
{
  "query": {
    "with_profiles": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "identities": []
}
```

<!-- facts:end -->

## What it does

Lists the app identities linked to the user (accounts in apps and games that use Discord sign-in).

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
