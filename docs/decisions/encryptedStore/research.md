# Encrypted account store research (#258)

How log should keep sessions and keys encrypted at rest. Back to [decisions](../README.md).

### Research for #258: encrypted account store

What this covers: how log stores sessions today (main @ `2787b997`), the open-source projects that already do local encrypted credential storage, a decision matrix, and a recommended design. No code was changed. Star counts and dates were fetched from the GitHub API on 2026-11-21. Anything marked *(inferred)* was not checked directly.

#### 1. Where sessions and secrets live today

The master copy of every account's session is the **Twenty `socialAccounts` row** (`cookies`, plus `loginSecrets`: email, password, TOTP, Messenger PIN). The `* cookies save` commands write there (`src/cli/twitter/helpers/cookies.ts`, `src/cli/linkedin/helpers/cookies.ts`, `log discord secrets`). On disk the session is copied into several places:

| Path pattern | What it holds | Writer | Reader |
|---|---|---|---|
| `~/.logCli/localAccounts.json` (`LOG_LOCAL_ACCOUNTS`) | Full account rows **with cookies and login secrets** (`localAccount pull` copies them from Twenty via `loginSecrets`) | `src/twenty/graphql/helpers/localAccounts.ts` (mode 0600) | `withLocalAccounts()` → every command |
| `~/.logCli/.env` (`LOG_USER_ENV`) | Provider API keys | `src/auth/credentials/client.ts` `saveProviderCredentials` (0600, atomic rename) | `src/config/userEnv` `loadUserEnv`, `savedCredential` |
| `~/.logCli/auth/sessions.json` | log API access/refresh tokens | `src/auth/session/client.ts` (0600) | same file |
| `~/.logCli/mcp/oauth.json` | MCP OAuth clients and tokens | `src/mcp/oauth/client.ts` (0600) | same file |
| `<tmp>/directApi*/cookies.txt`, `spec.json`; platformKit and twitter session temp dirs (`cookiesPath`, `storagePath`, `pinPath`, `refreshedPath`) | One run's cookies, sessionStorage (Discord `token`) and chat PIN, passed to Python | `src/directApi/engine/client.ts`, `src/platformKit/session/client.ts`, `src/twitter/account/session/client.ts` (0600, `rmSync` afterwards) | `python/platformKit/engine.py` (`spec["cookiesPath"]`, `spec["storagePath"]`), `python/twitterApi`, `python/directApi` |
| `refreshedPath` | Cookies the platform rotated during the run | `python/platformKit/engine.py:123` (`write_text`, **no 0600**) | TS session client, which writes them back to Twenty/local |
| `~/.logCli/<platform>/<account>/session.json`, `governor_state.json`, `host.json` | Session state and accountId (not the cookie values); the host socket token | `src/directApi/engine/client.ts`, `python/*/host.py` | status, the host clients |
| `~/.logCli/<platform>/<account>/browser.json` (LinkedIn) | Browser headers (UA, client hints, x-li-track) | `src/linkedin/account/browser/client.ts` | linkedinApi |
| `python/discordApi/browserIdentity.py` store | Discord super-properties/identity built from HARs | that module | discordApi |
| `run.statePath` (Playwright `storage_state`) | Full browser cookies and localStorage per run/account | `python/session/{connect,inspect,publish}Session.py`, `logWorker.py` | the same sessions on the next launch |
| Camoufox / Brave persistent profiles (`brave_profile_dir`, `launch_persistent_context`) | The browser's own cookie DB | the browser | the browser |

Repo rules this has to fit:
- `scripts/checks/checkOneDatabase.ts` lists every file writer with a `kind`. Session files are allowed as `kind: 'session'` ("a private per-run or per-account session file, never shared state"). A new store should **shrink** that list (≈20 `session` entries today), not add to it.
- AGENTS.md: camelCase, no comments, paths through `logHome()` / `log_home()`, rule 94 (every platform call goes through log and its governor).
- `sharp` is already a native N-API dependency, so a napi-rs prebuilt addon is not a new kind of dependency.
- `docs/trust.md` is **not in this clone of main** (`git ls-files | grep trust` returns nothing). The issue says it exists, so it is probably on another branch *(inferred)*.

#### 2. Projects that already solve this (GitHub API, 2026-11-21)

