# discordApiUsersMeSettingsProto

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/settings-proto` |
| Sends | `settings` |
| Reads | `settings` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 3 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 1 | 200 | 371 ms | 35608 ms | — |
| inspect | step 8: click e221 | 1 | 200 | 365 ms | 20533 ms | — |
| inspect | step 11: type e2625 | 1 | 200 | 354 ms | 20002 ms | — |
| inspect | step 27: type e2077 | 1 | 200 | 387 ms | 23 ms | — |
| inspect | step 1: goto /login | 1 | 200 | 458 ms | 56239 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T084152_<name:1>**, step 1: goto /login: 200, 458 ms

Sent:

```json
{
  "settings": "Is4ECm3AEQAAQBAAAAAAIAAQAAAgIAAAIgBAAEAwQAAAEAAAIIAAGBhAAAAAAAAAQATAMQABAAAIAAiAIAAAAAAAAKEAECCIAZAAALDBUWIAMGCIKRBpAKIFAsAIIYIFFAACgACQJkgUIEEQiIRCACEBMXgARNsAVMkVOhAIpgMSCwhmEMqfxYuaNCAKOhgI0wMSExDcmba78zMYj6GA8O/xmvoUIAE6GAjUAxITENqS9aSQNBi8gIiOv7HlwRUgBToYCNUDEhMQuYbOuOszGI+hgPDv8Zr6FCADOhgI1gMSExDb/Pay9jMYj6GA8O/xmvoUIAI6DgjaAxIJENHC0qucNCADOg4IkQQSCRDV+LXYvzMgAjoOCJIEEgkQuqqzmMIzIDQ6FAiuBBIP… (792 chars)"
}
```

Answered:

```json
{
  "settings": "CgMY1RcSAggBGqcUCh0JR1AEj6Wcew4SEmIQCJYFEgsIARjo3ZvDnjQoAQoPCVQABMyNEx4UEgQqAvABCiAJSRAEHWhOcBESFSoBEGIQCJYFEgsIARi7maSOvDMoAQoOCR5QhBK5PhAPEgMqARAKHQlmEAK1okTwEhISYhAIlgUSCwgBGMz1sYDXMygBCg4JZQCEJZZv/hESAyoBEAodCTQAgDq9orkSEhJiEAiWBRILCAEYmu7d+dQzKAEKDgkLEMAomYPMERIDKgEQCh0JWjDEggkgoA4SEmIQCJYFEgsIARiTxfmP0jMoAQodCRUABKuzta4JEhJiEAiWBRILCAEYu8va9OUzKAEKDgl7EARV7zyqERIDKgEQCg4JPgBErbcGXQ8SAyoBEAoa… (14916 chars)"
}
```

**runs/inspect/20261028T065202_<name:1>**, step 1: goto /channels/@me/<id>: 200, 371 ms

Sent:

```json
null
```

Answered:

```json
{
  "settings": "CgUIChj2YxK+Agq7AgpYaHR0cHM6Ly9jZG4uZGlzY29yZGFwcC5jb20vYXR0YWNobWVudHMvMTEzODE5NjU1NDE4MDcyMjg0My8xNDU4NTM2MzIzMzc0Nzc2NjIyL2hxNzIwLmdpZhLeAQgBEtEBaHR0cHM6Ly9tZWRpYS5kaXNjb3JkYXBwLm5ldC9hdHRhY2htZW50cy8xMTM4MTk2NTU0MTgwNzIyODQzLzE0NTg1MzYzMjMzNzQ3NzY2MjIvaHE3MjAuZ2lmP2Zvcm1hdD13ZWJwJmFuaW1hdGVkPXRydWUmZXg9NmFlMjQ2Y2QmaXM9NmFlMGY1NGQmaG09N2EzZjljOGMwZjJhNGIwMzZkMWE0ZWJlNTRlYWQ4OGQzMzA0ZDI2ZDM3YWZk… (23216 chars)"
}
```

**runs/inspect/20261028T062914_<name:1>**, step 8: click e221: 200, 365 ms

Sent:

```json
null
```

Answered:

```json
{
  "settings": "CgUIChj2YxK+Agq7AgpYaHR0cHM6Ly9jZG4uZGlzY29yZGFwcC5jb20vYXR0YWNobWVudHMvMTEzODE5NjU1NDE4MDcyMjg0My8xNDU4NTM2MzIzMzc0Nzc2NjIyL2hxNzIwLmdpZhLeAQgBEtEBaHR0cHM6Ly9tZWRpYS5kaXNjb3JkYXBwLm5ldC9hdHRhY2htZW50cy8xMTM4MTk2NTU0MTgwNzIyODQzLzE0NTg1MzYzMjMzNzQ3NzY2MjIvaHE3MjAuZ2lmP2Zvcm1hdD13ZWJwJmFuaW1hdGVkPXRydWUmZXg9NmFlMjQ2Y2QmaXM9NmFlMGY1NGQmaG09N2EzZjljOGMwZjJhNGIwMzZkMWE0ZWJlNTRlYWQ4OGQzMzA0ZDI2ZDM3YWZk… (23216 chars)"
}
```

<!-- facts:end -->

## What it does

Reads the account's settings as a base64 protobuf (`settings-proto/1` user settings, `/2` frecency: recently used emojis, GIFs and channels).

## What our machine does with it

Not read yet. The frecency settings would say which chats the account used last.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
