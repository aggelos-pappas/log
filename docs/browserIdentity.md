# One browser identity

Every HTTP client log runs presents the same browser: Facebook (fbk), X (twikit), Instagram's web transport (instagrapi), Slack (gabriel), LinkedIn, Discord and Reddit (wreq-js). One module decides it: `python/identity/browserIdentity.py`, with its TypeScript twin `src/browser/identity/index.ts`. A vendored client never writes its own impersonate target or user agent, and `bun run check:oneIdentity` fails the commit if one does. A new platform from `log new platform` takes it the same way.

## Set it

| Setting | Values | Default |
|---|---|---|
| `LOG_BROWSER` | a pinned target: `chrome152`, `chrome150`, `firefox155`… | `chrome152` |
| `LOG_BROWSER_OS` | `windows`, `macos`, `linux` | `windows` |
| `LOG_HTTP_CLIENT` | `curl_cffi` (`httpcloak` once its adapter is built) | `curl_cffi` |

Each takes one value for every platform, or per platform with a default: `LOG_BROWSER=facebook=chrome136,default=chrome152`. Without the env vars, `~/.logCli/settings.json` is read:

```json
{ "identity": { "browser": { "default": "chrome152", "facebook": "chrome136" }, "os": "windows" } }
```

The identity gives each client the curl_cffi target, the matching user agent and `sec-ch-ua-platform`, the httpcloak preset name and the wreq-js profile. An unpinned target (`chrome`), a Safari or unknown target, or one the installed curl_cffi doesn't ship is refused; it's never swapped for a nearby one. Reddit's wreq-js 3.0.0 stops at `chrome_149`, so Reddit uses the newest Chrome profile at or below the identity until wreq-js is upgraded.

Facebook keeps each account's saved transport profile (fbk writes it once and replays it), so existing Facebook accounts stay on the `chrome136` they were made with. Only new profiles take the identity.

## Why Chrome 152, curl_cffi, and httpcloak later

See [httpClients](httpClients/README.md): a live test against the real Chrome on this machine, both libraries' docs, what Scraping Enthusiasts said, and a SubQ matrix. In short:
- For the same version, curl_cffi and httpcloak send byte-identical JA4 and peetprint.
- curl_cffi 0.17 is needed for Windows Chrome targets. 0.16 targets all say macOS.
- 152 is the newest Chrome both libraries ship.
- httpcloak has no WebSocket client and no Python asyncio, which Discord, Slack and Facebook need.
