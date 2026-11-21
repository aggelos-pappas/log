# discordApiQuestsDecision

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/quests/decision` |
| Sends | — |
| Reads | `request_id`, `quest`, `creative.creative_type`, `creative.creative_content`, `creative.starts_at`, `creative.ends_at`, `ad_identifiers`, `ad_context`, `response_ttl_seconds`, `metadata_sealed`, `traffic_metadata_sealed`, `provenance_metadata_sealed` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 18 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 644 ms | 5017 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 783 ms | 8359 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 607 ms | 3121 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 580 ms | 2467 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 438–8655 ms | 13524–1047414 ms | — |
| inspect | step 1: goto /channels/@me | 2 | 401, 200 | 359–420 ms | 9647–15691 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 505 ms | 48946 ms | — |
| inspect | step 4: viewerInput scroll | 1 | 200 | 790 ms | 1786818 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 440–566 ms | 14208–16378 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 591 ms

Sent:

```json
{
  "query": {
    "placement": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "7d85d479-af8d-4322-9a56-c78547c5a348",
    "visible_guild_ids": "1270478659127476274"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "8a815ed6-078b-4a81-9d40-9f4fd582686c",
  "quest": null,
  "creative": {
    "creative_type": 4,
    "creative_content": {
      "ad_content_id": "0"
    },
    "starts_at": null,
    "ends_at": null
  },
  "ad_identifiers": null,
  "ad_context": null,
  "response_ttl_seconds": 2374,
  "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMZWJCbXd4bGFGTlQ1QVE0bExmcGZRRm9WOEZHUUtWYmh5ZVRxR0RHSDdZMW9WYlJ5NWFnZ0hJdEF1M3N1MWlyRjA3MHJkaHVhZU4yWnoxWTFKTGhEMTJPYzkzUURGM2NoN2JqemJZR3JuZHJGSFVZZVBHaDBueWdMRkFWV0pTZmpVTnZNcTBFY3ptYUVndHFBS29tUWVYYlNsb01xT3h3dVc2azZ5WjkwUkRhcGxBSEFiaE9SWm4xVko0NlRLUGlEOWRZQkowUGpMWW1MeDBqMEJ6aTA5MGl3REMrR1FPb2c2TFJQSG9xK3gxQkxoNklOdEswV0Juek9UOWRR… (852 chars)",
  "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMVHBqYk1IY1FYNmFXZERYQTVFM0l3UmxsRFJlVWJVbHZIcVZaaTRGRjI0YzB4RFR3T0tyKzhCcUcrbEdOc2NQOHpMNksyNE4xL3hrb0ttL1IreERxTVMzUmg1M2hsK1R1SnZzbExPaFVPbWEyQXpuVzZaN2VKdVFVcDFEdXpxSFRRMUpJSVQxVmhqelZ5WUVZemNpNmYxdz09In0=",
  "provenance_metadata_sealed": null
}
```

**runs/inspect/20261120T115645_<name:1>**, step 4: viewerInput scroll: 200, 790 ms

Sent:

```json
{
  "query": {
    "placement": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "5f6071af-ee15-4a6a-9089-e1b3cdc0b5a0",
    "visible_guild_ids": "1320319532719538176"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "ccc4fd82-8db3-4268-a9ac-11c0b8f4608e",
  "quest": null,
  "creative": {
    "creative_type": 4,
    "creative_content": {
      "ad_content_id": "0"
    },
    "starts_at": null,
    "ends_at": null
  },
  "ad_identifiers": null,
  "ad_context": null,
  "response_ttl_seconds": 2069,
  "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKbExmbW5MVDFTWkhOZHlKOEVWOTNHeUxWMll2VDR3RlpQdVVkZkN4dmJCaFFqOTVkb0RtcVRCNVJhbHc4TklnZnpLRG1SaWFFdG1zTkxQOC93SnZHNFd3d0FseUhFUG40VEh6QWtFQ0d4WmMzcktpTnA4U21XZ1NtL3NFYkpMdTFLMlJPZFIrL0hvWUsrQ01KUGNuMnFub0xOeEVEbzZJL1Zyd1kyOTNVMHZja0ZBd2lhR0JNNVFKdThXazJJOUd3R1FCd1RxNjJLL3RoZlY0eTJ3V1hpZUM2ZDVVc1ZiR25kUzh3TE9hd3RSdDBYL0RZYU9PV1ZyTU5oL0Nk… (852 chars)",
  "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJSGlwMGRZbXg5VVdNcVpNb3pUV3Y5UTZobm4vMnlHbEU3VUdrN1NnVDZQbmhUVFJUSzdPL09zRTBjSXpnajMrc0J0c0JyZHQyTENKUERic2lJVkF2d0xCcGtmNjAwY1c0WHg4em0ra2pJd2NwUmlEY3ZDbnBWVG1sRTk3YnN2VEovbXluWU9wdHoxcW9UeDJhell2TGJSZz09In0=",
  "provenance_metadata_sealed": null
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 566 ms

Sent:

```json
{
  "query": {
    "placement": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "7e73139e-bfa4-44e9-ad4f-48f9b6a52f20"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "a985e280-8967-4736-aab7-45caec98256e",
  "quest": null,
  "creative": {
    "creative_type": 4,
    "creative_content": {
      "ad_content_id": "0"
    },
    "starts_at": null,
    "ends_at": null
  },
  "ad_identifiers": null,
  "ad_context": null,
  "response_ttl_seconds": 1869,
  "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLUkZFZ1Fzelp5VlM4L1YySExic2pZRlhJSjFxV0pQaU05UlZpeE04YWdvT3ZxeFBxZ1BzcUZ0MWY5MGV5OXpyWlRDVldEWXZ4NmxVbVhXRWplZnNUQVJCcjZjRzJKdHVMWXFmbHZPMXhoZ1crKzVmeXdYTmJGK1R0blcva0pNemxyblNaUUJFUk02QnlISWloNkpLMkNjelNueVJsc09MZTZtTUJENDhLamMrL0NLMkJLakFJU3grTWxJa2RTVGhYbHJ4N0RSRGVWZlVyd3lnWkVObndvejdlVjdwWTNGQmxxOVZwMDMvR1d5V2txeWgraGh3L0svNURKMytp… (852 chars)",
  "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKakxEZGF2TVMrWGRZNjhXMVJtZWtidFdDTWZJV21ITk14eUMzSERpdzZpdXJTdjZNQWUraElNejRYOGJuWkFrVE5YOHdrNDNrQnVqWTVLWVlOSTcvYlpaWEJGbzhTS2FyaEw1NFpBQUJvdWlyZDJkVGhwNVA0ajdEMExaY1VaNXJvaVkzM21id3cyTU5ocHBzSUlFRkFtZz09In0=",
  "provenance_metadata_sealed": null
}
```

<!-- facts:end -->

## What it does

Asks which Quest (sponsored task) to show the account on a surface.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
