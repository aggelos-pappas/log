# discordApiGames

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/games` |
| Sends | — |
| Reads | — |
| Called from | `runs/inspect/20261120T115645_<name:12>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:12>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:12>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:12>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 24 time(s) in 12 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 1 | 200 | 358 ms | 13047 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 366 ms | 10199 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 318 ms | 8803 ms | — |
| inspect | step 27: type e2077 | 2 | 200 | 325–385 ms | 390–543 ms | — |
| inspect | step 1: goto /login | 12 | 200 | 333–590 ms | 18655–1051883 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 1088 ms | 50864 ms | — |
| inspect | step 2: viewerInput click | 2 | 200 | 337–382 ms | 1122–2954 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 407–428 ms | 31701–36431 ms | — |
| inspect | step 1: goto /channels/@me | 2 | 200 | 334–351 ms | 25108–1247268 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:12>**, step 1: goto /login: 200, 371 ms

Sent:

```json
{
  "query": {
    "game_ids": "363445589247131668"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "id": "<id:1>",
    "name": "<name:1>",
    "aliases": [
      "Roblox"
    ],
    "description": "Roblox is a massively multiplayer online platform marketed toward creators and players of all ages. It allows users to create their own virtual games using a variety of objects, which they and others can enter and socialize in. Games created on Roblox can be scripted using a sandboxed scripting language based on Lua 5.1 to affect events that occur in-game and create different scenarios.",
    "icon_hash": "f2b60e350a2097289b3b0b877495e55f",
    "executables": [
      {
        "os": "darwin",
        "name": "<name:2>",
        "is_launcher": false
      },
      {
        "os": "win32",
        "name": "<name:3>",
        "is_launcher": false
      },
      {
        "os": "win32",
        "name": "<name:4>",
        "is_launcher": false
      }
    ],
    "third_party_skus": [
      {
        "distributor": "gop",
        "id": "<id:2>"
      },
      {
        "distributor": "playstation",
        "id": "<id:3>"
      },
      {
        "distributor": "igdb",
        "id": "<id:4>"
      },
      {
        "distributor": "xbox_title",
        "id": "<id:5>"
      },
      {
        "distributor": "xbox_title",
        "id": "<id:6>"
      },
      {
        "distributor": "gdco",
        "id": "<id:7>"
      },
      "… 8 more"
    ],
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 1,
    "hook": true,
    "themes": [
      "Action",
      "Kids",
      "Open world",
      "Sandbox"
    ],
    "linked_applications": [],
    "media": {
      "cover_url": "https://images-ext-1.discordapp.net/external/EVCrLFOO8DAfZk2h_a8olO3_8P3lpgbqjXCwpQpcKXM/https/images.igdb.com/igdb/image/upload/t_cover_big/cociyw.jpg",
      "artwork_hashes": [
        "e970e33dd647f87dc87f4dc4b28f4627"
      ],
      "icon": {
        "type": "hash",
        "value": "f2b60e350a2097289b3b0b877495e55f"
      },
      "banner": {
        "type": "hash",
        "value": "e970e33dd647f87dc87f4dc4b28f4627"
      },
      "cover": {
        "type": "url",
        "value": "https://images-ext-1.discordapp.net/external/EVCrLFOO8DAfZk2h_a8olO3_8P3lpgbqjXCwpQpcKXM/https/images.igdb.com/igdb/image/upload/t_cover_big/cociyw.jpg"
      },
      "artwork": [
        {
          "type": "hash",
          "value": "e970e33dd647f87dc87f4dc4b28f4627"
        }
      ]
    },
    "first_release_date": "2006-09-01T00:00:00+00:00",
    "genres": [
      8,
      28,
      5
    ],
    "platforms": [
      0,
      1,
      2,
      3,
      4,
      7
    ],
    "platform_availability": [
      "console",
      "desktop",
      "mobile"
    ],
    "banner_hash": "e970e33dd647f87dc87f4dc4b28f4627",
    "screenshot_urls": [
      "https://images-ext-1.discordapp.net/external/7QP_AtcqrL5Zo2XH9QYXKZSutpDYrUfzZO18W0Mocog/https/images.igdb.com/igdb/image/upload/t_1080p/sc12f2b.jpg",
      "https://images-ext-1.discordapp.net/external/AD3oaKWVNWd4hlW6WrvXQFlUL2WeNZet83LVIIyCyRI/https/images.igdb.com/igdb/image/upload/t_1080p/scyxw8.jpg",
      "https://images-ext-1.discordapp.net/external/M_9mwgc0vC1DwAh1u1WeUH6up0LZvP8cXxDzlb5Fi9M/https/images.igdb.com/igdb/image/upload/t_1080p/sc12f2c.jpg",
      "https://images-ext-1.discordapp.net/external/M_eG7QR4WRVXdAeAisDa0UACvoCKl7RAKbhDsMpI2E8/https/images.igdb.com/igdb/image/upload/t_1080p/scyxwd.jpg",
      "https://images-ext-1.discordapp.net/external/PCOKTAfXaBeqTHASK3iMTLinivFNE2OzkE-gd_iY6Z0/https/images.igdb.com/igdb/image/upload/t_1080p/scyxw9.jpg",
      "https://images-ext-1.discordapp.net/external/_eC04hC8OYO-E2bD5jWF47rwXx7aFpfxs_Gto94Bsv0/https/images.igdb.com/igdb/image/upload/t_1080p/scyxwc.jpg",
      "… 11 more"
    ],
    "websites": [
      {
        "url": "https://www.roblox.com",
        "category": 22
      },
      {
        "url": "https://play.google.com/store/apps/details?id=<id:14>",
        "category": 12
      },
      {
        "url": "https://www.facebook.com/Roblox",
        "category": 4
      },
      {
        "url": "https://www.instagram.com/roblox",
        "category": 8
      },
      {
        "url": "https://apps.apple.com/us/app/roblox/id431946152?platform=ipad",
        "category": 11
      },
      {
        "url": "https://apps.apple.com/us/app/roblox/id431946152",
        "category": 10
      },
      "… 7 more"
    ],
    "companies": [
      {
        "name": "<name:5>",
        "roles": [
          1,
          2
        ]
      }
    ],
    "reviews": {
      "opencritic": {
        "top_critic_rating_count": 1
      },
      "app_store": {
        "rating": 4.5,
        "rating_count": 20653860,
        "global_rating_count": 48188813
      },
      "google_play": {
        "rating": 4.199999809265137,
        "rating_count": 53892112
      }
    },
    "opencritic_url": "https://opencritic.com/game/1927/roblox",
    "l30_rank": 1,
    "community_guild_ids": [
      "1376018788041887795",
      "1358536829636448418",
      "1254502244926361620",
      "1328110081136398427",
      "871820516825116723",
      "150074202727251969",
      "… 34 more"
    ],
    "game_flags": 0,
    "content_classification": {
      "agency_ratings": {
        "esrb": {
          "rating": 3,
          "descriptors": []
        },
        "pegi": {
          "rating": 3,
          "descriptors": []
        },
        "apple": {
          "rating": 4,
          "descriptors": [
            32,
            33,
            2,
            3,
            34,
            7,
            "… 4 more"
          ]
        }
      }
    }
  }
]
```

