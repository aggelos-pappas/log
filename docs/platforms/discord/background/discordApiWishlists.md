# discordApiWishlists

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/wishlists` |
| Sends | — |
| Reads | `id`, `user_id`, `wishlist_items`, `applications`, `storefront_pricing.sku_price_map`, `storefront_pricing.pricing_result_id_map`, `storefront_pricing.reward_result_id_map`, `storefront_pricing.offer_result_id_map` |
| Called from | `runs/inspect/20261120T115645_<name:4>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:4>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:4>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:4>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 1 time(s) in 1 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 2: viewerInput click | 1 | 200 | 394 ms | 2372 ms | — |

### What it sent and what came back (the newest 1 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T111021_<name:4>**, step 2: viewerInput click: 200, 394 ms

Sent:

```json
{
  "query": {
    "source": "user_profile",
    "country_code": "VN"
  },
  "body": null
}
```

Answered:

```json
{
  "id": "<id:1>",
  "user_id": "<userId:1>",
  "wishlist_items": [
    {
      "sku_id": "1387888352853885098",
      "sku_product_line": 7,
      "sku_name": "Skibidi Toilets",
      "is_owned": false,
      "added_at": "2026-06-02T22:54:11.162724+00:00",
      "collectibles_item": {
        "type": 1,
        "sku_id": "1387888352853885098",
        "title": "Skibidi Toilets",
        "description": "Show this effect when others view your profile.",
        "accessibilityLabel": "Multiple Skibidi Toilets pop into frame around the profile with exaggerated wide grins and unsettling expressions.",
        "animationType": 2,
        "thumbnailPreviewSrc": "https://cdn.discordapp.com/assets/content/787a43bac023d526a9afdad89f62d56af1612d170c17d79e85aeddb42b437c7d",
        "reducedMotionSrc": "https://cdn.discordapp.com/assets/content/a89bbcc93148acbb1d828723d57fbc30a17aa4d91df3391c42400f1e7a46d50c",
        "effects": [
          {
            "src": "https://cdn.discordapp.com/assets/content/745c50db0e9fbfe876ff6e17f54658279b4ae5a9ef2aeaebc6c316f47f8ff280",
            "loop": false,
            "height": 880,
            "width": 450,
            "duration": 4167,
            "start": 0,
            "loopDelay": 0,
            "position": {
              "x": 0,
              "y": 0
            },
            "zIndex": 100,
            "randomizedSources": []
          },
          {
            "src": "https://cdn.discordapp.com/assets/content/d88264f57d1eae28a95d13c616077e139ef393b6cec04703385c783277b40a89",
            "loop": true,
            "height": 880,
            "width": 450,
            "duration": 5000,
            "start": 7000,
            "loopDelay": 3000,
            "position": {
              "x": 0,
              "y": 0
            },
            "zIndex": 101,
            "randomizedSources": []
          }
        ]
      },
      "bundle_items": null,
      "sku": {
        "id": "<id:2>",
        "type": 2,
        "product_line": 7,
        "application_id": "1096190356233670716",
        "name": "<name:1>",
        "description": "Show this effect when others view your profile.",
        "flags": 4,
        "slug": "skibidi-toilets",
        "premium": false,
        "exclusive": false,
        "selected_options": [
          {
            "option_name": "default",
            "option_value": "default"
          }
        ],
        "product_id": "1463960830621126747",
        "thumbnail_asset_id": null,
        "tenant_metadata": {
          "collectibles": {
            "type": 1,
            "premium_type": 0,
            "item": {
              "type": 1,
              "sku_id": "1387888352853885098",
              "title": "Skibidi Toilets",
              "description": "Show this effect when others view your profile.",
              "accessibilityLabel": "Multiple Skibidi Toilets pop into frame around the profile with exaggerated wide grins and unsettling expressions.",
              "animationType": 2,
              "thumbnailPreviewSrc": "https://cdn.discordapp.com/assets/content/787a43bac023d526a9afdad89f62d56af1612d170c17d79e85aeddb42b437c7d",
              "reducedMotionSrc": "https://cdn.discordapp.com/assets/content/a89bbcc93148acbb1d828723d57fbc30a17aa4d91df3391c42400f1e7a46d50c",
              "effects": [
                "(10 fields)",
                "(10 fields)"
              ]
            },
            "option_selector_display_value": null,
            "source_type": 1,
            "is_first_party": false
          }
        },
        "price": {
          "amount": 799,
          "currency": "usd",
          "currency_exponent": 2,
          "premium": {
            "2": {
              "amount": 599,
              "percentage": 25
            }
          }
        }
      }
    },
    {
      "sku_id": "1462116613892608222",
      "sku_product_line": 7,
      "sku_name": "Amethyst Choker",
      "is_owned": false,
      "added_at": "2026-06-02T22:53:15.926676+00:00",
      "collectibles_item": {
        "type": 0,
        "sku_id": "1462116613892608222",
        "asset": "a_1dbf2797d2eff3e588b03f059a144cf7",
        "label": "Dark purple velvet choker with glowing violet gem and white lace."
      },
      "bundle_items": null,
      "sku": {
        "id": "<id:3>",
        "type": 2,
        "product_line": 7,
        "application_id": "1096190356233670716",
        "name": "<name:2>",
        "description": "Give your avatar a new look.",
        "flags": 4,
        "slug": "amethyst-choker",
        "premium": false,
        "exclusive": false,
        "selected_options": [
          {
            "option_name": "default",
            "option_value": "default"
          }
        ],
        "product_id": "1463961112289476608",
        "thumbnail_asset_id": null,
        "tenant_metadata": {
          "collectibles": {
            "type": 0,
            "premium_type": 0,
            "item": {
              "type": 0,
              "sku_id": "1462116613892608222",
              "asset": "a_1dbf2797d2eff3e588b03f059a144cf7",
              "label": "Dark purple velvet choker with glowing violet gem and white lace."
            },
            "option_selector_display_value": null,
            "source_type": 1,
            "is_first_party": true
          }
        },
        "price": {
          "amount": 599,
          "currency": "usd",
          "currency_exponent": 2,
          "premium": {
            "2": {
              "amount": 499,
              "percentage": 17
            }
          }
        }
      }
    },
    {
      "sku_id": "1462116613871636542",
      "sku_product_line": 7,
      "sku_name": "He-Bat",
      "is_owned": false,
      "added_at": "2026-06-02T22:53:14.959793+00:00",
      "collectibles_item": {
        "type": 0,
        "sku_id": "1462116613871636542",
        "asset": "a_8a1a0be2e9cf1c344f020d16d6a8af72",
        "label": "White and purple ombre hair with pointed bat ears."
      },
      "bundle_items": null,
      "sku": {
        "id": "<id:4>",
        "type": 2,
        "product_line": 7,
        "application_id": "1096190356233670716",
        "name": "<name:3>",
        "description": "Give your avatar a new look.",
        "flags": 4,
        "slug": "he-bat",
        "premium": false,
        "exclusive": false,
        "selected_options": [
          {
            "option_name": "default",
            "option_value": "default"
          }
        ],
        "product_id": "1463961111748542554",
        "thumbnail_asset_id": null,
        "tenant_metadata": {
          "collectibles": {
            "type": 0,
            "premium_type": 0,
            "item": {
              "type": 0,
              "sku_id": "1462116613871636542",
              "asset": "a_8a1a0be2e9cf1c344f020d16d6a8af72",
              "label": "White and purple ombre hair with pointed bat ears."
            },
            "option_selector_display_value": null,
            "source_type": 1,
            "is_first_party": true
          }
        },
        "price": {
          "amount": 599,
          "currency": "usd",
          "currency_exponent": 2,
          "premium": {
            "2": {
              "amount": 499,
              "percentage": 17
            }
          }
        }
      }
    }
  ],
  "applications": [],
  "storefront_pricing": {
    "sku_price_map": {
      "1387888352853885098": {
        "pricing_result_id": "9528657974941697833",
        "storefront_promotion_ids": [],
        "reward_result_ids": [],
        "offer_result_ids": []
      },
      "1462116613892608222": {
        "pricing_result_id": "13733610536265100654",
        "storefront_promotion_ids": [],
        "reward_result_ids": [],
        "offer_result_ids": []
      },
      "1462116613871636542": {
        "pricing_result_id": "13733610536265100654",
        "storefront_promotion_ids": [],
        "reward_result_ids": [],
        "offer_result_ids": []
      }
    },
    "pricing_result_id_map": {
      "9528657974941697833": {
        "0": {
          "user_price": [
            {
              "amount": 799,
              "currency": "usd",
              "exponent": 2
            }
          ],
          "prices": {
            "0": {
              "0": [
                "(3 fields)"
              ]
            },
            "3": {
              "0": [
                "(3 fields)"
              ]
            }
          }
        }
      },
      "13733610536265100654": {
        "0": {
          "user_price": [
            {
              "amount": 599,
              "currency": "usd",
              "exponent": 2
            },
            {
              "amount": 4100,
              "currency": "discord_orb",
              "exponent": 0
            }
          ],
          "prices": {
            "0": {
              "0": [
                "(3 fields)",
                "(3 fields)"
              ]
            },
            "3": {
              "0": [
                "(3 fields)",
                "(3 fields)"
              ]
            }
          }
        }
      }
    },
    "reward_result_id_map": {},
    "offer_result_id_map": {}
  }
}
```

<!-- facts:end -->

## What it does

Loads the account's shop wishlist and its prices.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
