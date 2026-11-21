# discordApiChannelsMessages

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/channels/messages` |
| Sends | `mobile_network_type`, `content`, `nonce`, `tts`, `flags` |
| Reads | `type`, `content`, `mentions`, `mention_roles`, `attachments`, `embeds`, `timestamp`, `edited_timestamp`, `flags`, `components`, `id`, `channel_id` and 19 more |
| Called from | `runs/inspect/20261120T115645_<name:2>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:2>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:2>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:2>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 19 time(s) in 4 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 387 ms | 6734 ms | — |
| inspect | step 4: press Enter | 1 | 200 | 398 ms | 72 ms | — |
| inspect | step 8: click e221 | 1 | 200 | 510 ms | 1615 ms | — |
| inspect | step 10: click e1454 | 2 | 200 | 390–449 ms | 1735–2487 ms | — |
| inspect | step 12: press Enter | 1 | 200 | 894 ms | 59 ms | — |
| inspect | step 15: press PageUp | 1 | 200 | 489 ms | 373 ms | — |
| inspect | step 17: click e180 | 1 | 200 | 361 ms | 751 ms | — |
| inspect | step 18: click e3208 | 1 | 200 | 391 ms | 1248 ms | — |
| inspect | step 20: press Enter | 1 | 200 | 1777 ms | 56 ms | — |
| inspect | step 28: press Enter | 1 | 200 | 2590 ms | 16 ms | — |
| inspect | step 30: press Enter | 1 | 200 | 3140 ms | 50 ms | — |
| inspect | step 1: goto /login | 2 | 200 | 445–449 ms | 18342–129024 ms | — |
| inspect | step 2: viewerInput click | 4 | 200 | 394–651 ms | 105–1937 ms | — |
| inspect | step 4: viewerInput click | 1 | 200 | 355 ms | 3583 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:2>**, step 1: goto /login: 200, 445 ms

Sent:

```json
{
  "query": {
    "limit": "10"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "type": 0,
    "content": "",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [
      {
        "type": "rich",
        "title": "Verify to join PS5 Emulation",
        "description": "Click the button below to verify and unlock the rest of the server.",
        "color": 5793266,
        "footer": {
          "text": "<messageText>"
        },
        "content_scan_version": 4
      }
    ],
    "timestamp": "2026-10-23T09:04:38.944000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [
      {
        "type": 1,
        "id": "<id:1>",
        "components": [
          {
            "type": 2,
            "id": "<id:2>",
            "style": 5,
            "label": "Verify",
            "url": "https://discord.com/oauth2/authorize?client_id=1193477794651447296&redirect_uri=https%3A%2F%2Frestorecord.com%2Fapi%2Fcallback&response_type=code&scope=identify&state=1525448264135213167&prompt=none"
          }
        ]
      }
    ],
    "id": "<id:3>",
    "channel_id": "1562756618997862440",
    "author": {
      "id": "<id:4>",
      "username": "<username:1>",
      "avatar": null,
      "discriminator": "0000",
      "public_flags": 0,
      "flags": 0,
      "bot": true,
      "global_name": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false,
    "application_id": "1193477794651447296",
    "webhook_id": "1563115926776184832"
  }
]
```

**runs/inspect/20261120T115645_<name:2>**, step 2: viewerInput click: 200, 416 ms

Sent:

```json
{
  "query": {
    "limit": "10"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T08:00:00.824000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:5>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:6>",
      "username": "<username:2>",
      "avatar": "82e338d2355f93220637a3ec394ca3c4",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": null,
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T07:58:58.562000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:7>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:8>",
      "username": "<username:3>",
      "avatar": "d637f952277975c2a9c472f58c15b962",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": "<name:1>",
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T07:58:57.553000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:9>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:8>",
      "username": "<username:3>",
      "avatar": "d637f952277975c2a9c472f58c15b962",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": "<name:1>",
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T07:58:51.086000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:10>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:6>",
      "username": "<username:2>",
      "avatar": "82e338d2355f93220637a3ec394ca3c4",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": null,
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T07:58:45.902000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:11>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:6>",
      "username": "<username:2>",
      "avatar": "82e338d2355f93220637a3ec394ca3c4",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": null,
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  {
    "type": 0,
    "content": "<messageText>",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [],
    "timestamp": "2026-11-20T07:55:57.625000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [],
    "id": "<id:12>",
    "channel_id": "1572929201751724053",
    "author": {
      "id": "<id:8>",
      "username": "<username:3>",
      "avatar": "d637f952277975c2a9c472f58c15b962",
      "discriminator": "0",
      "public_flags": 0,
      "flags": 0,
      "banner": null,
      "accent_color": null,
      "global_name": "<name:1>",
      "avatar_decoration_data": null,
      "collectibles": null,
      "display_name_styles": null,
      "banner_color": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false
  },
  "… 4 more"
]
```

**runs/inspect/20261120T111021_<name:2>**, step 4: viewerInput click: 200, 355 ms

Sent:

```json
{
  "query": {
    "limit": "10"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "type": 0,
    "content": "",
    "mentions": [],
    "mention_roles": [],
    "attachments": [],
    "embeds": [
      {
        "type": "rich",
        "title": "Verify to join PS5 Emulation",
        "description": "Click the button below to verify and unlock the rest of the server.",
        "color": 5793266,
        "footer": {
          "text": "<messageText>"
        },
        "content_scan_version": 4
      }
    ],
    "timestamp": "2026-10-23T09:04:38.944000+00:00",
    "edited_timestamp": null,
    "flags": 0,
    "components": [
      {
        "type": 1,
        "id": "<id:1>",
        "components": [
          {
            "type": 2,
            "id": "<id:2>",
            "style": 5,
            "label": "Verify",
            "url": "https://discord.com/oauth2/authorize?client_id=1193477794651447296&redirect_uri=https%3A%2F%2Frestorecord.com%2Fapi%2Fcallback&response_type=code&scope=identify&state=1525448264135213167&prompt=none"
          }
        ]
      }
    ],
    "id": "<id:3>",
    "channel_id": "1562756618997862440",
    "author": {
      "id": "<id:4>",
      "username": "<username:1>",
      "avatar": null,
      "discriminator": "0000",
      "public_flags": 0,
      "flags": 0,
      "bot": true,
      "global_name": null,
      "clan": null,
      "primary_guild": null
    },
    "pinned": false,
    "mention_everyone": false,
    "tts": false,
    "application_id": "1193477794651447296",
    "webhook_id": "1563115926776184832"
  }
]
```

<!-- facts:end -->

## What it does

Reads a channel's messages (`GET .../messages?before=<id>&limit=20`, newest first, for history paging) and sends one (`POST .../messages` with `content` and a `nonce`).

## What our machine does with it

History paging: the oldest id in each answer is the next `before`; fewer than 20 back is the start of the chat. A send is decided by the answer's `id` (rule 73). Sending is only with `--live` (rule 8).

## What can go wrong

403 `Missing Access` / 50001 means the account can't see the channel, 50013 missing permissions, 429 rate limited with `retry_after`. A failed send is never retried blindly: the gateway's `MESSAGE_CREATE` echo says whether it landed.
