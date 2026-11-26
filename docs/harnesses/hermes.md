# Hermes

Hermes (Nous Research) is an agent that runs on a server and answers through gateways such as Telegram and Slack, plus its CLI, TUI and desktop app.

- **Plugin:** log has a Hermes plugin, named `log`, in this repo under [`hermesPlugin/`](../../hermesPlugin/README.md).
  - **One plugin:** it used to be two, a portable `log` (tools, skills) and a native `logHooks` (hooks), because Hermes loads a folder with a `plugin.yaml` as native and ignores its `plugin.json`, only a portable package can declare an MCP server, and only a native plugin can register hooks (`hermes_cli/plugins_discovery.py`, `plugins_loader.py`; [Portable Agent Plugins](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)). A `config.yaml` server wins over a package's anyway, so log's MCP server now comes from `config.yaml` and the plugin is one native folder, [`hermesPlugin/`](../../hermesPlugin/plugin.yaml).
  - **Install:** log itself first, with `logMcp` on the PATH. `log launch --setup` (pick Hermes) copies the plugin into `<Hermes home>/plugins/log` with the log install's path and removes an old `plugins/logHooks` that log wrote; then `hermes plugins enable log` and `hermes mcp add log --command logMcp --env "LOG_ACCOUNTS=${LOG_ACCOUNTS}"`. The Hermes home is `HERMES_HOME`, else `~/.hermes`, else `%LOCALAPPDATA%\\hermes` on Windows (`LOG_HERMES_DIR` overrides all three).
  - **After setup or update:** `log setup` and `log update` say two things when they copy the plugin. The first time the Desktop half lands, switch log on in Hermes **Settings > Plugins** (a package's Desktop half ships switched off). When `dashboard/plugin_api.py` changed, restart the Hermes gateway (`hermes gateway restart`; when the gateway runs by hand, stop it and start it again), because the gateway mounts the plugin's routes once at start and restarting the app alone keeps the old ones. They also name a running gateway that started before the routes on disk changed.
  - **What it adds:** every log play as a `log:<play>` skill (generated from `docs/useCases/` by `bun run skills:build`), log's GenUI tools and recipes, a read-only log tab in the dashboard and the Desktop half that draws blocks and views.
  - **The router hook:** `pre_llm_call` runs `scripts/hooks/event.ts UserPromptSubmit --host hermes` with the message (and `SessionStart` first on a session's first turn) and returns `{ "context": … }`, cut to 7,500 characters per event. It finds log by itself: `LOG_ROOT`, then the `log_root` that `log launch --setup` writes, then Bun's global `node_modules/@listeningkit/log` (`BUN_INSTALL` or `~/.bun`), then npm's global folders. When `config.yaml` has no `mcp_servers.log`, it adds a line saying so with the command that fixes it.
  - **What it doesn't do yet:** it has no hosted option; the hook runs only where log is installed on the same machine as Hermes.
- **Connects:**
  - **Config:** `mcp_servers` in `~/.hermes/config.yaml`. A remote server takes `url` and `auth: oauth`; Hermes handles registration, PKCE and refresh, and keeps tokens in `~/.hermes/mcp-tokens/<server>.json`. A local server takes `command`. ([Hermes: MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), [MCP config reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference))
  - **Tool names:** Hermes names tools `mcp_<server>_<tool>`, so log's tools appear as `mcp_log_report` and so on.
  - **Reloading:** after a config change, run `/reload-mcp`.
- **Draws MCP Apps:** Hermes's MCP page doesn't mention MCP Apps or `ui://` resources, and Hermes isn't in the [support matrix](https://modelcontextprotocol.io/extensions/client-matrix). Treat it as text.
  - **Views:** in Hermes Desktop, `report`'s answer names a `::logview` line that log's Desktop plugin draws as the view; Telegram and the CLI get it as text.
  - **Show me the browser:** for an account that is signed in already, `sessionsSignIn { account, open: true }` opens its browser through the same gates, hidden (no window or taskbar entry), and `browserView` streams it into the chat.
  - **Sign-in:** in Hermes Desktop, `sessionsSignIn` opens the account's browser and `browserView`'s answer names a `::logbrowser{account="..."}` line; the agent writes it on its own line and the Desktop plugin draws the live browser there, on the owner's machine too, so the owner signs in in the chat. Telegram and the CLI sign in in the log console; a streamed browser has no window of its own unless `LOG_BROWSER_WINDOW=visible`.
- **Guidance:**
  - **Prompt router:** with the plugin enabled, `pre_llm_call` names the play before each model call. Without it the model routes each request with `getGuide({ ask: "<the owner's words>" })` (as `mcp_log_getGuide`).
  - **Server instructions:** Hermes's MCP page doesn't mention them.
  - **Resources and prompts:** Hermes does wrap a server's resources and prompts as tools (`list_resources`, `read_resource`, `list_prompts`, `get_prompt`), so log's `log://agents` resource can be read.
  - **What's left:** guidance comes through the tool descriptions and `getGuide`.
  - **Skills:** the plugin's skills are named `log:<skill>` by Hermes. Whether Hermes loads them as Claude Code does isn't checked by running it.
- **Approvals:** Hermes routes MCP form elicitation to its approval prompts, which show as buttons on Telegram and Slack. URL elicitation is declined as unsupported.

## Related

- Up: [Every agent app log works with](README.md)
- [Connect your agent](../mcp.md) · [Install](../install.md) · [Use cases](../useCases/README.md)
