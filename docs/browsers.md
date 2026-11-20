# Browsers

log can drive more than one browser, and every one of them works the same way,
so a session never needs to know which browser it is in. Each account picks
its browser with one setting (`browserDriver`: `camoufox`, `adsPower` or
`brave`; empty means Camoufox). Read this to understand how a browser is
opened and held to the same checks, to pick one, or to add a new one.

## Choosing a browser

Camoufox is the default: an account with nothing set opens on it. Any other
browser is one setting, read in this order by `driverNameOf`
(`src/browser/driver/client.ts`), the one place every path asks:

1. **Per account:** `browserDriver` on the account. Set it with
   `log localAccount add --platform <p> --account <a> --browser brave`, the
   `localAccountAdd` MCP tool, or the browser picker on the console's
   Connections page (table and cards). In Twenty it is
   `socialAccounts.browserDriver`.
2. **A linked AdsPower profile:** an account with
   `socialAccounts.adsPowerProfileId` and no `browserDriver` opens on AdsPower.
3. **For the whole machine:** `LOG_BROWSER_DRIVER=brave` (or `adsPower`) in
   `~/.logCli/.env` moves every account that has no setting of its own. The
   console marks it as the default.
4. **Otherwise Camoufox.**

A name log does not drive, in the account or in `LOG_BROWSER_DRIVER`, is
refused with `browserDriverUnknown`; it never falls back silently.

