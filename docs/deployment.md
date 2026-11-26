# Running log on servers

This page describes one way to run log in production: [AdsPower](https://www.adspower.com/share/pD25Iu) plus log together on a browser server, with your laptop as the development machine. It explains how the pieces talk to each other, why the browser and log must share a machine, how to keep development and production from opening the same account twice, and how to reach log's MCP server remotely. Accounts live in the local account store on the browser server (log used to keep them in Twenty; it no longer does). Read it if you're moving log off a single machine.

## The one constraint: log runs beside AdsPower

AdsPower's Local API only listens on the machine it runs on. Its documented address is `http://local.adspower.net:50325/` or `http://localhost:50325/` (127.0.0.1 when that name doesn't resolve). The CDP websocket a started profile returns is a loopback address too (`ws://127.0.0.1:<port>/devtools/browser/...`). AdsPower's Local API docs say so, and third-party AdsPower SDKs note that "AdsPower returns unreachable loopback endpoints" in remote or Docker setups.

So **whatever drives the browsers (log's host, its Python sessions and its proxy gate) runs on the same machine as AdsPower.** A typical setup is AdsPower, a virtual display (Xvfb) and log on one server, talking to `http://127.0.0.1:50325`.

Don't expose port 50325 or the CDP ports to the internet:

- AdsPower binds them to loopback anyway;
- the API key would cross the network;
- anyone who reached a CDP port could drive a signed-in browser.

## Production

```text
                ┌───────────────────────── browser server (Ubuntu Desktop 22.04+ or Windows Server 2016+) ─────────────────────────┐
                │  Xvfb :99 (Linux) ─ the browsers render here, visible, watchable over VNC through the private network           │
                │  AdsPower  --headless=true --api-key=<key> --api-port=50325   (systemd)                                           │
                │     ▲ Local API http://127.0.0.1:50325 (Bearer key)        ▲ CDP ws://127.0.0.1:<port> per open profile             │
                │     │                                                      │                                                        │
                │  log: `log facebook host start --account <a>` per account, the Python sessions, proxyGate, rea; run folders + HARs here │
                └─────┼─────────────────┬────────────────────────────┬──────────────────────────────┬───────────────────────────────┘
                      │                 │ HTTP(S)/SOCKS5 outbound     │ HTTPS outbound               │ HTTPS outbound
                      ▼                 ▼                             ▼                              ▼
              local account store   Proxy gateway                 CaptchaKraken, 2Captcha        facebook.com, through the
              (on this server)      (e.g. 2Captcha residential)   solving APIs                   proxy only (all the browser's
                                    → a residential exit IP                                      traffic goes via the gateway)
                                      in the account's city
```

- **The browser server only makes outbound connections:** to the proxy gateway and the captcha APIs. Nothing needs to reach it from outside, except your own access over a private network (below).
- **Proxies:**
  - The browser's traffic goes from the browser server to the proxy gateway, and leaves from a residential IP in the account's city.
  - The proxy gate checks the exit IP from the same server, through the same proxy, before the profile starts.
  - 2Captcha's proxies sign in by username and password, so the server's own IP doesn't matter. An IP allow-list is optional.
- **AdsPower licence:** with an API key and headless mode, one AdsPower account can run Local API automation on several devices at once. In GUI mode it can only be signed in on one device. GUI and headless can't both run on the same machine (help.adspower.com/docs/api).
- **Profiles are AdsPower cloud records.** Profiles that `log adsPower sync` made on your development machine show up on the server under the same AdsPower account, so their ids, and the `adsPowerProfileId` links on the accounts, are the same in development and production.

## Development (your own machine)

- **AdsPower:** the GUI app, so the browsers open on your screen.
- **`.env.local`:** `ADSPOWER_HOST=http://local.adspower.net:50325` and `ADSPOWER_API_KEY`.
- **Accounts:** each machine has its own local account store. Tests use the in-memory store (`marketplaceFixture`).
- **Proxies:** the same gateway, so a development run exits from the account's city just like production.
- **AdsPower's MCP server:** added at local scope, so its key stays out of git.

## Keeping development and production apart

1. **One profile is open on one machine at a time.** A profile open in both places at once means two browsers, two IPs and two cookie jars for one account. Before opening, the driver asks AdsPower which device has the profile open (`/api/v1/browser/cloud-active`, at most 100 ids per call) and refuses if it's open elsewhere. AdsPower can't report this with "Multi Device mode" on, so leave that mode off.
2. **The port is read, not assumed.** AdsPower notes the port can change. In production, `ADSPOWER_HOST` comes from AdsPower's own `local_api` file (`~/.config/adspower_global/cwd_global/source/local_api` on Linux), or the port is pinned with `--api-port=50325`.
3. **Each machine has its own `.env.local`,** with the same names: `ADSPOWER_HOST`, `ADSPOWER_API_KEY`, `2CAPTCHA_*` and `CAPTCHA_KRAKEN_API_KEY`. Never committed.
4. **Reach the browser server over a private network** (Tailscale or an SSH tunnel) to run `log` commands, watch the Xvfb display over VNC, and read run folders. AdsPower's MCP server can work from development through an SSH tunnel to 127.0.0.1:50325.

## Reaching log's MCP server remotely

`logMcp` serves the same tools as over stdio, over MCP's Streamable HTTP, so a client on another machine can drive the browser server:

```
LOG_MCP_TOKEN=<a long random token> logMcp --http --host <private network ip> --port 7337
```

- **Endpoint:** `http://<host>:7337/mcp`. A client sends `Authorization: Bearer <token>`.
- **Loopback by default** (`127.0.0.1`, no token needed). On any other address it refuses to start without `LOG_MCP_TOKEN`, and it checks the Host header against DNS rebinding. With only the static token, bind it to the private network's address, never a public one, or keep it on loopback and reach it through an SSH tunnel.
- **One session per client,** with its progress lines streamed as they happen (logging notifications), as over stdio.
- **The same guards:** a live action needs `confirmLive: true`, and a join, fill or check runs in the account's open browser, opened with `log inspect start --account <a> --detach`.
- **What a client gets:** every tool declares one `outputSchema` and returns `structuredContent` (`exit`, `ok`, `stdout`, `stderr`, `log`, and `json` when the command printed JSON). Failures come back as `isError`. `tools.listChanged` is on, and saving a flow (a tool of its own) sends `notifications/tools/list_changed`.

## Connecting from Claude's connectors

The hosted connector signs in through the control service (`python/controlService`, see [Connect your agent](mcp.md)). `logMcp --http` itself takes only the static `LOG_MCP_TOKEN`, for Claude Code and Codex over the private network; its older OAuth sign-in went through Twenty and was removed with it.

## Sticky proxies and an always-open browser

- **How a proxy session works:** the account's proxy username carries country, state, city, `session-<id>` and `sessTime-120` (`src/proxyVendor/twoCaptcha/helpers/buildProxyUrl.ts`).
- **The 120-minute limit:** 2Captcha holds one sticky IP for at most 120 minutes. After that, the same username gets a new residential IP in the same city.
- **Why it matters:** a browser kept open all day sees its exit IP change every two hours. In one recorded run, a checkpoint appeared on the first request after the IP changed.
- **Two ways to handle it:**
  - **(a)** keep the browser open all day and let the IP change within the same city;
  - **(b)** open in windows of up to 120 minutes, closing with a logged reason before the session ends, and opening the next window on a fresh session.

## What's left to build

1. **Production settings:**
   - `ADSPOWER_HOST` read from the `local_api` file when it's there;
   - `log facebook doctor` checking the AdsPower Local API and that `ADSPOWER_API_KEY` is set;
   - a server setup guide: Xvfb, AdsPower headless with `--api-key`, Bun and Python for log, systemd units, and VNC on the private network only.
2. **The one-machine lock:** `cloud-active` before every open (point 1 under "Keeping development and production apart").
3. **The proxy gate and self-check over CDP,** run on the browser server: `proxyGate.py` attaches to the AdsPower profile with `connect_over_cdp`.
4. **HAR and step recording** on the attached browser context. The run folders live on the browser server; whether they're copied to a development machine for rea is up to you.
5. **One host per account** as a systemd service on the browser server, picking its driver from `socialAccounts.browserDriver`.
6. **The proxy session handling** you choose, (a) or (b) above.

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
