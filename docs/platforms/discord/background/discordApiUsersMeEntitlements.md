# discordApiUsersMeEntitlements

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/entitlements` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 14 time(s) in 13 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 1 | 200 | 314 ms | 6487 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 319–1182 ms | 11361–1045683 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 382 ms | 48639 ms | — |
| inspect | step 1: goto /quest-home | 3 | 200 | 359–400 ms | 14824–30692 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 309 ms | 15695 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 1182 ms

Sent:

```json
{
  "query": {
    "with_sku": "false",
    "with_application": "false",
    "entitlement_type": "11",
    "exclude_ended": "true"
  },
  "body": null
}
```

Answered:

```json
[]
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 385 ms

Sent:

```json
{
  "query": {
    "with_sku": "false",
    "with_application": "false",
    "entitlement_type": "11",
    "exclude_ended": "true"
  },
  "body": null
}
```

Answered:

```json
[]
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 309 ms

Sent:

```json
{
  "query": {
    "with_sku": "false",
    "with_application": "false",
    "entitlement_type": "11",
    "exclude_ended": "true"
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

Lists everything the account is entitled to (gifts, Nitro, items).

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
