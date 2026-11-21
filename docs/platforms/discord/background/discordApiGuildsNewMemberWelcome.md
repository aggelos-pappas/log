# discordApiGuildsNewMemberWelcome

<!-- facts:start · written by `log capture docs` from the run captures and rea. Not edited by hand. -->

| | |
| --- | --- |
| Domain | background |
| Kind | endpoint |
| doc_id | — |
| Path | `discord.com/api/guilds/new-member-welcome` |
| Sends | — |
| Reads | `guild_id`, `enabled`, `welcome_message.author_ids`, `welcome_message.message`, `new_member_actions`, `resource_channels` |
| Called from | `runs/inspect/20261120T115645_<name:1>/script0.js:232 625075`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 559868`, `runs/inspect/20261120T115645_<name:1>/script0.js:124 961943`, `runs/inspect/20261120T115645_<name:1>/script1326.js:1 634654` |
| rea | `ev_a9fa69c7432fa1fcc41058ba491790444cfcec72f4c96150b3d2566a4e5def67` |

Seen 2 time(s) in 2 run(s).

| Action | Our step | Times | Status | Took | After step start | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| inspect | step 5: viewerInput click | 1 | 200 | 486 ms | 42610 ms | — |
| inspect | step 1: goto /login | 1 | 200 | 668 ms | 1186299 ms | — |

### What it sent and what came back (the newest 2 from our runs)

Read from each run's own recording (rule 73), secrets and signed link tokens taken out. Kept in `~/.logCli/rea/clientFacts.json`, so it stays after the run is pruned.

**runs/inspect/20261120T111021_<name:1>**, step 5: viewerInput click: 200, 486 ms

Sent:

```json
null
```

Answered:

```json
{
  "guild_id": "1556595354999332884",
  "enabled": true,
  "welcome_message": {
    "author_ids": [
      "1462119871398805629"
    ],
    "message": "<messageText>"
  },
  "new_member_actions": [
    {
      "channel_id": "1556595356199030806",
      "action_type": 0,
      "title": "Check out the recent announcements",
      "description": ""
    },
    {
      "channel_id": "1556595356199030807",
      "action_type": 0,
      "title": "Resouces are here:",
      "description": ""
    },
    {
      "channel_id": "1558406547535691849",
      "action_type": 0,
      "title": "Check out and share what you're working on!",
      "description": ""
    },
    {
      "channel_id": "1556595356199030809",
      "action_type": 1,
      "title": "Tell us what you're working on or need help with!",
      "description": ""
    },
    {
      "channel_id": "1558393767386419200",
      "action_type": 0,
      "title": "Forum to showcase your work",
      "description": ""
    }
  ],
  "resource_channels": [
    {
      "channel_id": "1556595356199030806",
      "title": "announcements",
      "description": ""
    },
    {
      "channel_id": "1556595356199030807",
      "title": "resources",
      "description": ""
    },
    {
      "channel_id": "1557926046920089610",
      "title": "faq",
      "description": ""
    }
  ]
}
```

**runs/inspect/20261120T084152_<name:1>**, step 1: goto /login: 200, 668 ms

Sent:

```json
null
```

Answered:

```json
{
  "guild_id": "1556595354999332884",
  "enabled": true,
  "welcome_message": {
    "author_ids": [
      "1462119871398805629"
    ],
    "message": "<messageText>"
  },
  "new_member_actions": [
    {
      "channel_id": "1556595356199030806",
      "action_type": 0,
      "title": "Check out the recent announcements",
      "description": ""
    },
    {
      "channel_id": "1556595356199030807",
      "action_type": 0,
      "title": "Resouces are here:",
      "description": ""
    },
    {
      "channel_id": "1558406547535691849",
      "action_type": 0,
      "title": "Check out and share what you're working on!",
      "description": ""
    },
    {
      "channel_id": "1556595356199030809",
      "action_type": 1,
      "title": "Tell us what you're working on or need help with!",
      "description": ""
    },
    {
      "channel_id": "1558393767386419200",
      "action_type": 0,
      "title": "Forum to showcase your work",
      "description": ""
    }
  ],
  "resource_channels": [
    {
      "channel_id": "1556595356199030806",
      "title": "announcements",
      "description": ""
    },
    {
      "channel_id": "1556595356199030807",
      "title": "resources",
      "description": ""
    },
    {
      "channel_id": "1557926046920089610",
      "title": "faq",
      "description": ""
    }
  ]
}
```

<!-- facts:end -->

## What it does

Loads a server's welcome message and suggested channels for new members.

## What our machine does with it

Nothing in log-cli waits for it or reads it. It is part of what Discord's client loads around the page; a watch or a send never depends on it.

## What can go wrong

The account carries on whatever it answers; a failure here changes nothing for our steps.
