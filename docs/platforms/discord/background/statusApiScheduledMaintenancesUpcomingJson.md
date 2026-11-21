# statusApiScheduledMaintenancesUpcomingJson

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `status.discord.com/api/scheduled-maintenances/upcoming.json` |
| Sends | — |
| Reads | `page.id`, `page.name`, `page.url`, `page.time_zone`, `page.updated_at`, `scheduled_maintenances` |
| Called from | `runs/inspect/20261120T115645_<name:2>/script0.js:23 statement` |
| rea | `ev_b4ef80010ed6f9a348297e0c2f9cc3f95410a8d88fb21298bad0d41ab4ccfa63` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 140 ms | 6698 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 215 ms | 5335 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 81 ms | 4472 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 82 ms | 4217 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 142–310 ms | 10004–1044521 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 150 ms | 47846 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 187–891 ms | 14209–17945 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 237 ms | 16034 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:2>**, step 1: goto /login: 200, 271 ms

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

**runs/inspect/20261120T111021_<name:2>**, step 1: goto /quest-home: 200, 187 ms

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

**runs/inspect/20261120T091412_<name:2>**, step 1: goto /channels/@me: 200, 237 ms

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

Reads Discord's status page for upcoming maintenance, to show a banner.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
