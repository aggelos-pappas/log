---
title: "Browser gate"
---

# Browser gate

Before an account's browser loads anything, it goes through one gate: a headed launch, the account's proxy with its exit in the account's country, the account's one device, the locale of its home country, and a self-check in the page and a worker. The gate is `python/browser/proxyGate.py`, with the run's device and home prepared by `prepareRun`. Rules 11, 12, 15, 16, 17 and 92, with rule 84 for platforms that run without a proxy.

## Headed launch

### REQ-GATE-01: A Camoufox launch is never headless

Every Camoufox launch is headed with the cursor shown. Humanize is on, except for a launch whose session moves the pointer itself (`own_trajectory`) while Myuri is installed: Myuri already paces every move, key and wheel step, so Camoufox's humanize is turned off there rather than pacing twice. A launch that asks for headless is refused with `unguardedLaunch`. Rule 11. On 2026-11-20 the owner changed rule 11 for streamed sessions: a browser opened to be streamed (the live view in a chat or the console) stays headed, with the same fingerprint and rendering, but its window is hidden (`browserWindow.WindowKeeper` hides every top-level window the session's browser opens, so it has no window and no taskbar entry, and Brave also starts off-screen). The stream is its only view. `LOG_BROWSER_WINDOW=hidden|visible` picks it for streamed sessions (default hidden); an inspect session the owner watches directly stays visible.

Checked by: code and SubQ

### REQ-GATE-02: The caller can only pass the options the gate allows

A Camoufox launch takes only headless, humanize, geoip and proxy from its caller. Any other launch option is refused with `unguardedLaunch`, so a caller cannot change what the gate built.

Checked by: code and SubQ

### REQ-GATE-03: A launch that did not go through the gate is refused

Playwright's launch, persistent context and new context are guarded. A launch the gate did not build, or whose options differ from what it built, or that is not headed, is refused with `unguardedLaunch`.

Checked by: code and SubQ

## Proxy

### REQ-GATE-04: No browser opens without the account's proxy

A browser opens only when the run has a proxy file. Without one the gate refuses with `noProxy`, for every launch and for an attached browser alike. Rule 12.

Checked by: code and SubQ

### REQ-GATE-05: A Facebook account never runs direct

A proxy file that says the account runs direct is accepted only for a platform other than Facebook. For a Facebook account it is refused with `noProxy`. Rules 12 and 84.

Checked by: code and SubQ

### REQ-GATE-06: The exit IP must be in the account's country

The gate finds the proxy's exit IP and its country. When that country is not the account's, the gate refuses with `proxyCountryMismatch`. Rule 12.

Checked by: code and SubQ

### REQ-GATE-07: An exit with no known timezone is refused

When the exit IP has no known timezone, the gate refuses with `proxyCountryMismatch`, because the browser's timezone is set from it.

Checked by: code and SubQ

### REQ-GATE-08: A proxy too slow to reach Facebook is refused

The gate times Facebook files through the proxy. When the best time is over the limit (`LOG_PROXY_MAX_MS`, 2500 ms by default), it refuses with `proxyTooSlow`. Rule 33.

Checked by: code and SubQ

## Device

### REQ-GATE-09: The first launch makes the account's one device

When the run has no stored device, the gate makes one Windows device (screen, fingerprint config, preferences and a geolocation pinned near the home city, or near the exit when the city has no coordinates) and marks it created so it is saved to Twenty once. Rule 15.

Checked by: code and SubQ

### REQ-GATE-10: Every later launch replays the stored device

When the account has a stored device, every launch is built from it, and only the per-launch values (timezone, WebRTC IP, locale, humanize, cursor) are set fresh. A new device is never made over a stored one. Rule 15.

Checked by: code and SubQ

### REQ-GATE-11: An unreadable stored device is refused

A stored device that cannot be read, is not a version-1 Windows profile, has no pinned geolocation or stores per-launch keys is refused with `deviceProfileInvalid`, and no browser opens. Rule 15.

Checked by: code and SubQ

## Home locale

### REQ-GATE-12: The locale comes from the home country's table

The account's locale and Facebook locale come from `HOME_COUNTRIES` by its home country. A country not in the table is refused with `noHomeLocale`. Rule 16.

Checked by: code and SubQ

### REQ-GATE-13: The pinned locale reaches the launch

The run's languages are the locale and its base language. The launch sets the browser's locale, its language list and its requested locale from them, so navigator, Accept-Language and Intl agree. Rule 16.

Checked by: code and SubQ

## Self-check

### REQ-GATE-14: The timezone must be the exit IP's, in page and worker

