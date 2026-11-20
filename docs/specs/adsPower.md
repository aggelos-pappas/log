---
title: "AdsPower"
---

# AdsPower

AdsPower is the account's browser. Each account holds one AdsPower profile, linked in Twenty, which keeps its own fingerprint and cookies but never the proxy or the login. log opens it through the same gate and self-check as every browser and drives it with Playwright over CDP. A deactivated account, or one whose home is not in `LOG_ADSPOWER_HOMES`, gives its profile back. Rules 42, 44, 59, 78 and 84.

## One profile per account

### REQ-ADSPOWER-01: Each account is linked to one profile

`log adsPower sync --apply` gives each account on a browser platform one profile and saves its id in `socialAccounts.adsPowerProfileId`. An account already linked to a live profile keeps it, and one whose link is gone is relinked to the profile whose remark names its Twenty id, before a new one is made. Rule 42.

Checked by: code and SubQ

### REQ-ADSPOWER-02: A profile holds no proxy

A profile is created with no proxy, and with the account's name, the remark `log-cli twenty:<id>`, the `logCli` group and the language of its home country. No password, cookie or 2FA key is put on it. Rule 42.

Checked by: code and SubQ

### REQ-ADSPOWER-03: AdsPower is deprecated: an account opens on it only when it names it

`socialAccounts.browserDriver` picks the driver, and a name log does not drive is refused with `browserDriverUnknown`. When it is empty the account opens on the browser `LOG_BROWSER_DRIVER` names, else Camoufox; a linked `adsPowerProfileId` no longer picks AdsPower. An account (or `LOG_BROWSER_DRIVER`) that names `adsPower` still opens on it, and `driverNameOf` writes one `adsPowerDeprecated` line per process naming `log browser move <account> --to camoufox`. Rules 42 and 59.

### REQ-ADSPOWER-04: An account without a profile is refused

Opening the AdsPower browser for an account with no linked profile is refused with `adsPowerProfileMissing`, saying to run the sync. Rule 42.

Checked by: code and SubQ

## Opening and closing

### REQ-ADSPOWER-05: The gate runs before the proxy goes on

The proxy gate (`gate_attached`) runs before anything is changed on the profile. Only when it passes is the proxy set and the profile started. Rules 42 and 44.

Checked by: code and SubQ

### REQ-ADSPOWER-06: The proxy goes on only to open

The account's proxy is put on the profile right before it starts. A platform that runs without a proxy gets no proxy on its profile. Rules 42 and 84.

Checked by: code and SubQ

### REQ-ADSPOWER-07: The proxy comes off at close

When the session ends, or fails, the profile is stopped if it started and its proxy is cleared, so the profile never keeps a proxy between runs. Rule 42.

Checked by: code and SubQ

### REQ-ADSPOWER-08: The profile starts headed

The profile is started through the Local API with headless off, so its window can be watched. Rules 11 and 44.

Checked by: code and SubQ

### REQ-ADSPOWER-09: Playwright drives it over CDP

The started profile is attached with Playwright's `connect_over_cdp`, never Puppeteer, and its own first context is used. Rule 44.

Checked by: code and SubQ

### REQ-ADSPOWER-10: The self-check and the session HAR run on it

A session HAR is attached to the profile's context, and the self-check (`check_attached`) runs on that context before the session gets it. Rules 44 and 17.

Checked by: code and SubQ

### REQ-ADSPOWER-11: The profile keeps its own cookies

Twenty's saved session is carried into the profile only when the profile has no login of its own (for Facebook, no `c_user` cookie). Otherwise the profile's cookies are left as they are. Rule 44.

Checked by: code and SubQ

## Giving a profile back

### REQ-ADSPOWER-12: A deactivated account gives its profile back

When an account is DEACTIVATED, the sync deletes its profile from AdsPower and clears `adsPowerProfileId`. The account's Twenty row stays. Rule 78.

Checked by: code and SubQ

### REQ-ADSPOWER-13: Setting DEACTIVATED gives the profile back at once

`log facebook account status <a> DEACTIVATED` runs the sync straight away when the account has a profile, so its profile is released and an account waiting for one is given the freed slot. Rule 78.

Checked by: code and SubQ

### REQ-ADSPOWER-14: The sync releases before it creates

`log adsPower sync --apply` releases every profile that must be given back before it makes or links any other, so a freed slot can be used in the same run. Rule 78.

Checked by: code and SubQ

### REQ-ADSPOWER-15: Only the homes in LOG_ADSPOWER_HOMES hold a profile

When `LOG_ADSPOWER_HOMES` (or `--homes`) names home countries, an account whose home is not one of them gives its profile back the same way and gets none. An account on a platform that runs without a proxy needs no home. Rules 78 and 84.

Checked by: code and SubQ

### REQ-ADSPOWER-16: Moving an account off a browser keeps its session and is confirmed by the platform

`log browser move [<account>|--all] --to camoufox|brave` is a dry run unless `--apply` (with `--approvedBy`). `--all` takes every account on AdsPower or still linked to a profile. Per account, live: when AdsPower's Local API answers with the key, the profile is started (headless first, else headed), its cookies and the platform's localStorage are read over CDP (`python/browser/cdpState.py`, requests answered locally so nothing reaches the platform) and it is stopped; when the API is down or refuses the key (`adsPowerKeyMismatch`), the session already saved for the account carries instead and the result says so. Then `browserDriver` is set to the target, `adsPowerProfileId` is cleared and kept as the former profile (log.db `browserMove` ledger, and `formerAdsPowerProfileId` on a local account), and the platform's own session check runs. Only `signedIn` reports `moved`; anything else puts the driver, the profile link and the session back (`browserMoveNotSignedIn`). The AdsPower profile is never deleted by a move: `--release --apply` deletes moved accounts' former profiles once the owner says so. The fingerprint does not carry.

Checked by: code and SubQ
