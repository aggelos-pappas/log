# discordApiUsersProfile

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/profile` |
| Sends | — |
| Reads | `user.id`, `user.username`, `user.global_name`, `user.avatar`, `user.avatar_decoration_data`, `user.collectibles`, `user.discriminator`, `user.display_name_styles`, `user.public_flags`, `user.primary_guild`, `user.clan`, `user.flags` and 27 more |
| Called from | `runs/inspect/20261120T115645_<name:5>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:5>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:5>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:5>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 10 time(s) in 4 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 510 ms | 7785 ms | — |
| inspect | step 4: press Enter | 1 | 200 | 649 ms | 8522 ms | — |
| inspect | step 28: press Enter | 1 | 200 | 403 ms | 196 ms | — |
| inspect | step 31: wait 60s | 1 | 200 | 456 ms | 37764 ms | — |
| inspect | step 1: goto /login | 2 | 200 | 444–700 ms | 129443–130412 ms | — |
| inspect | step 2: viewerInput click | 4 | 200 | 370–452 ms | 288–2386 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:5>**, step 1: goto /login: 200, 700 ms

Sent:

```json
{
  "query": {
    "with_mutual_guilds": "false",
    "with_mutual_friends": "false",
    "with_mutual_friends_count": "false"
  },
  "body": null
}
```

Answered:

```json
{
  "user": {
    "id": "<id:1>",
    "username": "<username:1>",
    "global_name": "<name:1>",
    "avatar": "9480834a7235799c03c7f51be3d96b53",
    "avatar_decoration_data": null,
    "collectibles": {
      "nameplate": {
        "asset": "nameplates/nameplates_v3/bonsai/",
        "palette": "bubble_gum",
        "label": "COLLECTIBLES_NAMEPLATES_VOL_3_BONSAI_A11Y",
        "sku_id": "1382845914225442886",
        "expires_at": null
      }
    },
    "discriminator": "0",
    "display_name_styles": null,
    "public_flags": 0,
    "primary_guild": null,
    "clan": null,
    "flags": 0,
    "banner": null,
    "banner_color": "#ffffff",
    "accent_color": 16777215,
    "bio": ""
  },
  "connected_accounts": [
    {
      "type": "paypal",
      "id": "<id:2>",
      "name": "<name:2>",
      "verified": true,
      "metadata": {
        "verified": "0",
        "created_at": "2023-11-04T00:00:00+00:00"
      }
    }
  ],
  "premium_type": 0,
  "premium_since": null,
  "premium_guild_since": null,
  "profile_themes_experiment_bucket": 4,
  "user_profile": {
    "bio": "",
    "accent_color": 16777215,
    "pronouns": "He/him",
    "profile_effect": {
      "sku_id": "1462116613775167569",
      "expires_at": null
    },
    "collectibles": [
      {
        "sku_id": "1462116613775167569",
        "type": 1,
        "expires_at": null
      }
    ]
  },
  "badges": [
    {
      "id": "<id:3>",
      "description": "Account Age",
      "icon": "d7648c523cf6322e650b4f7ea718b8a3",
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/2f2f1d83c3abedbbd2346212343e3f45bd215ddd3d97fdf2272f3c3b4ea52dae.svg"
    },
    {
      "id": "<id:4>",
      "description": "Completed a Quest",
      "icon": "7d9ae358c8c5e118768335dbe68b4fb8",
      "link": "https://discord.com/discovery/quests"
    }
  ],
  "guild_badges": [],
  "widgets": [
    {
      "id": "<id:5>",
      "updated_at": "2025-12-23T15:55:08.235579+00:00",
      "data": {
        "type": "favorite_games",
        "games": [
          {
            "game_id": "1445181071103627284",
            "comment": null,
            "tags": []
          }
        ]
      }
    }
  ],
  "legacy_username": null
}
```

**runs/inspect/20261120T115645_<name:5>**, step 2: viewerInput click: 200, 428 ms

Sent:

```json
{
  "query": {
    "with_mutual_guilds": "false",
    "with_mutual_friends": "false",
    "with_mutual_friends_count": "false"
  },
  "body": null
}
```

Answered:

