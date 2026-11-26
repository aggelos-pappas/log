# discordApiUsersMeBillingUserOffer

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/billing/user-offer` |
| Sends | `allow_triggers` |
| Reads | `user_trial_offer`, `user_discount_offer.id`, `user_discount_offer.user_id`, `user_discount_offer.discount_id`, `user_discount_offer.applied_at`, `user_discount_offer.expires_at`, `user_discount_offer.discount`, `user_discount` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 452 ms | 11810 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 456 ms | 12896 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 442 ms | 9543 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 407 ms | 8653 ms | — |
| inspect | step 1: goto /login | 8 | 200, 204 | 336–430 ms | 18482–1052568 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 404 ms | 51730 ms | — |
| inspect | step 1: goto /quest-home | 2 | 204 | 365–426 ms | 17511–26345 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 204 | 379 ms | 15742 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 204, 403 ms

Sent:

```json
{
  "allow_triggers": true
}
```

Answered:

```json
null
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 204, 365 ms

Sent:

```json
{
  "allow_triggers": true
}
```

Answered:

```json
null
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 204, 379 ms

Sent:

```json
{
  "allow_triggers": true
}
```

Answered:

```json
null
```

<!-- facts:end -->

## What it does

Asks which Nitro offer the account may be shown.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
