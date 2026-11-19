# TikTok

Made by `log new platform tiktok`. TikTok is a platform of its own: every command is `log tiktok <command> …`, and each one is an MCP tool named `tiktok<Command>`.

## What is here

| Part | Where |
| --- | --- |
| The accounts | Twenty `socialAccounts` with platform `TIKTOK` |
| The session (find the account, its gate, its engine, the answer back to Twenty) | `src/tiktok/account/session`, on the shared `src/platformKit/session` |
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