| Project | ★ | Last push | License | How the key is held | Headless fallback | Bun / Python |
|---|---|---|---|---|---|---|
| **Brooooooklyn/keyring-node** (`@napi-rs/keyring` 2.1.2) | 109 | 2026-11-20 | MIT | Rust `keyring-core` stores: Windows Credential Manager, macOS Keychain, Linux Secret Service (D-Bus) + **keyutils** | keyutils on Linux. #142/#144 (closed) added explicit backend selection; **#156 open**: `AsyncEntry` hangs when D-Bus does not answer | **Bun 1.4.0: tested, round-trip OK on Windows**. 8.76M weekly npm downloads, no JS deps |
| **open-source-cooperative/keyring-rs** (+ PyPI `rust-native-keyring` 0.2.0) | 785 | 2026-11-19 | MIT/Apache-2.0 | Same Rust stores (the base under keyring-node and the Codex CLI) | keyutils, or any store you name | Python wheels for win/mac/manylinux/musl. **Tested: reads the entry Bun wrote** |
| **jaraco/keyring** (PyPI `keyring` 25.7.0) | 1519 | 2026-10-29 | MIT (PyPI; no SPDX on GitHub) | WinVault, macOS Keychain, SecretStorage/KWallet | `keyrings.alt` (29★): plaintext/encrypted file; none on headless Linux | Python only. **Tested: cannot read a keyring-rs entry by default** (target naming differs, see §3) |
| atom/node-keytar | 1424 | 2022-12-12 | MIT | Native Credential Manager / Keychain / libsecret | none | **Archived**; still 3.97M weekly downloads. Fork `@github/keytar` 7.10.6 (538k weekly) |
| magarcia/cross-keychain | 18 | 2026-11-08 | MIT | Shells out to OS tools (inferred from its deps `meow`, `@inquirer/prompts`; see its README) | file fallback *(inferred)* | Node; small project, one main maintainer |
| zalando/go-keyring (used by **cli/cli**, `internal/keyring/keyring.go` wraps it with 60 s timeouts) | 1368 | 2026-11-20 | MIT | Credential Manager / Keychain / Secret Service | gh falls back to a plaintext `hosts.yml` when no keyring *(inferred from gh docs)* | Go only. The design to copy: timeouts plus a file fallback |
| 99designs/keyring (used by aws-vault, 8996★, pushed 2025-12-30) | 660 | 2024-05-07 | MIT | Keychain, WinCred, Secret Service, KWallet, pass, **encrypted file (passphrase)** | yes, the passphrase file backend | Go only. Shows the passphrase fallback |
| openai/codex (`codex-rs/keyring-store`) | 136026 | 2026-11-21 | Apache-2.0 | keyring-rs (apple-native, windows-native, linux secret-service) behind `cli_auth_credentials_store` (file / keyring / auto) | `auto` falls back to `auth.json` | Rust. Same base as the recommendation |
| NousResearch/hermes-agent (`agent/vault_store.py`, `agent/vault_keychain.py`) | 265095 | 2026-11-21 | MIT | **Envelope design**: a Fernet-encrypted vault file. The key sits in `vault.key`, or (opt-in `vault.key_storage: keychain`) in the OS keychain via `keyring`, leaving a non-secret `vault.keyref` pointer | refuses `keyrings.alt`/`fail`/`null` as "not a keychain"; file key otherwise | Python. Closest prior art to what log needs |
| docker/docker-credential-helpers | 1327 | 2026-11-10 | MIT | Separate binaries per backend (osxkeychain, wincred, secretservice, **pass**) speaking a stdin JSON protocol | `pass` (GPG) | Any language via subprocess, but a binary per OS to ship |
| git-ecosystem/git-credential-manager | 9464 | 2026-11-20 | NOASSERTION (MIT per repo *(inferred)*) | Credential Manager / Keychain / Secret Service; **GPG `pass` or plaintext for headless** | yes | .NET binary |
| FiloSottile/age · str4d/rage | 24401 · 3731 | 2026-08-29 · 2026-08-20 | BSD-3 · Apache-2.0 | File encryption to a key file or passphrase (scrypt). Holds no key itself | passphrase | Good file format, but no OS key custody |
| getsops/sops | 23774 | 2026-11-16 | MPL-2.0 | KMS / age / PGP | age | Built for repo secrets, too heavy here |
| bitwarden/clients | 14295 | 2026-11-21 | NOASSERTION (GPL/BW mix) | Vault master password; desktop uses OS biometrics/keychain | password | License and size rule it out |
| anthropics/claude-code | 156512 | 2026-11-21 | none | macOS Keychain; elsewhere `~/.claude/.credentials.json` *(inferred from public docs; code search found no keyring hits)* | plain file | n/a |
| Chromium `os_crypt` (chromium/chromium mirror) | 25398 | 2026-11-21 | BSD | Cookies encrypted with AES-GCM; key wrapped by DPAPI (Windows) / Keychain "Chrome Safe Storage" / libsecret or kwallet, with the hard-coded `peanuts` key when no keyring *(inferred, well-known)* | weak fixed key | Relevant to browser profiles. Firefox/Camoufox `cookies.sqlite` is **not** encrypted at rest *(inferred)* |
| borisbabic/browser_cookie3 · n8henrie/pycookiecheat | 1085 · 827 | 2024-12-20 · 2026-10-30 | LGPL-3.0 · MIT | Readers that decrypt Chromium cookies with the OS key | n/a | Show that any process running as the same user can decrypt os_crypt cookies |

