# discordApiQuestsGetDecisions

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/quests/get-decisions` |
| Sends | — |
| Reads | `request_id`, `decisions` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 16 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 450 ms | 14921 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 362 ms | 16903 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 692 ms | 15056 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 523 ms | 15461 ms | — |
| inspect | step 1: goto /login | 8 | 200 | 395–7336 ms | 24174–1059434 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 508 ms | 53252 ms | — |
| inspect | step 1: goto /quest-home | 2 | 200 | 474–534 ms | 17521–18446 ms | — |
| inspect | step 1: goto /channels/@me | 1 | 200 | 458 ms | 24297 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 453 ms

Sent:

```json
{
  "query": {
    "placement": "3",
    "num_decisions_requested": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "7d85d479-af8d-4322-9a56-c78547c5a348"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "37e66b2f-321e-4c0b-a8aa-713c2bc6c2e6",
  "decisions": [
    {
      "creative": {
        "creative_type": 2,
        "creative_content": {
          "id": "<id:1>",
          "label_title": "Grand Theft Auto VI",
          "label_subtitle": "Vice City, USA. Jason and Lucia have always known the deck is stacked against them. But when an easy score goes wrong, they find themselves on the darkest side of the sunniest place in America, in the middle of a criminal conspiracy stretching across the state of Leonida — forced to rely on each other more than ever if they want to make it out alive.",
          "hero_image": "quests/1560067021281042513/1570603201835569182.jpg",
          "sponsor_image": "quests/1560067021281042513/1570842803418829011.png",
          "cta": {
            "url": "https://www.rockstargames.com/VI/PS5/editions",
            "button_label": "Buy Now"
          },
          "quest_ids": [
            "1553081116678819980",
            "1553085045168939138",
            "1556760769062903880",
            "1572384460580589671",
            "1572085565795471514",
            "1572086779056496692",
            "… 9 more"
          ],
          "quest_home_entrypoint": {
            "gradient_preset": 12,
            "image": "quests/1560067021281042513/1570670531206844487.png",
            "tooltip_image": "quests/1560067021281042513/1570609518339952700.png",
            "tooltip_title": "GTAVI is here!",
            "tooltip_subtitle": "Play and earn incredible rewards today!"
          },
          "shelf_image": "quests/1560067021281042513/1571569067582816548.jpg",
          "features": [
            1
          ]
        },
        "starts_at": "2026-11-16T18:00:00+00:00",
        "ends_at": "2026-11-23T17:59:00+00:00"
      },
      "ad_context": {
        "is_campaign_ias_enabled": false,
        "is_campaign_ios_attribution_enabled": false
      },
      "ad_identifiers": {
        "campaign_id": "1560067021281042514",
        "ad_set_id": "1560067021281042515",
        "ad_id": "1560067021281042516",
        "creative_id": "1560067021281042513",
        "creative_type": 2,
        "served_item_id": "1573306287238942832",
        "original_served_item_id": "1573306287238942832"
      },
      "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLbFpHeitvcGgrWkZnTTllOUxtVCtIVWdVVjRZaDNWNHJlUVNDeDNnYUQ4L2VuSDY2OWdrb2RRbGNMSUNKMmlTcFhLMFJtYmRGQ0NSTmh3bzFhdGw1aFgxVldIVzlmWCthSUc3QW5hcHc2OTdRT2trUXk5ZUZYVFNaMWJqTWl0cm85K3dOcVpTcG1pV0s0VkdLN0FBUUNVM3o4SUlPWnA3Y09yamdDNWpYQkIvc2M2c3dIZ2EwbzRGWDA2eVcvTy9SZ1NSV3hZSWczSkV2N2gxSlRacnI0UVN5MnM1Ym5VRmd6MTV4WDIxVVZOUklheFNVTmtlY3h4dXpFRGxE… (1956 chars)",
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLT3hmSUxGa3dIR1dzbDhyR1NHZVpMSzFwYm02dVh6bEFYL0F4akx4dDl3UGxKSm14RkFRQUtuQ3pXcjVIQjYrSGNacktGVjBXT2U3RlYvZlVCaStQaEg0UTE3dzlFOWpVTEpGVGlqSi9SUzRaQXo4b2VycUtsT005TVFyRlE5UXJaaElQVzhwQXhSU0VjcDV6QzBXcndvZz09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJV2tmY05NRWlsS3ZNYmN5cHMvRi8zdFMxNzgyMkVscWJGVldBOWhZalgyUTg4aU1xNXZRRE01dGMwVmdoRnpaZVJUSjlMNkhDcEJiQ3pWM3loTWcvcks1VHp2cXVXLzZGRDFWR245cmhyb0RGZWh6bDZUMVM2MXJFdERwdmkwcUtFN2kvQkh1VEcvSGVsUHpXOEhNQW92TjBJV0lqTDgxajZzMit5MkFmWjRJMVI4VzFrZVJaQTViUFpNNTlVUDU5ZUJRT0tsZktJMlUwRWw2M0NwYW1SZThsTFNGMmRtY0R1d0lPMmVmOWZtMzBWc1dHWC9lUXd2ZUl6MzVo… (432 chars)",
      "response_ttl_seconds": 2654
    }
  ]
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 534 ms

Sent:

```json
{
  "query": {
    "placement": "3",
    "num_decisions_requested": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "7e73139e-bfa4-44e9-ad4f-48f9b6a52f20"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "981ff395-6a32-44ff-a384-ee8aeed7b5e9",
  "decisions": [
    {
      "creative": {
        "creative_type": 2,
        "creative_content": {
          "id": "<id:1>",
          "label_title": "Grand Theft Auto VI",
          "label_subtitle": "Vice City, USA. Jason and Lucia have always known the deck is stacked against them. But when an easy score goes wrong, they find themselves on the darkest side of the sunniest place in America, in the middle of a criminal conspiracy stretching across the state of Leonida — forced to rely on each other more than ever if they want to make it out alive.",
          "hero_image": "quests/1560067021281042513/1570603201835569182.jpg",
          "sponsor_image": "quests/1560067021281042513/1570842803418829011.png",
          "cta": {
            "url": "https://www.rockstargames.com/VI/PS5/editions",
            "button_label": "Buy Now"
          },
          "quest_ids": [
            "1553081116678819980",
            "1553085045168939138",
            "1556760769062903880",
            "1572384460580589671",
            "1572085565795471514",
            "1572086779056496692",
            "… 9 more"
          ],
          "quest_home_entrypoint": {
            "gradient_preset": 12,
            "image": "quests/1560067021281042513/1570670531206844487.png",
            "tooltip_image": "quests/1560067021281042513/1570609518339952700.png",
            "tooltip_title": "GTAVI is here!",
            "tooltip_subtitle": "Play and earn incredible rewards today!"
          },
          "shelf_image": "quests/1560067021281042513/1571569067582816548.jpg",
          "features": [
            1
          ]
        },
        "starts_at": "2026-11-16T18:00:00+00:00",
        "ends_at": "2026-11-23T17:59:00+00:00"
      },
      "ad_context": {
        "is_campaign_ias_enabled": false,
        "is_campaign_ios_attribution_enabled": false
      },
      "ad_identifiers": {
        "campaign_id": "1560067021281042514",
        "ad_set_id": "1560067021281042515",
        "ad_id": "1560067021281042516",
        "creative_id": "1560067021281042513",
        "creative_type": 2,
        "served_item_id": "1573294555363803176",
        "original_served_item_id": "1573294555363803176"
      },
      "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMTk1TR1dYa3NkWFkvTmpuT1d6akZ2OHB6UFEvNmhIMFhHZEJSbTBEU1cvZWxaVWFDeTV3VFlSVXdZdW5mZjA2QkVobjZDcVhlSmpWbHNNelFVNEl3dVFnOS8zeGlnL3puY1JMMkZaVzNlZ1plVGQ4RC8xL1pzN0hCREszUTRDM0JZbmlyMFZSM0JsYk4yWEdMeit4MENVcWtHSkNWWEFaNUJnQis3MVZyOUlKOFdYaEo5NWI3cTdyU2E2cFRzNkRaV3FXRWE4aXRSV3I4WlhXaTN6Vm4vUjFFYmwrbWF2YmRWaGZtUnB4eTVYdGdQQ2p6WC91dUcvTWJGSlM2… (1956 chars)",
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKdXIvWkVleldjRWlIbDRmUUszS3dDSUl3ekhIOURMRHozMEpzTkExOHhKdFJKUFRuc1pVWHpJckFhNlVZMEdoVW1pUy9BL2NmS29oS2ZGWVg4Z3RyRlhhM0V1U3M5QnZiVzI5NFlwSHd6Zk9SUTJMUWZPOFlic2dkMFd2SzVWYTlLUm9EaExuU2hVb0VidndPeHpUOEpjUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMaFZsdkpmeGVrb0VkKzdYNjVOZGcvbXVYL2dVbHJhZGVvSFFUTitXU2VQazhIK25vYnF4RmFQakpBaGxiRTdMQWxvVjdLeGQzSFpQdTM0RE15U00ydFVqcUZyYXArR09QeDgxb3JBdjVkSldqQ2I3UkZvNXBkdStjelV0Tkl1QksxNE01bWJ5bk5FanNLckZ4V25ka3JsWkN0ZlhLaEs2SnMwVFRnYW1GUHZseFJkMVVWbUY0UHhKOEJhVVlFWTdPUDJYazlLMFVaWnBBTmN6SkFXTk1MSmdYc3JzakJjTkZNa2ludFNqTWVvTnM2OWFWVUNoRWpJazU4ZXJv… (432 chars)",
      "response_ttl_seconds": 1986
    }
  ]
}
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 200, 458 ms

Sent:

```json
{
  "query": {
    "placement": "3",
    "num_decisions_requested": "1",
    "client_heartbeat_session_id": "e6cba4bf-c16b-4d59-a885-964ccdbc94e4",
    "client_ad_session_id": "df571102-2aa9-45a2-8560-e6afeabfd000"
  },
  "body": null
}
```

Answered:

```json
{
  "request_id": "f4a84ddb-fa05-42be-a7e3-77c1e33a98fb",
  "decisions": [
    {
      "creative": {
        "creative_type": 2,
        "creative_content": {
          "id": "<id:1>",
          "label_title": "Grand Theft Auto VI",
          "label_subtitle": "Vice City, USA. Jason and Lucia have always known the deck is stacked against them. But when an easy score goes wrong, they find themselves on the darkest side of the sunniest place in America, in the middle of a criminal conspiracy stretching across the state of Leonida — forced to rely on each other more than ever if they want to make it out alive.",
          "hero_image": "quests/1560067021281042513/1570603201835569182.jpg",
          "sponsor_image": "quests/1560067021281042513/1570842803418829011.png",
          "cta": {
            "url": "https://www.rockstargames.com/VI/PS5/editions",
            "button_label": "Buy Now"
          },
          "quest_ids": [
            "1553081116678819980",
            "1553085045168939138",
            "1556760769062903880",
            "1572384460580589671",
            "1572085565795471514",
            "1572086779056496692",
            "… 9 more"
          ],
          "quest_home_entrypoint": {
            "gradient_preset": 12,
            "image": "quests/1560067021281042513/1570670531206844487.png",
            "tooltip_image": "quests/1560067021281042513/1570609518339952700.png",
            "tooltip_title": "GTAVI is here!",
            "tooltip_subtitle": "Play and earn incredible rewards today!"
          },
          "shelf_image": "quests/1560067021281042513/1571569067582816548.jpg",
          "features": [
            1
          ]
        },
        "starts_at": "2026-11-16T18:00:00+00:00",
        "ends_at": "2026-11-23T17:59:00+00:00"
      },
      "ad_context": {
        "is_campaign_ias_enabled": false,
        "is_campaign_ios_attribution_enabled": false
      },
      "ad_identifiers": {
        "campaign_id": "1560067021281042514",
        "ad_set_id": "1560067021281042515",
        "ad_id": "1560067021281042516",
        "creative_id": "1560067021281042513",
        "creative_type": 2,
        "served_item_id": "1573265329008803921",
        "original_served_item_id": "1573265329008803921"
      },
      "metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMNXhiUWM1N3JBaVZtRXNqeGhsOEZkei91dUZybGZKamJVQmJFcFllVFB1RlIxR0FGOG41L2hEVDVocjRMSVR3d3VRcEM4Y2lRMVZqVFZ6bS81bFRKWTlYNmpOelhQZVFWUm5Ia0ZnNjdnY1ZVam1tNWxIbUQ2dC9rUDg3eUU2WGpEdWp5Um9vZXRodlF1a3VPellPSmhLMFVhYWhhRVRqSWwySm5MNVBrUzB0Y3dwdzlUMlU4dDk1YlRYRnNUQVFPNE16aTRzbm45Y2pOSEFGTXJrU0xGMHRDMWY5U3lPeFFxejBsQWE1M0hBL3lLeVo5My9MSXM2dWtsOW0x… (1956 chars)",
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKVG9ZTG1CT0g4UlA3aEZGODgwOHVoNjJ5QzNFTk8yOHFnZUkxYms0OFE0YWRKTXhKRmpJTUUzditwK3NBQzd6bW1rY1JqZEtKeHBsYUtxN0NpNW5jUWZFcjJMMVRjVWRiUHdCR3FDL05NWHhEMG5yTVF6NlNPeUVDZ2ttcCs0anBON3VBenlWOVZzbkt1Z1d0VXA1R29PUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJQ0psTUlHRHFFRHRvOFE4WUlzb3lSdXZWdUN0dEVtMWxMZU91Y0RWUzJqQVhmd1pOYmozRE9iN3lnZXlIdmNlZnlsVUpsSE9LL1FpRW5ZeTNpTUhMYitRVmdTVllkcTAvbzRUYlR1M3ZFTGQ4c1g5aWYydk0wL056bHNzN2d5MUlTSnF0ZGVQSkhRZnc2bHF6V24rTzVHRnlPRjFJUWdyRFJuTUNOWCt6OEQxT1NLN3o2VVovWWVBTTd4cVAyMkJKU2RNblBncUl3aWVhVTlXYzZGc0N6WnphdFFFOHl4elNhTFN3VFNCQWcxRmtLeFo3OTUwbjlDeWxFZkFE… (432 chars)",
      "response_ttl_seconds": 2524
    }
  ]
}
```

<!-- facts:end -->

## What it does

The batch version of the Quest decision, for several surfaces at once.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
