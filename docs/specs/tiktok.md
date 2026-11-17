---
title: "TikTok"
---

# TikTok

What `log new platform tiktok` made, and what the platform's code must keep doing as it grows. Rules 83, 117 and 123.

## The account's session

### REQ-TIKTOK-01: The account is found on its own platform's row and gated

An account is found in socialAccounts by its platform, TIKTOK, and checked by the platform's gate before its engine runs.

Checked by: code and SubQ

### REQ-TIKTOK-02: The engine runs the account through the shared platform kit

Every TikTok call goes through `python/tiktokApi/engine.py` on the shared platform kit, with the account's own governor, never a script of its own.

Checked by: code and SubQ

### REQ-TIKTOK-03: TikTok's own answer is what gets recorded

`log tiktok session check` sends nothing, and writes TikTok's own answer to the account's sessionState. Refreshed cookies for .tiktok.com are merged back into the row.

Checked by: code and SubQ

## Wiring

### REQ-TIKTOK-04: The platform is wired into the CLI and the direct-API routes

tiktok is in PLATFORMS and PLATFORM_SITES, its session command is in COMMANDS, and its session route is in DIRECT_ROUTES.

Checked by: code and SubQ
