# discordApiCollectiblesProducts

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/collectibles-products` |
| Sends | — |
| Reads | `sku_id`, `name`, `summary`, `store_listing_id`, `styles.background_colors`, `styles.button_colors`, `styles.confetti_colors`, `preview_assets`, `items`, `type`, `premium_type`, `category_sku_id` and 3 more |
| Called from | `runs/inspect/20261120T115645_<name:3>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:3>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:3>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 2 time(s) in 2 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /login | 1 | 200 | 67 ms | 130409 ms | — |
| inspect | step 2: viewerInput click | 1 | 200 | 55 ms | 3262 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:3>**, step 1: goto /login: 200, 67 ms

Sent:

```json
{
  "query": {
    "locale": "en-US"
  },
  "body": null
}
```

Answered:

```json
{
  "sku_id": "1462116613775167569",
  "name": "<name:1>",
  "summary": "Show this effect when others view your profile.",
  "store_listing_id": "1462116613775167569",
  "styles": {
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
  "preview_assets": null,
  "items": [
    {
      "type": 1,
      "sku_id": "1462116613775167569",
      "title": "Nevermore (White)",
      "description": "Show this effect when others view your profile.",
      "accessibilityLabel": "Gray birds fly across a misty background while feathers fall.",
      "animationType": 2,
      "thumbnailPreviewSrc": "https://cdn.discordapp.com/assets/content/8396ce3a1df9dcee95c2f576f78b03f40d66f52f189dc1deb519f904e717dc0c",
      "reducedMotionSrc": "https://cdn.discordapp.com/assets/content/b9a622a1cb7e0d880b3b3916324050f2f5230e77e7c6b893677569c3bde28861",
      "effects": [
        {
          "src": "https://cdn.discordapp.com/assets/content/c63fef5bf0e775acdf282856277d09f8992e2ac812a61abeca218d5164dad09d",
          "loop": false,
          "height": 880,
          "width": 450,
          "duration": 3000,
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
          "src": "https://cdn.discordapp.com/assets/content/5aa83fd157054febd903d172107b857020c4acf020293ea308124ee381bd8fda",
          "loop": true,
          "height": 880,
          "width": 450,
          "duration": 3000,
          "start": 4400,
          "loopDelay": 4000,
          "position": {
            "x": 0,
            "y": 0
          },
          "zIndex": 101,
          "randomizedSources": []
        }
      ]
    }
  ],
  "type": 1,
  "premium_type": 0,
  "category_sku_id": "1462116614332748010",
  "google_sku_ids": {
    "5": "1462116613775167569_1463224005032022188",
    "7": "1462116613775167569_1463224010254061773"
  },
  "is_first_party": true
}
```

**runs/inspect/20261120T111021_<name:3>**, step 2: viewerInput click: 200, 55 ms

Sent:

```json
{
  "query": {
    "locale": "en-US"
  },
  "body": null
}
```

Answered:

```json
{
  "sku_id": "1387888352853885098",
  "name": "<name:2>",
  "summary": "Show this effect when others view your profile.",
  "store_listing_id": "1387888352853885098",
  "styles": {
    "background_colors": [
      1966086,
      14039960
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
  "preview_assets": null,
  "items": [
    {
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
    }
  ],
  "type": 1,
  "premium_type": 0,
  "category_sku_id": "1387888352891764947",
  "google_sku_ids": {
    "5": "1387888352853885098_1388254220485918861",
    "7": "1387888352853885098_1388254226408407070"
  },
  "is_first_party": false
}
```

<!-- facts:end -->

## What it does

Reads a Shop collectible (avatar decoration or profile effect): its SKU, name, summary and colours, to draw it in the Shop and on profiles.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
