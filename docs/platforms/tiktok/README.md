# TikTok

Made by `log new platform tiktok`. TikTok is a platform of its own: every command is `log tiktok <command> …`, and each one is an MCP tool named `tiktok<Command>`.

## What is here

| Part | Where |
| --- | --- |
| The accounts | Twenty `socialAccounts` with platform `TIKTOK` |
| The session (find the account, its gate, its engine, the answer back to Twenty) | `src/tiktok/account/session`, on the shared `src/platformKit/session` |
| The commands | `src/cli/tiktok/index.ts`: `log tiktok session check` (MCP `tiktokSessionCheck`) |
| The engine | `python/tiktokApi/engine.py`, on the shared `python/platformKit/engine.py`; each account's governor is under `~/.logCli/tiktok/<account>` |
| The client | not vendored yet |

## Next

1. Vendor TikTok's client under `vendor/<library>` and set `LIBRARY` in `python/tiktokApi/engine.py`.
2. Fill in `ping` there: call TikTok with the account's cookies and answer `loginState` from TikTok's own answer.
3. Add each family as an action in the engine, a command in `src/cli/tiktok` and its rules in `COMMAND_RULES`, with a `…Live` flag for anything that acts on TikTok.
