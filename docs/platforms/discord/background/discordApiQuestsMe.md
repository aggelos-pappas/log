# discordApiQuestsMe

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/quests/@me` |
| Sends | — |
| Reads | `quests`, `excluded_quests`, `quest_enrollment_blocked_until`, `quest_access_suspended_until` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 27 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 651 ms | 4963 ms | — |
| inspect | step 5: click e40 | 1 | 200 | 608 ms | 6502 ms | — |
| inspect | step 9: goto /channels/@me | 1 | 200 | 583 ms | 3040 ms | — |
| inspect | step 25: goto /channels/@me | 1 | 200 | 728 ms | 2403 ms | — |
| inspect | step 1: goto /login | 13 | 200 | 487–1186 ms | 11373–1045694 ms | — |
| inspect | step 1: goto /channels/@me | 3 | 401, 200 | 344–611 ms | 9529–1814027 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 705 ms | 48663 ms | — |
| inspect | step 4: viewerInput scroll | 1 | 200 | 723 ms | 1786813 ms | — |
| inspect | step 1: goto /quest-home | 5 | 200 | 494–562 ms | 14194–29376 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 200, 1186 ms

Sent:

```json
null
```

Answered:

```json
{
  "quests": [
    {
      "id": "<id:1>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJT3EyNDd4YWJoTklMUGRoRWJCNzBGTklETEZFMEZvYkpSZExWYzhhZ1VJcXIxU0hUdkRtWnJldzZVSmhJR1lxV2Z1YktPMTlMejR2ZUJyQnl5emFzbFZadnBmSk14aks0aWQxL3lVakpISUlVUW9SWE5JZDhiRjRWN3BGM25VMWNKaFFwTmNWd1ZHTWtVRTE3RU5WZi9CcFEwM1ZUcUhTeDFmNlVNNko1bWI3eUdadlNsIn0="
    },
    {
      "id": "<id:2>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMTUlES3M1aERzYUErTFBuUWJ5RHQzVVNiN1hwVGw0dXBzNFFRcGVBRkViaHN3b3dRb3ZZcEt4Wm5TaEVvZGVmaDlhTStrdmRiSlZIekVEeWFyRmFpNFpGcVhJS1dOekNmQlNJSy9udXZvRVZzaC9PTUtCeVhhQXZMWVlEaTVyMVBvTjFMOU9sUkg3MFZLZEswdU0weWlUb2VyNzVrTjIrSFE1TWV4ckxHdGdBaVBZdkZVIn0="
    },
    {
      "id": "<id:3>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMWXhIKzJJdDVBYzlNYVN1Y1l1QkNMeXNoSW5HWDhFYXpwWTVNT0hHV2VWdkhHeW5zYVJYOTZXeDF5VlBCc2tMWUxuTU9UdzFUOCsvZ2p6MmNUWlhyRW1hVzcrZUltenRoMFR1TlBzczdTMmlSTDJNMUp0VzBNZTcvNGtNTW1Uek56alE2UWhyblNNNTBHb0NuajFCSWNRbU4zTWtNQVFvVHl2aVNpcWdRcHk0VTcyZW5FIn0="
    },
    {
      "id": "<id:4>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJVU9Gc21aakhBSXZXcWdRUExvMFR0MkFMaUZGNENBY0gveE12cjA2ZllZMlhrNzVCMnQ1MVc5NFRMSitoSG1tUlhnenR5VlhLdVVuQ2dyRmZJKytUT3NET3hnaXFDYXo5QjJPTEpGOEFFcTlBTnJFb3U0bmlOQ1NCY2F1OTREYUZYUDVMSUlJM2RjdGwxN2ZhY3RhaktDRWVlcnFhNHVpeWpuS0U2QUZ4SVFzbjFtL3Q1In0="
    },
    {
      "id": "<id:5>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKb1Q2ZlVSZWN2YllTeXAwaTRPdzh3QUVNRUU4dnl2NXR1aHVxWmg5NURQaGlGaFptZXMwWFhJTVltNWlqa3JHZzltMk9NUnhkVUZrYlNjT2o0ZitWSEl2UWg0aGoydnkzcmFRaEdkdEM1emNYMDN0d20rSjJGZUNHNWRmckxnMTRyaWlLTEVOUGRnT0hpT0RVNkdKekRHaHdRVFFKZTdFUHRIRlNaUEtwT2pDS3FDdlVvIn0="
    },
    {
      "id": "<id:6>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMS1ZQT3o0S3l6ZkVUOGVtWHhBLzBsd3NWMGR1Z1U5Tlh1c3RUeUV0ZWE3VmtBaUo1ajJwaXJndVB5SzcxWTJrVm13RnNnZGdybXdpbThZSUw5WWFWU0VQM1hseHhQWW5rRlo5OUxvL283K0x3aEZNRXM4bFRiTGg0WEg5RUlKeDBLSStWTmRjN0dFdXFJWXBmR2RUdkdCUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJS1JZV1BWZVpBenpoM3RZb01ETnRRN2l5R1ZNQ3k1UTZwUExmWkxNdi9ZVEhHdnpHY2ZTTnFQSTJhMnJVTUVDMXpmSU11VDVMT1dvaUMvcG4yajJNekt1SzdXUnhyRmRIV3JMMWVaUDBzZU05YVpXUDFMWUkxd21JbFlyUFZ5N2x1Z3RKeHVUWmVjaU9LQ2VDSFlwNHdXVXVzUDRJSVk1RGxkTjlKVUlPMEppb0xqUFFGIn0="
    },
    "… 55 more"
  ],
  "excluded_quests": [
    {
      "id": "<id:7>"
    },
    {
      "id": "<id:8>"
    },
    {
      "id": "<id:9>"
    },
    {
      "id": "<id:10>"
    },
    {
      "id": "<id:11>"
    },
    {
      "id": "<id:12>"
    },
    "… 127 more"
  ],
  "quest_enrollment_blocked_until": null,
  "quest_access_suspended_until": null
}
```

**runs/inspect/20261120T115645_<name:1>**, step 4: viewerInput scroll: 200, 723 ms

Sent:

```json
null
```

Answered:

```json
{
  "quests": [
    {
      "id": "<id:1>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKVHl2WHd6UlAzWmZiaWE0bVozTm9qc0dRUGRwZEhKK1pUalFIdkxYbmhaMGhLNnl4YlRqWFdjZmlwL3hzZ1RJUDZXdC9BYS9JV0dlaVNVVVFaWTVEanZGQTF0bmhSbzFxWEV6T0JZc0MxTXJyUTNTVzF2VitRdmRWSThhNnAvZU5JMmdUa2NkVWNlQjd6UWY2YmxTNVNzS0p5OWcvbzZ3cjRYd1FKTUg5MjhLVlIxeW1zIn0="
    },
    {
      "id": "<id:2>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKWStPN3VGRzdVWnFSSnJsZmQ5WlJEQm01b2lkUEtIVUlzaTRXenFpa1VibFZrSzR1TUJqRm85aFBNN0dRMWNnSlpvelcvVlBWVUxqRm8yaEpJNmVqSmJvb1dMMG5abFVQbTlwTzN0MjIzUnl1Y2U3K1ZYaUpsUHdQdkRwM1RYN0NEWk9qd0o1NjUxS1dnTWRsWjQ2WTVaMUJUdnBrYzJqS3pZQ3RFSk5aUFpzY2N6cVBNIn0="
    },
    {
      "id": "<id:3>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLVjBtcG5hakQ5UnJlc0cwQ0pqa0RSSDVGdEdyTnhJQzducDcxS0dWNnp2cE84b09MZWJGTFZOQmlRSUxzUC9EOWU1M0k0ak5VTldPQ3RCbnNia3dxM3hXdENZb1pBc1p1MndPSUtkWXcyZ29WbVpjT0Y1Wkk0L0MxalI1ZGhuekdpc2VmYk1tNm5hbFh5OUlpNXF6V0xrL2tTUkx5Zm1VYWcrZE1oVHBWcTJpMGlMR3pxIn0="
    },
    {
      "id": "<id:4>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMaDdMMlh2eHhySUZCT1pCdlZIdXRVU2RaVGpPNWhmVGdESkN1cVZvRmNlUlpwdkhYYU02cnR3WWdkUm5ORnFKVkk5ZUJ2RktxdWRQQ0F1b3pyTVdMUEpDR1hGR0NRYUFTRTNERFhyWVQ3RW5hZW5maCs5Y3lSdVVkMStXU2x4YUhPbm9hSWZwRHd5NURET2Z6Ry9JUlVUOXFmYmpVYkFIdGxieTFSYUVPN2lLbUNQem5wIn0="
    },
    {
      "id": "<id:5>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKUGhqbURPRkdQZ0VITGZ5dm4weWcwUFE3cmhJS2oyRmNWaC94UjRIdUhwVWJsWXMrbWFlM2JJOEdNNTVYVng1Yml6SHF3NTFpSm9DTWxJME0reVdDeGg4enRIZDczam16dFh4WmtPRzRCaGNzQmZuWXlqRU9Ha3pacGV6KytnRXNRcW1Nb24xTytBaEdsZDEzS09mMU9qelNFaUprVlVzWHh5dWg5SUtZeUE5aGdnWmxkIn0="
    },
    {
      "id": "<id:6>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKSHZCT2NLZW9EMVVWRis4alFRV044aU1aL3ZZV3E0TkZiRzB5K3pYRWNIUUtIbHdJNnY0OFIzK1BJZWo1d2pwMFA1WStUOGdNbmxQYTdOQXl2UG40ME5UZ2ppRFJwWDlSK3JZcmxuY0JNZUl0RFpuNGpXU3lMalhvUTdTS0oxY0NEM0ZOV2dNM24rcU9kLzFzUzU3YWRQUT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKNWpkaEFzUHJkSHgvT21QK0UxZ1RMTERGODlySGlEdnZsNm44RUxhem5OM29WaWN3ZDd6dEgva3F2YzA5U1Bqc3NaOEhBMHU2dEU5UzRrTGRyNE1pMlBwY0ZBTmRHR0F0YjBWQmFOc21BejZmRUloSHhGYTVUOUV0N0kyU29UQXM1YjdCaDJZMHRtUk84OUM1M2JJNEZxZVg3cW9JMXJWbHhSYzR5QVB6a3JwODBZUDlQIn0="
    },
    "… 55 more"
  ],
  "excluded_quests": [
    {
      "id": "<id:7>"
    },
    {
      "id": "<id:8>"
    },
    {
      "id": "<id:9>"
    },
    {
      "id": "<id:10>"
    },
    {
      "id": "<id:11>"
    },
    {
      "id": "<id:12>"
    },
    "… 127 more"
  ],
  "quest_enrollment_blocked_until": null,
  "quest_access_suspended_until": null
}
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 200, 530 ms

