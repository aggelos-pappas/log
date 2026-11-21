# discordApiUsersMeAchievementsUnreadState

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/achievements/unread-state` |
| Sends | — |
| Reads | `has_unread_new_achievement`, `has_unclaimed_achievements` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 9 time(s) in 7 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 5 | 200 | 339–507 ms | 28965–50798 ms | — |
| inspect | step 1: goto /quest-home | 4 | 200 | 335–376 ms | 17519–29372 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 507 ms

Sent:

```json
null
```

Answered:

```json
{
  "has_unread_new_achievement": true,
  "has_unclaimed_achievements": false
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 335 ms

Sent:

```json
null
```

Answered:

```json
{
  "has_unread_new_achievement": true,
  "has_unclaimed_achievements": false
}
```

<!-- facts:end -->

## What it does

Checks whether the account has new or unclaimed achievements, for the badge in the client.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
