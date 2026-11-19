# Morning debrief: the issue

The owner wants a daily debrief of his conversations when he wakes up, as a step towards agents running his accounts around the clock.

## What happened when it was done by hand (19 Nov 2026)

One ask ("summarise the Discord conversation with <person>, show the opportunities on Discord, show the stats") took one agent turn of more than 1.5 minutes, while log's own tools took about 5.6 s in total (discordChats 2.03 s, discordRead 2.78 s, inboxWaiting 0.80 s, measured from log.db spans). The rest was agent round trips: about 13 tool calls, 2.9 MB of tool output (discordChats 1.35 MB, inboxWaiting 1.51 MB with up to 60 messages per chat), and five Python passes over saved output to find a chat by a misspelt name, cut threads to their last lines and count chats by kind and month. The opportunities (a partner fundraising, a client closed at about 2k a month, a lead asking whether a tool is free, a developer offering help) were picked by the agent reading threads, with no score in log.

## What log has today (checked in the repo, not guessed)

- `inboxWaiting`: who wrote last on every platform from log.db, read-only, so Hermes cron may run it. No `--since`; PR #191 adds `--tail <n>` and totals by platform, kind and month.
- `twitterNotifications --since`: likes, reposts, replies, quotes, follows, read-only.
- Discord server mentions and replies are pushed into the inbox by the gateway watcher.
- Account health: `sessionsCheck`, `governorShow`, gaps (behind) in log.db.
- Hermes `cronjob_manage` runs a prompt on a schedule. log's MCP server is marked untrusted in the plugin, so any log tool not annotated read-only is refused in cron and other unattended runs.
- The Today page (`dashboard` tool) and blocks render a view; a PNG render exists for Telegram.
- No play, command or doc in the repo mentions a debrief, digest or morning summary (gh api code search for debrief, digest, morning).
- No opportunity or money score inside log; the nicheMap scores (sponsor, affiliate, collaborator bands) live outside the repo.
