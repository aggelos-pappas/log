# discordApiCollectiblesCollectionSequencedOffers

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/collectibles-collection-sequenced-offers` |
| Sends | — |
| Reads | `collection_id`, `starts_at`, `ends_at`, `promotions`, `help_center_article_id` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 10 time(s) in 10 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 7 | 200 | 333–9789 ms | 29184–1052573 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 349–411 ms | 17515–26351 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 353 ms | 15761 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 333 ms

Sent:

```json
null
```

Answered:

```json
{
  "collection_id": null,
  "starts_at": null,
  "ends_at": null,
  "promotions": [],
  "help_center_article_id": null
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 349 ms

Sent:

```json
null
```

Answered:

```json
{
  "collection_id": null,
  "starts_at": null,
  "ends_at": null,
  "promotions": [],
  "help_center_article_id": null
}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 353 ms

Sent:

```json
null
```

Answered:

```json
{
  "collection_id": null,
  "starts_at": null,
  "ends_at": null,
  "promotions": [],
  "help_center_article_id": null
}
```

<!-- facts:end -->

## What it does

Loads the timed shop offers (Discord collectibles: avatar decorations and profile effects) the client shows in the Shop: each collection with its start, end and promotions.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; sign-in, a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
