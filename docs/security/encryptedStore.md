# Encrypted account store

log keeps every account session (cookies, the Discord token in storage origins, a proxy URL with its password), every login secret (email, password, TOTP secret, chat PIN) and every provider API key sealed in log.db. Encryption is on by default and needs no migration step: each secret is sealed the first time log touches it.

## How it is built

- **One data key per log.db.** A random 256-bit key, made the first time log seals something.
- **The key is held by the OS**, never written in the clear:
  - Windows: wrapped with DPAPI for the signed-in user (the same protection Credential Manager and Chromium's cookie key use). The wrapped bytes sit in log.db's `secretKeys` table and only that Windows user can unwrap them.
  - macOS: stored in the login Keychain (`security`, service `logCli`, account `storeKey:<keyId>`).
  - Linux: stored in the Secret Service (`secret-tool`, same attributes) when a D-Bus session answers.
  - Headless or no keystore: set `LOG_STORE_PASSPHRASE`. The key is then wrapped with a key derived by scrypt (N=32768, r=8, p=1) from the passphrase. With both a keystore and a passphrase, both wrap the same key, so either one opens it.
- **Recovery passphrase, so logins survive a reinstall.** An OS keystore wrap is tied to one Windows user profile, one Keychain or one Secret Service. After a Windows reinstall, on a new PC, or with a log home restored from a backup, that wrap no longer opens. Run `log storage recovery set` in a terminal (masked prompt, at least 12 characters; agents cannot run it). It wraps the same data key with a scrypt key derived from the recovery passphrase and stores that wrap in `secretKeys` next to the OS wrap. Running it again changes the passphrase.
  - **Restoring on a new machine:** when no OS wrap opens the key, run `log storage recovery set` there and type the same recovery passphrase. log unwraps the key with it and wraps it again with the new machine's keystore, so later runs need no passphrase. On a headless machine, `LOG_STORE_RECOVERY` in the environment does the same without a prompt.
  - Order tried: the OS keystore first, then `LOG_STORE_PASSPHRASE`, then the recovery passphrase. A wrong recovery passphrase refuses with `secretStoreLocked` and changes nothing.
  - `log storage status` says whether a recovery passphrase is set and prints a `>>> NO RECOVERY PASSPHRASE` warning when it is not. log also warns when it makes a new key without one. If `LOG_STORE_RECOVERY` is set when the key is first made, that passphrase wraps it from the start.
  - Keep the recovery passphrase off the machine (a password manager, paper). Anyone who has it and a copy of log.db can open the secrets.
- **Every secret is sealed with AES-256-GCM** into log.db's `secrets` table, with a fresh 96-bit nonce and the secret's ref (`account:…`, `session:<platform>:<account>`, `env:<NAME>`) as authenticated data, so a row copied to another ref fails its check.
- **One module does it**: `src/storage/secrets` (Bun) and `python/secretStore` (Python, same format; it opens and seals rows with a key Bun made).
- Keystore calls run with a 10 s timeout, so a keystore that does not answer (a stuck D-Bus) falls back to the passphrase or to the plain-file path instead of hanging.

## Sealed on access, never lost

1. **Read:** when log reads `localAccounts.json` or `.env` and finds a secret in plain text, it seals the secret into log.db, reads it back, and compares it with the plain value. The plain copy is removed from the file only after that read-back matched (the file is rewritten through a temp file and a rename). If the read-back differs, the file is left exactly as it was.
2. **Write:** `localAccount login`, `localAccount pull`, every session saved back after a run and `credentials save` write secrets straight to the store; the files keep only non-secret fields and a ref (`sealedSecrets` per account, `LOG_SEALED_KEYS` in `.env`).
3. **No key holder:** if no OS keystore answers and `LOG_STORE_PASSPHRASE` is not set, log keeps using the plain file, prints one warning per file naming the gap, and seals it on the first use after a key holder appears.
4. **Locked or tampered:** if log.db holds sealed secrets but no holder opens the key (another user, a lost passphrase), commands refuse with `secretStoreLocked`. A sealed row that fails its check refuses with `secretTampered`. Neither ever reads as an empty session.
5. **Engine handoff:** when the store is ready, a spawned Python engine gets a ref (`cookiesRef`) to the sealed session instead of a cookies file in a temp folder, and reads it with `python/secretStore`. Rotated cookies an engine writes back are written owner-only (0600).

`log storage status` (MCP `storageStatus`) reads only: which holders answer here, whether the key opens, how many secrets are sealed by kind, and which files still hold secrets in plain text. It never prints a value.

## What it protects, and what it does not

- **Protects:** backups, synced or copied log homes, a log.db or `localAccounts.json` attached to a bug report, other OS users on the machine.
- **Does not protect against code running as the same user while they are signed in.** Such code can ask DPAPI, the Keychain or the Secret Service exactly as log does. This is the same limit every keychain-based tool has.
- **The passphrase is only as safe as where it is kept.** Putting `LOG_STORE_PASSPHRASE` in the same `.env` as the secrets protects a copied log.db but not a copied home folder.
- **macOS:** the key is passed to `security` on its command line for the moment it is stored, where another process of the same user could see it.

## Not covered yet

- log's own sign-in tokens (`auth/sessions.json`) and MCP OAuth tokens (`mcp/oauth.json`): still 0600 files; `log storage status` lists them.
- The Twenty server keeps its own copy of `socialAccounts.cookies` and login secrets; its at-rest protection is the operator's.
- Persistent browser profiles (Camoufox, Brave) and Playwright `storage_state` files: they rely on OS file permissions and full-disk encryption (BitLocker, FileVault, LUKS).
- A long-running engine host still receives a 0600 temp cookies file, so hosts started by older code keep working.
- The direct-API engine (`python/directApi`) still reads a temp cookies file.
- The plan in issue #258 holds the key in Windows Credential Manager through `@napi-rs/keyring`. That native package is not installed here, so Windows uses DPAPI through `bun:ffi` and `ctypes` instead. The protection is the same (Credential Manager is DPAPI underneath); moving to keyring later means re-wrapping one key.

## Safety outline

| Risk | What log does |
| --- | --- |
| Losing access during the switch | Plain copies are removed only after a sealed copy read back equal; with no key holder nothing changes |
| A half-written file | Files are rewritten to a temp file and renamed into place |
| A secret copied to another account's row | The ref is authenticated data, so the row fails its check (`secretTampered`) |
| A changed or corrupted row | AES-GCM's tag fails, so the value is refused, never used |
| A keystore that hangs | 10 s timeout, then the passphrase or the plain file |
| A Windows reinstall, a new PC or a restored log home | The recovery passphrase unwraps the key, and log wraps it again with the new OS keystore; status warns loudly while none is set |
| A wrong recovery passphrase | `secretStoreLocked`, nothing re-wrapped or changed |
| Two processes making a key at once | Key creation runs in one `BEGIN IMMEDIATE` transaction; the second process uses the first one's key |
| Values in logs or status output | Status prints counts and field names only; refusals name the ref, never the value |
