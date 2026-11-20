# One view, every harness: log's generative UI in ChatGPT, Claude and local harnesses

20 November 2026.

Status: spec. Nothing in it is built yet. It reads `main` at `43c0f35b` (`src/mcp/apps/report`, `src/mcp/apps/browserView`, `src/mcp/server`, `src/mcp/oauth`, `src/mcp/stateless`, `docs/harnesses`) and the MCP Apps and ChatGPT Apps guidance as of November 2026.

## Goal

A view that log draws (`report`, `browserView`) shows up the same way wherever the owner works:

| Where | How it connects | What the person sees |
| --- | --- | --- |
| ChatGPT (web, desktop, mobile) | remote connector over HTTPS with OAuth | the view inline, full screen on request |
| Claude (web, Desktop) | remote connector, or a local Desktop extension | the view inline |
| Claude Code, Codex CLI | local stdio MCP | the same view as text (markdown tables, unicode bars) |
| Cursor, VS Code, Goose | local stdio or remote connector | the view inline |
| Hermes Desktop | log's plugin | the view in the side panel (`hermesView`) |

One view bundle and one tool contract serve every row. A host only decides how much of it to draw.

## What already works (checked in code)

- `report` and `browserView` are MCP Apps tools. Each carries `_meta.ui.resourceUri` (`ui://log/report`, `ui://log/browserView`). Each resource is `text/html;profile=mcp-app` with `_meta.ui.csp`.
- UI tools and resources are listed only when the client advertises the `io.modelcontextprotocol/ui` extension (`uiCapable()`), and text otherwise.
- `report` has an `outputSchema`, read-only annotations and a text fallback for hosts that don't draw.
- The view talks to the host over the standard `ui/*` bridge (`@modelcontextprotocol/ext-apps` 1.7.5). It can call read tools (`useTool`), put a prompt in the chat (`AskButton`, `FollowUps`) and tell the model what the person is pointing at (`tellAgent`).
- `logMcp --http` serves Streamable HTTP with OAuth (`src/mcp/oauth`) and a stateless mode (`src/mcp/stateless`).
- `log runtime connect` keeps an outbound bridge from this machine to the hosted side, so a remote client's call runs here.

## Gaps

### 1. ChatGPT can't reach log today

ChatGPT only connects to a remote HTTPS MCP server. It has no stdio. The hosted origin `app.log.listeningkit.com` doesn't resolve (checked 20 Nov 2026), so there is nothing for ChatGPT to add. Every ChatGPT cell in `docs/harnesses/chatgpt.md` is unverified for this reason.

### 2. The whole view goes to the model

`report` returns the full view payload in `structuredContent`. ChatGPT gives `structuredContent` to the model as well as the view, so a large people table costs context and invites the model to repeat it. The view, not the model, needs the rows.

### 3. ChatGPT metadata is missing

ChatGPT reads the standard `_meta.ui.*`, but app review and some of its features want more:

- `_meta.ui.domain`: a dedicated origin for the view, required before an app can be submitted;
- `openai/widgetDescription`: what the view shows, so the model doesn't narrate it;
- `openai/toolInvocation/invoking` and `invoked`: the short status lines shown while a tool runs;
- `openai/outputTemplate`: the older alias of `ui.resourceUri`, for ChatGPT clients that predate MCP Apps.

### 4. Every client gets every tool

ChatGPT and Claude load the full tool list into context. log has more than 200 tools. A chat that only needs the inbox and a view still pays for all of them.

### 5. Card rules aren't enforced

ChatGPT's inline-card rules: at most two actions, no nested scrolling, no tabs or deep navigation inline, 3 to 8 items in a carousel. Larger views go full screen with `requestDisplayMode`. log's report kit allows `Tabs`, `Routes` and any number of buttons inline.

### 6. No packaged local install for Claude Desktop

Claude Desktop installs local servers as Desktop extensions (`.mcpb`). log asks the person to edit a config file instead.

### 7. Nothing proves a view renders

No test renders `ui://log/report` in a real MCP Apps host. The text fallback is tested, but the drawn view isn't.

## Design

### A. Three ways to connect, one server

1. **Local stdio** (unchanged): Claude Code, Codex, Cursor, VS Code, Claude Desktop. `logMcp` is started by the host.
2. **Local connector** (new command, `log mcp connector`): runs `logMcp --http` on loopback with OAuth on, opens an HTTPS tunnel to it, and prints the URL to paste into ChatGPT or Claude as a custom connector. The tunnel only forwards; the OAuth gate stays in front of every call. Personal use, no deployment. The tunnel provider is a setting (`cloudflared` by default).
3. **Hosted** (existing code, not deployed): `https://<hosted origin>/mcp` with OAuth, which relays each call to the owner's machine over `log runtime connect`. This is the path for a shared team and for ChatGPT app submission.

