# Bundled TikTok detail extraction

Source: https://github.com/omkarcloud/tiktok-scraper

Pinned revision: `127209e86ae663e2427baf171b8f92933fa12d02`.

MIT license, copyright 2026 Chetan Jain. See LICENSE.

This is a source subset for video details. The original parsers, reference helpers, signer, JSON helpers and their shared utilities are included unchanged. `tiktok/fetch.py` contains the original single-request transport, request parameters, status reader and error classes extracted from the upstream file. Its imports are restricted to those dependencies. The HTTP server, routes, caches, retries, proxy rotation and unrelated endpoint implementations are excluded.

Log's adapter in `python/tiktokApi/details.py` performs the upstream `/api/item/detail/` request and calls the upstream `parsers.video` normalizer, matching upstream `videos.get_details`. It supplies the selected account's saved cookies and configured proxy. The shared platform engine applies the account governor before each detail call. The first refusal stops extraction and records a governor soft block. Missing videos may be recorded individually. No retry or country/identity rotation is performed.

No second checkout, Bottle/Cheroot process or HTTP port is required. `curl_cffi>=0.15` must be installed in Log's Python runtime, as it is for Log's other platform clients. For a manually prepared runtime, install `vendor/tiktokScraper/requirements.txt` using the interpreter selected by `LOG_PYTHON`.

Only full video/photo URLs discovered by Log are supported by this adapter. Bundling parsers for other entity shapes does not expose extra scraping endpoints. Detail extraction does not verify that the account is logged in. TikTok's generated `ping` action remains unimplemented.
