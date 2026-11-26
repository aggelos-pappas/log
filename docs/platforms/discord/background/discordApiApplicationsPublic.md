# discordApiApplicationsPublic

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/applications/public` |
| Sends | — |
| Reads | `id`, `name`, `icon`, `description`, `summary`, `type`, `is_monetized`, `is_verified`, `is_discoverable`, `bot.id`, `bot.username`, `bot.global_name` and 28 more |
| Called from | `runs/inspect/20261120T115645_<name:8>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:8>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:8>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:8>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 69 time(s) in 13 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 2 | 200 | 328–519 ms | 10619–11963 ms | — |
| inspect | step 9: goto /channels/@me | 2 | 200 | 336–568 ms | 5245–6447 ms | — |
| inspect | step 25: goto /channels/@me | 2 | 200 | 351–2376 ms | 4843–5938 ms | — |
| inspect | step 1: goto /login | 41 | 200 | 326–11499 ms | 15797–1050595 ms | — |
| inspect | step 2: snapshot | 2 | 200 | 486–510 ms | 49606–49728 ms | — |
| inspect | step 1: goto /quest-home | 14 | 200 | 347–661 ms | 23892–30704 ms | — |
| inspect | step 2: viewerInput click | 1 | 200 | 377 ms | 646 ms | — |
| inspect | step 4: viewerInput click | 1 | 200 | 360 ms | 4127 ms | — |
| inspect | step 1: goto /channels/@me | 4 | 200 | 398–974 ms | 15734–1246042 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:8>**, step 1: goto /login: 200, 400 ms

Sent:

```json
{
  "query": {
    "application_ids": "1511443377927880775"
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
    "icon": "fc966b0fa3cd76ef308841a74639d46a",
    "description": "War erupts on the Korean Peninsula as North Korea launches a full-scale invasion that threatens to destabilize the world in Call of Duty: Modern Warfare 4. A young squad of South Korean soldiers fights to survive on the collapsing front lines, while half a world away a vengeful Captain Price wages a personal war from the shadows as he stays one step ahead of those hunting him. As Price’s off-book … (494 chars)",
    "summary": "",
    "type": 5,
    "is_monetized": false,
    "is_verified": false,
    "is_discoverable": false,
    "cover_image": "92f26a6c6f70d1ac4da3fbdd57dd22ac",
    "third_party_skus": [
      {
        "id": "<id:2>",
        "sku": "20690",
        "distributor": "opencritic"
      },
      {
        "id": "<id:3>",
        "sku": "403310",
        "distributor": "igdb"
      },
      {
        "id": "<id:4>",
        "sku": "4435490",
        "distributor": "steam"
      },
      {
        "id": "<id:5>",
        "sku": "9NCPSQQD1Z66",
        "distributor": "xbox"
      },
      {
        "id": "<id:6>",
        "sku": "137799",
        "distributor": "gop"
      },
      {
        "id": "<id:7>",
        "sku": "9NWWNS0C3007",
        "distributor": "xbox"
      }
    ],
    "linked_games": [
      {
        "id": "<id:8>",
        "type": 1,
        "application": {
          "id": "<id:8>",
          "name": "<name:2>",
          "icon": "3b61e4cbc93ea3ad9395f1f9b75f32fc",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "parent_id": "1508604436132532305",
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 1
            }
          ],
          "flags": 1024,
          "flags_new": "1024",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      },
      {
        "id": "<id:9>",
        "type": 2,
        "application": {
          "id": "<id:9>",
          "name": "<name:2>",
          "icon": "84f274b530d0eca2a8806a7c99e5956e",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "parent_id": "1526711602038968440",
          "connection_entrypoint_url": "https://callofduty.com/discord",
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 2
            }
          ],
          "flags": 134218752,
          "flags_new": "134218752",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      },
      {
        "id": "<id:10>",
        "type": 1,
        "application": {
          "id": "<id:10>",
          "name": "<name:3>",
          "icon": "e981d4e33ba1a539543bc50379dc921e",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 1
            }
          ],
          "flags": 0,
          "flags_new": "0",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      }
    ],
    "content_classification": {
      "agency_ratings": {
        "esrb": {
          "rating": 4,
          "descriptors": [
            10,
            27,
            4,
            21
          ]
        },
        "pegi": {
          "rating": 5,
          "descriptors": []
        }
      }
    },
    "flags": 0,
    "flags_new": "0",
    "hook": false,
    "executables": [
      {
        "os": "win32",
        "name": "<name:4>",
        "is_launcher": false
      },
      {
        "os": "win32",
        "name": "<name:5>",
        "is_launcher": false
      }
    ],
    "storefront_available": false,
    "integration_types_config": {
      "0": {}
    },
    "verify_key": "<token>",
    "embedded_surfaces": []
  }
]
```

**runs/inspect/20261120T111021_<name:8>**, step 1: goto /quest-home: 200, 398 ms

Sent:

