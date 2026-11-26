# discordApiUsersBadges

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/badges` |
| Sends | — |
| Reads | `badges` |
| Called from | `runs/inspect/20261120T115645_<name:13>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:13>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:13>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:13>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 21 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 397 ms | 7772 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 462 ms | 6529 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 463 ms | 5243 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 584 ms | 4841 ms | — |
| inspect | step 31: wait 60s | 1 | 200 | 611 ms | 241902 ms | — |
| inspect | step 1: goto /login | 9 | 200 | 413–1161 ms | 11383–1045715 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 691 ms | 48674 ms | — |
| inspect | step 2: viewerInput click | 2 | 200 | 421–428 ms | 1105–2381 ms | — |
| inspect | step 1: goto /quest-home | 3 | 200 | 411–662 ms | 14826–23713 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 402 ms | 15734 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:13>**, step 1: goto /login: 200, 1161 ms

Sent:

```json
null
```

Answered:

```json
{
  "badges": [
    {
      "badge_id": 22,
      "name": "<name:1>",
      "rarity": 5,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/ba692509432a91ed75d9460662b05c44a5fefb565566fa7df7698597a75f03ee.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
      "is_earnable": false,
      "owned": false,
      "hidden": false
    },
    {
      "badge_id": 18,
      "name": "<name:2>",
      "description": "Keep an active Discord account to level up this badge. Time will do the rest.",
      "leveling_instructions": "Unlock more levels by keeping your account active.",
      "info_label": "1 year",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/465f6cc202c60d0e250f986fa035ed461e275adddbf875106089527a2c16ef2c.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/8da9339b9d405f0194947e607c839b1bd43436211e5bf07fe7f4ce005578e9e4.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/a020845b216d1b7ab5d32a0b65c7f706a87342546d5283b4fb7f7661e6adb5f8.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-11-02T07:24:49.677000+00:00",
      "current_tier": "one_year",
      "next_tier": "two_years",
      "tier_obtained_at": {
        "one_year": "2026-11-02T07:24:49.677000+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 21,
      "name": "<name:3>",
      "description": "Play more detectable PC games with Discord open to level up this badge.",
      "leveling_instructions": "Unlock more levels by playing more games.",
      "info_label": "3 games played",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/ed18d5976c01a4ea19f5a13af08f0547582405cbe48b098b0822e352b8e0a822.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/cbd75cae9bca1c49b35eb0d9c189af4c8604b4f69a1de17ae550db9f03cbd371.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/796135a2c54b35bc73ba0928b8fb6a9e94be5c97573800ce0a20830b451650b9.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-10-28T14:18:57.525616+00:00",
      "current_tier": "sampler",
      "next_tier": "dabbler",
      "tier_obtained_at": {
        "sampler": "2026-10-28T14:18:57.525606+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 20,
      "name": "<name:4>",
      "description": "Play more hours of detectable PC games with Discord open to level up this badge.",
      "leveling_instructions": "Unlock more levels by playing more hours of games.",
      "info_label": "37 hours of games played",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/e0c82f41bcad94a2a52713800fbef7687d0d2c6a6066b09d5e5876156d086e1a.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/d6ab0696aae97fca8e6b2b88d4117f09f9ea895d4f0cebee770564369ff06873.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/c12fc54ecf68afdeba97999f5378f93f10e476fb1c87e90a881ec5667e1ff9d1.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-09-26T15:44:58.490622+00:00",
      "current_tier": "dedicated",
      "next_tier": "committed",
      "tier_obtained_at": {
        "recreational": "2026-10-08T18:00:03.160653+00:00",
        "dedicated": "2026-10-26T16:26:08.509962+00:00",
        "casual": "2026-09-26T15:44:58.490612+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 19,
      "name": "<name:5>",
      "description": "Stream more hours to other users to level up this badge.",
      "leveling_instructions": "Unlock more levels by streaming more hours.",
      "info_label": "988 hours streamed to others",
      "rarity": 2,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/06b6206db966635cf626651bdb94eacce5a23ab05dc7f600f7d31aa482b2058c.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/20e0b4ff7fc63681efe95082a69f9bfe7259f1485fa6fa6cebaf709336f42b90.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/54f39ff20bdd89d59288e41909344ef6d7d71f7d45d0b84e91acee34b6e973f3.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-07-29T21:31:11.773738+00:00",
      "current_tier": "star",
      "next_tier": "sensation",
      "tier_obtained_at": {
        "breakout": "2026-07-29T21:31:11.773730+00:00",
        "trendsetter": "2026-07-29T21:31:11.773730+00:00",
        "newcomer": "2026-07-29T21:31:11.773730+00:00",
        "headliner": "2026-07-29T21:31:11.773730+00:00",
        "star": "2026-07-29T21:31:11.773730+00:00",
        "standout": "2026-07-29T21:31:11.773730+00:00",
        "fledgling": "2026-07-29T21:31:11.773730+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 1,
      "name": "<name:6>",
      "description": "Subscribe to Nitro to unlock this badge.",
      "leveling_instructions": "Unlock more levels the longer you have Nitro.",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/f61ddf640d11d9bdfaf9de265eb862edf28986b659e545f293b54adf229433af.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/835f1fbfc62861a12021328aeb953e68b205383e57c477a754eecef9237fbaa6.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/a6c7aa95118d579d8a26d16b79cf5761a6fa95d3f4ec24c12907e32223e26a20.svg",
      "is_earnable": true,
      "owned": false,
      "hidden": false,
      "next_tier": "starter",
      "tier_obtained_at": {},
      "tiers": [
        "(8 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "… 3 more"
      ]
    },
    "… 17 more"
  ]
}
```

