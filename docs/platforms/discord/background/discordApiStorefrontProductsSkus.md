# discordApiStorefrontProductsSkus

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/storefront/products/skus` |
| Sends | — |
| Reads | `products` |
| Called from | `runs/inspect/20261120T115645_<name:7>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:7>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:7>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:7>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 1 time(s) in 1 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 2: viewerInput click | 1 | 200 | 444 ms | 547 ms | — |

### What it sent and what came back (the newest 1 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:7>**, step 2: viewerInput click: 200, 444 ms

Sent:

```json
{
  "query": {
    "country_code": "VN",
    "sku_ids": "1462116613775167569",
    "locale": "en-US",
    "with_bundled_skus": "true",
    "include_google_sku_ids": "false",
    "ignore_cache": "false"
  },
  "body": null
}
```

Answered:

```json
{
  "products": [
    {
      "id": "<id:1>",
      "application_id": "1096190356233670716",
      "sku_ids": [
        "1382845914225442886"
      ],
      "name": "<name:1>",
      "summary": "Make your name stand out in servers and chats.",
      "options": [
        {
          "name": "<name:2>",
          "option_values": [
            "default"
          ]
        }
      ],
      "created_at": "2026-01-22T18:17:32.389334+00:00",
      "updated_at": "2026-04-03T17:05:35.915906+00:00",
      "tenant_metadata": {
        "collectibles": {
          "primary_collection_id": "1382845914355470457",
          "primary_collection_styles": {
            "background_colors": [
              11884697,
              7163263
            ],
            "button_colors": [
              5793266,
              5793266
            ],
            "confetti_colors": [
              43772,
              15774258,
              16414587,
              3000177,
              9739511
            ]
          },
          "primary_collection_pdp_bg_url": "https://cdn.discordapp.com/assets/content/2eeca59476e7a2d08aea8270c2fdda08530ecc816c8d1fd0d1dbdbdd6c886433"
        }
      },
      "skus": [
        {
          "id": "<id:2>",
          "type": 2,
          "product_line": 7,
          "application_id": "1096190356233670716",
          "name": "<name:1>",
          "description": "Make your name stand out in servers and chats.",
          "flags": 4,
          "slug": "bonsai",
          "premium": false,
          "exclusive": false,
          "selected_options": [
            {
              "option_name": "default",
              "option_value": "default"
            }
          ],
          "product_id": "1463960794092798003",
          "thumbnail_asset_id": null,
          "tenant_metadata": {
            "collectibles": {
              "type": 2,
              "premium_type": 0,
              "item": "(5 fields)",
              "option_selector_display_value": null,
              "source_type": 1,
              "is_first_party": true
            }
          },
          "prices": {
            "0": {
              "country_prices": "(2 fields)"
            },
            "4": {
              "country_prices": "(2 fields)"
            }
          }
        }
      ]
    },
    {
      "id": "<id:3>",
      "application_id": "1096190356233670716",
      "sku_ids": [
        "1462116613745676445",
        "1462116613758128149",
        "1462116613775167569"
      ],
      "name": "<name:3>",
      "summary": "Show this effect when others view your profile.",
      "options": [
        {
          "name": "<name:3>",
          "option_values": [
            "Midnight",
            "Crimson",
            "White"
          ]
        }
      ],
      "created_at": "2026-01-22T18:18:52.115167+00:00",
      "updated_at": "2026-04-03T17:07:04.961334+00:00",
      "tenant_metadata": {
        "collectibles": {
          "primary_collection_id": "1462116614332748010",
          "primary_collection_styles": {
            "background_colors": [
              2628961,
              8402858
            ],
            "button_colors": [
              5793266,
              5793266
            ],
            "confetti_colors": [
              43772,
              15774258,
              16414587,
              3000177,
              9739511
            ]
          },
          "primary_collection_pdp_bg_url": "https://cdn.discordapp.com/assets/content/2bef9f6d8c839d2a6a610035a09b65c26e120447670a40cc978317ff39d3d8d6"
        }
      },
      "skus": [
        {
          "id": "<id:4>",
          "type": 2,
          "product_line": 7,
          "application_id": "1096190356233670716",
          "name": "<name:4>",
          "description": "Show this effect when others view your profile.",
          "flags": 4,
          "slug": "nevermore-midnight",
          "premium": false,
          "exclusive": false,
          "selected_options": [
            {
              "option_name": "Nevermore",
              "option_value": "Midnight"
            }
          ],
          "product_id": "1463961128483684639",
          "thumbnail_asset_id": null,
          "tenant_metadata": {
            "collectibles": {
              "type": 1,
              "premium_type": 0,
              "item": "(9 fields)",
              "option_selector_display_value": "#2F292C",
              "source_type": 1,
              "is_first_party": true
            }
          },
          "prices": {
            "0": {
              "country_prices": "(2 fields)"
            },
            "4": {
              "country_prices": "(2 fields)"
            }
          }
        },
        {
          "id": "<id:5>",
          "type": 2,
          "product_line": 7,
          "application_id": "1096190356233670716",
          "name": "<name:5>",
          "description": "Show this effect when others view your profile.",
          "flags": 4,
          "slug": "nevermore-crimson",
          "premium": false,
          "exclusive": false,
          "selected_options": [
            {
              "option_name": "Nevermore",
              "option_value": "Crimson"
            }
          ],
          "product_id": "1463961128483684639",
          "thumbnail_asset_id": null,
          "tenant_metadata": {
            "collectibles": {
              "type": 1,
              "premium_type": 0,
              "item": "(9 fields)",
              "option_selector_display_value": "#6F383A",
              "source_type": 1,
              "is_first_party": true
            }
          },
          "prices": {
            "0": {
              "country_prices": "(2 fields)"
            },
            "4": {
              "country_prices": "(2 fields)"
            }
          }
        },
        {
          "id": "<id:6>",
          "type": 2,
          "product_line": 7,
          "application_id": "1096190356233670716",
          "name": "<name:6>",
          "description": "Show this effect when others view your profile.",
          "flags": 4,
          "slug": "nevermore-white",
          "premium": false,
          "exclusive": false,
          "selected_options": [
            {
              "option_name": "Nevermore",
              "option_value": "White"
            }
          ],
          "product_id": "1463961128483684639",
          "thumbnail_asset_id": null,
          "tenant_metadata": {
            "collectibles": {
              "type": 1,
              "premium_type": 0,
              "item": "(9 fields)",
              "option_selector_display_value": "#ACACAC",
              "source_type": 1,
              "is_first_party": true
            }
          },
          "prices": {
            "0": {
              "country_prices": "(2 fields)"
            },
            "4": {
              "country_prices": "(2 fields)"
            }
          }
        }
      ]
    }
  ]
}
```

<!-- facts:end -->

## What it does

Reads storefront products by SKU, to draw items in Discord's store.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