All three run the same `runToolCall`, so a view and its data are identical whichever way the call arrives.

### B. Card views: the model gets a summary, the view gets the data

Every UI tool result has three parts, each with one reader:

- `content`: one or two sentences for the model ("The view shows 42 people who messaged you in 30 days, Kennedy most."). The model answers from this.
- `structuredContent`: a small typed summary that matches the tool's `outputSchema` (counts, top 3, the title). Under 2 KB.
- `_meta["log/view"]`: everything the view draws (rows, series, the compiled component). Hosts don't pass `_meta` to the model.

The view draws on first load from `_meta["log/view"]` and makes no call. `useTool` stays for refresh and for drilling in. A host that drops `_meta` falls back to `structuredContent`, then to text, so nothing breaks.

### C. Profiles: a small tool list where context is tight

`/mcp` keeps the full list. `/mcp/inbox` is a profile with only what a chat about people needs: inbox and chat reads, `search`, `voice`, the `report` and `browserView` views, and the approved-send tools. Same server, same auth; the profile is the path. A tool missing from a profile isn't listed and is refused if called by name. Stdio picks a profile with `--profile inbox`.

### D. ChatGPT metadata, added once in one place

One helper (`appToolMeta`) adds the ChatGPT keys next to the standard ones for every UI tool and resource:

- tools: `ui.resourceUri`, `ui.visibility`, `openai/outputTemplate`, `openai/toolInvocation/invoking|invoked`, `openai/widgetAccessible` (true, so `useTool` can call);
- resources: `ui.csp`, `ui.domain` (from the connector's or the hosted origin), `ui.prefersBorder`, `openai/widgetDescription`.

The standard keys stay the source of truth. The ChatGPT keys are derived from them and never set by hand.

### E. Card rules in the kit

- An inline view gets at most two buttons, one primary. More actions move to full screen or into `FollowUps`, which put prompts in the chat.
- `Tabs` and `Routes` render inline as a summary plus a "Full screen" button; the full set opens with `requestDisplayMode("fullscreen")` where the host offers it.
- `checkReport` refuses an inline view that breaks a rule, with the code `reportCardRule` and the line to fix.

### F. Elicitation and approvals

The server records which clients declared `elicitation` at initialize, and does nothing else with it yet. A send still needs the owner in the chat: an approval asked through elicitation must also work as a plain question, so no tool depends on it.

### G. Writes never start in a view

Unchanged and restated: a view only calls read tools. `AskButton` and `FollowUps` put text in the chat, where the voice gate and the owner's approval run. The judge (`src/inbox/judge`) already marks or holds incoming text before any of it reaches a view's data.

### H. Packaging per harness

| Harness | Install |
| --- | --- |
| Claude Desktop | a `.mcpb` Desktop extension built from `logMcp` (`log mcp pack`), with the `LOG_*` settings as its user config |
| ChatGPT, Claude web | `log mcp connector` prints the URL; the hosted origin when deployed |
| Claude Code, Codex, Cursor, VS Code | `log install <harness>` (exists) |
| Hermes | log's plugin (exists); it draws `hermesView` from the same compiled view |

## Verification

A host matrix test per release, each cell a check with a pass/fail:

| Check | How |
| --- | --- |
| tool lists `ui.resourceUri` and the ChatGPT keys | unit test on `appToolMeta` |
| view draws from `_meta["log/view"]` with no call | headless host from `@modelcontextprotocol/ext-apps` examples, in CI |
| `structuredContent` under 2 KB, matches `outputSchema` | unit test over every report source |
| inline card rules | `checkReport` test with breaking fixtures |
| renders in ChatGPT, Claude web, Claude Desktop | by hand through `log mcp connector`, screenshot kept in the PR |
| text fallback | existing tests |

## Order

1. Card views (B) and the ChatGPT metadata (D). Small, no new surface, makes the existing view ready.
2. `log mcp connector` (A2). This is the first time ChatGPT can reach log; check the view renders there by hand.
3. Card rules in the kit (E).
4. The `/mcp/inbox` profile (C).
5. The `.mcpb` Desktop extension (H).
6. The host matrix in CI (Verification).
7. Hosted deployment (A3), when a team needs it.

## Open questions

- Which tunnel by default: `cloudflared` needs no account for a quick tunnel but changes its URL every run, so the connector would need re-adding in ChatGPT. A named tunnel keeps the URL but needs a Cloudflare account.
- Whether `ui.domain` can be the tunnel's origin for personal use, or only a fixed origin.