Before any page loads, the gate reads the timezone in a page and in a worker. When either is not the exit IP's timezone (the same offsets all year count as the same), or the page and the worker disagree, it refuses with `browserTimezoneMismatch`. Rule 17.

Checked by: code and SubQ

### REQ-GATE-15: The language and Intl locale must be exactly the pinned locale

In the page and the worker, `navigator.language`, the Intl locale and the number locale must each be exactly the pinned locale, or the gate refuses with `browserLocaleMismatch`. Rules 17 and 92.

Checked by: code and SubQ

### REQ-GATE-16: The language list must start with the pinned languages

`navigator.languages` must start with the pinned languages, in order, in the page and the worker. Languages the browser adds after them are allowed. Anything else is refused with `browserLocaleMismatch`. Rule 92.

Checked by: code and SubQ

### REQ-GATE-17: The browser's exit IP is the one the gate checked, or in its country and timezone

The self-check reads the browser's own exit IP. When no IP echo answers, it refuses with `selfCheckFailed`. When the IP differs from the one the gate checked, it is refused with `browserExitIpMismatch`, except on an attached browser, where a residential proxy can change its IP between the gate's check and the browser opening: there a new exit is located and accepted only when it is in the account's country and on the same timezone. Rules 17 and 118.

Checked by: code and SubQ

### REQ-GATE-18: A failed self-check stops the browser before Facebook loads

When the self-check refuses, the browser is closed (Camoufox) or the error is raised before anything else loads (an attached browser, which its driver then stops). Rule 17.

Checked by: code and SubQ

### REQ-GATE-19: Brave opens through the same gate, in the account's own profile

A Brave session first passes `gate_attached` (the proxy, the exit's country and timezone, the Facebook speed limit). `chromium_launch` then builds the only launch options the guard accepts: headed, the account's proxy (none for a platform that runs direct), and `--lang` plus the context locale pinned to the home locale, with `navigator.languages` pinned to that one locale as Brave reduces it. The guarded persistent context gets the exit's timezone and geolocation and a session HAR, and runs the self-check before the caller gets it. The profile folder is the account's own under log's home (`browsers/brave/<account id>`). Brave is found at `LOG_BRAVE_PATH` or the standard install places; none there is refused with `braveNotFound`. Rules 11, 12, 17 and 44.

Checked by: code and SubQ

## Engine route

The engines (the direct-API clients, their warm hosts and their sockets) carry the same identity as the browser: the account's own proxy when it has one, its browser identity on every HTTP client, and no way out from this machine for a proxied account. Issue 47.

### REQ-GATE-20: Every engine spec carries the account's route

`engineRoute` (`src/platformKit/socialAccount`) builds the route of every engine call from the account: its proxy as a URL, or none for an account on a platform that runs direct. A Facebook account without a proxy is refused with `noProxy` and an unreadable proxy with `proxyMalformed`, before Python starts. `runPlatformEngine`, the X engine and the Facebook direct API all put it in the spec as `route`, and the engines refuse a spec without it with `routeMissing` (`accountRoute.arm`). Rules 12 and 80.

Checked by: code and SubQ

### REQ-GATE-21: Every client in an engine goes out through that route

Once armed, `python/identity/accountRoute.py` gives every curl_cffi request and socket (`Session.request`, `AsyncSession.request`, `ws_connect`) the account's proxy, and refuses with `routeBypass` a client that asks for another proxy or, for a direct account, any proxy. For a proxied account a Python socket that would resolve or dial anything but the proxy or this machine is refused, so a library's own connection (an MQTT socket, a websockets fallback) can't go out from this machine. A SOCKS5 proxy is used as `socks5h` so names resolve at the proxy. Media links are fetched through `accountRoute.download` with the platform's browser identity, and Discord's files through the account's curl_cffi session; endcord's own connections are refused.

Checked by: code and SubQ

### REQ-GATE-22: A direct platform's account with a proxy opens its browser through it

`checkRunnable` gives an account on a platform that runs direct its own proxy when it has one (with its home country, or `noHomeCountry`); only an account with no proxy opens direct.

Checked by: code and SubQ

### REQ-GATE-23: A new way out without the route is refused by a check

`check:identityGate` (`scripts/checks/checkIdentityGate.ts`) refuses a Python network client other than curl_cffi outside the listed non-platform services, a browser launch outside the gated launchers or the listed no-account tools, an engine that never arms the route, a TypeScript engine spawner without `engineRoute`, and Bun's `fetch` to a platform host.

Checked by: code and SubQ
