# discordApiUsersMeAffinitiesUsers

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/affinities/users` |
| Sends | — |
| Reads | `user_affinities` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 5 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 1 | 200 | 789 ms | 6560 ms | — |
| inspect | step 2: snapshot | 1 | 200 | 740 ms | 48694 ms | — |
| inspect | step 1: goto /login | 3 | 200 | 567–863 ms | 32327–1045767 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T084152_<name:1>**, step 1: goto /login: 200, 863 ms

Sent:

```json
null
```

Answered:

```json
{
  "user_affinities": [
    {
      "other_user_id": "428660066716090378",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.868118679332314,
      "dm_rank": 1,
      "vc_probability": 0.8329808455771183,
      "vc_rank": 1,
      "server_message_probability": 0.0675239665545675,
      "server_message_rank": 29,
      "communication_probability": 0.5895411638213333,
      "communication_rank": 1
    },
    {
      "other_user_id": "541647035317747722",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8572496179275535,
      "dm_rank": 4,
      "vc_probability": 0.777301929086438,
      "vc_rank": 2,
      "server_message_probability": 0.004113237849325427,
      "server_message_rank": 174,
      "communication_probability": 0.546221594954439,
      "communication_rank": 2
    },
    {
      "other_user_id": "197014787945791488",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.7729288511543547,
      "dm_rank": 10,
      "vc_probability": 0.0029691820358079017,
      "vc_rank": 68,
      "server_message_probability": 0.8030203089018778,
      "server_message_rank": 1,
      "communication_probability": 0.5263061140306802,
      "communication_rank": 3
    },
    {
      "other_user_id": "1186364405743624192",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.7651596067383517,
      "dm_rank": 13,
      "vc_probability": 0.02799853904719779,
      "vc_rank": 13,
      "server_message_probability": 0.7777044395461289,
      "server_message_rank": 2,
      "communication_probability": 0.5236208617772261,
      "communication_rank": 4
    },
    {
      "other_user_id": "1231328132427153461",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.6824153507811419,
      "dm_rank": 18,
      "vc_probability": 0.5801331641194938,
      "vc_rank": 3,
      "server_message_probability": 0.11813818451654216,
      "server_message_rank": 17,
      "communication_probability": 0.46022889980572596,
      "communication_rank": 5
    },
    {
      "other_user_id": "1192133857198223460",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8486500422239412,
      "dm_rank": 7,
      "vc_probability": 0.40687628901240175,
      "vc_rank": 4,
      "server_message_probability": 0.029439592416318727,
      "server_message_rank": 48,
      "communication_probability": 0.4283219745508872,
      "communication_rank": 6
    },
    "… 1915 more"
  ]
}
```

**runs/inspect/20261030T222341_<name:1>**, step 2: snapshot: 200, 740 ms

Sent:

```json
null
```

Answered:

```json
{
  "user_affinities": [
    {
      "other_user_id": "428660066716090378",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8643636102350072,
      "dm_rank": 2,
      "vc_probability": 0.8255596310980683,
      "vc_rank": 2,
      "server_message_probability": 0.3062781273687434,
      "server_message_rank": 3,
      "communication_probability": 0.6654004562339396,
      "communication_rank": 1
    },
    {
      "other_user_id": "541647035317747722",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8645748232426937,
      "dm_rank": 1,
      "vc_probability": 0.8493159768033763,
      "vc_rank": 1,
      "server_message_probability": 0.00555013901642494,
      "server_message_rank": 53,
      "communication_probability": 0.5731469796874984,
      "communication_rank": 2
    },
    {
      "other_user_id": "1177427345733324870",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.860912193565373,
      "dm_rank": 5,
      "vc_probability": 0.7015095818585135,
      "vc_rank": 3,
      "server_message_probability": 0.021203940445420805,
      "server_message_rank": 16,
      "communication_probability": 0.5278752386231025,
      "communication_rank": 3
    },
    {
      "other_user_id": "1192133857198223460",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8628775567284265,
      "dm_rank": 3,
      "vc_probability": 0.6142673051609551,
      "vc_rank": 4,
      "server_message_probability": 0.04272257299513136,
      "server_message_rank": 9,
      "communication_probability": 0.5066224782948376,
      "communication_rank": 4
    },
    {
      "other_user_id": "1173020076509773965",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8580826073453751,
      "dm_rank": 6,
      "vc_probability": 0.6115944246337351,
      "vc_rank": 5,
      "server_message_probability": 0.010937512416067231,
      "server_message_rank": 25,
      "communication_probability": 0.4935381814650591,
      "communication_rank": 5
    },
    {
      "other_user_id": "1016308664119857202",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8382034161517002,
      "dm_rank": 9,
      "vc_probability": 0.21580670512032407,
      "vc_rank": 6,
      "server_message_probability": 0.05303509648587448,
      "server_message_rank": 8,
      "communication_probability": 0.3690150725859663,
      "communication_rank": 6
    },
    "… 1665 more"
  ]
}
```

**runs/inspect/20261028T062914_<name:1>**, step 5: click e40: 200, 789 ms

Sent:

```json
null
```

Answered:

```json
{
  "user_affinities": [
    {
      "other_user_id": "428660066716090378",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8643658221695745,
      "dm_rank": 2,
      "vc_probability": 0.836348199793196,
      "vc_rank": 2,
      "server_message_probability": 0.3598735948759675,
      "server_message_rank": 3,
      "communication_probability": 0.6868625389462459,
      "communication_rank": 1
    },
    {
      "other_user_id": "541647035317747722",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8645838800717208,
      "dm_rank": 1,
      "vc_probability": 0.8505251562385611,
      "vc_rank": 1,
      "server_message_probability": 0.006904361688764468,
      "server_message_rank": 38,
      "communication_probability": 0.574004465999682,
      "communication_rank": 2
    },
    {
      "other_user_id": "1177427345733324870",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8631666113317887,
      "dm_rank": 3,
      "vc_probability": 0.7813187369513939,
      "vc_rank": 3,
      "server_message_probability": 0.02500637897799835,
      "server_message_rank": 13,
      "communication_probability": 0.5564972424203937,
      "communication_rank": 3
    },
    {
      "other_user_id": "1173020076509773965",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8609676471181841,
      "dm_rank": 6,
      "vc_probability": 0.6976196622219482,
      "vc_rank": 4,
      "server_message_probability": 0.005601138309123053,
      "server_message_rank": 52,
      "communication_probability": 0.5213961492164184,
      "communication_rank": 4
    },
    {
      "other_user_id": "1192133857198223460",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8622789754175471,
      "dm_rank": 5,
      "vc_probability": 0.4437963111304042,
      "vc_rank": 5,
      "server_message_probability": 0.02614309038385969,
      "server_message_rank": 12,
      "communication_probability": 0.44407279231060365,
      "communication_rank": 5
    },
    {
      "other_user_id": "1016308664119857202",
      "user_segment": "HFU_MAU",
      "other_user_segment": "HFU_MAU",
      "is_friend": true,
      "dm_probability": 0.8467236514951515,
      "dm_rank": 8,
      "vc_probability": 0.24969665040916272,
      "vc_rank": 6,
      "server_message_probability": 0.21321692540280923,
      "server_message_rank": 4,
      "communication_probability": 0.4365457424357079,
      "communication_rank": 6
    },
    "… 1658 more"
  ]
}
```

<!-- facts:end -->

## What it does

Lists the people the account talks to most, used to rank the Quick Switcher and suggestions.

## What our machine does with it

Not read yet. It is the ranking behind Ctrl+K, so it would say whom the account talks to most.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
