# Morning debrief: research

## Prior art (GitHub, by stars, 19 Nov 2026)

- Anthropic, Writing effective tools for AI agents: a tool that returns all contacts for the agent to read wastes context; tools should do the narrowing and offer concise vs detailed responses.
- Anthropic, Effective context engineering: hand the agent lightweight identifiers and let it load data just in time.
- mem0ai/mem0 (69k): one retrieval pass per turn with entity linking and fused signals, about 1 s p50.
- mksglu/context-mode (34k): keep tool output out of the agent's context window.
- daily-briefing style agents (tballochi/daily-briefing, iloveitaly/gmail-digest, paper_claw): a scheduled job gathers the last 24 h, ranks it, and delivers one message.
- Hermes personal-assistant recipe (in log's vendored genui): a cron job every 30 minutes runs a check skill with only read tools and the assistant tools, records items once, and the Today page shows what needs the user and what was handled; it never sends on its own.

## Matrix: what the debrief needs vs log today

| Need | In log | Gap |
| --- | --- | --- |
| New messages per platform since a time | inboxWaiting (no --since) | --since, compact |
| Waiting on the owner, follow-ups | inboxWaiting | none |
| X notifications overnight | twitterNotifications --since | none |
| Discord mentions | gateway watcher into inbox | none |
| Ranked opportunities | none | a score |
| Account health | sessionsCheck, governorShow, gaps | one place |
| One call for all of it | none | a command |
| Steps for the agent | none | a play |
| Runs every morning | Hermes cron, read-only log tools | the job |
| Delivered where seen | Today page, blocks, Telegram PNG | wiring |
