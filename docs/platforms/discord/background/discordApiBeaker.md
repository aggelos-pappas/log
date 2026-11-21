# discordApiBeaker

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/beaker` |
| Sends | `events` |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 5 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: viewerInput click | 1 | 204 | 429 ms | 345294 ms | — |
| inspect | step 1: goto /quest-home | 1 | 204 | 322 ms | 1394727 ms | — |
| inspect | step 1: goto /login | 2 | 204 | 441–451 ms | 647762–1063590 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 204 | 479 ms | 594548 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T111021_<name:1>**, step 5: viewerInput click: 204, 429 ms

Sent:

```json
{
  "events": [
    {
      "type": "client_telemetry",
      "properties": {
        "client_track_timestamp": 1795174587315,
        "rpc_success_count": 61,
        "rpc_failure_count": 0,
        "first_seen_event_sequence_number": 0,
        "last_seen_event_sequence_number": 146,
        "telemetry_period_start_timestamp": null,
        "telemetry_period_end_timestamp": 1795174587315,
        "event_queue_rejection_count": 0,
        "event_queue_batch_count": 61,
        "event_queue_batch_min_size": 1,
        "event_queue_batch_max_size": 9,
        "event_queue_batch_avg_size": 2.3934426229508197,
        "science_request_id": "f7c195ff-3121-4451-b3f6-4e557436a787",
        "science_response": "VdA4C8EP5Bd4l0JOhgyljqQGuJHKnz9XwC5F8xehhYI=",
        "launch_signature": "5168e3c9-25e0-4137-9d46-ee195c6bb192",
        "client_send_timestamp": 1795174587315
      }
    }
  ]
}
```

Answered:

```json
null
```

**runs/inspect/20261120T104444_<name:1>**, step 1: goto /quest-home: 204, 322 ms

Sent:

```json
{
  "events": [
    {
      "type": "client_telemetry",
      "properties": {
        "client_track_timestamp": 1795172892925,
        "rpc_success_count": 66,
        "rpc_failure_count": 0,
        "first_seen_event_sequence_number": 0,
        "last_seen_event_sequence_number": 136,
        "telemetry_period_start_timestamp": null,
        "telemetry_period_end_timestamp": 1795172892925,
        "event_queue_rejection_count": 0,
        "event_queue_batch_count": 66,
        "event_queue_batch_min_size": 1,
        "event_queue_batch_max_size": 17,
        "event_queue_batch_avg_size": 2.0606060606060606,
        "science_request_id": "ca470ec9-4418-4696-84cf-c3e115aaba2a",
        "science_response": "/2LrCMz3osAbdyrCrE6KiLVroPgq7f47uhjRNHArRAA=",
        "launch_signature": "dc1d42aa-f7cc-4464-880c-df88e8a511a7",
        "client_send_timestamp": 1795172892925
      }
    }
  ]
}
```

Answered:

```json
null
```

**runs/inspect/20261120T103002_<name:1>**, step 1: goto /login: 204, 441 ms

Sent:

```json
{
  "events": [
    {
      "type": "client_telemetry",
      "properties": {
        "client_track_timestamp": 1795171261942,
        "rpc_success_count": 31,
        "rpc_failure_count": 0,
        "first_seen_event_sequence_number": 0,
        "last_seen_event_sequence_number": 83,
        "telemetry_period_start_timestamp": null,
        "telemetry_period_end_timestamp": 1795171261942,
        "event_queue_rejection_count": 0,
        "event_queue_batch_count": 31,
        "event_queue_batch_min_size": 1,
        "event_queue_batch_max_size": 12,
        "event_queue_batch_avg_size": 2.6774193548387095,
        "science_request_id": "4aa0bb9f-47f2-4073-8d37-ab9bdef40634",
        "science_response": null,
        "launch_signature": "0565c223-e620-44ac-9d32-310fb665f42a",
        "client_send_timestamp": 1795171261942
      }
    }
  ]
}
```

Answered:

```json
null
```

<!-- facts:end -->

## What it does

Sends client telemetry events to Discord.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