```json
{
  "user": {
    "id": "<id:6>",
    "username": "<username:2>",
    "global_name": "<name:3>",
    "avatar": "d637f952277975c2a9c472f58c15b962",
    "avatar_decoration_data": null,
    "collectibles": null,
    "discriminator": "0",
    "display_name_styles": null,
    "public_flags": 0,
    "primary_guild": {
      "identity_guild_id": null,
      "identity_enabled": false,
      "tag": null,
      "badge": null
    },
    "clan": {
      "identity_guild_id": null,
      "identity_enabled": false,
      "tag": null,
      "badge": null
    },
    "flags": 0,
    "banner": "987bf5784f1260281b85ccc513ac4c50",
    "banner_color": "#393a41",
    "accent_color": 3750465,
    "bio": "https://nohello.club/"
  },
  "connected_accounts": [],
  "premium_type": 2,
  "premium_since": "2026-06-02T20:22:16.122000+00:00",
  "premium_guild_since": null,
  "profile_themes_experiment_bucket": 4,
  "user_profile": {
    "bio": "https://nohello.club/",
    "accent_color": 3750465,
    "pronouns": "",
    "profile_effect": null,
    "collectibles": [],
    "banner": "987bf5784f1260281b85ccc513ac4c50",
    "theme_colors": [
      0,
      2433829
    ],
    "popout_animation_particle_type": null,
    "emoji": null
  },
  "badges": [
    {
      "id": "<id:7>",
      "description": "Earned 6/2/26. 3 months: Silver",
      "icon": "4514fab914bdbfb4ad2fa23df76121a6",
      "link": "https://discord.com/settings/premium"
    }
  ],
  "guild_badges": [],
  "widgets": [
    {
      "id": "<id:8>",
      "updated_at": "2026-06-03T19:02:09.214332+00:00",
      "data": {
        "type": "played_games",
        "games": [
          {
            "game_id": "1377783621775130694",
            "comment": null,
            "tags": []
          },
          {
            "game_id": "1402418436809953330",
            "comment": null,
            "tags": []
          }
        ]
      }
    }
  ],
  "legacy_username": null
}
```

**runs/inspect/20261028T065202_<name:5>**, step 1: goto /channels/@me/<id>: 200, 510 ms

Sent:

```json
{
  "query": {
    "type": "sidebar",
    "with_mutual_guilds": "true",
    "with_mutual_friends": "false",
    "with_mutual_friends_count": "false"
  },
  "body": null
}
```

Answered:

```json
{
  "user": {
    "id": "<id:9>",
    "username": "<username:3>",
    "global_name": null,
    "avatar": "fb80bbc029b4e9d1df8999fddb550687",
    "avatar_decoration_data": null,
    "collectibles": null,
    "discriminator": "0902",
    "display_name_styles": null,
    "public_flags": 0,
    "primary_guild": null,
    "clan": null,
    "flags": 0,
    "bot": true,
    "banner": null,
    "banner_color": null,
    "accent_color": null,
    "bio": "AI agent powered by AgentConnect."
  },
  "connected_accounts": [],
  "premium_type": 0,
  "premium_since": null,
  "premium_guild_since": null,
  "profile_themes_experiment_bucket": 4,
  "user_profile": {
    "bio": "AI agent powered by AgentConnect.",
    "accent_color": null,
    "pronouns": "",
    "profile_effect": null,
    "collectibles": [],
    "banner": null,
    "theme_colors": null,
    "popout_animation_particle_type": null,
    "emoji": null
  },
  "badges": [
    {
      "id": "<id:10>",
      "description": "Supports Commands",
      "icon": "6f9e37f9029ff57aef81db857890005e",
      "link": "https://discord.com/blog/welcome-to-the-new-era-of-discord-apps?ref=badge"
    }
  ],
  "guild_badges": [],
  "mutual_guilds": [
    {
      "id": "<id:11>",
      "nick": null
    }
  ],
  "application": {
    "id": "<id:9>",
    "name": "<name:4>",
    "flags": 11051008,
    "verified": false,
    "storefront_available": false,
    "embedded_surfaces": [],
    "flags_new": "11051008",
    "integration_types_config": {
      "0": {},
      "1": {}
    }
  },
  "legacy_username": null
}
```

<!-- facts:end -->

## What it does

Reads a user's full profile (`GET .../users/<id>/profile`): bio, badges, mutual servers and friends.

## What our machine does with it

The client fetches it to draw a sender after their `MESSAGE_CREATE` arrives (<name:1>). A watch can read the sender's name from the event itself, so it doesn't need this.

## What can go wrong

404 / 10013 unknown user; 403 when the user can't be seen.