**runs/inspect/20261120T115645_<name:12>**, step 2: viewerInput click: 200, 382 ms

Sent:

```json
{
  "query": {
    "game_ids": "1402418436809953330"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "id": "<id:8>",
    "name": "<name:6>",
    "aliases": [],
    "description": "Elden Ring: Nightreign is a standalone adventure within the ELDEN RING universe, crafted to offer players a new gaming experience by reimagining the game’s core design.",
    "icon_hash": "be5767e5d6fc2f9ab982f461cff7a528",
    "executables": [
      "(3 fields)"
    ],
    "third_party_skus": [
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "… 15 more"
    ],
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": null,
    "hook": true,
    "themes": [
      "Action",
      "Fantasy",
      "Open world",
      "Survival"
    ],
    "linked_applications": [],
    "media": {
      "cover_url": "https://images-ext-1.discordapp.net/external/gr5lzlpB7fgW3ZxCt55yYbxVsKTwucF8jJ6PqyAwi-Q/https/images.igdb.com/igdb/image/upload/t_cover_big/co95gk.jpg",
      "artwork_urls": "(2 items)",
      "icon": "(2 fields)",
      "cover": "(2 fields)",
      "artwork": "(2 items)"
    },
    "first_release_date": "2025-05-30T00:00:00+00:00",
    "genres": [
      4,
      20
    ],
    "platforms": [
      0,
      1,
      2
    ],
    "platform_availability": [
      "console",
      "desktop"
    ],
    "screenshot_urls": [
      "https://images-ext-1.discordapp.net/external/GCFK8FE9dqRgb7oge_1hezmqiBAJ4XpfEEpnMPYrYZk/https/images.igdb.com/igdb/image/upload/t_1080p/scus1u.jpg",
      "https://images-ext-1.discordapp.net/external/Qe9J9sdimUnJT_T5m8m0_HaftM0GT3ugOOrYeouKNgQ/https/images.igdb.com/igdb/image/upload/t_1080p/scus1r.jpg",
      "https://images-ext-1.discordapp.net/external/hNk4gEOVUoou1CBAfaM16lwdJkOye0sYcvWsuxOkHes/https/images.igdb.com/igdb/image/upload/t_1080p/scus1t.jpg",
      "https://images-ext-1.discordapp.net/external/okuCxt7iM0f1fy1VpCo_ZWuIlpqpM9BlX-1SzSPVKvg/https/images.igdb.com/igdb/image/upload/t_1080p/scus1x.jpg",
      "https://images-ext-1.discordapp.net/external/rAV5jtCLp-q5j7I5WSgttqxAtcc8ZB89B-LT4lwixbM/https/images.igdb.com/igdb/image/upload/t_1080p/scus1v.jpg",
      "https://images-ext-1.discordapp.net/external/sI6cIhhkkw-ONmWa3gINrpI04gsDXEKh-JNRBovnhqg/https/images.igdb.com/igdb/image/upload/t_1080p/scus1s.jpg",
      "… 1 more"
    ],
    "websites": [
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "… 1 more"
    ],
    "companies": [
      "(2 fields)",
      "(2 fields)"
    ],
    "steam_release_status": 3,
    "reviews": {
      "steam": "(6 fields)",
      "opencritic": "(3 fields)"
    },
    "opencritic_url": "https://opencritic.com/game/18502/elden-ring-nightreign",
    "community_guild_ids": [
      "384334768063381514",
      "998753917636718672",
      "809469632859471933",
      "1164010856078659634",
      "1377816067145203782",
      "793227917861322752",
      "… 4 more"
    ],
    "game_flags": 0,
    "content_classification": {
      "agency_ratings": "(2 fields)"
    }
  },
  {
    "id": "<id:9>",
    "name": "<name:7>",
    "aliases": [
      "ELDEN RING"
    ],
    "description": "Elden Ring is an action RPG developed by FromSoftware and published by Bandai Namco Entertainment, released in February 2022. Directed by Hidetaka Miyazaki, with world-building contributions from novelist George R. R. Martin, the game features an expansive open world called the Lands Between. Players assume the role of a customisable character known as the Tarnished, who must explore this world, b… (804 chars)",
    "icon_hash": "28c674e1de18e7a100a44559d64a55b8",
    "executables": [
      "(3 fields)"
    ],
    "third_party_skus": [
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "… 34 more"
    ],
    "overlay": true,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 0,
    "hook": true,
    "themes": [
      "Action",
      "Fantasy",
      "Open world"
    ],
    "linked_applications": [
      "(2 fields)"
    ],
    "media": {
      "cover_url": "https://images-ext-1.discordapp.net/external/jCrLqbeLlZsQu7-FTtkg1Jqn9SaX2jF-ZjaLARLAfoM/https/images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
      "artwork_urls": "(4 items)",
      "icon": "(2 fields)",
      "cover": "(2 fields)",
      "artwork": "(4 items)"
    },
    "first_release_date": "2022-02-25T00:00:00+00:00",
    "genres": [
      8,
      20
    ],
    "platforms": [
      0,
      1,
      2
    ],
    "platform_availability": [
      "console",
      "desktop"
    ],
    "screenshot_urls": [
      "https://images-ext-1.discordapp.net/external/012WBSsjr7wgYY8xK-xHEP4ZuyK84tCZOpoJ3ncrRLc/https/images.igdb.com/igdb/image/upload/t_1080p/scf2s1.jpg",
      "https://images-ext-1.discordapp.net/external/AGm7c7pVXKFpYl_RxLC_RErNEESNHDPleGchw-wqnE4/https/images.igdb.com/igdb/image/upload/t_1080p/scu5kx.jpg",
      "https://images-ext-1.discordapp.net/external/Jj80BQ0vPk5UvFECurIdp3dF-mm3HQpJCc6wjnEuuwE/https/images.igdb.com/igdb/image/upload/t_1080p/scagdm.jpg",
      "https://images-ext-1.discordapp.net/external/S5TbU53fDe-VPOhh3jzg2QYLcy864NpHj6CsSE0re4E/https/images.igdb.com/igdb/image/upload/t_1080p/scagdq.jpg",
      "https://images-ext-1.discordapp.net/external/UFUQaQBUZl6tX4iexwmuNRGfYUsdz3Y6QmidR85CJY4/https/images.igdb.com/igdb/image/upload/t_1080p/scagdr.jpg",
      "https://images-ext-1.discordapp.net/external/WJjGFZ15gIbbqWIynL50JCFqA0-XcciWLT40JEYdkZU/https/images.igdb.com/igdb/image/upload/t_1080p/scagdo.jpg",
      "… 4 more"
    ],
    "trailers": [
      "(6 fields)"
    ],
    "websites": [
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "(2 fields)",
      "… 5 more"
    ],
    "companies": [
      "(2 fields)",
      "(2 fields)"
    ],
    "steam_release_status": 3,
    "reviews": {
      "steam": "(6 fields)",
      "opencritic": "(3 fields)"
    },
    "opencritic_url": "https://opencritic.com/game/12090/elden-ring",
    "l30_rank": 60,
    "community_guild_ids": [
      "867784605293084702",
      "598865171779420161",
      "586725391624962139",
      "1199144224612962314",
      "959006368784850994",
      "340798259972800513",
      "… 15 more"
    ],
    "game_flags": 0,
    "content_classification": {
      "agency_ratings": "(2 fields)"
    }
  }
]
```

