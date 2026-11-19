# Research: one generative-UI view in every harness, local and hosted

20 November 2026. Feeds `docs/proposals/genuiEverywhere.md`. Sources: GitHub (`gh api` search, stars on that date), the live web through Parallel search, and a partner's private MCP server read with access granted to the owner (described by pattern only; no names, paths or code from it).

## Local and hosted are the same contract

The view does not care how a call arrived. In every working example the tool returns the same three parts (`content` for the model, `structuredContent`, `_meta` for the view) and points at the same `ui://` resource; only the transport and the auth in front of it change.

| Way in | Transport | Auth | Who uses it | Draws the view |
| --- | --- | --- | --- | --- |
| Local, started by the host | stdio | none (the host started the process) | Claude Code, Codex, Claude Desktop, Cursor, VS Code | Claude Desktop, VS Code, Goose: yes. Claude Code, Codex: text only |
| Local, reached from the cloud | Streamable HTTP on loopback, carried by OpenAI's Secure MCP Tunnel (`openai/tunnel-client`, outbound HTTPS only, nothing opened inbound) | the server's own OAuth or none, plus the tunnel id | ChatGPT (Plugins, Add custom MCP server, Connection: Tunnel), Codex, the Responses API | ChatGPT: yes |
| Local, reached by anyone else | Streamable HTTP behind a public tunnel (`cloudflared`, ngrok) | OAuth required, since the URL is public | Claude web, any remote-only client | yes |
| Hosted | Streamable HTTP at a fixed public origin, stateless (a fresh server per request) | API key or OAuth 2.1 | ChatGPT directory listing, teams | yes |

The partner's server is the hosted row: stateless Streamable HTTP on one origin, bearer API keys or OAuth 2.1, a new server per request, no stdio. Its only local MCP is a separate tools-only server for its developer machines. log is the other way round: local first (stdio and `logMcp --http`), with a hosted relay (`log runtime connect`) not yet deployed.

Secure MCP Tunnel changes the plan for ChatGPT. It supports private connections and testing, not public plugin submission, which still needs a stable public HTTPS origin. So: Secure MCP Tunnel for the owner's own ChatGPT, a public tunnel only for clients OpenAI's tunnel doesn't reach, the hosted origin for a directory listing.

## Who builds this, and what to take

| Project | Stars | What it is | Lesson for log |
| --- | --- | --- | --- |
| `mcp-use/mcp-use` | 10,997 | full-stack framework for MCP Apps in ChatGPT and Claude | one server definition serving every host; check its widget build before writing ours |
| `modelcontextprotocol/ext-apps` | 3,122 | the MCP Apps spec and SDK (`registerAppTool`, `registerAppResource`, the `ui/*` bridge) | log already uses it (1.7.5); keep the standard keys as the source of truth |
| `openai/openai-apps-sdk-examples` | 2,400 | OpenAI's example apps | the ChatGPT-only keys (`openai/*`) beside the standard ones |
| `alpic-ai/skybridge` | 2,198 | type-safe React framework for MCP Apps and ChatGPT Apps | typed view-models shared by server and widget |
| `modelcontextprotocol/mcpb` | 2,179 | Desktop Extensions (`.mcpb`), one-click local install | the Claude Desktop package in design H |
| `MCP-UI-Org/mcp-ui` | n/a | UI over MCP before MCP Apps | older shape; MCP Apps superseded it |
| `openai/tunnel-client` | n/a | Secure MCP Tunnel client (CLI and Go SDK) | the ChatGPT path for a local server |
| `aliaksei-loi/chatgpt-app-emulator` | 0 | local emulator of the ChatGPT host, no tunnel | the replica-host test bench idea, small enough to read |
| MCPJam inspector playground | n/a | renders MCP Apps widgets outside a real host | a second replica host for the bench |
| the partner's server | private | card tools with the view in `_meta`, one registration helper, replica-host bench | the patterns in the spec's prior-art table |

Guides read: OpenAI "Add UI to your MCP server" (keep every tool useful without UI; UI only for inspect, compare, edit, confirm, navigate), "Secure MCP Tunnel" and "Connecting custom MCP servers in ChatGPT" (Plugins, Add custom MCP server, choose Tunnel), the goose team's "5 tips for building MCP Apps", and Anthropic's `build-mcp-app` skill.

## Progress

| Step | State |
| --- | --- |
| Spec (`docs/proposals/genuiEverywhere.md`) | written, prior art added, blocks card (section I) added |
| Research (this file) | written |
| Card registration helper, view in `_meta`, ChatGPT keys (B, D) | not started |
| Blocks card `ui://log/blocks` (I) | not started |
| ChatGPT through Secure MCP Tunnel (A2) | not started |
| Card rules (E), profiles (C), `.mcpb` (H), replica-host bench | not started |
