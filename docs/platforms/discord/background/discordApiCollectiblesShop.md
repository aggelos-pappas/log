# discordApiCollectiblesShop

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/collectibles-shop` |
| Sends | — |
| Reads | `shop_blocks`, `categories` |
| Called from | `runs/inspect/20261120T115645_<name:3>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:3>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 3 time(s) in 3 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 1 | 200 | 366 ms | 140846 ms | — |
| inspect | step 4: viewerInput click | 1 | 200 | 1127 ms | 1191 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 671 ms | 1812261 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T111021_<name:3>**, step 4: viewerInput click: 200, 1127 ms

Sent:

```json
{
  "query": {
    "tab": "home",
    "include_bundles": "true",
    "include_dynamic_blocks": "true",
    "variants_return_style": "2",
    "skip_num_categories": "0"
  },
  "body": null
}
```

Answered:

```json
{
  "shop_blocks": [
    {
      "type": 0,
      "category_sku_id": "1476284050405855372",
      "name": "<name:1>",
      "category_store_listing_id": "1476284050405855372",
      "unpublished_at": "2027-03-18T19:00:00+00:00",
      "summary": " ",
      "ranked_sku_ids": [
        "1476292494755889153",
        "1476293022873555056",
        "1476284432401825912",
        "1476286115227893903",
        "1476286348318216293",
        "1476286544359981149",
        "… 13 more"
      ],
      "hero_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/af8b29eaf45e392bd0d3318224f208fa93bdd84daf289621bde357ee0a85ae11",
      "hero_logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/4a11df3d5f005ef7f49e11fb345e0ab4e0b5bbde0682add310f040707c2a5e26",
      "mobile_hero_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/8c32fbb52034c5e20cd1d3558f441619ba0945d889523fcdf933e677c9e25705",
      "banner_display_config": {
        "desktop_max_height": null,
        "mobile_max_height": null,
        "responsive": true,
        "background_style": "linear-gradient(180deg, #141516 0%, #373737 100%)"
      }
    },
    {
      "type": 1,
      "subblocks": [
        "(8 fields)",
        "(8 fields)"
      ]
    },
    {
      "type": 4,
      "name": "<name:2>",
      "ranked_sku_ids": [
        "1243618816639107223",
        "1228246010116050965",
        "1228251144065777765",
        "1228251351415263242",
        "1228251846032756796",
        "1228252042791878707",
        "… 4 more"
      ],
      "category_sku_id": "1228243842684162121",
      "show_button": true,
      "button_text": "Shop All Lofi Vibes"
    },
    {
      "type": 2,
      "ranked_sku_ids": [
        "1564422928026828911",
        "1516561824114409572",
        "1516560337070198894",
        "1481392199261487187",
        "1516560866609467452",
        "1511102779819687956",
        "… 83 more"
      ],
      "sorted_sku_ids": {
        "recommended": "(7 items)",
        "popular": "(7 items)"
      }
    }
  ],
  "categories": [
    {
      "sku_id": "1476284050405855372",
      "name": "<name:1>",
      "summary": " ",
      "store_listing_id": "1476284050405855372",
      "unpublished_at": "2027-03-18T19:00:00+00:00",
      "styles": {
        "background_colors": "(2 items)",
        "button_colors": "(2 items)",
        "confetti_colors": "(5 items)"
      },
      "hero_ranking": [
        "1476292494755889153",
        "1476293022873555056",
        "1476284432401825912",
        "1476286115227893903",
        "1476286348318216293",
        "1476286544359981149",
        "… 13 more"
      ],
      "products": [
        "(15 fields)",
        "(15 fields)",
        "(15 fields)",
        "(15 fields)",
        "(14 fields)",
        "(14 fields)",
        "… 13 more"
      ],
      "hero_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/af8b29eaf45e392bd0d3318224f208fa93bdd84daf289621bde357ee0a85ae11",
      "hero_logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/4a11df3d5f005ef7f49e11fb345e0ab4e0b5bbde0682add310f040707c2a5e26",
      "catalog_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/b32b9fa04f0a45005de019ebd88b9c1d3d676ba35a111eff459697cf2cf6ed41",
      "featured_block_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/dbe8c4b24bc1ec393bf2bde2fc79550b15fd0824ae487215b2d82b16da58bb97",
      "logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/50855c850a1e1991b02490148cac13d2dd5da98c5e8bd9c0cd9ff7515a721fbd",
      "pdp_bg_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/2f0bae1bdf2a6d906daac07802f750e80fc528b44e4375326a02a3a47b366a6b",
      "mobile_hero_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/8c32fbb52034c5e20cd1d3558f441619ba0945d889523fcdf933e677c9e25705",
      "mobile_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/baaf9e71531f84b8763a3102ce40008d6813b1a6314c3baad8ff3e8a62c7773d",
      "mobile_bg_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/b97b4712deba2ec8ec14a773e42d434e1fd36a9cdc6171dcbbbac214ab215992",
      "hero_banner_display_config": {
        "desktop_max_height": null,
        "mobile_max_height": null,
        "responsive": true,
        "background_style": "linear-gradient(180deg, #141516 0%, #373737 100%)"
      }
    },
    {
      "sku_id": "1228243842684162121",
      "name": "<name:2>",
      "summary": " ",
      "store_listing_id": "1228243842684162121",
      "styles": {
        "background_colors": "(2 items)",
        "button_colors": "(2 items)",
        "confetti_colors": "(6 items)"
      },
      "hero_ranking": [
        "1243618816639107223",
        "1228246010116050965",
        "1228251144065777765",
        "1228251351415263242",
        "1228251846032756796",
        "1228252042791878707",
        "… 4 more"
      ],
      "products": [
        "(14 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "… 4 more"
      ],
      "catalog_banner_url": "https://cdn.discordapp.com/assets/content/f00e0478024c1c7ce2eeca569e9226b953baa4d9569342f797193f47424967f1",
      "featured_block_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/d403032d2a69fe831dadf83e070419ee6e9b475c241a200b4a6f390eda5e6c69",
      "logo_url": "https://cdn.discordapp.com/assets/content/b00d36785e0b463c9d99179fda1a1349833831c9814210583fcbb83dbed7595c",
      "pdp_bg_url": "https://cdn.discordapp.com/assets/content/68edc586aa7f6eb100c20b5f735092383b5a68a25bfc61810024f89c61d71c6e",
      "mobile_banner_url": "https://cdn.discordapp.com/assets/content/de7ac96104bd3e0ac59d71bd841911f8b48a8842511c9b4e80bec46dc118096b",
      "mobile_bg_url": "https://cdn.discordapp.com/assets/content/f7bd27a122b4dcef48622316d2ecbf1c3454fc07c67bffd9d8a26e8bd388401a"
    }
  ]
}
```