**When to pick Brave.** Brave is Chromium with its own fingerprint defence:
it farbles canvas, WebGL, audio and fonts with a fresh seed every launch, and
reports the real Chrome user agent of the machine. Scraping developers report
it does well against Akamai and DataDome, where a pinned fingerprint that
drifts from a real one gets flagged. Pick it for a site that keeps
challenging Camoufox. Keep Camoufox where the account must look like the same
device every day (rule 15): Brave's farbling is per launch by design, so its
`devicePinned` row is **not built** below. It needs Brave installed
([Browser setup](browserSetup.md#brave)); no browser download is done by log.

## One Playwright layer for every browser

```text
TS  log facebook host / log inspect / log flow / log facebook warmup
      └─ openInspectSession(account)  ── browser: browserFor(account)  (src/browser/driver)
Py  inspectSession.py
      └─ browserDriver.open_browser(config)                (python/browser/browserDriver.py)
           camoufox: AsyncCamoufox(launch_kwargs) → new_context  (the gate's launch and context guards)
           adsPower: gate_attached → profile proxy → Local API start → connect_over_cdp
                     → the profile's context → SessionHar → check_attached
           brave:    gate_attached → chromium_launch (headed, proxy, locale)
                     → launch_persistent_context(<log home>/browsers/brave/<account id>)
                     → the gate's guard: timezone, geolocation, HAR, self-check
      └─ the same Playwright context and page for everything after:
           HumanMouse, scrollMotion, Recorder (per-step HAR), the flows, saveState
```

- All the Playwright work is async (`playwright.async_api`).
- [AdsPower](https://www.adspower.com/share/pD25Iu) and Brave are Chromium and Camoufox is Firefox, but all
  three are driven through the same Playwright API.
- Neither uses Puppeteer. `ws.puppeteer` is only the name AdsPower's Local API
  gives the CDP websocket it returns, which Playwright's `connect_over_cdp`
  takes.

In TypeScript, each browser is a folder under `src/browser/` with the same
parts:

- **`src/browser/driver`:** the session machine (XState v5) and the list of
  capabilities every browser fills;
- **`src/browser/<name>/types.ts`:** its row of the parity table below;
- **`src/browser/<name>/client.ts`:** its `BrowserDriver`;
- **`src/browser/<name>/<name>.test.ts`:** its tests.

## How AdsPower is used

These practices come from an earlier production setup that ran on AdsPower,
and are kept here:

| Practice | In log |
| --- | --- |
| A Local API client: start, stop and list profiles, then Playwright over CDP | `src/browser/adsPower/client.ts` (v2 endpoints) and `python/browser/adsPowerBrowser.py` |
| One AdsPower window per account, held open | `log facebook host` opens the account's profile once a day and keeps it open; every action is a tab |
| Never close the AdsPower context | Sessions close only their own tabs. The profile is stopped through the Local API at the end, never by `context.close()` |
| No stealth scripts | Nothing is injected into any page |
| No cookie injection: the profile keeps its own cookies | The profile keeps its own. Twenty's session is carried in once, only into a profile that has no Facebook login yet |
| The login check still applies | The connect steps, the page check and `signIn` run the same in either browser |
| Keep a fallback | Camoufox stays: an account without `browserDriver` runs on it |

## Moving an account to another browser

AdsPower is deprecated: an account opens on it only when its `browserDriver` names `adsPower` (a linked `adsPowerProfileId` no longer picks it), and then log writes an `adsPowerDeprecated` line naming the move below. Camoufox is the default. The same procedure moves any account from one browser to another.

1. **Dry run.** `log browser move --all --to camoufox` (MCP `browserMove`; the console's **Move to…** on the account's browser entry shows the same plan first). It lists each account, its browser now, its AdsPower profile, the target, whether AdsPower's Local API answers (`adsPowerUnavailable`, `adsPowerKeyMismatch` when the app refuses the saved key, `adsPowerPlanLapsed` when the plan has lapsed), and what will happen. Nothing changes.
2. **Move one.** `log browser move <account> --to camoufox --apply --approvedBy "<who>"` (MCP `browserMoveLive` with `confirmLive`). When AdsPower answers, the profile is started (headless first, else headed), its cookies and the platform's localStorage are read over CDP with every request answered locally (`python/browser/cdpState.py`), and it is stopped. When it doesn't, the session already saved for the account (what `saveState` keeps in Twenty) carries instead, and the result says so. Then `browserDriver` is set to the target, `adsPowerProfileId` is cleared and kept as the former profile (log.db's `browserMove` ledger, plus `formerAdsPowerProfileId` on a local account), and the platform's own session check runs.
3. **Check.** Only the platform saying signed in reports `moved`. Anything else rolls back the driver, the profile link and the session (`browserMoveNotSignedIn`) and says why. Facebook has no read-only check, so it is skipped: it opens on Camoufox anyway now and is checked in its browser.
4. **Move all.** The same with `--all`: one account after another, accounts to move first in platform order.
5. **Release.** `log browser move --release` lists the moved accounts' former AdsPower profiles; `--release --apply` deletes them, only once the owner says so. A move never deletes a profile.

What carries: the cookies and the platform's localStorage (the signed-in session). The proxy and the locale are account fields and stay with the account, behind the usual gates. What doesn't: AdsPower's fingerprint (its user agent, canvas, WebGL, fonts) stays in the AdsPower profile; the new browser shows its own.

## Parity table

Every browser must fill the same capabilities. `bun run check:browsers`
(pre-commit and pre-push) refuses a browser that is missing its folder, row,
driver, tests, Python opener or column below. A capability may be marked
**not built**: that is listed on every commit, not refused.

The table is generated from `src/browser/<name>/types.ts`; edit those, not the
table.

<!-- browsers:start · generated by `bun run browsers:docs` from src/browser/<name>/types.ts. Not edited by hand. -->

| Capability | What it means | camoufox | adsPower (deprecated) | brave |
| --- | --- | --- | --- | --- |
| `headedWindow` | A visible window you can watch, never headless (rule 11) | built: visibleBrowser.launch_kwargs: headless False, humanize, showcursor (rule 11) | built: Local API start with headless "0" (python/browser/adsPowerBrowser.py); on a server the window renders on Xvfb | built: launch_persistent_context with headless False; proxyGate refuses any other launch |
| `proxyGate` | The account's proxy, exit IP in its country and speed checked before the browser starts (rule 12) | built: proxyGate.apply() builds the only launch options; the launch guard refuses any other | built: proxyGate.gate_attached() before the profile starts; the proxy is put on the profile only then | built: proxyGate.chromium_launch(): gate_attached() checks the exit, then builds the only launch options (the account's proxy) |
| `selfCheck` | Timezone, language, Intl and exit IP agree in a page and a worker before Facebook loads (rule 17) | built: proxyGate's new_context guard runs _self_check before the caller gets the context | built: proxyGate.check_attached() on the CDP context, the same verdict as Camoufox | built: the gate's launch_persistent_context guard runs _self_check before the caller gets the context |
| `sessionHar` | The raw session HAR of every request (rules 19, 22) | built: Playwright's record_har_path, forced on every context by the gate | built: harRecorder.SessionHar from the context events, written as session.har at close | built: Playwright's record_har_path, forced on the persistent context by the gate |
| `stepHar` | Each inspect or flow step's own HAR, from the context's events (rule 29) | built: harRecorder.Recorder, the inspect session's per-step HAR | built: harRecorder.Recorder, the inspect session's per-step HAR | built: harRecorder.Recorder, the inspect session's per-step HAR |
| `humanMouse` | Every cursor move is HumanMouse's measured trajectory, nothing injected (rule 32) | built: HumanMouse on the Playwright page; Camoufox's humanize per-hop curve capped at 20 ms | built: HumanMouse on the Playwright page (no cursor is drawn: nothing is injected) | built: HumanMouse on the Playwright page (no cursor is drawn: nothing is injected) |
| `scrollMotion` | Every scroll is scrollMotion's wheel trajectory | built: scrollMotion wheel trajectories on the Playwright page | built: scrollMotion wheel trajectories on the Playwright page | built: scrollMotion wheel trajectories on the Playwright page |
| `devicePinned` | One fixed device per account, the same every open (rule 15) | built: deviceProfile.py: one Windows identity per account in socialAccounts.deviceProfile (rule 15) | built: the account's one AdsPower profile (fingerprint kept by AdsPower), linked in socialAccounts.adsPowerProfileId | **not built**: Brave farbles canvas, WebGL, audio and fonts with a new seed every launch by design. Pinned: the account's own profile folder under log's home, the real Windows/GPU user agent, timezone and locale; deviceProfile.py's fixed identity is Camoufox's only |
| `localePinned` | navigator, Accept-Language and Intl in the home country's locale (rule 16) | built: HOME_COUNTRIES locale in the launch; the self-check checks it (rule 16) | built: the profile's language from HOME_COUNTRIES; the self-check checks it | built: HOME_COUNTRIES locale through --lang and the context locale; navigator.languages is that one locale, as Brave reduces it; the self-check checks it |
| `sessionCarried` | The account's signed-in session carries over from one open to the next | built: Twenty's cookies and localStorage as the context's storage_state each open | built: the profile keeps its own cookies; Twenty's session is carried in once when it has none | built: the account's own Brave profile folder keeps its cookies; Twenty's session is carried in once when it has none |
| `sessionSaved` | The session is saved back to Twenty (saveState) | built: saveState writes the context storage state, saved to Twenty | built: saveState writes the context storage state, saved to Twenty | built: saveState writes the context storage state, saved to Twenty |
| `inspectSession` | log inspect, the flows, the warm-up and log facebook host run in it (python/session/inspectSession.py) | built: python/browser/browserDriver.py open_camoufox | built: python/browser/browserDriver.py open_ads_power | built: python/browser/browserDriver.py open_brave |
| `syncSessions` | publishSession, connectSession and profileSession (the sync sessions) run in it | built: publishSession, connectSession and profileSession launch it (sync API) | **not built**: publishSession, connectSession and profileSession still launch Camoufox (sync API) | **not built**: publishSession, connectSession and profileSession still launch Camoufox (sync API) |
| `oneMachineAtATime` | It refuses to open where another machine already has the account open | n/a: Camoufox runs only where log-cli runs; there is no shared profile to open twice | **not built**: cloud-active before open (docs/deployment.md) | n/a: the profile folder lives only where log-cli runs; there is no shared profile to open twice |
| `liveView` | The browser streams live into the console and chat views and takes clicks and typing (browserView) | built: browserViewer.PageCast: Playwright's page screencast over Juggler, ~22 fps measured | built: browserViewer.PageCast: the same page screencast over the CDP-attached page (connect_over_cdp), proven on a CDP-attached Brave, not on a live AdsPower profile | built: browserViewer.PageCast: Playwright's page screencast over Chromium CDP (Page.startScreencast) |

<!-- browsers:end -->

The two capabilities still to build are tracked: `syncSessions` in [#43](https://github.com/matthewdonsemail-lab/log/issues/43), `oneMachineAtATime` in [#44](https://github.com/matthewdonsemail-lab/log/issues/44).

## Adding a browser

1. Add its name to `BROWSER_DRIVERS` (`src/browser/driver/types.ts`), and its
   brand (`<name>Brand`: label and logo, a file in `site/apps/web/public/logos`)
   to its `types.ts`, then to `BROWSER_BRANDS` (`src/browser/driver/brands.ts`).
2. Write `src/browser/<name>/`: `types.ts` with its capabilities row (every
   capability, `liveView` included: built, notBuilt or notApplicable, and
   how), `client.ts` with its driver, `index.ts`, and `<name>.test.ts`.
3. Add its opener to `python/browser/browserDriver.py` (`BROWSERS` and
   `OPENERS`). It must return a gated, self-checked Playwright context and
   record a session HAR. A new error goes in the error catalog
   (`src/errors/catalog/types.ts`, then `bun run errors:export`).
4. Check it reaches every surface. These read `BROWSER_DRIVERS`, so a new name
   shows up on its own; the checks below fail when one does not:
   - **CLI:** `log localAccount add --browser <name>` and `log localAccount
     list` (`src/cli/localAccount`);
   - **MCP:** the `localAccountAdd` tool's `browser` enum, built from the same
     flag;
   - **local console:** the Connections page's Browsers list (each with its
     logo), the browser picker (table and
     cards, `ConnectionList.tsx`), its choices from the view's `browsers`
     (`browserChoices` in `src/console/connections`), the pick saved through
     `POST /api/console/connections/browser` (`accountBrowser`), and the
     browser badge in `BrowserCheckDialog.tsx`; the clack Connections screen
     prints each account's browser;
   - **hosted console:** `POST /teams/<team>/console/accountBrowser`
     (`python/controlService/consoleRoutes.py`, `CONSOLE_TOOLS`);
   - **the live view:** its `liveView` row, then a bench run (step 5).
5. Run `bun run browsers:docs`, `bun run check:browsers` and
   `bun run check:consoleParity`, run the bench on it
   (`BENCH_BROWSER=<name> scripts/browserView/hostBench.py <shots dir>`), and
   commit.

Setting a browser up: [Browser setup](browserSetup.md). The rules behind this
are in AGENTS.md.

## The live browser viewer

An account's browser can be watched and, while its page asks for sign-in,
used by a person: in the local console and inline in an MCP Apps host
(ChatGPT, Claude, Cursor). The frame path and the input path meet only in the
viewer.

**The viewer.** `python/browser/browserViewer.py` starts a private HTTP server
on `127.0.0.1:0` inside the account's inspect session and writes its port,
bearer token, generation and pid to `browserViewer.json` in the run folder
(`BrowserViewer.start`); `Inspector.serve` in `python/session/inspectSession.py`
starts it with the session and removes it when the session ends. `GET /state`
answers the classified page state (`classify` from `login/autoLogin.py`), a
revision hashed from the URL, the page text, the step index, the input count
and the HAR count, whether the page is blocked (a checkpoint, a disabled
account, a captcha, a video selfie, automated behaviour) and whether input is
allowed (only the sign-in states). `GET /frame?after=<seq>` answers the newest
screencast frame with the generation, revision, `X-Log-Frame-Seq` and
`X-Log-Frame-Source` (`cast`) in its headers: it keeps the screencast running
while frames are pulled (`BrowserViewer.pull`, stopped five seconds after the
last pull), and when the newest frame is not newer than `after` it waits up to
250 ms for one, so a view that asks again as soon as it has an answer gets each
frame once. Without a screencast it answers one
`page.screenshot(type="jpeg", quality=65, scale="css")` (`X-Log-Frame-Source:
screenshot`, seq 0). `POST /ticket` mints a one-time ticket (60 s by default,
900 s at most) and `GET /stream?ticket=<ticket>` opens the stream once with no
token, answering any origin (`Access-Control-Allow-Origin: *`, and a preflight
that allows a private network read), which is how a view inside a chat reads
it. `GET /stream` answers
`multipart/x-mixed-replace; boundary=logFrame`: one JPEG part per frame of
Playwright's page screencast (`PageCast` in the same file), started at the
viewport's own size so a point on the picture is a point on the page. The first
part is a screenshot so a still page has a picture at once, and the last frame
is sent again every 2 seconds while nothing changes. Every part carries the
generation and the frame's width and height. One screencast serves every reader
of a viewer; it starts with the first and stops when the last disconnects, and a
slow reader gets only the newest frame (older ones are dropped, never queued).
When the session's page changes the stream ends with the closing boundary, and a
screencast that fails to start answers `browserStreamUnavailable`, so the reader
falls back to `/frame`. `src/browser/viewer` is the one TypeScript client both
surfaces use: `viewerState`, `viewerFrame` and `viewerInput` find the account's
inspect session, read its descriptor, check the generation, and turn the
answers into a view with a phase (`browserMissing`, `viewerUnavailable`,
`signInRequired`, `needsAttention`, `busy`, `ready`).

**Input, both paths.** Clicks, text, keys and scrolls never travel on the frame
channel. They go to `POST /input`, which refuses them unless the generation and
the revision still match (`browserStateChanged`), the page still reports a
sign-in state (`browserInputStopped`) and no other step holds the browser
(`browserBusy`), then replays them with Playwright's `page.mouse`,
`page.keyboard` and `mouse.wheel` inside `owner.step("viewerInput", ...)`, so
every viewer action is a recorded step with its HAR and reading. The answer is
the page read again once the step has let go of the browser. A checkpoint or
other blocked page is shown but takes no input: it stays a stop (rule 94).

**Picture, page screencast first, on every browser.** On the machine the
browser runs on, the page screencast is the stream: the same `PageCast` code
serves Camoufox (Juggler's screencast), Brave (Chromium's
`Page.startScreencast` over CDP) and a CDP-attached Chromium such as an
AdsPower profile. Measured on Camoufox headless, about 22 frames a
second (a frame every ~45 ms), click to screen about 33 ms at the median and
46 ms at p95 on loopback, ~13 KB a frame. Neither JPEG quality nor frame size
moves that rate, and patching Firefox's capture limits in the binary did not
raise it either, so ~22 fps is Camoufox's ceiling for now. Through the console
at a full 1100x700 viewport it measured 21 parts a second.

Per browser, measured with the replica host bench on one Windows machine (two
runs each, 1100x700, loopback; click to frame is a click on the view until the
view's own canvas shows the page's change):

| Browser | Opened by | Streamed (fps) | Pulled (fps) | Click to frame, p50 |
| --- | --- | --- | --- | --- |
| Camoufox, headless | bare `AsyncCamoufox` | 17-20 | 18-20 (the Hermes card fell to screenshots, ~2, in one run) | 73-133 ms |
| Camoufox, headed | bare `AsyncCamoufox` | 17-19 | 18 (Hermes card ~2, one run) | 74-83 ms |
| Brave, headed | the `brave` driver: gate, self-check, own profile | 93-100 | 34-48 | 52-93 ms |
| Brave, attached over CDP | `connect_over_cdp`, AdsPower's path | 96-99 | 34-40 | 83-95 ms |

Chromium's screencast sends a frame per painted frame, so Brave streams at the
display rate; Camoufox stays at Juggler's ~45 ms cadence. AdsPower itself was
not measured: its Local API was not running on the bench machine; the
CDP-attached Brave runs the same code path an AdsPower profile does.

**voxl, optional.** When `LOG_VOXL_URL` names a running
[voxl](https://github.com/tembo/voxl) server (`--read-only`) on the account's
display, `python/browser/streamSurface.py` reports a stream in `/state`:
`{kind: "voxl", url, page, window}`. It first puts the browser window into
fullscreen over CDP (`Browser.getWindowForTarget`, `Browser.setWindowBounds`
with `windowState: "fullscreen"`, then a re-read that refuses the stream if the
state did not take; `streamSurface.composite`, cached for 3 seconds), because a
fullscreen window is the one arrangement where the page viewport is the whole
display, which makes a point on the video a point in the page. `streamOf` in
`src/browser/viewer/client.ts` then re-checks the URL (https anywhere, http
only on loopback), that every number is a non-negative integer and that the
window still matches the viewport. When any of that does not hold, the view has
no stream and the JPEG path is used unchanged. Camoufox is Firefox and has no
CDP, so it keeps the JPEG path. voxl runs `--read-only`, so its own input paths
are never used; Playwright still supplies the input. voxl captures X11 or Xvfb
on Linux, DXGI on Windows (the logged-in session, not a service) and
ScreenCaptureKit on macOS (Screen Recording permission).

**Fallback, frames pulled.** When the stream can't be read (a hosted chat, a
host whose frame can't reach loopback, a screencast that ends three times
without a frame), the console's `/api/console/browser/frame` and the MCP App's
`browserViewFrame` read `GET /frame` back to back, each call carrying the seq of
the frame the view has. Measured in the replica host bench on Camoufox headless
through the real viewer: about 20 frames a second over the tool-call path, the
same as the direct stream, because each answer is the screencast's newest frame
rather than a fresh screenshot. Only when there is no screencast at all does it
drop to screenshots (about 2 a second).

**The replica host bench.** `scripts/browserView/hostBench.py <screenshot dir>`
(run with `LOG_PYTHON`; it needs `uv` for the plugin routes and Microsoft Edge)
opens a page behind the real viewer in the browser `BENCH_BROWSER` names
(`camoufox`, the default, headless; `camoufoxHeaded`; `brave`, opened through
the `brave` driver with a direct scratch gate and its self-check; `braveCdp`,
Brave attached over CDP the way an AdsPower profile is), then loads the built
MCP App inside a replica MCP Apps host (a sandboxed iframe with the host's CSP
and bridge) and the `::logapp` card (log's vendored Hermes host card, through
the real plugin routes) inside a replica Hermes transcript, each in light and
dark. It reports frames a second, which source drew them, the median of five
clicks on the picture reaching the page and reaching the view's own canvas
(click to frame), the address bar text, and the report view through `::logapp`
following a theme flip, and saves `light.png`, `dark.png`,
`logapp-browserView-light.png`, `logapp-browserView-dark.png`,
`logapp-report-light.png` and `logapp-report-dark.png`, prefixed with the
browser's name for any but the default.

**In the local console.** `log console --web` serves `/api/console/browser`
(the view), `/api/console/browser/frame` and `POST /api/console/browser/input`
from `consoleBrowserAnswer` (`src/console/web/helpers/browser.ts`), behind the
same loopback, origin and fetch-site guard as every console route. On
Connections each local account has a live browser button that opens
`BrowserCheckDialog.tsx`. While the browser runs on this machine and has no voxl
stream, the dialog reads `GET /api/console/browserCheck/stream?accountId=&generation=`
(`consoleBrowserAnswer`, which needs the console's own `x-log-console` header
and pipes the viewer's `/stream` through unchanged, never journaled) with
`fetch()`, splits the parts (`partReader` in `browserCheckData.ts`) and draws
the newest JPEG into the `<canvas>`; a frame that arrives while one is drawing
replaces the waiting one. If the stream can't start or ends, `castBrowser` tries
again up to three times and meanwhile `browserCheckMachine.ts` polls the frame
every 500 ms as before. Clicks map onto the page by the view's width and
height, and input is sent only while the view can take it. With a voxl stream the console embeds voxl's own
client in an iframe under a transparent overlay that maps clicks by fraction.
Errors are toasts. The console attaches to a browser that is already open (by
`log inspect start` or a flow); opening, closing, provisioning a profile and
verifying a session from the console are not ported yet.

**In an MCP Apps host and in Hermes.** See [the live browser in the chat](mcp.md#the-live-browser-in-the-chat).
