# discordApiUsersMeVirtualCurrencyBalance

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/virtual-currency/balance` |
| Sends | — |
| Reads | `balance` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 7 time(s) in 7 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 5 | 200 | 314–368 ms | 28964–50798 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 339–369 ms | 17519–18252 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 336 ms

Sent:

```json
null
```

Answered:

```json
{
  "balance": 0
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 339 ms

Sent:

```json
null
```

Answered:

```json
{
  "balance": 0
}
```

<!-- facts:end -->

## What it does

Reads the user's Discord Orbs balance (the virtual currency earned from quests), for the Shop and quest pages.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