**runs/inspect/20261120T115645_<name:13>**, step 2: viewerInput click: 200, 421 ms

Sent:

```json
null
```

Answered:

```json
{
  "badges": [
    {
      "badge_id": 1,
      "name": "<name:6>",
      "description": "Stay subscribed to Nitro to level up this badge.",
      "leveling_instructions": "Unlock more levels the longer you have Nitro.",
      "info_label": "Subscriber since 6/2/26",
      "rarity": 2,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/8b4b79fdb42105846a2f238bf24e64bc7ff7f1c8f5b1f23f33354eaf2be152b8.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/ce00ed106a8f38879901531c00788820327ae1c33fa5a5838d61628f02583765.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/b9a8bbb8b1efc9565d11061402662cc77dda584247d873d2302021a3253e4d0a.svg",
      "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/e97f6077a973b27a4abe03c0c3b0a52cb597beb6a048e84963e66ccd7c5b3f09.png",
      "is_earnable": true,
      "owned": true,
      "obtained_at": "2026-06-02T20:22:16.122000+00:00",
      "current_tier": "silver",
      "next_tier": "gold",
      "tier_obtained_at": {
        "starter": "2026-06-02T20:22:16.122000+00:00",
        "bronze": "2026-07-02T20:22:16.122000+00:00",
        "silver": "2026-09-02T20:22:16.122000+00:00"
      },
      "tiers": [
        {
          "key": "starter",
          "name": "<name:7>",
          "rarity": 1,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/f61ddf640d11d9bdfaf9de265eb862edf28986b659e545f293b54adf229433af.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/835f1fbfc62861a12021328aeb953e68b205383e57c477a754eecef9237fbaa6.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/a6c7aa95118d579d8a26d16b79cf5761a6fa95d3f4ec24c12907e32223e26a20.svg",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 0,
              "unit": "months"
            }
          ],
          "owned": true
        },
        {
          "key": "bronze",
          "name": "<name:8>",
          "rarity": 2,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/9226534d23ce85818ab0a768771c3083eaaa640c1ae5224b933945f0deefc310.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/05bee0b1bb4a1f9bfd4209f5d3a790b8cc02cecde73256eba3ecea751f1767f9.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/448f4eadeff74512c378c180dcbb686af9c9cd94dc6694d5180d34c7ed05ecc1.svg",
          "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/a0837200c383ca7b9e9b2e91358f6871ce8c7f3dd5ba98bbbb86305a205ac6ac.png",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 1,
              "unit": "months"
            }
          ],
          "owned": true,
          "milestone_text": "1 month"
        },
        {
          "key": "silver",
          "name": "<name:9>",
          "rarity": 2,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/8b4b79fdb42105846a2f238bf24e64bc7ff7f1c8f5b1f23f33354eaf2be152b8.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/ce00ed106a8f38879901531c00788820327ae1c33fa5a5838d61628f02583765.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/b9a8bbb8b1efc9565d11061402662cc77dda584247d873d2302021a3253e4d0a.svg",
          "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/e97f6077a973b27a4abe03c0c3b0a52cb597beb6a048e84963e66ccd7c5b3f09.png",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 3,
              "unit": "months"
            }
          ],
          "owned": true,
          "milestone_text": "3 months"
        },
        {
          "key": "gold",
          "name": "<name:10>",
          "rarity": 2,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/8adb5e57de66f9e2bf9b764fb973a47fb3552466f0c32ed73b0f503c286abd98.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/6ecb8ab48a8abb284c3392dd956f8809fefca5f78c00e672454c16292051d576.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/6fdeb3399fcded8ab71eb6e4940e8de94e653edf21edb74edd9899354919625d.svg",
          "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/1518ef16d0790bcc0d2a409db2e71a25d7b8726703150612a9b06b45219f4066.png",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 6,
              "unit": "months"
            }
          ],
          "owned": false,
          "milestone_text": "6 months"
        },
        {
          "key": "platinum",
          "name": "<name:11>",
          "rarity": 2,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/79b503085598b92dba50758bca96744efd6255155eadf85a53f3b96e80cf1884.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/8506db9c753ce9205cccbfcc17c1a60d2ad517eec52dc6d4ae3bb5eec5233db6.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/c26c5facef36a5cb3be583f1fc127e9c02e91f4c765ae6070e91259a8c245bb3.svg",
          "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/cc06a548690262c78f8389f6efec9c70bad9f9ab42062b796da90639e98a0f92.png",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 12,
              "unit": "months"
            }
          ],
          "owned": false,
          "milestone_text": "1 year"
        },
        {
          "key": "diamond",
          "name": "<name:12>",
          "rarity": 3,
          "simple_icon_url": "https://cdn.discordapp.com/assets/content/75f77bbb354870ee41d9dd0973994e4f143fe429e418695c05e1530902b61dd5.svg",
          "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/4f8a09a0cb53da23542326685cd8786e989e654362edf844bfeb970f3da1aa00.png",
          "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/4532350c490989a448d09aab87c54924c6e7096acd5402feaf23984f75f3b6ee.svg",
          "complex_icon_animated_url": "https://cdn.discordapp.com/assets/content/5c8d9feecf9b0160e9eeb1081c10be271ad7a7df3c47e1b0b8b99af02288f9bc.png",
          "requirements": [
            {
              "progress_type": 1,
              "threshold": 24,
              "unit": "months"
            }
          ],
          "owned": false,
          "milestone_text": "2 years"
        },
        "… 3 more"
      ],
      "progress": null
    }
  ]
}
```

