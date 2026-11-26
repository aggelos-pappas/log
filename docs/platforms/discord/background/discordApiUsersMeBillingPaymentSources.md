# discordApiUsersMeBillingPaymentSources

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/billing/payment-sources` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 4 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 8: click e221 | 2 | 200 | 417–744 ms | 1820–1823 ms | — |
| inspect | step 1: goto /login | 1 | 200 | 407 ms | 130416 ms | — |
| inspect | step 4: viewerInput click | 1 | 200 | 610 ms | 408 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 392 ms | 1811199 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 407 ms

Sent:

```json
null
```

Answered:

```json
[]
```

**runs/inspect/20261120T111021_<name:1>**, step 4: viewerInput click: 200, 610 ms

Sent:

```json
null
```

Answered:

```json
[]
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 392 ms

Sent:

```json
null
```

Answered:

```json
[]
```

<!-- facts:end -->

## What it does

Lists the account's saved payment methods for the billing screens.

## What our machine does with it

Never read or used by log-cli; nothing is bought (rule 41).

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