```json
{
  "query": {
    "application_ids": "1511443377927880775"
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
    "icon": "fc966b0fa3cd76ef308841a74639d46a",
    "description": "War erupts on the Korean Peninsula as North Korea launches a full-scale invasion that threatens to destabilize the world in Call of Duty: Modern Warfare 4. A young squad of South Korean soldiers fights to survive on the collapsing front lines, while half a world away a vengeful Captain Price wages a personal war from the shadows as he stays one step ahead of those hunting him. As Price’s off-book … (494 chars)",
    "summary": "",
    "type": 5,
    "is_monetized": false,
    "is_verified": false,
    "is_discoverable": false,
    "cover_image": "92f26a6c6f70d1ac4da3fbdd57dd22ac",
    "third_party_skus": [
      {
        "id": "<id:6>",
        "sku": "137799",
        "distributor": "gop"
      },
      {
        "id": "<id:4>",
        "sku": "4435490",
        "distributor": "steam"
      },
      {
        "id": "<id:7>",
        "sku": "9NWWNS0C3007",
        "distributor": "xbox"
      },
      {
        "id": "<id:3>",
        "sku": "403310",
        "distributor": "igdb"
      },
      {
        "id": "<id:2>",
        "sku": "20690",
        "distributor": "opencritic"
      },
      {
        "id": "<id:5>",
        "sku": "9NCPSQQD1Z66",
        "distributor": "xbox"
      }
    ],
    "linked_games": [
      {
        "id": "<id:8>",
        "type": 1,
        "application": {
          "id": "<id:8>",
          "name": "<name:2>",
          "icon": "3b61e4cbc93ea3ad9395f1f9b75f32fc",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "parent_id": "1508604436132532305",
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 1
            }
          ],
          "flags": 1024,
          "flags_new": "1024",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      },
      {
        "id": "<id:9>",
        "type": 2,
        "application": {
          "id": "<id:9>",
          "name": "<name:2>",
          "icon": "84f274b530d0eca2a8806a7c99e5956e",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "parent_id": "1526711602038968440",
          "connection_entrypoint_url": "https://callofduty.com/discord",
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 2
            }
          ],
          "flags": 134218752,
          "flags_new": "134218752",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      },
      {
        "id": "<id:10>",
        "type": 1,
        "application": {
          "id": "<id:10>",
          "name": "<name:3>",
          "icon": "e981d4e33ba1a539543bc50379dc921e",
          "description": "",
          "summary": "",
          "type": null,
          "is_monetized": false,
          "is_verified": false,
          "is_discoverable": false,
          "linked_games": [
            {
              "id": "<id:1>",
              "type": 1
            }
          ],
          "flags": 0,
          "flags_new": "0",
          "hook": true,
          "storefront_available": false,
          "bot_public": true,
          "bot_require_code_grant": false,
          "install_params": {
            "scopes": [
              "applications.commands"
            ],
            "permissions": "0"
          },
          "integration_types_config": {
            "0": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            },
            "1": {
              "oauth2_install_params": {
                "scopes": [
                  "applications.commands"
                ],
                "permissions": "0"
              }
            }
          },
          "verify_key": "<token>",
          "embedded_surfaces": []
        }
      }
    ],
    "content_classification": {
      "agency_ratings": {
        "esrb": {
          "rating": 4,
          "descriptors": [
            10,
            27,
            4,
            21
          ]
        },
        "pegi": {
          "rating": 5,
          "descriptors": []
        }
      }
    },
    "flags": 0,
    "flags_new": "0",
    "hook": false,
    "executables": [
      {
        "os": "win32",
        "name": "<name:5>",
        "is_launcher": false
      },
      {
        "os": "win32",
        "name": "<name:4>",
        "is_launcher": false
      }
    ],
    "storefront_available": false,
    "integration_types_config": {
      "0": {}
    },
    "verify_key": "<token>",
    "embedded_surfaces": []
  }
]
```

**runs/inspect/20261120T111021_<name:8>**, step 2: viewerInput click: 200, 377 ms

Sent:

```json
{
  "query": {
    "application_ids": "1124352407741149344"
  },
  "body": null
}
```

Answered:

```json
[
  {
    "id": "<id:11>",
    "name": "<name:6>",
    "icon": "ab74e388bb0bd760f96f78fd7adf060a",
    "description": "",
    "summary": "",
    "type": 5,
    "is_monetized": false,
    "is_verified": false,
    "is_discoverable": false,
    "cover_image": "40e3a1db91d35592a681b91fc9f75b30",
    "third_party_skus": [
      {
        "id": "<id:12>",
        "sku": "PPSA03250_00",
        "distributor": "playstation"
      },
      {
        "id": "<id:13>",
        "sku": "CUSA18703_00",
        "distributor": "playstation"
      },
      {
        "id": "<id:14>",
        "sku": "CUSA16170_00",
        "distributor": "playstation"
      },
      {
        "id": "<id:15>",
        "sku": "CUSA18540_00",
        "distributor": "playstation"
      },
      {
        "id": "<id:16>",
        "sku": "CUSA18702_00",
        "distributor": "playstation"
      },
      {
        "id": "<id:17>",
        "sku": "1462040",
        "distributor": "steam"
      },
      "… 29 more"
    ],
    "bot": {
      "id": "<id:11>",
      "username": "<username:1>",
      "global_name": null,
      "avatar": "ab74e388bb0bd760f96f78fd7adf060a",
      "avatar_decoration_data": null,
      "collectibles": null,
      "discriminator": "2197",
      "display_name_styles": null,
      "public_flags": 0,
      "primary_guild": null,
      "clan": null,
      "bot": true,
      "banner": null,
      "banner_color": null,
      "accent_color": null
    },
    "content_classification": {
      "agency_ratings": {
        "esrb": {
          "rating": 3,
          "descriptors": [
            3,
            11,
            24,
            26,
            28,
            29
          ]
        },
        "pegi": {
          "rating": 4,
          "descriptors": []
        }
      }
    },
    "flags": 0,
    "flags_new": "0",
    "hook": true,
    "executables": [
      {
        "os": "win32",
        "name": "<name:7>",
        "is_launcher": false
      }
    ],
    "storefront_available": false,
    "bot_public": true,
    "bot_require_code_grant": false,
    "integration_types_config": {
      "0": {}
    },
    "verify_key": "<token>",
    "embedded_surfaces": []
  }
]
```

<!-- facts:end -->

## What it does

Looks up public details of the applications (bots, games) the account sees, by id, to draw their names and icons.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