Sent:

```json
null
```

Answered:

```json
{
  "quests": [
    {
      "id": "<id:1>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMVWt3eVcvT3JKdjJqVG80WXhYeUpQNTRZSEI0dVAyak8xM1BnVXVRVm5oUDZhVmtuK1pNQndLR3ZpMnk3MEJnRHBVT2pRMHNOeWlyeFR4Q2RzMTdRaGJJVzNCdXBoMnlmbmdyVmJhYVJrRHdGVG1td3NaNDA1bUhIMzVBSWpZMi9QMFkyWnlnUG5WTXVIR0NDbkFLdStwUlNHRlFyNU4xNXdGblMrOEZSam5YRmluSGFYIn0="
    },
    {
      "id": "<id:2>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLWkwxMFJzZ3ZaVWJKNHVheEdSVDVkeGZYUHBpRGZOMExaQkFIcDNiTzMraHNrRUNEK2dCUWZWb1Z5Y3orOHUwVFFORkUwYnFGTnBtcmJraGtoYW43MzlkOXlmdDVkd3BUMXFDVm14cVF4WjV2d2RGck1hSFFPRmlpNmRGSnV0YlZIdmVVQ0w2UkU3NVBKekI5RmFaS0ZiVFY4bmdET3JHVUNZREw0dTU0OHhCbG01ZVVwIn0="
    },
    {
      "id": "<id:3>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMNFhadlhLa29QeXh3Rk9JQ3VtV094OHlqVFBVelM5cTgvaXQzTmNDQnM1ZzlvM2dXZmE5bzlIdmFveG0rZzlzZ0ZpdEw3K3RoOURkNnhwZzFuL2ZoQnNsYXRESFZiblBjWXQranZIaFprb25WazRJQndUYmJRQmtlWXQ1clBaQ0pFRkRhUEliR3hOMnV5L3NKMmZIWFp6bG5VdkRTM0hmNVpqNStHRVlsdFlaczlqdk1TIn0="
    },
    {
      "id": "<id:4>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKN3Q0N05oalJEbVRaQTQ2alo1aXFtWDZ4amR5WmlhUkU2Q0tmRjhiUHFhUUJ3TjUzZmJCSkQ0SThYMUdPOUtwNUxVdEk3RzRKenhHSEVlQ2dvdXB1bFM4Mlllc1dBdEd2c0RaNkt1UjJDaThyVjduRVJpb2d6dWVKUHNFQzEwQXQ2bUFHWUdzM0Z5cU1sMFRIazVLeXc0RWdmT0ZTR0duQjFISjlUY0hJKysxWHJheUZHIn0="
    },
    {
      "id": "<id:5>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dJTlhWQXhaaDI4dFBNb3lHSytMcTNTc2o3bW5QOW1RdHJyNHYzNTd3cjlOc1NVSG12TEV6VVVIWEVJRVlCclBBaUVaVUdsdnJ3cFlGcGFGOHg3WVl5ek1nRVVuS0VValFBb2pleUoydU9PaGtCd1RGUzlrNkxodjM0VTQ5YjdtbGxEcVhzM0RPNWNOTEFZaEwrYWRsMkNsZ0dmMGFnV3lMSUZ3OGlkbVN2OVRIMWEwbTd6In0="
    },
    {
      "id": "<id:6>",
      "config": "(13 fields)",
      "user_status": null,
      "targeted_content": "(0 items)",
      "ad_context": null,
      "preview": false,
      "traffic_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dKc2NZaFRIb2QwMi8vOEFxLzNCQTBHZjlSNlpLK2dhcHI5QzFoRnJNbDdQTTBHMURqWUd3SEZ5cXNjckcwZ0FadE1WaDBGMGlHWDU1TUZvOCtHeDdnMXlWN1dGaUs0NVhWZi9KZjBlMkZYNFdnQ2hXL0lhZ240R1RJRWdHZktaSjNGanJhVk84ZTNrU0QxcEZhVUVrdHJ0UT09In0=",
      "provenance_metadata_sealed": "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dMY1Q5ZEhTYkdkZDFBYmdZYUN4a2dONFFHVmJsSWxLcW5Ucmx2cG42RXdiV1p3ZUNSU04wWWdXc3MzMHhjRkNDZnUwVUdmRzFjU3JPWnlXRjN4NTNKUU83d2h4WGNmNGkwTkZxZnRQVkxXMFVBVUQ0V2JON2xSaFdlWGhTeU5mcWYxSVRFcEgrWGlFM2pMV0dDaERBUmJiN3lXQ2gxa1VhbG5RaVdGZHFGVU9JdDZ4RW5tIn0="
    },
    "… 55 more"
  ],
  "excluded_quests": [
    {
      "id": "<id:7>"
    },
    {
      "id": "<id:8>"
    },
    {
      "id": "<id:9>"
    },
    {
      "id": "<id:10>"
    },
    {
      "id": "<id:11>"
    },
    {
      "id": "<id:12>"
    },
    "… 127 more"
  ],
  "quest_enrollment_blocked_until": null,
  "quest_access_suspended_until": null
}
```

<!-- facts:end -->

## What it does

Lists the account's Quests and how far along each is.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
