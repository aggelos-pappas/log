# TikTok

Made by `log new platform tiktok`. TikTok is a platform of its own: every command is `log tiktok <command> …`, and each one is an MCP tool named `tiktok<Command>`.

## What is here

| Part | Where |
| --- | --- |
| The accounts | `socialAccounts` with platform `TIKTOK`, in the local account store `~/.logCli/localAccounts.json` |
| The session (find the account, its gate, its engine, the answer back to the account row) | `src/tiktok/account/session`, on the shared `src/platformKit/session` |
| The commands | `src/cli/tiktok/index.ts`: `log tiktok session check` (MCP `tiktokSessionCheck`), `log tiktok stats` (MCP `tiktokStats`), `log tiktok post` and `log tiktok delete` (MCP `tiktokPost`, `tiktokDelete`, each with its live twin) |
| The engine | `python/tiktokApi/engine.py`, on the shared `python/platformKit/engine.py`; each account's governor is under `~/.logCli/tiktok/<account>` |
| The client | `python/tiktokApi/transport.py`: one curl_cffi session pinned to Chrome 150, sending TikTok Studio's own query and headers |

## Reads, with no browser

TikTok Studio's own calls, recorded from a real post (`~/.logCli/runs/inspect/20261117T052642_tiktokAccount`) and answered without TikTok's page signatures (`X-Bogus`, `_signature`): the reads need only the account's cookies, its `tt-csrf-token` and its `msToken`.

| Command | Calls, in order | TikTok's answer decides |
| --- | --- | --- |
| `log tiktok session check` | `GET /tiktokstudio/api/web/user` | `userId` other than `0` is loggedIn; `0`, a redirect or no body is loggedOut (`sessionDead`) |
| `log tiktok stats` | the same, then `GET /tiktokstudio/api/web/relation/multiGetFollowRelationCount`, then `POST /tiktok/creator/manage/item_list/v1/` paged 30 at a time | `BaseResp.StatusCode` 0 and `status_code` 0; an empty body is `signatureRequired`, any other status `tiktokRefused`, and nothing is retried (rule 94) |

## Posting and deleting, with no browser

Recorded from a real post and a real delete in TikTok Studio, then sent the same way without the page. TikTok accepted both without its page signatures (`X-Bogus`, `_signature`) or the ticket-guard headers (tested 2026-11-18 on tiktokAccount: a 73 KB clip posted in 3 s, deleted in 1 s).

| Command | Calls, in order | TikTok's answer decides |
| --- | --- | --- |
| `log tiktok post --live` | `GET /api/v1/video/upload/auth/` (the upload's temporary keys, `video_token_v5`), `GET /top/v1?Action=ApplyUploadInner` signed AWS4-HMAC-SHA256 with those keys (region `ap-singapore-1`, service `vod`), the video to the storage host it names (`POST /upload/v1/<StoreUri>` multipart with `file` and `post_upload_req`; above 8 MB in 5 MB parts with `phase=transfer`, then `phase=finish`), then `POST /tiktok/web/project/post/v1/` with the video id and caption | storage `code` 2000 with a `vid`, then `status_code` 0 and an `item_id`; anything else stops the run, nothing retried (rule 94) |
| `log tiktok delete --live` | `POST /tiktok/post/edit/v1/` with `{"aweme_id": <id>, "scene": 1, "delete": {"delete_type": 1}}` | `edit_diff.aweme_id` is the post and every `edit_biz_result` is 0 |

The signer is checked against the page's own: recomputing the recorded `GetUploadCandidates` and `ApplyUploadInner` signatures gives the same value. The parts path (videos above 8 MB) follows TikTok's uploader code (`uploadChunkedUrl`, `uploadMergeUrl`); on 2026-11-18 a 20 MB, 20 s clip went up in 5 parts and posted in 8 s, whole (TikTok listed it at 20 s), then was deleted.

The `tiktokPost` and `tiktokDelete` flows (the AdsPower browser) stay for when the direct calls are refused. They run faster too: `log flow run` uses the account's browser when one is already open (rule 35), rea reads each step in the background (`reaLater`), and a step's quiet wait ignores TikTok's telemetry beacons (`mcs-*`, `mon-*`, `mssdk-*`, `vmweb-*`, `vcs-*`), which used to hold every step to its 15 s cap.

## Next

1. Add each family as an action in the engine, a command in `src/cli/tiktok` and its rules in `COMMAND_RULES`, with a `…Live` flag for anything that acts on TikTok.

## Full video exports

The omkarcloud/tiktok-scraper extraction code is bundled under `vendor/tiktokScraper`. Log calls TikTok’s `/api/item/detail/` through its governed Python engine and uses the original `parsers.video` normalizer. Its snake_case fields, nulls, numbers and nested media arrays are preserved. No separate service, checkout or port 8000 is needed. The runtime needs `curl_cffi>=0.15`, already used by Log’s other platform engines. For a manually prepared runtime, install `vendor/tiktokScraper/requirements.txt` into the Python interpreter selected by `LOG_PYTHON`.

`bun bin/log.ts tiktok scrape --account tiktok-signin --query "#duegooder" --limit 20 --pages 2 --output duegooder.json --json` searches the signed-in browser, then extracts the discovered videos sequentially through the bundled engine. Use `--url "https://www.tiktok.com/@creator/video/ID"` instead of `--query` to extract one known video. The MCP tool is `tiktokScrape`. The former `--apiUrl` option has been removed.

The single export contains collection and search metadata, a `videos` array of unmodified upstream parser outputs, `failures`, and `pending` links. `extractedCount` counts successful responses. `extractionComplete` means all discovered links were extracted successfully. Search coverage remains bounded by `--limit` and `--pages`; `complete` only becomes true for a successful single-link extraction or an explicitly complete source search.

When `--output` is supplied, Log atomically checkpoints the JSON before extraction and after every video. An unavailable video is recorded as a failure. HTTP 401, 403, 429, server errors, malformed responses and connection failures stop further extraction and preserve pending links. Platform blocks also update the governor cooldown. No retry or alternate provider is selected automatically.

Reference method and schema: https://github.com/omkarcloud/tiktok-scraper, inspected at commit `127209e86ae663e2427baf171b8f92933fa12d02`. The pinned source subset supplies the signing, transport and normalization implementation. The adapter uses the account’s saved cookies and configured proxy. Upstream retries and country/identity rotation are excluded.

## Searching videos

Run `bun bin/log.ts tiktok search --account tiktok-signin --query "DueGooder" --limit 20 --pages 1 --json` with the account's inspect browser open. For a hashtag, pass `--query "#duegooder"`. This searches the Videos tab with the literal query, including the hash. The MCP tool is `tiktokSearch`, with the same named inputs.

`--pages` bounds navigation and scroll batches, from 1 to 10. `--limit` bounds returned videos, from 1 to 100. Defaults are 1 batch and 20 videos. Results retain observed order and are deduplicated by video ID. The returned `stopped` value explains the collection boundary and `complete` is false because search coverage is not exhaustive.

Each result includes its string ID, canonical URL, creator handle, available image description, caption derived from that description, hashtags and the formatted counter shown on the card. `displayedCount` keeps the original text without assuming whether it represents views or likes. Missing card metadata is null. Use `tiktok scrape` to enrich these cards with publication timestamps, duration and typed engagement counters.

The command uses the existing inspect navigation, motion, recording and account session. Raw captures stay in the private inspect run. A checkpoint, login redirect or HTTP 429 stops collection. Browser errors after a successful batch retain collected videos in the JSON result with an error exit status.