**runs/inspect/20261120T111021_<name:12>**, step 1: goto /quest-home: 200, 428 ms

Sent:

```json
{
  "query": {
    "game_ids": "1121201675240210523"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "id": "<id:10>",
    "name": "<name:8>",
    "aliases": "(0 items)",
    "description": "Call of Duty: Modern Warfare 4 is a first-person shooter and the follow-up to Modern Warfare III (2023), continuing the rebooted Modern Warfare storyline. The campaign is set during a North Korean invasion of South Korea and features dual perspectives: a young South Korean soldier named Private Park facing his first combat deployment, and Captain Price operating outside official channels on a pers… (695 chars)",
    "icon_hash": "cd03f4a5ad670a01f554c6a2832e2db7",
    "executables": "(2 items)",
    "third_party_skus": "(6 items)",
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 0,
    "hook": false,
    "themes": "(2 items)",
    "linked_applications": "(3 items)",
    "media": "(5 fields)",
    "first_release_date": "2026-10-23T00:00:00+00:00",
    "genres": "(1 items)",
    "platforms": "(3 items)",
    "platform_availability": "(2 items)",
    "cover_image_hash": "b84dc72f3c50792e031f4ee8337452ee",
    "screenshot_hashes": "(7 items)",
    "screenshot_urls": "(7 items)",
    "websites": "(7 items)",
    "companies": "(2 items)",
    "reviews": "(1 fields)",
    "game_flags": 0,
    "content_classification": "(1 fields)"
  },
  {
    "id": "<id:11>",
    "name": "<name:9>",
    "aliases": "(0 items)",
    "description": "Where Winds Meet is a free-to-play wuxia action-adventure RPG set in China during the Five Dynasties and Ten Kingdoms period. Players take on the role of a wandering adventurer known as a youxia, wielding a variety of weapons including swords, spears, fans, and umbrellas, each paired with distinct martial arts styles. The open world spans multiple regions and supports both single-player and multip… (618 chars)",
    "icon_hash": "54b48542501564ce5e9837f7fa3171a5",
    "executables": "(2 items)",
    "third_party_skus": "(7 items)",
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 0,
    "hook": false,
    "themes": "(4 items)",
    "linked_applications": "(1 items)",
    "media": "(6 fields)",
    "first_release_date": "2024-12-27T00:00:00+00:00",
    "genres": "(2 items)",
    "platforms": "(5 items)",
    "platform_availability": "(3 items)",
    "screenshot_urls": "(7 items)",
    "websites": "(7 items)",
    "companies": "(2 items)",
    "steam_release_status": 3,
    "reviews": "(4 fields)",
    "opencritic_url": "https://opencritic.com/game/19677/where-winds-meet",
    "community_guild_ids": "(7 items)",
    "game_flags": 0,
    "content_classification": "(1 fields)"
  },
  {
    "id": "<id:12>",
    "name": "<name:10>",
    "aliases": "(0 items)",
    "description": "Arknights: Endfield is a 3D real-time strategy RPG developed by HYPERGRYPH. You will take on the role of the Endministrator of Endfield Industries, set out across Talos-II to uncover its secrets, and defend and expand the frontiers of human civilization.",
    "icon_hash": "a1c43f46f274856e6fb9edc8afda149d",
    "executables": "(1 items)",
    "third_party_skus": "(7 items)",
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 0,
    "hook": false,
    "themes": "(3 items)",
    "linked_applications": "(1 items)",
    "media": "(6 fields)",
    "first_release_date": "2026-01-22T00:00:00+00:00",
    "genres": "(3 items)",
    "platforms": "(4 items)",
    "platform_availability": "(3 items)",
    "cover_image_hash": "941cd7843b7d364efa507aafd613a7c4",
    "banner_hash": "73ef144a2ebe1c4e507bba257d986866",
    "screenshot_hashes": "(7 items)",
    "screenshot_urls": "(7 items)",
    "trailers": "(1 items)",
    "websites": "(7 items)",
    "companies": "(2 items)",
    "steam_release_status": 3,
    "reviews": "(4 fields)",
    "opencritic_url": "https://opencritic.com/game/19963/arknights-endfield",
    "l30_rank": 94,
    "community_guild_ids": "(4 items)",
    "game_flags": 0,
    "content_classification": "(1 fields)"
  },
  {
    "id": "<id:1>",
    "name": "<name:1>",
    "aliases": "(1 items)",
    "description": "Roblox is a massively multiplayer online platform marketed toward creators and players of all ages. It allows users to create their own virtual games using a variety of objects, which they and others can enter and socialize in. Games created on Roblox can be scripted using a sandboxed scripting language based on Lua 5.1 to affect events that occur in-game and create different scenarios.",
    "icon_hash": "f2b60e350a2097289b3b0b877495e55f",
    "executables": "(3 items)",
    "third_party_skus": "(7 items)",
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 1,
    "hook": true,
    "themes": "(4 items)",
    "linked_applications": "(0 items)",
    "media": "(6 fields)",
    "first_release_date": "2006-09-01T00:00:00+00:00",
    "genres": "(3 items)",
    "platforms": "(6 items)",
    "platform_availability": "(3 items)",
    "banner_hash": "e970e33dd647f87dc87f4dc4b28f4627",
    "screenshot_urls": "(7 items)",
    "websites": "(7 items)",
    "companies": "(1 items)",
    "reviews": "(3 fields)",
    "opencritic_url": "https://opencritic.com/game/1927/roblox",
    "l30_rank": 1,
    "community_guild_ids": "(7 items)",
    "game_flags": 0,
    "content_classification": "(1 fields)"
  },
  {
    "id": "<id:13>",
    "name": "<name:11>",
    "aliases": "(1 items)",
    "description": "Honkai: Star Rail is an all-new strategy-RPG title in the Honkai series that takes players on a cosmic adventure across the stars. Hop aboard the Astral Express and experience the galaxy's infinite wonders on this journey filled with adventure and thrill.",
    "icon_hash": "444d067889922e42b0af99b13e5d5c72",
    "executables": "(1 items)",
    "third_party_skus": "(7 items)",
    "overlay": false,
    "overlay_warn": false,
    "overlay_compatibility_hook": false,
    "overlay_methods": 0,
    "hook": true,
    "themes": "(3 items)",
    "linked_applications": "(1 items)",
    "media": "(6 fields)",
    "first_release_date": "2023-04-26T00:00:00+00:00",
    "genres": "(3 items)",
    "platforms": "(4 items)",
    "platform_availability": "(3 items)",
    "cover_image_hash": "2e9bc8a0ff931b6cd0cf00a9a8be90eb",
    "banner_hash": "f33bc88eae059cbb939029e34854911e",
    "screenshot_hashes": "(7 items)",
    "screenshot_urls": "(7 items)",
    "trailers": "(1 items)",
    "websites": "(7 items)",
    "companies": "(3 items)",
    "reviews": "(3 fields)",
    "opencritic_url": "https://opencritic.com/game/14841/honkai-star-rail",
    "l30_rank": 43,
    "community_guild_ids": "(7 items)",
    "game_flags": 0,
    "content_classification": "(1 fields)"
  }
]
```

<!-- facts:end -->

## What it does

Looks up game details by id for activities and rich presence.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
