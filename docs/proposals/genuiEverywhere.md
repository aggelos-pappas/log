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
- UI tools and resources are listed only when the client advertises the `io.modelcontextprotocol/ui` extension (`uiCapable()`), and text otherwise. That gate hides every view from claude.ai, which draws views without declaring the extension (gap 1).
- `report` has an `outputSchema`, read-only annotations and a text fallback for hosts that don't draw.
- The view talks to the host over the standard `ui/*` bridge (`@modelcontextprotocol/ext-apps` 1.7.5). It can call read tools (`useTool`), put a prompt in the chat (`AskButton`, `FollowUps`) and tell the model what the person is pointing at (`tellAgent`).
- `logMcp --http` serves Streamable HTTP with OAuth (`src/mcp/oauth`) and a stateless mode (`src/mcp/stateless`).
- `log runtime connect` keeps an outbound bridge from this machine to the hosted side, so a remote client's call runs here.

## Prior art: a production server that draws one card set in ChatGPT, Claude and its own chat

A partner's MCP server (private code, read with access granted to the owner; described here by pattern only) already ships what this spec plans. Its lessons, each one a change to the design below:

| What it does | Why it matters for log |
| --- | --- |
| A card tool's handler calls the server's own read tools first (a list of steps; a later step can depend on an earlier one's answer) and returns `content` = one summary sentence for the model, `_meta["<app>/view"]` = `{ kind, version, results: { <tool name>: <its parsed answer> } }` | The card draws on first load with no call from the iframe. The model reads one sentence, not the rows. This is design B, proven. |
| The widget reads the view from the tool result's `_meta`, checks `kind` and `version`, and only when it is missing (an older server, a host that drops `_meta`) fetches for itself with `callServerTool` | A version bump never blanks a card; old and new servers both draw. |
| A failed step stays in `results` as `{ error, hint }` and the card turns it into words; it never prints raw errors | One broken read shows as one line in the card, not an empty card. |
| One registration helper per card: tool `_meta` (`ui.resourceUri`, `ui.visibility: ["model","app"]`, `openai/outputTemplate`, `openai/widgetAccessible`, `openai/toolInvocation/invoking|invoked`) and resource `_meta` (`ui.csp`, `ui.prefersBorder`, `openai/widgetDescription`, `openai/widgetCSP`, `openai/widgetPrefersBorder`), derived from one definition | Design D: the ChatGPT keys are never typed by hand. Two tools may share one widget; the helper registers the `ui://` resource once. |
| The handler and the widget are both optional: a tool with a handler and no widget is a complete text tool | Claude Code and Codex, which draw nothing, get the same answer as text. |
| CSP: fonts only by default; image or upload origins named per card | Nothing in a card can fetch data on its own. |
| One Vite build per widget with `inlineDynamicImports`; a multi-entry build splits React into chunks a `ui://` iframe cannot load | The bundle must be one self-contained HTML file per card. |
| The product's own web chat draws the same card components as the MCP widgets, adjusting to width | One card set for every surface; for log that surface is Hermes (below). |
| At most two primary actions per card, enforced after a review found three | Design E. |
| The client's declared capabilities (`elicitation`) are logged at initialize and nothing branches on them yet | Design F, as written. |
| A public `/.well-known/openai-apps-challenge` route answers the app-submission domain check from config, no redeploy | Needed for A3 before a ChatGPT directory listing. |
| A test bench renders every widget inside replica ChatGPT and Claude hosts, and runs prompts against several models | The Verification matrix, with the replica host as the CI cell. |

## Gaps

### 1. The hosted server is deployed but can't answer, and hides its views

The hosted origin is `https://mcp.listeningkit.com` (`python/controlService`, live with OAuth and dynamic client registration). It relays every call to the owner's machine over `log runtime connect`, and that bridge isn't running, so a ChatGPT or Claude connector added today authenticates and then has nowhere to run a tool. Its tool list is a hand-kept allow-list (48 tools against about 300 local), and like the local server it lists views only for clients that declare the MCP Apps extension, which claude.ai doesn't. Details and the issues other servers hit: `docs/decisions/genuiEverywhere/research.md`.

Partly closed (#112): the relay's tool list and resources now come from the runtime's registry (`toolManifest { all }`, built from `statelessTools` and `CARDS`), cards are listed to every client, and a report's `_meta["log/view"]` reaches clients that declare nothing. Still open: the origin routes `/mcp` and `/oauth` to an older Twenty-OAuth `logMcp`, not the relay, and `log runtime connect` isn't kept running.

### 2. The whole view goes to the model

Closed: the view goes in `_meta["log/view"]`, the model gets a summary (`docs/mcp.md`, Cards).


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

Closed for the card meta, actions, radius and inner scrolling by `check:cards`; the report kit's Tabs and Routes inline are still allowed.


ChatGPT's inline-card rules: at most two actions, no nested scrolling, no tabs or deep navigation inline, 3 to 8 items in a carousel. Larger views go full screen with `requestDisplayMode`. log's report kit allows `Tabs`, `Routes` and any number of buttons inline.

### 6. No packaged local install for Claude Desktop

Claude Desktop installs local servers as Desktop extensions (`.mcpb`). log asks the person to edit a config file instead.

### 7. Nothing proves a view renders

Closed: `scripts/cards/cardShots.py` draws every card in a replica host, light and dark.


No test renders `ui://log/report` in a real MCP Apps host. The text fallback is tested, but the drawn view isn't.

## Design

### A. Three ways to connect, one server

1. **Local stdio** (unchanged): Claude Code, Codex, Cursor, VS Code, Claude Desktop. `logMcp` is started by the host.
2. **Local connector** (new command, `log mcp connector`): runs `logMcp --http` on loopback with OAuth on and connects it outward. For ChatGPT (and Codex, the Responses API) it runs OpenAI's Secure MCP Tunnel client (`openai/tunnel-client`): outbound HTTPS only, nothing reachable from the internet, and the person picks **Tunnel** under Plugins, Add custom MCP server. For other remote-only clients (Claude web) it opens a public HTTPS tunnel instead (`cloudflared` by default), with the OAuth gate in front of every call. Personal use, no deployment. Research and the local-versus-hosted table: `docs/decisions/genuiEverywhere/research.md`.
3. **Hosted** (deployed at `https://mcp.listeningkit.com/mcp`, relay not running): `https://mcp.listeningkit.com/mcp` with OAuth, which relays each call to the owner's machine over `log runtime connect`. This is the path for a shared team and for ChatGPT app submission.

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
| ChatGPT, Claude web | `https://mcp.listeningkit.com/mcp` once the relay runs; `log mcp connector` for a private ChatGPT tunnel |
| Claude Code, Codex, Cursor, VS Code | `log install <harness>` (exists) |
| Hermes | log's plugin (exists); it draws `hermesView` from the same compiled view |

### I. The Hermes blocks, everywhere

In Hermes, log's views are genui blocks (`show_blocks`: tables, lists, callouts, actions, forms, charts), drawn by the vendored renderer (`vendor/hermesGenui`). Other hosts can't see them. The same blocks become one more card:

- A `blocks` card tool (`ui://log/blocks`) takes a blocks payload, or the id of a stored one, and returns the usual three parts: a one-line summary for the model, a small `structuredContent`, and the blocks in `_meta["log/view"]` as `{ kind: "blocks", version: 1, results: { blocks } }`.
- Its resource is the vendored blocks renderer built as one self-contained HTML file (one Vite entry, `inlineDynamicImports`), drawing from the host's CSS variables (`hostContext.styles.variables`) the way it draws from Hermes's theme.
- Block actions map onto the host bridge: an `actions` button's prompt becomes `ui/message` (`sendFollowUpMessage` in ChatGPT), a form submit becomes a prompt too, and only read tools are called from the card (G).
- Inline, the card shows at most two actions and no tabs; a blocks payload with tabs or more buttons opens with `requestDisplayMode("fullscreen")` (E).
- Hosts that draw nothing get the blocks as markdown (tables, lists, bullets), from the same payload.

So a view written once with `show_blocks` reads the same in Hermes, ChatGPT, Claude and Claude Desktop, and as text in Claude Code.

### J. The live browser, streamed and driven from the chat, wherever it runs

`browserView` already has the parts: the page screencast (`GET /stream` in `python/browser/browserViewer.py`, the default local stream: about 22 frames a second measured on Camoufox headless, a frame every ~45 ms; a binary patch matrix of the Juggler capture limits did not raise it), an optional voxl video stream (`python/browser/streamSurface.py`), a screenshot fallback (`browserViewFrame`, about 2 frames a second) and the person's clicks, typing, keys and scroll replayed with Playwright as recorded steps (`browserViewInput`). It has never worked from a hosted chat, and it was built as a sign-in helper. The owner's decision (20 Nov 2026): the stream is the normal picture, not screenshots, and the person drives the browser from the chat for whatever they need, wherever the browser runs.

Where the browser runs, and how the chat reaches it:

| Browser on | Calls (state, frames, input) | Picture |
| --- | --- | --- |
| the person's own machine, local web console | the console's loopback routes | the page screencast, piped through `/api/console/browserCheck/stream` (built); voxl only if set |
| the person's own machine, chat in Claude Desktop or another MCP Apps host | local stdio | the page screencast through the loopback relay (`http://127.0.0.1:47613`, in the view's CSP), frames pulled when the host blocks loopback; voxl on loopback optional |
| the person's own machine, chat in Hermes Desktop | local stdio + log's Desktop plugin | `::logbrowser{account}`: the page screencast read by the plugin from the viewer with a one-time ticket, frames through the plugin's routes as the fallback |
| the person's own machine, chat in ChatGPT or claude.ai | through `mcp.listeningkit.com` and the relay, or Secure MCP Tunnel | voxl through an https tunnel from the same machine, its origin in the CSP |
| the person's own server or VM (Xvfb or a desktop session, AdsPower headless with its Local API, `docs/deployment.md`) | `log runtime connect` runs on that server, so the hosted server relays to it | voxl on the server's display, published over https (its own tunnel or reverse proxy) |

Changes:

1. **Streaming on by default.** `log` starts voxl `--read-only` beside each open account browser on its display, sets `LOG_VOXL_URL` itself, and publishes it over https when the chat isn't on the same machine. The URL (with voxl's read-only password) reaches only the view, never the model (as now).
2. **Streaming locally too.** The "use your own window" refusal (`browserViewLocal`) goes: a chat on the same machine streams as well, so a Hermes or Claude Desktop chat shows the browser inline.
3. **Camoufox streams too.** The page screencast already does, at about 22 fps, with no window arrangement (built for the local console). For voxl: it needs the page to fill the display so a point on the video is a point on the page. Chromium does it over CDP; Camoufox (Firefox, no CDP) gets it by launching kiosk/fullscreen at the display's size and checking the viewport against the display before the stream is offered. The screenshot path stays only as the fallback when voxl can't run.
4. **The person drives, not just signs in.** `browserViewInput` takes input on any page while the person holds control (a "Take control" / "Hand back" toggle in the view), still as recorded steps with their HAR. While the person holds control no flow or agent step runs in that browser (`browserBusy` the other way round). A checkpoint or blocked page is something only the person may act on: the agent still stops there (rule 94), and the person can clear it from the chat.
5. **The server or VM setup is one command.** On a server with AdsPower: `log runtime pair` once, then the supervisor keeps the account hosts, voxl and `runtime connect` running together, and the chat sees that server's browsers the same way as local ones.
6. **Proof.** The replica-host bench (Verification) loads the view with a stream and with frames, sends a click and a typed line, and checks they reached the page; a manual run in ChatGPT, claude.ai and Hermes per release.

