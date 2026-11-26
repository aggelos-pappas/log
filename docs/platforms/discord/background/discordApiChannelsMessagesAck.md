# discordApiChannelsMessagesAck

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/channels/messages/ack` |
| Sends | `version`, `read_state_type` |
| Reads | `token` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 39 time(s) in 14 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 1: goto /channels/@me/<id> | 2 | 204 | 338–402 ms | 16667–16770 ms | — |
| inspect | step 4: press Enter | 1 | 200 | 285 ms | 7266 ms | — |
| inspect | step 5: click e40 | 2 | 204 | 313–349 ms | 15288–15389 ms | — |
| inspect | step 8: click e221 | 1 | 200 | 343 ms | 4838 ms | — |
| inspect | step 9: goto /channels/@me | 2 | 204 | 329–331 ms | 14445–14547 ms | — |
| inspect | step 17: click e180 | 1 | 200 | 315 ms | 3905 ms | — |
| inspect | step 20: press Enter | 1 | 200 | 312 ms | 7670 ms | — |
| inspect | step 21: wait 20s | 1 | 200 | 290 ms | 978 ms | — |
| inspect | step 25: goto /channels/@me | 2 | 204 | 324–370 ms | 14201–14303 ms | — |
| inspect | step 28: press Enter | 1 | 200 | 350 ms | 3015 ms | — |
| inspect | step 31: wait 60s | 1 | 200 | 301 ms | 39716 ms | — |
| inspect | step 1: goto /login | 16 | 204 | 309–1581 ms | 19948–1054567 ms | — |
| inspect | step 2: snapshot | 2 | 204 | 301–410 ms | 57834–57944 ms | — |
| inspect | step 1: goto /quest-home | 4 | 204 | 339–395 ms | 31490–32448 ms | — |
| inspect | step 1: goto /channels/@me | 2 | 204 | 296–342 ms | 28386–31371 ms | — |

### What it sent and what came back (the newest 3 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T115645_<name:1>**, step 1: goto /login: 204, 352 ms

Sent:

```json
{
  "version": 2,
  "read_state_type": 0
}
```

Answered:

```json
null
```

**runs/inspect/20261120T111021_<name:1>**, step 1: goto /quest-home: 204, 345 ms

Sent:

```json
{
  "version": 2,
  "read_state_type": 0
}
```

Answered:

```json
null
```

**runs/inspect/20261120T091412_<name:1>**, step 1: goto /channels/@me: 204, 342 ms

Sent:

```json
{
  "version": 2,
  "read_state_type": 0
}
```

Answered:

```json
null
```

<!-- facts:end -->

## What it does

Marks a channel read up to a message (`POST .../messages/<id>/ack`), so the unread badge clears on every device.

## What our machine does with it

Recorded, not sent by us on purpose: opening a chat in the account's browser acks it, so a watch that opens chats marks them read.

## What can go wrong

204 is the normal answer; a failure only leaves the badge unread.
