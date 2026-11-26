# discordApiMetrics

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/metrics` |
| Sends | `metrics`, `client_info` |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:3>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:3>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 17 time(s) in 12 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 2: snapshot | 1 | 204 | 367 ms | 79666 ms | — |
| inspect | step 6: wait 6s | 1 | 204 | 379 ms | 4339 ms | — |
| inspect | step 11: type e2625 | 1 | 204 | 337 ms | 21744 ms | — |
| inspect | step 28: press Enter | 1 | 204 | 373 ms | 29174 ms | — |
| inspect | step 32: snapshot | 1 | 204 | 359 ms | 60949 ms | — |
| inspect | step 3: snapshot | 1 | 204 | 301 ms | 13477 ms | — |
| inspect | step 1: goto /login | 5 | 204 | 325–2618 ms | 127935–1082791 ms | — |
| inspect | step 2: viewerInput click | 1 | 204 | 389 ms | 481 ms | — |
| inspect | step 3: viewerInput click | 2 | 204 | 326–368 ms | 60687–114894 ms | — |
| inspect | step 1: goto /quest-home | 2 | 204 | 334–338 ms | 128675–129568 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 204 | 327 ms | 128536 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:3>**, step 2: viewerInput click: 204, 389 ms

Sent:

```json
{
  "metrics": [
    {
      "name": "<name:1>",
      "type": "distribution",
      "tags": [
        "design_id:2",
        "viewed_user:self",
        "result:success",
        "catalog_state:non_empty",
        "attempt:initial",
        "platform:web",
        "… 1 more"
      ],
      "value": 4290
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_HERO",
        "ad_creative_type:QUEST_HOME_HERO",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_HERO_SHELF",
        "ad_creative_type:QUEST_HOME_HERO",
        "platform:web",
        "release_channel:stable"
      ]
    },
    "… 1 more"
  ],
  "client_info": {
    "built_at": "1795076375680",
    "build_number": "677695"
  }
}
```

Answered:

```json
null
```

**runs/inspect/20261120T115645_<name:3>**, step 3: viewerInput click: 204, 326 ms

Sent:

```json
{
  "metrics": [
    {
      "name": "<name:1>",
      "type": "distribution",
      "tags": [
        "design_id:2",
        "viewed_user:other",
        "result:success",
        "catalog_state:non_empty",
        "attempt:initial",
        "platform:web",
        "… 1 more"
      ],
      "value": 628
    },
    {
      "name": "<name:1>",
      "type": "distribution",
      "tags": [
        "design_id:2",
        "viewed_user:other",
        "result:success",
        "catalog_state:non_empty",
        "attempt:initial",
        "platform:web",
        "… 1 more"
      ],
      "value": 1998
    }
  ],
  "client_info": {
    "built_at": "1795076375680",
    "build_number": "677695"
  }
}
```

Answered:

```json
null
```

**runs/inspect/20261120T111021_<name:3>**, step 1: goto /quest-home: 204, 334 ms

Sent:

```json
{
  "metrics": [
    {
      "name": "<name:1>",
      "type": "distribution",
      "tags": [
        "design_id:2",
        "viewed_user:self",
        "result:success",
        "catalog_state:non_empty",
        "attempt:initial",
        "platform:web",
        "… 1 more"
      ],
      "value": 2537
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_DESKTOP",
        "ad_creative_type:QUEST",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_HERO",
        "ad_creative_type:QUEST_HOME_HERO",
        "platform:web",
        "release_channel:stable"
      ]
    },
    {
      "name": "<name:2>",
      "type": "count",
      "tags": [
        "design_id:2",
        "quest_content:QUEST_HOME_HERO_SHELF",
        "ad_creative_type:QUEST_HOME_HERO",
        "platform:web",
        "release_channel:stable"
      ]
    },
    "… 1 more"
  ],
  "client_info": {
    "built_at": "1795076375680",
    "build_number": "677695"
  }
}
```

Answered:

```json
null
```

<!-- facts:end -->

## What it does

The client's own performance and error counters, sent in the background.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
