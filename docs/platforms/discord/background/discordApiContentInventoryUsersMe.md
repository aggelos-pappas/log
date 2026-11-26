# discordApiContentInventoryUsersMe

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/content-inventory/users/@me` |
| Sends | — |
| Reads | `request_id`, `entries`, `unranked_game_entries`, `entries_hash`, `expired_at`, `refresh_stale_inbox_after_ms`, `refresh_token`, `wait_ms_until_next_fetch` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 18 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 640 ms | 11843 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 1160 ms | 12933 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 861 ms | 10108 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 2270 ms | 8798 ms | — |
| inspect | step 1: goto /login | 9 | 200 | 970–9445 ms | 18512–1052610 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 902 ms | 51784 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 1360–1625 ms | 17517–31086 ms | — |
| inspect | step 1: goto /channels/@me | 2 | 200 | 1225–2982 ms | 15774–773840 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 1366 ms

Sent:

```json
{
  "query": {
    "for_game_profile": "false",
    "feature": "inbox"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "c919deb327ad4f36a77f76e06428a828",
  "entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:2>",
        "author_id": "<userId:2>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1573145974451216424",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 4
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:4>",
        "author_id": "<userId:4>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1572675589758914640",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 7
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    "… 29 more"
  ],
  "unranked_game_entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    {
      "content": {
        "id": "<id:7>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T20:59:29.119000+00:00",
        "started_at": "2026-11-18T20:37:26.119000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 13
    },
    {
      "content": {
        "id": "<id:8>",
        "author_id": "<userId:6>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T22:48:18.361000+00:00",
        "started_at": "2026-11-18T22:27:15.361000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 15
    },
    "… 23 more"
  ],
  "entries_hash": 0,
  "expired_at": "2026-11-20T12:07:11.648000+00:00",
  "refresh_stale_inbox_after_ms": 30000,
  "refresh_token": "<token>",
  "wait_ms_until_next_fetch": 580635
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 1625 ms

Sent:

```json
{
  "query": {
    "for_game_profile": "false",
    "feature": "inbox"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "04f03f01840c4202bb504e7283d2deec",
  "entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:2>",
        "author_id": "<userId:2>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1573145974451216424",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 4
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:4>",
        "author_id": "<userId:4>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1572675589758914640",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 7
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    "… 28 more"
  ],
  "unranked_game_entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    {
      "content": {
        "id": "<id:7>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T20:59:29.119000+00:00",
        "started_at": "2026-11-18T20:37:26.119000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 13
    },
    {
      "content": {
        "id": "<id:8>",
        "author_id": "<userId:6>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T22:48:18.361000+00:00",
        "started_at": "2026-11-18T22:27:15.361000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 15
    },
    "… 23 more"
  ],
  "entries_hash": 0,
  "expired_at": "2026-11-20T11:17:11.648000+00:00",
  "refresh_stale_inbox_after_ms": 30000,
  "refresh_token": "<token>",
  "wait_ms_until_next_fetch": 368061
}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 1225 ms

Sent:

```json
{
  "query": {
    "for_game_profile": "false",
    "feature": "inbox"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "600701fa8b4c4eb58e5d59495e8795b0",
  "entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:2>",
        "author_id": "<userId:2>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1573145974451216424",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 4
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:4>",
        "author_id": "<userId:4>",
        "author_type": 1,
        "content_type": 6,
        "traits": "(4 items)",
        "extra": "(3 fields)",
        "original_id": "1572675589758914640",
        "participants": "(1 items)",
        "signature": "(3 fields)"
      },
      "rank": 7
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    "… 27 more"
  ],
  "unranked_game_entries": [
    {
      "content": {
        "id": "<id:1>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(1 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T15:49:53.460000+00:00",
        "started_at": "2026-11-18T15:44:53.460000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 1
    },
    {
      "content": {
        "id": "<id:3>",
        "author_id": "<userId:3>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-20T06:07:17.855000+00:00",
        "started_at": "2026-11-20T05:57:36.855000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 6
    },
    {
      "content": {
        "id": "<id:5>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T21:51:01.969000+00:00",
        "started_at": "2026-11-18T21:10:29.969000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 8
    },
    {
      "content": {
        "id": "<id:6>",
        "author_id": "<userId:5>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(3 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-16T16:39:58.127000+00:00",
        "started_at": "2026-11-16T16:39:49.127000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 9
    },
    {
      "content": {
        "id": "<id:7>",
        "author_id": "<userId:1>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T20:59:29.119000+00:00",
        "started_at": "2026-11-18T20:37:26.119000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 13
    },
    {
      "content": {
        "id": "<id:8>",
        "author_id": "<userId:6>",
        "author_type": 1,
        "content_type": 1,
        "traits": "(2 items)",
        "extra": "(4 fields)",
        "participants": "(1 items)",
        "ended_at": "2026-11-18T22:48:18.361000+00:00",
        "started_at": "2026-11-18T22:27:15.361000+00:00",
        "signature": "(3 fields)"
      },
      "rank": 15
    },
    "… 23 more"
  ],
  "entries_hash": 0,
  "expired_at": "2026-11-20T09:27:11.648000+00:00",
  "refresh_stale_inbox_after_ms": 30000,
  "refresh_token": "<token>",
  "wait_ms_until_next_fetch": 754096
}
```

<!-- facts:end -->

## What it does

Fetches the account's activity feed inventory (what friends played or listened to) for the Active Now panel.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
