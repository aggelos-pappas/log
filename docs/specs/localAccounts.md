---
title: "Local accounts"
---

# Local accounts

Accounts live in a local file, on every platform, so log runs everything locally; log no longer uses Twenty. `log localAccount add|list|login` (MCP `localAccountAdd`, `localAccountList`; `login` is terminal-only) fills and reads the file. Listings, groups and conversations (the deferred Marketplace agency objects) were kept only in Twenty and are retired until rebuilt on log.db (#339). Rule 97, which narrows rule 13 for accounts only.

## The file

### REQ-LOCAL-01: Accounts live in one local file

Local accounts are kept in `~/.logCli/localAccounts.json`, and `LOG_LOCAL_ACCOUNTS` moves it. The file is written readable by its owner only, since it holds cookies and logins. Its secret fields (cookies, storage origins, proxy, email, password, two-step secret, PIN) are moved out of the file into log.db, encrypted through the secret store (`src/storage/secrets`) with the key held by the OS keyring (Windows DPAPI, the macOS Keychain or Linux Secret Service), and the row keeps only a `sealedSecrets` reference, when the store is ready; otherwise they stay in the file and a warning says so once.

Checked by: code and SubQ

## The commands

### REQ-LOCAL-03: Add makes an account

`log localAccount add --platform <p> --account <a>` saves an account to the file under a local id (`local:<platform>:<accountName>`), with its AdsPower profile (`--adsPower`, which sets the AdsPower driver), proxy, home country and city. It takes any platform log knows.

Checked by: code and SubQ

### REQ-LOCAL-04: List shows the local accounts

`log localAccount list` shows every account in the file with its platform, name, AdsPower profile and session state.

Checked by: code and SubQ

### REQ-LOCAL-10: Login saves an account's email and password from masked prompts

`log localAccount login --platform <p> --account <a>` asks for the account's email and password in two masked prompts and writes them to its row in the file through `saveAccountLogin` (`src/console/signIn/client.ts`), the same save as the console's password sign-in: an account not in the file is `accountNotFound`, a platform that doesn't sign in from them is `passwordSignInUnavailable`, an empty or over-long value is `signInInputInvalid`, and nothing is written. The form is terminal-only (no MCP tool), it refuses with `terminalOnly` when there is no terminal, and the values are never printed.

Checked by: code and SubQ

## How every command reads accounts

### REQ-LOCAL-05: Every command reads accounts from the file

Every command reads accounts through one store (`createAccountStore`, `src/accounts/store`). Listing, reading, creating and updating accounts and reading their logins use only the file.

Checked by: code and SubQ

### REQ-LOCAL-07: A session a run saves goes back to the file

An update to an account that is in the file (a session a run captured or refreshed, a state) is written to the file.

Checked by: SubQ

### REQ-LOCAL-08: Everything else is retired

Listings, groups, conversations and every other object were kept only in Twenty, so every call on them is refused with `twentyRemoved` and nothing reaches a network.

Checked by: code and SubQ

### REQ-LOCAL-09: The tool names the rule it falls under

The `localAccount` MCP tool's description names rule 97 among the rules it falls under (rule 47).

Checked by: code and SubQ
