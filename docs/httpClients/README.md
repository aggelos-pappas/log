# curl_cffi vs httpcloak: SubQ matrix

Run 19 Nov 2026. Model `subq-snap-preview`, `POST https://api.subq.ai/v1/systemone`, 98,732 input tokens. State: [evidence.md](evidence.md) (log's client inventory, a live fingerprint test, both libraries' docs, every Scraping Enthusiasts message on these clients). Both repeats of the choice pass and the claim pass agreed. Raw: `matrix/subqResults.json`. Rerun: `node docs/httpClients/matrix/runMatrix.mjs` (needs `SUBQ_API_KEY`).

Options: **hybrid** = One identity, curl_cffi plus httpcloak by switch, **curl** = curl_cffi 0.17 behind one identity, **stay** = Keep curl_cffi 0.16.3, each client as it is, **cloak** = httpcloak everywhere, **wreq** = wreq / rnet everywhere.

## Winner: one identity, curl_cffi everywhere, httpcloak by switch later (hybrid, 3.15)

| Criterion | SubQ's pick (both passes) | hybrid | curl | stay | cloak | wreq |
|---|---|---|---|---|---|---|
| matchesRealChrome | cloak | 3.12 | 2.07 | 1.20 | **3.97** | 0.96 |
| oneIdentity | hybrid | **3.50** | 3.31 | 0.20 | 3.13 | 2.23 |
| osCoherence | cloak | 3.63 | 3.12 | 0.69 | **3.94** | 1.84 |
| websocket | curl | 3.61 | 3.93 | **3.94** | 0.18 | 0.75 |
| asyncio | curl | 3.27 | 3.89 | **3.96** | 0.81 | 1.04 |
| migrationEffort | stay | 2.63 | 2.94 | **3.87** | 0.69 | 0.44 |
| vendorDiff | stay | 2.91 | 3.04 | **3.98** | 1.22 | 0.92 |
| freshness | cloak | 3.29 | 2.98 | 1.24 | **3.43** | 1.26 |
| proxyH2 | cloak | **3.01** | 2.69 | 2.19 | 2.76 | 0.83 |
| communityBacking | curl | 2.99 | 3.19 | 3.11 | **3.27** | 2.45 |
| maturity | curl | 2.39 | **3.41** | 3.37 | 0.59 | 1.23 |
| cookieMatch | cloak | **2.49** | 2.34 | 0.94 | 2.37 | 1.07 |
| newPlatforms | curl | **3.00** | 2.65 | 0.59 | 2.52 | 1.36 |
| silentFlagDetection | hybrid | **3.33** | 1.97 | 0.43 | 1.20 | 0.56 |
| reversible | hybrid | **3.72** | 3.24 | 1.85 | 1.20 | 1.18 |
| risk | stay | 3.45 | 3.06 | **3.81** | 1.59 | 1.39 |
| **mean (0–4)** | | **3.15** | **2.99** | **2.21** | **2.06** | **1.22** |

- **httpcloak alone wins the fingerprint criteria:** matchesRealChrome, osCoherence, freshness, cookieMatch and proxyH2. Its newest preset matched real Chrome 157 on JA4 and peetprint.
- **It also loses badly where log depends on it:** WebSocket (0.18), asyncio (0.81), migration (0.69) and maturity (0.59). Its docs show no WebSocket client and no Python asyncio.
- **curl_cffi 0.17 behind one identity comes a close second (2.99).** The hybrid adds httpcloak for plain REST once a bake-off through each platform's own proxy proves it.
- **What was built:** the curlUnified part of the hybrid. `LOG_HTTP_CLIENT` exists but refuses `httpcloak` until its adapter exists, so nothing silently falls back.

## Claims (probability true, both passes)

| Claim | p |
|---|---|
| For the same Chrome version, curl_cffi and httpcloak sent identical JA4 and peetprint fingerprints in the live test. | 0.999 |
| httpcloak's chrome-latest-windows preset matched the real Chrome 157 on this machine on both JA4 and peetprint. | 0.999 |
| curl_cffi 0.16.3, the version log runs, stops at chrome150 and its Chrome targets carry a macOS user agent. | 0.999 |
| curl_cffi 0.17.0 adds Windows Chrome targets (chrome151, chrome152) and Windows Firefox 153-155. | 0.996 |
| httpcloak's documentation shows no WebSocket client API. | 1.000 |
| httpcloak's documentation shows no asyncio API for Python. | 0.999 |
| curl_cffi WebSocket handshakes use the same impersonated TLS fingerprint, proxies and cookies as its HTTP requests. | 1.000 |
| JWriter20, the Camoufox maintainer, recommended httpcloak in Scraping Enthusiasts. | 0.993 |
| Scraping Enthusiasts members reported that random JA3 fingerprints still get blocked and recommended copying a real browser. | 0.998 |
| A member reported that a platform ties cookies to the JA3/JA4 fingerprint they were issued to. | 0.998 |
| log's HTTP clients today present more than three different browser identities. | 0.999 |
| Both libraries produced the same Akamai HTTP/2 fingerprint as real Chrome in the live test. | 0.998 |

## Live test

Real Chrome 157 on this machine against curl_cffi and httpcloak at tls.peet.ws. The table is in [evidence.md](evidence.md#2-live-fingerprint-test-tlspeetwsapiall-no-proxy-this-windows-machine).