#### 3. Cross-language check (run on Windows 11, Bun 1.4.0, Python 3.x via uv)

```
bun:  new Entry("logCliProbe","storeKey").setPassword(...)  → getPassword OK
      Credential Manager TargetName = "storeKey.logCliProbe"
py rust-native-keyring 0.2.0: Entry("logCliProbe","storeKey").get_password() → OK (same value)
py jaraco keyring 25.7.0 (WinVaultKeyring): get_password("logCliProbe","storeKey") → None
      only get_password("storeKey.logCliProbe","storeKey") works (a target-name workaround)
```

Bun and Python can share one key only if both use **keyring-rs** (`@napi-rs/keyring` and `rust-native-keyring`), or if Python never touches the keyring. macOS and Linux were not tested here, and CI has to cover them.

#### 4. Decision matrix (score 0–3, higher is better)

| Criterion (weight) | A. `@napi-rs/keyring` holds a data key; one encrypted file read by both sides (envelope) | B. Every secret as its own keyring entry (keytar-style) | C. age/rage file, passphrase only | D. Docker-style helper binaries | E. jaraco `keyring` (Python) + keytar fork (TS) | F. Store secrets inside `log.db` with SQLCipher |
|---|---|---|---|---|---|---|
| Key held by the OS on all 3 OSes (3) | 3 | 3 | 0 | 3 | 3 | 1 (key still needs custody) |
| Same store from Bun **and** Python (3) | 3 (verified on Windows) | 2 (needs keyring-rs on both sides) | 3 | 2 | 0 (naming mismatch verified) | 2 (pysqlcipher wheels uneven *(inferred)*) |
| Headless fallback (2) | 3 (passphrase → scrypt-wrapped key file; Linux keyutils) | 1 | 3 | 2 (`pass`) | 1 (`keyrings.alt`) | 2 |
| Maintained (2) | 3 (pushed 2026-11-20, 8.7M dl/wk) | 3 | 3 | 3 | 1 (keytar archived) | 2 |
| License (1) | 3 MIT | 3 | 3 | 3 | 3 | 2 (BSD-style, build friction) |
| Small dependency (1) | 3 (one prebuilt addon, no JS deps; Python one wheel) | 3 | 2 | 1 (binary per OS) | 2 | 1 |
| Migration ease (2) | 3 (one file swap per writer) | 1 (cookie blobs hit Windows' 2.5 KB credential size limit *(inferred)*; many entries) | 3 | 2 | 1 | 1 (schema change, driver swap) |
| Fits `checkOneDatabase` (1) | 3 (one blob replaces ~20 session files) | 3 | 2 | 2 | 2 | 3 |
| **Weighted total (/45)** | **45** | 34 | 34 | 35 | 22 | 25 |

C scores high on everything except the criterion the issue requires: it holds no key in the OS. That is why A wraps the key with a passphrase only when no keyring is available.

#### 5. Recommendation: A, envelope encryption

One random 256-bit **data key** per log home, held by the OS through `@napi-rs/keyring` (Bun) and `rust-native-keyring` (Python), both keyring-rs, entry `service=logCli`, `user=storeKey:<logHome hash>`. Every secret is sealed with **AES-256-GCM** (WebCrypto in Bun, `cryptography` AESGCM in Python) into one store. On headless servers the data key is wrapped by a passphrase (scrypt) instead. The same pattern is used by Hermes' vault, Chromium os_crypt and Codex.

**Layout**
- `src/storage/secretStore/` → `index.ts` (`sealSecret`, `openSecret`, `putAccountSecret`, `accountSecret`, `dropAccountSecret`), `helpers/keyHolder.ts` (keyring → `LOG_STORE_PASSPHRASE` → refuse with code `storeKeyMissing`), `helpers/envelope.ts`. Ciphertext goes in a `secrets` table in **log.db** (`ref`, `nonce`, `ciphertext`, `aad=platform:account:kind`), so no new file writer is added.
- `python/secretStore/` → `store.py` with the same format, so it can read and write the same rows. `python/platformKit/engine.py`, `twitterApi`, `directApi` and `discordApi.browserIdentity` call `account_secret(...)` instead of `Path(spec["cookiesPath"]).read_text()`. The spec carries a **ref**, not the cookie values. `refreshedPath` becomes `put_account_secret`.
- Keyring calls get a timeout, as gh does, because of keyring-node #156 (D-Bus hang). Use the sync `Entry` in a worker or a `Promise.race`. On timeout, fall back to the passphrase path.
- Format header: `v1`, alg, kdf, so the key can be rotated later.

**Migration** (`log storage encrypt`, also run once at boot when plain files exist):
1. Make the data key, or unlock it.
2. For each writer in §1 (`localAccounts.json` cookies and loginSecrets, `.env` keys, `auth/sessions.json`, `mcp/oauth.json`, `browser.json`, Discord identity), seal each value into `secrets` and read it back to check.
3. Rewrite the plain file with refs only (`.env` keeps non-secret keys), or delete it, and overwrite the old bytes first where the OS allows *(best effort)*.
4. Record a `migratedAt` row so the step is idempotent.
5. Remove those files from `checkOneDatabase` `ALLOWED`. Temp `cookies.txt`/`spec.json` files go away because engines read by ref.

**Browser profiles (Camoufox / Brave / Playwright `storage_state`)**
- `storage_state` JSON: seal it into the store at release and restore it to a 0600 temp file just before launch, removed on close.
- Camoufox/Firefox `cookies.sqlite` in a persistent profile is not encrypted, and log cannot encrypt it while the browser runs. `docs/trust.md` should say so: profiles rely on OS file permissions and full-disk encryption (BitLocker/FileVault/LUKS). Brave on Windows/macOS uses Chromium os_crypt with the OS key; on Linux without a keyring it uses the fixed `peanuts` key *(inferred)*.

**Tests / CI**
- Unit: a sealed value is not in the raw log.db bytes (grep for the plaintext). Tampered AAD fails. The passphrase path works with no keyring.
- Cross-language: Bun writes, Python reads, and the other way round, in one test run.
- CI matrix: `windows-latest` (Credential Manager), `macos-latest` (create and unlock a temp keychain with `security create-keychain`), `ubuntu-latest` twice: with `gnome-keyring-daemon --unlock` under `dbus-run-session`, and with no D-Bus (expects the keyutils or passphrase path, never a hang).
- Migration: seed plain fixtures, run `storage encrypt`, assert no plaintext is left under `logHome()` and a second run changes nothing.

**What `docs/trust.md` should then say**
- Sessions, login secrets and provider keys are AES-256-GCM encrypted in log.db. The key is in the OS credential store, or passphrase-wrapped on headless machines.
- This protects backups, synced folders, copied homes and other OS users.
- It does **not** protect against code running as the same user while you are logged in. Any such process can ask the keychain, the same limit Hermes states in `vault_keychain.py`.
- Persistent browser profiles rely on file permissions and disk encryption.
- The Twenty server still holds the master copy of `socialAccounts.cookies` and `loginSecrets`, so its own at-rest protection is the operator's job, or the TS side could send Twenty only sealed blobs (follow-up).

#### 6. Maintainers who could be asked

Public X handle and email as shown on their GitHub profile only:
- **Brooooooklyn** (LongYinan): keyring-node / napi-rs. X `Brooooook_lyn`, email public on profile
- **brotskydotcom** (Daniel Brotsky): keyring-rs and `rust-native-keyring`. Email public on profile, no X
- **hwchen** (Walther Chen): keyring-rs original author. No X or email on profile
- **jaraco** (Jason R. Coombs): Python `keyring` / `keyrings.alt`. X `jaraco`, email public
- **magarcia** (Martin Garcia): cross-keychain. X `martinprins`, email public
- **mikkeloscar**, **szuecs**: zalando/go-keyring (top contributors). No X or email on profile
- **FiloSottile** (Filippo Valsorda): age. Email public, no X. **str4d** (Jack Grigg): rage. Neither on profile
- **n8henrie** (Nathan Henrie): pycookiecheat (Chromium cookie decryption). No X or email on profile
