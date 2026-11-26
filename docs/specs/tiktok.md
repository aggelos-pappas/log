---
title: "TikTok"
---

# TikTok

TikTok account sessions and recorded browser video search. Rules 83, 117 and 123.

## Recorded browser search

### REQ-TIKTOK-07: Full video exports preserve the bundled upstream scraper schema

`log tiktok scrape` accepts either a query or a canonical video/photo link. Query discovery uses the existing browser search command. Each discovered link is extracted sequentially by the shared governed TikTok engine using the bundled omkarcloud signer, single-request transport and `parsers.video` normalizer. The adapter sends the selected account’s cookies and configured proxy. No HTTP service or second checkout is required. Upstream retry and country/identity rotation paths are excluded. Detail records are returned unchanged inside one collection's `videos` array. Missing fields are not synthesized. Collection metadata records failures, pending links and bounded search coverage. An output file is atomically checkpointed after every attempted extraction. Refusals, rate limits, server errors and connection failures stop further engine calls. Platform blocks update the shared governor cooldown.

Checked by: code, schema-preservation checks and live bundled extraction

### REQ-TIKTOK-05: Text and hashtag searches use the existing account browser

`log tiktok search` accepts a nonempty query, including a leading hashtag, and navigates the open TikTok account's inspect session to the Videos search tab. The shared inspect command owns navigation, scroll motion and captures. A missing session is refused. The search command does not create an independent authenticated client.

Checked by: code and live browser

### REQ-TIKTOK-06: Search results preserve source identifiers and collection limits

Results retain string video IDs, canonical links, creator handles and available card metadata. Limits are 1–100 returned videos and 1–10 recorded batches, with defaults of 20 and 1. Duplicate IDs are merged in observed order. The JSON reports the stopping reason and does not claim exhaustive coverage. A recorded TikTok HTTP 429, checkpoint, login redirect or browser error stops collection. Already collected results are retained when a later batch fails.

Checked by: code, extractor tests and live browser

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