**runs/inspect/20261120T091412_<name:3>**, step 1: goto /channels/@me: 200, 671 ms

Sent:

```json
{
  "query": {
    "tab": "home",
    "include_bundles": "true",
    "include_dynamic_blocks": "true",
    "variants_return_style": "2",
    "skip_num_categories": "0"
  },
  "body": null
}
```

Answered:

```json
{
  "shop_blocks": [
    {
      "type": 0,
      "category_sku_id": "1476284050405855372",
      "name": "<name:1>",
      "category_store_listing_id": "1476284050405855372",
      "unpublished_at": "2027-03-18T19:00:00+00:00",
      "summary": " ",
      "ranked_sku_ids": [
        "1476292494755889153",
        "1476293022873555056",
        "1476284432401825912",
        "1476286115227893903",
        "1476286348318216293",
        "1476286544359981149",
        "… 13 more"
      ],
      "hero_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/af8b29eaf45e392bd0d3318224f208fa93bdd84daf289621bde357ee0a85ae11",
      "hero_logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/4a11df3d5f005ef7f49e11fb345e0ab4e0b5bbde0682add310f040707c2a5e26",
      "mobile_hero_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/8c32fbb52034c5e20cd1d3558f441619ba0945d889523fcdf933e677c9e25705",
      "banner_display_config": {
        "desktop_max_height": null,
        "mobile_max_height": null,
        "responsive": true,
        "background_style": "linear-gradient(180deg, #141516 0%, #373737 100%)"
      }
    },
    {
      "type": 1,
      "subblocks": [
        "(8 fields)",
        "(8 fields)"
      ]
    },
    {
      "type": 4,
      "name": "<name:2>",
      "ranked_sku_ids": [
        "1243618816639107223",
        "1228246010116050965",
        "1228251144065777765",
        "1228251351415263242",
        "1228251846032756796",
        "1228252042791878707",
        "… 4 more"
      ],
      "category_sku_id": "1228243842684162121",
      "show_button": true,
      "button_text": "Shop All Lofi Vibes"
    },
    {
      "type": 2,
      "ranked_sku_ids": [
        "1564422928026828911",
        "1516561824114409572",
        "1516560337070198894",
        "1481392199261487187",
        "1516560866609467452",
        "1511102779819687956",
        "… 83 more"
      ],
      "sorted_sku_ids": {
        "recommended": "(7 items)",
        "popular": "(7 items)"
      }
    }
  ],
  "categories": [
    {
      "sku_id": "1476284050405855372",
      "name": "<name:1>",
      "summary": " ",
      "store_listing_id": "1476284050405855372",
      "unpublished_at": "2027-03-18T19:00:00+00:00",
      "styles": {
        "background_colors": "(2 items)",
        "button_colors": "(2 items)",
        "confetti_colors": "(5 items)"
      },
      "hero_ranking": [
        "1476292494755889153",
        "1476293022873555056",
        "1476284432401825912",
        "1476286115227893903",
        "1476286348318216293",
        "1476286544359981149",
        "… 13 more"
      ],
      "products": [
        "(15 fields)",
        "(15 fields)",
        "(15 fields)",
        "(15 fields)",
        "(14 fields)",
        "(14 fields)",
        "… 13 more"
      ],
      "hero_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/af8b29eaf45e392bd0d3318224f208fa93bdd84daf289621bde357ee0a85ae11",
      "hero_logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/4a11df3d5f005ef7f49e11fb345e0ab4e0b5bbde0682add310f040707c2a5e26",
      "catalog_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/b32b9fa04f0a45005de019ebd88b9c1d3d676ba35a111eff459697cf2cf6ed41",
      "featured_block_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/dbe8c4b24bc1ec393bf2bde2fc79550b15fd0824ae487215b2d82b16da58bb97",
      "logo_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/50855c850a1e1991b02490148cac13d2dd5da98c5e8bd9c0cd9ff7515a721fbd",
      "pdp_bg_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/2f0bae1bdf2a6d906daac07802f750e80fc528b44e4375326a02a3a47b366a6b",
      "mobile_hero_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/8c32fbb52034c5e20cd1d3558f441619ba0945d889523fcdf933e677c9e25705",
      "mobile_banner_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/baaf9e71531f84b8763a3102ce40008d6813b1a6314c3baad8ff3e8a62c7773d",
      "mobile_bg_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/b97b4712deba2ec8ec14a773e42d434e1fd36a9cdc6171dcbbbac214ab215992",
      "hero_banner_display_config": {
        "desktop_max_height": null,
        "mobile_max_height": null,
        "responsive": true,
        "background_style": "linear-gradient(180deg, #141516 0%, #373737 100%)"
      }
    },
    {
      "sku_id": "1228243842684162121",
      "name": "<name:2>",
      "summary": " ",
      "store_listing_id": "1228243842684162121",
      "styles": {
        "background_colors": "(2 items)",
        "button_colors": "(2 items)",
        "confetti_colors": "(6 items)"
      },
      "hero_ranking": [
        "1243618816639107223",
        "1228246010116050965",
        "1228251144065777765",
        "1228251351415263242",
        "1228251846032756796",
        "1228252042791878707",
        "… 4 more"
      ],
      "products": [
        "(14 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "(13 fields)",
        "… 4 more"
      ],
      "catalog_banner_url": "https://cdn.discordapp.com/assets/content/f00e0478024c1c7ce2eeca569e9226b953baa4d9569342f797193f47424967f1",
      "featured_block_url": "https://cdn.discordapp.com/media/v1/collectibles-shop/d403032d2a69fe831dadf83e070419ee6e9b475c241a200b4a6f390eda5e6c69",
      "logo_url": "https://cdn.discordapp.com/assets/content/b00d36785e0b463c9d99179fda1a1349833831c9814210583fcbb83dbed7595c",
      "pdp_bg_url": "https://cdn.discordapp.com/assets/content/68edc586aa7f6eb100c20b5f735092383b5a68a25bfc61810024f89c61d71c6e",
      "mobile_banner_url": "https://cdn.discordapp.com/assets/content/de7ac96104bd3e0ac59d71bd841911f8b48a8842511c9b4e80bec46dc118096b",
      "mobile_bg_url": "https://cdn.discordapp.com/assets/content/f7bd27a122b4dcef48622316d2ecbf1c3454fc07c67bffd9d8a26e8bd388401a"
    }
  ]
}
```

<!-- facts:end -->

## What it does

The Shop page's catalogue of avatar decorations and profile effects, loaded by Discord's client around the page.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
