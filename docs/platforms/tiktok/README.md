# TikTok

Made by `log new platform tiktok`. TikTok is a platform of its own: every command is `log tiktok <command> …`, and each one is an MCP tool named `tiktok<Command>`.

## What is here

The first milestone uses the shared Log inspect browser for manual TikTok sign-in. A local account with platform `TIKTOK` can use Camoufox and the existing private browser capture and session storage. The direct engine's `ping` action currently returns `engineNotBuilt`, so the generated session-check command cannot yet verify a TikTok login.

Open the sign-in browser with `bun bin/log.ts inspect start --account tiktok-signin --url https://www.tiktok.com/login --detach`. The local account entry must already exist. After manual sign-in, `bun bin/log.ts inspect do saveState --account tiktok-signin` writes browser state into the private run. Close normally with `bun bin/log.ts inspect do stop --account tiktok-signin` and wait for the account-session save confirmation before restarting. The shared launch-spacing rule also applies to restoration tests. Use `bun bin/log.ts inspect do snapshot --account tiktok-signin` to inspect the current screen.

| Part | Where |
| --- | --- |
| The accounts | Twenty `socialAccounts` with platform `TIKTOK` |
| The session (find the account, its gate, its engine, the answer back to Twenty) | `src/tiktok/account/session`, on the shared `src/platformKit/session` |
| The commands | `src/cli/tiktok/index.ts`: `log tiktok session check` (MCP `tiktokSessionCheck`) |
| The engine | `python/tiktokApi/engine.py`, on the shared `python/platformKit/engine.py`; each account's governor is under `~/.logCli/tiktok/<account>` |
| The client | not vendored yet |

## Full video exports

Run the omkarcloud/tiktok-scraper service locally before extraction. Its default address is `http://127.0.0.1:8000`. Log calls `/videos/details?video=<id>` and retains the returned detail object unchanged, including its snake_case fields, nulls, numbers and nested media arrays.

`bun bin/log.ts tiktok scrape --account tiktok-signin --query "#duegooder" --limit 20 --pages 2 --output duegooder.json --json` searches the signed-in browser, then extracts the discovered videos sequentially through the local service. Use `--url "https://www.tiktok.com/@creator/video/ID"` instead of `--query` to extract one known video. The MCP tool is `tiktokScrape`. `--apiUrl` selects another loopback service address.

The single export contains collection and search metadata, a `videos` array of unmodified service responses, `failures`, and `pending` links. `extractedCount` counts successful responses. `extractionComplete` means all discovered links were extracted successfully. Search coverage remains bounded by `--limit` and `--pages`; `complete` only becomes true for a successful single-link extraction or an explicitly complete source search.

When `--output` is supplied, Log atomically checkpoints the JSON before extraction and after every video. An unavailable video is recorded as a failure. HTTP 401, 403, 429, server errors, malformed responses and connection failures stop further extraction and preserve pending links. No retry or alternate provider is selected automatically.

Reference method and schema: https://github.com/omkarcloud/tiktok-scraper, inspected at commit `127209e86ae663e2427baf171b8f92933fa12d02`. The service supplies the extraction and normalization implementation.

## Searching videos

Run `bun bin/log.ts tiktok search --account tiktok-signin --query "DueGooder" --limit 20 --pages 1 --json` with the account's inspect browser open. For a hashtag, pass `--query "#duegooder"`. This searches the Videos tab with the literal query, including the hash. The MCP tool is `tiktokSearch`, with the same named inputs.

`--pages` bounds navigation and scroll batches, from 1 to 10. `--limit` bounds returned videos, from 1 to 100. Defaults are 1 batch and 20 videos. Results retain observed order and are deduplicated by video ID. The returned `stopped` value explains the collection boundary and `complete` is false because search coverage is not exhaustive.

Each result includes its string ID, canonical URL, creator handle, available image description, caption derived from that description, hashtags and the formatted counter shown on the card. `displayedCount` keeps the original text without assuming whether it represents views or likes. Missing card metadata is null. Exact publication timestamps, duration and typed engagement counters need a later detail extractor.

The command uses the existing inspect navigation, motion, recording and account session. Raw captures stay in the private inspect run. A checkpoint, login redirect or HTTP 429 stops collection. Browser errors after a successful batch retain collected videos in the JSON result with an error exit status.

## Session engine implementation

1. Vendor TikTok's client under `vendor/<library>` and set `LIBRARY` in `python/tiktokApi/engine.py`.
2. Fill in `ping` there: call TikTok with the account's cookies and answer `loginState` from TikTok's own answer.
3. Add each family as an action in the engine, a command in `src/cli/tiktok` and its rules in `COMMAND_RULES`, with a `…Live` flag for anything that acts on TikTok.
