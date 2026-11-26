# discordApiUsersMeAffinitiesGuilds

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/affinities/guilds` |
| Sends | — |
| Reads | `guild_affinities` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 5 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 1 | 200 | 352 ms | 5395 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 640 ms | 47867 ms | — |
| inspect | step 1: goto /login | 3 | 200 | 359–514 ms | 29131–1044582 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T084152_<name:1>**, step 1: goto /login: 200, 359 ms

Sent:

```json
null
```

Answered:

```json
{
  "guild_affinities": [
    {
      "guild_id": "1053877538025386074",
      "affinity": 1634.7521438681463
    },
    {
      "guild_id": "1290725749543927941",
      "affinity": 1334.1589153478053
    },
    {
      "guild_id": "1359579021108842617",
      "affinity": 363.71310008744933
    },
    {
      "guild_id": "1556595354999332884",
      "affinity": 320.36386312965305
    },
    {
      "guild_id": "1458911680376606957",
      "affinity": 255.4580321096507
    },
    {
      "guild_id": "1130383047699738754",
      "affinity": 237.7634816829892
    },
    "… 64 more"
  ]
}
```

**runs/inspect/20261030T222341_<name:1>**, step 2: snapshot: 200, 640 ms

Sent:

```json
null
```

Answered:

```json
{
  "guild_affinities": [
    {
      "guild_id": "1053877538025386074",
      "affinity": 1635.3694287875048
    },
    {
      "guild_id": "1290725749543927941",
      "affinity": 1313.1123110344417
    },
    {
      "guild_id": "1442518050527248436",
      "affinity": 431.20519581788784
    },
    {
      "guild_id": "1130383047699738754",
      "affinity": 247.01759045031068
    },
    {
      "guild_id": "1019350475847499849",
      "affinity": 223.8806022930477
    },
    {
      "guild_id": "1529710922749181963",
      "affinity": 208.34762746343887
    },
    "… 67 more"
  ]
}
```

**runs/inspect/20261028T062914_<name:1>**, step 5: click e40: 200, 352 ms

Sent:

```json
null
```

Answered:

```json
{
  "guild_affinities": [
    {
      "guild_id": "1053877538025386074",
      "affinity": 1646.2934671355592
    },
    {
      "guild_id": "1290725749543927941",
      "affinity": 1319.293853734509
    },
    {
      "guild_id": "1442518050527248436",
      "affinity": 433.8327795401903
    },
    {
      "guild_id": "1130383047699738754",
      "affinity": 247.87436595899314
    },
    {
      "guild_id": "1019350475847499849",
      "affinity": 227.40028227161596
    },
    {
      "guild_id": "1529710922749181963",
      "affinity": 215.55699466751432
    },
    "… 68 more"
  ]
}
```

<!-- facts:end -->

## What it does

Lists the servers the account uses most, to rank them in the client.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