Built (20 Nov 2026, PR #207):

| Step | State |
| --- | --- |
| Frames from the screencast everywhere: `browserViewFrame` answers the newest screencast frame with a `seq`, waiting up to 250 ms for a newer one (`BrowserViewer.pull`) | built; ~20 fps through the tool-call path in the bench, the same as the direct stream |
| Streaming locally too (2): `browserViewLocal` is gone; locally `browserViewStream` gives a one-time loopback URL read through the relay at a fixed origin the CSP names (`relayTicket`) | built; ~20 fps in the bench |
| The view pulls back to back when it can't stream, and stops when hidden or done | built |
| The view listed to every client, both servers, with the ChatGPT keys from one helper (`appToolMeta`, `appResourceMeta`) | built for `browserView`; `report` still gated |
| Every colour from host variables, light and dark defaults, `window.openai.theme` | built; light and dark checked in the bench |
| Hermes: `::logbrowser{account}` drawn by log's Desktop plugin (`LogBrowser`), stream and input through the plugin's routes | built; checked in a replica transcript page, not yet in a live Hermes Desktop |
| Replica-host bench: `scripts/browserView/hostBench.py` (real Camoufox viewer, Edge headless, replica MCP Apps host and replica Hermes transcript, light and dark, a click reaching the page) | built; run by hand |
| voxl started by log (1), Camoufox kiosk (3), take control on any page (4), server setup (5) | not built |

### K. One view everywhere: log's MCP Apps drawn in Hermes Desktop (`::logapp`, #210)

Hermes Desktop doesn't draw MCP Apps (NousResearch/hermes-agent#61095). The host PR that would add it (NousResearch/hermes-agent#75828, MIT, by oriliz, head `2f62fb5a`) is parked on a maintainer decision. So far log drew its two views twice: the MCP App widget (`ui://log/browserView`, `ui://log/report`) for ChatGPT and Claude, and a hand-made Hermes copy (`::logbrowser` drawn by `LogBrowser`, `::logview` drawn as static markup). Two views per feature drift.

log takes only the card half of #75828 into its own Desktop plugin and leaves Hermes's core alone:

| Part of #75828 | Files | In log |
| --- | --- | --- |
| Sandboxed iframe card, `ui/*` postMessage bridge, CSP from `_meta.ui.csp`, per-card message rate limit | `mcp-app-card.tsx`, `store/mcp-app.ts`, `mcp-app-security.test.ts` | vendored (adapted) into `src/mcp/apps/report/view/appBridge.ts` + `hermesApp.tsx`, MIT notice and commit in `mcpAppsHostLicense.txt` |
| Keep tool `_meta.ui` at discovery, fetch `ui://` resources, route iframe tool calls through Hermes's approvals | `tools/mcp_tool.py`, `tools/approval.py`, `tui_gateway/server.py` | not taken (core); log's plugin routes reach log directly |
| Attach cards to tool results in the transcript, keep them across sessions | `lib/chat-messages.ts`, `thread/message-parts.tsx` | not taken (core); log uses a transcript directive, which Hermes keeps with the message |

Design:

1. **One directive.** `::logapp{tool="browserView" args='{"account":"..."}'}` (and `::logapp{tool="report" view="<id>"}` for a kept report) is claimed through the plugin SDK's `TRANSCRIPT_DIRECTIVE_AREA` in `hermesDesktop.tsx`. `::logbrowser{account}` stays as the documented shortcut and draws through the same card with `browserView`.
2. **The card** fetches the tool's `ui://log/...` resource HTML, injects a CSP built only from the resource's `_meta.ui.csp` (`default-src 'none'`, scripts inline only, `connect-src` only the listed origins), and loads it in an `allow-scripts`-only iframe. It answers `ui/initialize` with a `hostContext` carrying the theme and the MCP Apps style variables read from Hermes's own CSS variables, sends `tool-input` and `tool-result` after `initialized`, follows `size-changed`, turns `ui/message` into a composer send (two seconds apart per card, the staged `ui/update-model-context` text in front), opens only http(s) links, and sends `host-context-changed` whenever Hermes's theme class changes.
3. **The routes** are new in `hermesPlugin/dashboard/plugin_api.py`: `GET /apps/{tool}/resource`, `POST /apps/{tool}/result` (the tool run with the directive's arguments, or a kept report view) and `POST /apps/{tool}/call` (the iframe's `tools/call`). They talk to one warm Bun child, `scripts/hermes/appHost.ts`, which runs log's own `runToolCall`, so every gate is the one the MCP server applies. Allow-lists: a view opens only for a tool whose `_meta.ui.resourceUri` is a `ui://log/` resource, and a view may call only its own tools (same `resourceUri`) and read tools; any send, and `logCall`, is refused `logAppToolRefused` without running. `browserViewInput` still reaches the page only while it asks for sign-in (rule 94, `BrowserViewer.input`).
4. **The report** draws through the same card: `saveHermesView` also keeps the compiled view and its data, and the model's line is `::logapp{tool="report" view="<id>"}`. `::logview{id}` lines already in transcripts still draw as before.
5. **Parity first.** `hermesBrowser.tsx` and its `/browser/*` routes go once the replica-host bench shows `::logapp` at the MCP App host's numbers (about 20 fps, clicks under 100 ms), light and dark.

Scope: log's own views only. Other servers' MCP Apps in Hermes still need upstream (#61095); log doesn't patch Hermes or wait on it.

Done when (#210):

- [ ] `::logapp` renders browserView in Hermes Desktop on the bench at the MCP App host's fps and click latency (about 20 fps, under 100 ms)
- [ ] the report view renders in Hermes through `::logapp`, light and dark
- [ ] a view's tool call from inside the iframe is refused when the gate refuses it (test)
- [ ] MIT notice and source commit recorded; check:privacy, naming and agnostic pass
- [ ] checked live in the owner's Hermes Desktop after merge

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
| every card and the blocks card draw inside a replica ChatGPT host and a replica Claude host | a headless test bench that loads each `ui://` resource in an iframe behind each host's bridge, in CI |

## Order

1. Make the hosted server answer: list UI tools whatever the client declares (both servers; done for `browserView`), keep `log runtime connect` running under the same supervisor as the watchers, and generate the hosted tool list from the local catalog. Without this, every hosted connector is empty.
2. The live browser (J): voxl started and published by log, streaming locally too, Camoufox in kiosk, take control from the chat, and the server/VM setup.
3. Card views (B) and the ChatGPT metadata (D), through one card registration helper. Makes the existing view ready.
4. The blocks card (I), so `show_blocks` output reaches every host.
5. `log mcp connector` (A2) for a private ChatGPT tunnel; check the views render there and through `mcp.listeningkit.com` by hand.
6. Card rules in the kit (E).
7. The `/mcp/inbox` profile (C).
8. The `.mcpb` Desktop extension (H).
9. The host matrix and replica-host bench in CI (Verification).
10. The app-submission challenge route on `mcp.listeningkit.com`, when the app is listed.
11. `::logapp` in Hermes Desktop (K, #210): the vendored MCP Apps host card, so browserView and report draw in Hermes from the same widget ChatGPT and Claude get; then `hermesBrowser.tsx` goes.

## Open questions

- On a person's own desktop, voxl captures the whole display (DXGI on Windows), and a kiosk browser covers their screen. Streaming locally needs the browser on a display of its own (a virtual display, a second desktop session, or Xvfb on Linux), or the stream would show everything else on screen. Pick the per-OS answer before J.2.
- Which public tunnel for clients OpenAI's tunnel doesn't reach: `cloudflared` needs no account for a quick tunnel but changes its URL every run, so the connector would need re-adding. A named tunnel keeps the URL but needs a Cloudflare account. (ChatGPT itself goes through Secure MCP Tunnel, which keeps a stable tunnel id.)
- Whether Secure MCP Tunnel passes MCP Apps resources and `_meta` through unchanged; check by hand with the first card.
- Whether `ui.domain` can be the tunnel's origin for personal use, or only a fixed origin.
