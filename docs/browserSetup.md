# Browser setup

Some commands work in the account's own browser rather than through a
platform's API. This page shows how to get each browser ready: [AdsPower](https://www.adspower.com/share/pD25Iu) (the
main one), Camoufox (the default) and Brave. You need it before running any command
that opens a browser, such as `log inspect` or `log facebook host`.

## What to know first

- Which commands run in which browser, and what each browser can do, is
  generated from the code: [the browser layer](reference.md#the-browser-layer)
  and [Browsers](browsers.md).
- A browser profile holds no proxy, password or 2FA key. Those stay in Twenty
  (or the local accounts file). The proxy goes on only to open the browser and
  comes off when it closes.
- Whichever browser runs:
  - the account must pass the account check first;
  - its proxy and cookies are copied into a private temporary folder for the
    run and deleted afterwards;
  - every launch is headed with the cursor shown, never headless. A browser
    opened to be streamed (the live view in a chat or the console) hides its
    window, so the stream is its only view; set `LOG_BROWSER_WINDOW=visible`
    to keep the window (the owner's change to rule 11, 2026-11-20).

## AdsPower

```bash
log adsPower status          # AdsPower's Local API answers
log adsPower profiles        # its profiles, and the Twenty account of each
log adsPower sync            # dry run: one profile per account on a platform with a browser path
log adsPower sync --apply    # make them, and link each in socialAccounts.adsPowerProfileId
```

More: [AdsPower](adsPower.md). Running across servers:
[Deployment](deployment.md).

## Camoufox

Camoufox runs the accounts without an AdsPower profile. The commands not yet
on the shared driver also launch it themselves, through
[facebook-camofox-client](https://github.com/PRACE1/facebook-camofox-client)
(`python/session/logWorker.py`) or their own sessions
(`python/session/publishSession.py`, `connectSession.py`,
`profileSession.py`).

```bash
git clone https://github.com/PRACE1/facebook-camofox-client ../facebook-camofox-client
pip install -e ../facebook-camofox-client
python -m camoufox fetch          # downloads the Camoufox browser
log facebook doctor
```

### When Camoufox's GitHub is down

On 19 Nov 2026 GitHub suspended daijro's and JWriter20's accounts with no notice, and `daijro/camoufox` went with them. Every release source the camoufox package knows (`daijro/camoufox`, `camoufox/camoufox`, `JWriter20/camoufox`) answers 404, so `camoufox fetch` can't download or update the browser. daijro is moving the project to a self-hosted GitLab.

Point log at the GitLab project once it publishes releases:

```bash
LOG_CAMOUFOX_SOURCE=https://<their gitlab host>/daijro/camoufox   # or "camoufoxSource" in ~/.logCli/settings.json
python python/browser/camoufoxSource.py fetch                       # any camoufox command: list all, set, version
```

`python/browser/camoufoxSource.py` reads the GitLab releases API (`/api/v4/projects/<path>/releases`) and hands camoufox each release in the shape of a GitHub release, so camoufox's own version rules, channels and installer run unchanged. Every launch goes through it (`visibleBrowser.launch_kwargs`). Nothing changes while it's unset.

The GeoIP database camoufox uses to place each proxy exit (`GeoIP AIO by daijro`) came from `daijro/geoip-all-in-one`, also gone. Switch to the other source with `python -m camoufox set --geoip "MaxMind GeoLite2"`. If an update still fails, the gate (`proxyGate.locate_ip`) keeps the database already on this machine instead of refusing the launch.

### Human input: Myuri

```bash
pip install "myuri==5.0.0"         # human mouse, typing and scroll (LGPL-3.0)
```

With [Myuri](https://github.com/JWriter20/Myuri) installed, every session that
moves the pointer itself plans its moves, typing and wheel steps with Myuri
(`python/human/myuriInput.py`): recorded human paths, typos it corrects,
fitted key timing, and notched mouse-wheel scrolls. The seed comes from the
account's device file, so each account keeps one steady "hand" across runs.
Passwords, codes and PINs are typed with no typos. Camoufox's own humanize is
turned off on those launches so nothing is paced twice. Without Myuri, log
falls back to its own curves and a fixed typing beat.

## Brave

Brave runs the accounts whose browser is set to `brave` (see
[Choosing a browser](browsers.md#choosing-a-browser)). log does not download
it: install Brave the usual way for the OS. log looks for it at
`LOG_BRAVE_PATH` first, then the standard places:

- Windows: `%PROGRAMFILES%`, `%PROGRAMFILES(X86)%` and `%LOCALAPPDATA%` under
  `BraveSoftware/Brave-Browser/Application/brave.exe`;
- macOS: `Brave Browser.app` in `/Applications` or `~/Applications`;
- Linux: `brave-browser`, `brave`, `/opt/brave.com/brave/brave`, the snap.

None there is refused with `braveNotFound`. Each account gets its own Brave
profile folder under log's home (`browsers/brave/<account id>`), which keeps
its cookies between opens.

```bash
log localAccount add --platform reddit --account <name> --browser brave   # one account
echo 'LOG_BROWSER_DRIVER=brave' >> ~/.logCli/.env                          # every account with no setting
```

## Adding another browser

A new browser is one more driver:

- its folder `src/browser/<name>` (capability row, driver, tests);
- its Python opener in `python/browser/browserDriver.py`;
- its column in [Browsers](browsers.md);
- its place on every surface: the CLI, the MCP, the local and hosted console
  ([the full list](browsers.md#adding-a-browser)).

`bun run check:browsers` and `bun run check:consoleParity` (pre-commit) refuse
one that is missing a piece.

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
