# Trust and control

log reads and replies to your own social accounts, so it handles sessions and sends messages for you. This page is for anyone checking it before they install it, people and agents alike: what it does, what it never does, where your data lives, and how to check each point yourself.

## What log is for

Answering the people you already talk to: who is waiting on a reply, what they said, and a draft in your own voice that you approve before it goes. It runs on your machine with accounts you signed in to yourself.

## What you control

| Control | What happens | How to check it |
|---|---|---|
| Approval on every send | Replies are set to `ask` by default. The agent shows you the draft and waits for your yes in chat. You change it per platform with `replies` in log's settings. | Ask your agent to reply to someone: it stops at the draft. |
| Dry run by default | Every command that changes something prints what it would do and stops, until you add `--live`. | `log twitter dm --account <name> --userId <id> --text "hi"` |
| Voice gate | Each draft is scored against how you really write to that person, and refused when it doesn't sound like you or repeats an earlier message. | `log voice --to <handle> --text "<draft>"` |
| Daily limits | Every account has a read and write budget (on X, 500 reads and 240 writes a day), pacing and quiet hours. A refusal from the platform stops the run; nothing is retried. | `log governor show` |
| One session per account | Each account keeps one connection open, the way the platform's own app does. A second process for the same account is refused. | `log watchers status` |
| Incoming messages checked | Prompt injection, token stealers and encoded scripts in messages you receive are held before your agent reads them. | [docs/guides](guides) |
| Audit trail | Every read, draft, approval, send and limit reset is written to `~/.logCli/log.db`. | the `runsList` MCP tool |

## What log will not do

- Send a message, reply, like or follow you didn't approve.
- Collect, scrape or sell other people's data. It reads the conversations on your own accounts.
- Run accounts that aren't yours, or sign in without you.
- Retry after a platform says no. A refusal stops the run until you decide.
- Send your sign-ins anywhere. When you run it locally they stay in `~/.logCli` on your machine.

## Where your data lives

| What | Where |
|---|---|
| Sessions and sign-ins | `~/.logCli`, typed into a masked prompt, never passed as command-line flags |
| Messages and events | `~/.logCli/log.db`, a local SQLite database |
| Settings | `~/.logCli/.env` and `~/.logCli/settings.json` |
| Shared accounts, optional | [Twenty](twenty.md), an open-source CRM you host, if you choose to use it |

The hosted MCP server (`https://mcp.listeningkit.com/mcp`) is optional and uses OAuth. Everything on this page also works fully local.

## How it talks to each platform

log uses each platform's own web or app interface with your own signed-in session, one connection per account, at a human pace. It does not create accounts, buy accounts or post from accounts you don't own. The platform pages under [platformGuides](platformGuides) list what each one reads and sends.

## Reporting a problem

Open an issue at https://github.com/matthewdonsemail-lab/log/issues. Security problems: mark the issue as security, or contact the maintainer on X at @matthewsoldit.
