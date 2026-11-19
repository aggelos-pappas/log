# The live inbox

Every account log runs keeps one live connection to its platform, and everything that comes in or goes out is recorded once, in one local database. Agents read from that database instead of asking the platform again, so many agents can follow the same account without anything being doubled, missed or answered twice. This page explains how it fits together.

```mermaid
flowchart LR
  platform["The platform's push channel<br/>X Chat socket, Discord gateway,<br/>Slack websocket, Instagram MQTT"] --> owner
  owner["The one owner per account<br/>(holds the lock, heartbeat every 5 s)"] --> db[("~/.logCli/log.db<br/>events, cursors, owners,<br/>claims, actions, alerts")]
  owner --> relay["Local relay<br/>127.0.0.1, token first"]
  relay --> subs["Hooks, Monitors,<br/>other agents"]
  db --> agent["An agent's session<br/>reads from its own cursor"]
  agent -->|claim the chat| db
  agent --> send["Send through the account's<br/>one session and governor"]
  send -->|what was done| db
```

## A real example

A contact writes a short question on Discord while a reply to them is going out line by line.

1. Discord's gateway pushes their message to the account's one owner process.
2. The owner adds it to `events` with the next sequence number and passes it to everyone attached to the relay.
3. Before sending its next line, the send checks the database, sees the contact wrote, and holds the rest (`>>> INTERRUPTED`).
4. The agent's hook shows the new message from its own cursor. The agent claims the chat, reads what was already done in it (`actions`), and answers their question first.

## The parts

**One owner per account (rules 131, 132).** The first watch to take an account's lock opens the platform's push connection. Every later watch attaches to its relay instead of opening a second connection. An owner that stops sending heartbeats for 60 s is stopped and reported loudly, and the next start takes over.

**One database (rule 134).** `~/.logCli/log.db` is SQLite in WAL mode, and every write runs in one transaction. It holds:

| Table | What it holds |
|---|---|
| `events` | every incoming event, once, by its event id, with a sequence number |
| `cursors` | how far each session has read, so nothing is shown twice |
| `owners` | the one owner per account: pid, heartbeat, status, relay port |
| `claims` | which session holds which chat, with a generation number |
| `actions` | every claim, send and release, with what the chat looked like before |
| `alerts` | loud problems: a second owner, a hung owner, an unknown event type |
| `timings` | when each event was received, stored, relayed, claimed and acted on |
| `searchIndex` | full-text search over events and actions |

**Claim before acting (rule 133).** A session claims a chat before drafting a reply. Only one session can hold it. Every send claims the chat itself, checks before each line that it still holds it, and releases it when done.

**Pushed into the session between turns.** A prompt hook only runs when the owner types, so on its own a message that lands while he is away waits for his next word. `scripts/hooks/push.ts --host <host> --reader <session reader>` (`src/inbox/push`) wakes on every watcher write under `~/.logCli/inbox` (and every 15 s if a write is missed), takes what is new from the same cursor the prompt hook reads, so nothing is shown twice, and prints one JSON line per batch: `{ reader, host, count, context }`, where `context` is the same `>>> NEW MESSAGE` block the hook shows. Each harness turns a line into a turn the same way it would take a message from the owner:

| Harness | How a pushed batch starts a turn |
|---|---|
| Hermes | the `log` plugin runs `push.ts` with the reader of the chat the owner last wrote in and calls `ctx.inject_message(context, session_key=...)`; needs `plugins.entries.log.allow_gateway_injection: true`, and picks the same chat up again after a restart from `~/.logCli/inbox/hermesPush.json` |
| opencode | the `log` plugin runs `push.ts` for each session it starts and sends each batch with `session.synthetic` |
| Claude Code | a `Monitor` on `bun <log>/scripts/hooks/push.ts --host claudeCode --reader <session id>`: every line it prints wakes the session |
| Codex, Cursor, Antigravity | no way for a plugin to start a turn yet, so messages wait for the next prompt hook |

**Replies: ask or auto.** A pushed message always tells the agent to say who wrote and what about. Whether it may then send is the owner's setting, `ask` by default: the agent drafts and gates the reply, shows it, and sends only when the owner says to in that chat. `auto` brings back sending straight away (rule 108). Set it per harness, one word for every platform or per platform with a default:

| Where | Setting |
|---|---|
| Hermes `config.yaml` | `plugins.entries.log.replies: ask`, or `replies: {default: ask, discord: auto}` |
| any harness (env) | `LOG_REPLIES=ask` or `LOG_REPLIES=discord=auto,default=ask` |
| fallback for all harnesses | `~/.logCli/settings.json`: `{"replies": "ask"}` or `{"replies": {"default": "ask", "twitter": "auto"}}` |

The harness setting wins over the file. Turning off `allow_gateway_injection` in Hermes stops pushed messages starting turns on their own; they then wait for your next message.

**Unknown events (rule one).** An event type nobody has catalogued yet is stored with its raw payload and raised as an alert, so it can be named from rea, the docs and SubQ instead of being dropped.

## Being built now

- **Catch-up after a gap.** When a connection drops, the owner uses the platform's own position (X Chat's sequence id, Discord's resume, Slack's timestamp, Instagram's sequence id) to pull what it missed through the governor. While an account is behind, sends wait.
- **Context from the database.** The full context before a send (rule 109) is read from the database, not fetched from the platform again.
- **The voice gate on the database.** Every send runs every voice check (the watermark and scrambler readings, the AI-tells index, his phrasing, SubQ). Embeddings are stored in the database with their model name. Results are always worked out fresh at send time, never saved.

## Waiting on the owner

- **The media describer:** a small local vision model (`LFM2.5-VL-450M`, SubQ's pick) kept warm from the start of the session. It turns pictures and video frames into text, so a reply answers what was actually sent. Audio already goes through AssemblyAI (rule 126).
- **Jina's newer models:** `jina-embeddings-v5-omni` (text and media in one space) and `jina-reranker-v3.5`, to rank the conversation, media, replies and likes that go into the voice step. These are paid calls, so they wait for his yes.

Specs: `docs/specs/agentHooks.md` (REQ-HOOKS-12 to 16). Code: `src/inbox/store`, `src/inbox/relay`, `src/inbox/watch`, `src/inbox/claims`.
