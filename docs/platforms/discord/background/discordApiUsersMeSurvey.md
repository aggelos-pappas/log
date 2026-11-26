# discordApiUsersMeSurvey

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/users/@me/survey` |
| Sends | — |
| Reads | `message`, `retry_after`, `global` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 5 time(s) in 5 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: click e40 | 1 | 429 | 394 ms | 5298 ms | — |
| inspect | step 2: snapshot | 1 | 429 | 363 ms | 47817 ms | — |
| inspect | step 1: goto /login | 3 | 429 | 325–500 ms | 29035–1044475 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T084152_<name:1>**, step 1: goto /login: 429, 325 ms

Sent:

```json
{
  "query": {
    "supports_native": "true",
    "disable_auto_seen": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "retry_after": 21476.8,
  "global": false
}
```

**runs/inspect/20261030T222341_<name:1>**, step 2: snapshot: 429, 363 ms

Sent:

```json
{
  "query": {
    "disable_auto_seen": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "retry_after": 15997.079,
  "global": false
}
```

**runs/inspect/20261028T062914_<name:1>**, step 5: click e40: 429, 394 ms

Sent:

```json
{
  "query": {
    "disable_auto_seen": "true"
  },
  "body": null
}
```

Answered:

```json
{
  "message": "<messageText>",
  "retry_after": 65369.159,
  "global": false
}
```

<!-- facts:end -->

## What it does

Asks whether to show the account a survey.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

It answered 429 (rate limited) in our run: the client asks often; nothing else is affected.