**runs/inspect/20261120T111021_<name:13>**, step 1: goto /quest-home: 200, 411 ms

Sent:

```json
null
```

Answered:

```json
{
  "badges": [
    {
      "badge_id": 22,
      "name": "<name:1>",
      "rarity": 5,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/ba692509432a91ed75d9460662b05c44a5fefb565566fa7df7698597a75f03ee.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
      "is_earnable": false,
      "owned": false,
      "hidden": false
    },
    {
      "badge_id": 18,
      "name": "<name:2>",
      "description": "Keep an active Discord account to level up this badge. Time will do the rest.",
      "leveling_instructions": "Unlock more levels by keeping your account active.",
      "info_label": "1 year",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/465f6cc202c60d0e250f986fa035ed461e275adddbf875106089527a2c16ef2c.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/8da9339b9d405f0194947e607c839b1bd43436211e5bf07fe7f4ce005578e9e4.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/a020845b216d1b7ab5d32a0b65c7f706a87342546d5283b4fb7f7661e6adb5f8.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-11-02T07:24:49.677000+00:00",
      "current_tier": "one_year",
      "next_tier": "two_years",
      "tier_obtained_at": {
        "one_year": "2026-11-02T07:24:49.677000+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 21,
      "name": "<name:3>",
      "description": "Play more detectable PC games with Discord open to level up this badge.",
      "leveling_instructions": "Unlock more levels by playing more games.",
      "info_label": "3 games played",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/ed18d5976c01a4ea19f5a13af08f0547582405cbe48b098b0822e352b8e0a822.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/cbd75cae9bca1c49b35eb0d9c189af4c8604b4f69a1de17ae550db9f03cbd371.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/796135a2c54b35bc73ba0928b8fb6a9e94be5c97573800ce0a20830b451650b9.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-10-28T14:18:57.525616+00:00",
      "current_tier": "sampler",
      "next_tier": "dabbler",
      "tier_obtained_at": {
        "sampler": "2026-10-28T14:18:57.525606+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 20,
      "name": "<name:4>",
      "description": "Play more hours of detectable PC games with Discord open to level up this badge.",
      "leveling_instructions": "Unlock more levels by playing more hours of games.",
      "info_label": "37 hours of games played",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/e0c82f41bcad94a2a52713800fbef7687d0d2c6a6066b09d5e5876156d086e1a.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/d6ab0696aae97fca8e6b2b88d4117f09f9ea895d4f0cebee770564369ff06873.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/c12fc54ecf68afdeba97999f5378f93f10e476fb1c87e90a881ec5667e1ff9d1.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-09-26T15:44:58.490622+00:00",
      "current_tier": "dedicated",
      "next_tier": "committed",
      "tier_obtained_at": {
        "recreational": "2026-10-08T18:00:03.160653+00:00",
        "dedicated": "2026-10-26T16:26:08.509962+00:00",
        "casual": "2026-09-26T15:44:58.490612+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 19,
      "name": "<name:5>",
      "description": "Stream more hours to other users to level up this badge.",
      "leveling_instructions": "Unlock more levels by streaming more hours.",
      "info_label": "988 hours streamed to others",
      "rarity": 2,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/06b6206db966635cf626651bdb94eacce5a23ab05dc7f600f7d31aa482b2058c.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/20e0b4ff7fc63681efe95082a69f9bfe7259f1485fa6fa6cebaf709336f42b90.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/54f39ff20bdd89d59288e41909344ef6d7d71f7d45d0b84e91acee34b6e973f3.svg",
      "is_earnable": true,
      "owned": true,
      "hidden": false,
      "obtained_at": "2026-07-29T21:31:11.773738+00:00",
      "current_tier": "star",
      "next_tier": "sensation",
      "tier_obtained_at": {
        "breakout": "2026-07-29T21:31:11.773730+00:00",
        "trendsetter": "2026-07-29T21:31:11.773730+00:00",
        "newcomer": "2026-07-29T21:31:11.773730+00:00",
        "headliner": "2026-07-29T21:31:11.773730+00:00",
        "star": "2026-07-29T21:31:11.773730+00:00",
        "standout": "2026-07-29T21:31:11.773730+00:00",
        "fledgling": "2026-07-29T21:31:11.773730+00:00"
      },
      "tiers": [
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "(9 fields)",
        "… 4 more"
      ],
      "progress": [
        "(7 fields)"
      ]
    },
    {
      "badge_id": 1,
      "name": "<name:6>",
      "description": "Subscribe to Nitro to unlock this badge.",
      "leveling_instructions": "Unlock more levels the longer you have Nitro.",
      "rarity": 1,
      "simple_icon_url": "https://cdn.discordapp.com/assets/content/f61ddf640d11d9bdfaf9de265eb862edf28986b659e545f293b54adf229433af.svg",
      "simple_icon_raster_url": "https://cdn.discordapp.com/assets/content/835f1fbfc62861a12021328aeb953e68b205383e57c477a754eecef9237fbaa6.png",
      "complex_icon_static_url": "https://cdn.discordapp.com/assets/content/a6c7aa95118d579d8a26d16b79cf5761a6fa95d3f4ec24c12907e32223e26a20.svg",
      "is_earnable": true,
      "owned": false,
      "hidden": false,
      "next_tier": "starter",
      "tier_obtained_at": {},
      "tiers": [
        "(8 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "(10 fields)",
        "… 3 more"
      ]
    },
    "… 17 more"
  ]
}
```

<!-- facts:end -->

## What it does

Reads a user's profile badges to draw on their profile.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
