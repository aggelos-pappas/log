# statusApiScheduledMaintenancesActiveJson

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `status.discord.com/api/scheduled-maintenances/active.json` |
| Sends | — |
| Reads | `page.id`, `page.name`, `page.url`, `page.time_zone`, `page.updated_at`, `scheduled_maintenances` |
| Called from | `runs/inspect/20261120T115645_<name:2>/script0.js:23 statement` |
| rea | `ev_73918d318df4796007dfce246259a12512bbffb02c96b64e69d84aa0e33ffe43` |

Seen 2 time(s) in 2 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /quest-home | 1 | 200 | 48 ms | 31490 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 50 ms | 31369 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T104444_<name:2>**, step 1: goto /quest-home: 200, 48 ms

Sent:

```json
null
```

Answered:

```json
{
  "page": {
    "id": "<id:1>",
    "name": "<name:1>",
    "url": "https://discordstatus.com",
    "time_zone": "America/Los_Angeles",
    "updated_at": "2026-11-20T00:54:23.162-08:00"
  },
  "scheduled_maintenances": []
}
```

**runs/inspect/20261120T091412_<name:2>**, step 1: goto /channels/@me: 200, 50 ms

Sent:

```json
null
```

Answered:

```json
{
  "page": {
    "id": "<id:1>",
    "name": "<name:1>",
    "url": "https://discordstatus.com",
    "time_zone": "America/Los_Angeles",
    "updated_at": "2026-11-20T00:54:23.162-08:00"
  },
  "scheduled_maintenances": []
}
```

<!-- facts:end -->

## What it does

Reads Discord's public status page for maintenance running now, so the client can show a banner.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
