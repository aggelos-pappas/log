# Docs audit: links and agent wording (#255)

Back to [decisions](../README.md); rules this audit checks against: [research](research.md).

Branch docs/agentTrust (PR #256). Doc set: README.md, AGENTS.md, CHANGELOG.md, skills.md and every .md under docs/ (796 pages). A link counts when it is a markdown, reference or <a href> link outside code, relative or to this repo's GitHub blob/tree URL; a folder link counts as its README. Measured by scripts/checks/checkDocLinks.ts.

## Headline

| Measure | Before | After this branch |
|---|---|---|
| Pages | 796 | 796 |
| Broken internal links | 26 | 0 |
| Orphans (no inbound link from another doc) | 530 | 495 |
| Dead ends (no outbound doc link) | 636 | 590 |
| Reachable from README by clicking | 150 | 239 |
| Max click depth from README | 4 | 4 |
| Risk words on agent-facing pages (checkAgentWording) | 40 | 0 |

Most of what is left is captured platform API notes (docs/platforms/**, not edited here) and private folders (docs/site.json `private`); see the per-folder table.

## Pages per folder (before → after)

| Folder | Pages | Orphans | Dead ends | Unreachable from README |
|---|---|---|---|---|
| docs/platforms/facebook/background | 135 | 107 → 107 | 126 → 126 | 135 → 135 |
| docs/platforms/discord/background | 74 | 74 → 74 | 74 → 74 | 74 → 74 |
| docs/specs | 57 | 1 → 0 | 43 → 43 | 26 → 0 |
| docs | 49 | 20 → 1 | 16 → 1 | 27 → 1 |
| docs/platforms/linkedin/background | 48 | 48 → 48 | 48 → 48 | 48 → 48 |
| docs/platforms/facebook/profile | 35 | 30 → 30 | 35 → 35 | 35 → 35 |
| docs/guides | 28 | 10 → 10 | 21 → 21 | 10 → 10 |
| docs/platforms/facebook/groups | 28 | 6 → 6 | 15 → 15 | 28 → 26 |
| docs/platforms/facebook/flows | 19 | 15 → 15 | 10 → 10 | 19 → 19 |
| docs/platforms/slack/boot | 17 | 17 → 17 | 17 → 17 | 17 → 17 |
| docs/proposals | 17 | 2 → 2 | 7 → 7 | 3 → 2 |
| docs/useCases/twitter | 17 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/useCases/inbox | 15 | 8 → 0 | 12 → 0 | 9 → 0 |
| docs/platforms/slack/activity | 14 | 14 → 14 | 14 → 14 | 14 → 14 |
| docs/platforms/slack/messages | 12 | 12 → 12 | 12 → 12 | 12 → 12 |
| docs/platforms/slack/conversations | 9 | 9 → 9 | 9 → 9 | 9 → 9 |
| docs/platforms/instagram/background | 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| docs/platforms/slack/files | 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| docs/platforms/slack/people | 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| docs/harnesses | 7 | 0 → 0 | 6 → 0 | 0 → 0 |
| docs/platforms/facebook/checkpoint | 7 | 7 → 7 | 7 → 7 | 7 → 7 |
| docs/platforms/facebook/listingForm | 7 | 7 → 7 | 7 → 7 | 7 → 7 |
| docs/platforms/facebook/login | 7 | 7 → 7 | 7 → 7 | 7 → 7 |
| docs/platforms/facebook/photos | 7 | 5 → 5 | 7 → 7 | 7 → 7 |
| docs/platforms/facebook/reels | 7 | 7 → 7 | 7 → 7 | 7 → 7 |
| docs/platforms/reddit/account | 7 | 7 → 7 | 7 → 7 | 7 → 7 |
| docs/rea | 7 | 1 → 0 | 0 → 0 | 7 → 0 |
| docs/extensions | 6 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/listingPublish | 6 | 0 → 0 | 0 → 0 | 6 → 0 |
| docs/platformGuides | 6 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/platforms/reddit/community | 6 | 6 → 6 | 6 → 6 | 6 → 6 |
| docs/useCases/discord | 6 | 0 → 0 | 1 → 0 | 0 → 0 |
| docs/decisions/mcpReload | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/decisions/processLimits | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/decisions/slopDetector | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/platforms/reddit/experiments | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/platforms/reddit/telemetry | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/providerResearch | 5 | 5 → 5 | 5 → 5 | 5 → 5 |
| docs/useCases/log | 5 | 4 → 0 | 5 → 0 | 4 → 0 |
| . | 4 | 2 → 2 | 2 → 2 | 2 → 2 |
| docs/decisions/pipeline | 4 | 3 → 3 | 4 → 4 | 3 → 3 |
| docs/platforms/discord | 4 | 4 → 4 | 4 → 4 | 4 → 4 |
| docs/platforms/reddit/chat | 4 | 4 → 4 | 4 → 4 | 4 → 4 |
| docs/platforms/reddit/feed | 4 | 4 → 4 | 4 → 4 | 4 → 4 |
| docs/platforms/slack/telemetry | 4 | 4 → 4 | 4 → 4 | 4 → 4 |
| docs/decisions/voiceOptions | 3 | 3 → 3 | 3 → 3 | 3 → 3 |
| docs/platforms/facebook/location | 3 | 2 → 2 | 3 → 3 | 3 → 3 |
| docs/platforms/reddit/background | 3 | 3 → 3 | 3 → 3 | 3 → 3 |
| docs/platforms/reddit/inbox | 3 | 3 → 3 | 3 → 3 | 3 → 3 |
| docs/rea/parallel | 3 | 0 → 0 | 3 → 3 | 3 → 0 |
| docs/httpClients | 2 | 0 → 0 | 1 → 1 | 2 → 0 |
| docs/platforms/facebook | 2 | 2 → 2 | 1 → 1 | 2 → 2 |
| docs/platforms/facebook/publishing | 2 | 1 → 1 | 2 → 2 | 2 → 2 |
| docs/platforms/reddit/comments | 2 | 2 → 2 | 2 → 2 | 2 → 2 |
| docs/platforms/tiktok/flows | 2 | 2 → 2 | 2 → 2 | 2 → 2 |
| docs/platforms/x | 2 | 2 → 2 | 1 → 1 | 2 → 2 |
| docs/platforms/x/xchat | 2 | 1 → 1 | 0 → 0 | 2 → 2 |
| docs/proxyVendors | 2 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/useCases/facebook | 2 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/useCases/instagram | 2 | 0 → 0 | 2 → 0 | 0 → 0 |
| docs/useCases/linkedin | 2 | 0 → 0 | 2 → 0 | 0 → 0 |
| docs/decisions/benchmarks | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/decisions/genuiEverywhere | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/platforms/instagram | 1 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/platforms/linkedin | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/platforms/reddit | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/platforms/reddit/profile | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/platforms/slack | 1 | 0 → 0 | 1 → 1 | 0 → 0 |
| docs/platforms/slack/signin | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/platforms/tiktok | 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| docs/rea/matrix | 1 | 0 → 0 | 1 → 1 | 1 → 0 |
| docs/useCases | 1 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/useCases/reddit | 1 | 1 → 0 | 1 → 0 | 1 → 0 |
| docs/useCases/slack | 1 | 0 → 0 | 0 → 0 | 0 → 0 |
| docs/useCases/tiktok | 1 | 1 → 0 | 1 → 0 | 1 → 0 |
| docs/useCases/web | 1 | 0 → 0 | 1 → 0 | 0 → 0 |
| docs/voice | 1 | 1 → 1 | 1 → 1 | 1 → 1 |

## Broken links found (all fixed)

All 26 were in copies of other projects' READMEs kept under docs/decisions, with links relative to their own repo. Each now points at the upstream file (`https://github.com/<owner>/<repo>/blob/HEAD/<path>`):

- docs/decisions/mcpReload/readme_mcpmon.md: `./tests/`
- docs/decisions/mcpReload/readme_mcpmon.md: `TROUBLESHOOTING.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `CONTRIBUTING.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `CONTRIBUTING.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `docs/api.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `docs/architecture.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `docs/testing.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `TROUBLESHOOTING.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `CONTRIBUTING.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `CHANGELOG.md`
- docs/decisions/mcpReload/readme_mcpmon.md: `LICENSE`
- docs/decisions/mcpReload/readme_reloaderoo.md: `banner.png`
- docs/decisions/mcpReload/readme_reloaderoo.md: `docs/CONTRIBUTING.md`
- docs/decisions/mcpReload/readme_reloaderoo.md: `docs/TESTING_GUIDELINES.md`
- docs/decisions/mcpReload/readme_reloaderoo.md: `LICENSE`
- docs/decisions/slopDetector/repos.md: `references/patterns.md`
- docs/decisions/slopDetector/repos.md: `ETHICS.md`
- docs/decisions/slopDetector/repos.md: `docs/MODELS.md`
- docs/decisions/slopDetector/repos.md: `tests/eval/slopbench/`
- docs/decisions/slopDetector/repos.md: `patterns.json`
- docs/decisions/slopDetector/repos.md: `INSTALL.md`
- docs/decisions/slopDetector/repos.md: `record/session_capture.py`
- docs/decisions/slopDetector/repos.md: `record/session.json`
- docs/decisions/slopDetector/repos.md: `README.zh-CN.md`
- docs/decisions/slopDetector/repos.md: `README.ru.md`
- docs/decisions/slopDetector/repos.md: `README.es.md`

## Top 30 worst pages (hand-written or generated, before), and the fix

Score: orphan 2, dead end 1, unreachable 1; ties by length.

| # | Page | Kind | In | Out | Depth | Lines | Fix | After (in/out) |
|---|---|---|---|---|---|---|---|---|
| 1 | docs/unifyStorage.md | source | 0 | 0 | ∞ | 425 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 2 | docs/storageAgainstTheBook.md | source | 0 | 0 | ∞ | 230 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 3 | docs/guides/logMcpInstructions.md | generated | 0 | 0 | ∞ | 218 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 4 | docs/status.md | source | 0 | 0 | ∞ | 195 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 5 | docs/guides/extensions.md | generated | 0 | 0 | ∞ | 186 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 6 | docs/storageReadPath.md | source | 0 | 0 | ∞ | 180 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 7 | docs/guides/ui.md | generated | 0 | 0 | ∞ | 153 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 8 | docs/toolCallsAgainstTheBook.md | source | 0 | 0 | ∞ | 138 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 9 | docs/hookStartup.md | source | 0 | 0 | ∞ | 129 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 10 | docs/guides/instagram.md | generated | 0 | 0 | ∞ | 117 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 11 | docs/toolCallSpeed.md | source | 0 | 0 | ∞ | 98 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 12 | docs/guides/console.md | generated | 0 | 0 | ∞ | 81 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 13 | docs/guides/newPlatform.md | generated | 0 | 0 | ∞ | 81 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 14 | CHANGELOG.md | generated | 0 | 0 | ∞ | 77 | generated: link from its generator | 0/0 |
| 15 | docs/voice/perPersonVoice.md | source | 0 | 0 | ∞ | 70 | link from its folder README (not done) | 0/0 |
| 16 | docs/opencodeHooks.md | source | 0 | 0 | ∞ | 68 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 17 | docs/guides/governor.md | generated | 0 | 0 | ∞ | 62 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 18 | skills.md | source | 0 | 0 | ∞ | 58 | link from its folder README (not done) | 0/0 |
| 19 | docs/useCases/tiktok/post.md | source | 0 | 0 | ∞ | 49 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 20 | docs/listingMonitor.md | source | 0 | 0 | ∞ | 44 | listed in howItWorks.md Related + footer up to it (done) | 1/3 |
| 21 | docs/useCases/log/toolHealth.md | source | 0 | 0 | ∞ | 41 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 22 | docs/guides/tiktok.md | generated | 0 | 0 | ∞ | 40 | generated by renderGuide (src/mcp/server/helpers/guides.ts): add a Related footer there linking its platform guide and the core guide (not done) | 0/0 |
| 23 | docs/useCases/reddit/contributorMaxxing.md | source | 0 | 0 | ∞ | 40 | row in docs/useCases/README.md + Related footer up to it (done) | 1/4 |
| 24 | docs/useCases/log/updateLog.md | source | 0 | 0 | ∞ | 38 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 25 | docs/useCases/log/browserMove.md | source | 0 | 0 | ∞ | 36 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 26 | docs/antigravityHooks.md | source | 0 | 0 | ∞ | 35 | listed in howItWorks.md Related + footer up to it (done) | 1/2 |
| 27 | docs/useCases/inbox/labelQueue.md | source | 0 | 0 | ∞ | 35 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 28 | docs/useCases/log/localModels.md | source | 0 | 0 | ∞ | 35 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 29 | docs/useCases/inbox/governorReset.md | source | 0 | 0 | ∞ | 34 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |
| 30 | docs/useCases/inbox/ignoreServer.md | source | 0 | 0 | ∞ | 32 | row in docs/useCases/README.md + Related footer up to it (done) | 1/3 |

## The 40 risk words that were left, and the rewrite used

Counted by scripts/checks/checkAgentWording.ts (prose only; code in backticks is not counted). Generated copies follow their source: docs/useCases/<p>/<page>.md → .claude/skills/log-<p>-<page>/SKILL.md and hermesPlugin/skills/... (`bun run skills:build`); skills/<name>/SKILL.md → docs/guides/*.md (`bun run docs:build`). Each rewrite was made once, in the source.

| # | Where (file:line, before) | Word | Source edited | Neutral rewrite (same meaning) |
|---|---|---|---|---|
| 1-3 | docs/useCases/twitter/engagerDms.md:23, :41, :44 | cold DM ×3 | same file | "Write each DM the first-DM way below"; heading "How a first DM opens" |
| 4-5 | .claude/skills/log-twitter-engager-dms/SKILL.md:35, :38 | cold DM ×2 | engagerDms.md | as above |
| 6-7 | hermesPlugin/skills/log-twitter-engager-dms/SKILL.md:35, :38 | cold DM ×2 | engagerDms.md | as above |
| 8-10 | docs/useCases/twitter/managerMaxxing.md:3, :64, :76 | cold dm/DM ×3 | same file | line 3 quoted the owner's post; now a paraphrase with the post's link kept: "find the manager of every Kick streamer on X, reply to their posts for a few days, then send each one a first DM about using log and showing Clavicular's X"; steps: "the first DM, the network-maxing way" |
| 11-13 | .claude/skills/log-twitter-manager-maxxing/SKILL.md:3, :15, :64/:76 | cold dm/DM ×3 | managerMaxxing.md | as above |
| 14-16 | hermesPlugin/skills/log-twitter-manager-maxxing/SKILL.md:3, :15, :64/:76 | cold dm/DM ×3 | managerMaxxing.md | as above |
| 17 | docs/useCases/twitter/networkMaxing.md:86 | cold DM | same file | "the first-DM way in engagerDms.md" |
| 18-19 | .claude/ and hermesPlugin/skills/log-twitter-network-maxing/SKILL.md:82 | cold DM ×2 | networkMaxing.md | as above |
| 20 | docs/useCases/twitter/nicheMapRegion.md:52 (and its diagram line 24) | cold DM | same file | "Each opener the first-DM way" |
| 21-22 | .claude/ and hermesPlugin/skills/log-twitter-niche-map-region/SKILL.md:36 | cold DM ×2 | nicheMapRegion.md | as above |
| 23 | docs/useCases/twitter/replyGuyFunnel.md:93 | cold DM | same file | "A first DM with the ask in it to someone who just followed" |
| 24-25 | .claude/ and hermesPlugin/skills/log-twitter-reply-guy-funnel/SKILL.md:83 | cold DM ×2 | replyGuyFunnel.md | as above |
| 26-28 | docs/guides/xSending.md:207, :228 (×2) | cold DM ×3 | skills/xPosting/SKILL.md:133, :154 | "(the first-DM way)"; "A first DM opens on their own tweet." |
| 29 | docs/useCases/facebook/marketplaceListings.md:94 | fingerprint | same file | "Each account keeps one browser identity, the same device profile every session (rule 35)" |
| 30 | .claude/skills/log-facebook-marketplace-listings/SKILL.md:72 | fingerprint | marketplaceListings.md | as above |
| 31-32 | docs/useCases/log/browserMove.md:34 | Fingerprint ×2 | same file | "**The device profile stays behind.** … AdsPower's device profile (the browser identity it presents) does not carry." |
| 33-36 | .claude/ and hermesPlugin/skills/log-log-browser-move/SKILL.md:36 | Fingerprint ×4 | browserMove.md | as above |
| 37 | docs/useCases/inbox/signIn.md:38 | captcha | same file | "A picture puzzle the platform shows, a code the platform sends, or a security check is the owner's to answer" |
| 38-39 | .claude/ and hermesPlugin/skills/log-inbox-sign-in/SKILL.md:38 | captcha ×2 | signIn.md | as above |
| 40 | README.md:553 | fingerprinted | same file | "HTTP for X and Discord that sends the same TLS handshake and headers as the account's own browser" |
| +1 | docs/guides/facebookMarketplace.md:107 | captchas | skills/accountToDryRun/SKILL.md:64 | "login puzzles solved (CaptchaKraken, then 2Captcha)": still names the solving services, nothing hidden |
| +1 | docs/guides/facebookBrowser.md:208 | fingerprint | skills/host/SKILL.md:104 | Facebook's own passkey prompt, now quoted as the literal UI string (in backticks, as the code matches it): `Use face scan, fingerprint or screen lock to confirm it's you` (a phone's biometric unlock, not a browser identity) |

(The baseline file held 40; the per-line count is a few higher because the two .claude/hermesPlugin copies and diagram lines repeat the same sentence.) After `--write`, scripts/checks/agentWordingBaseline.json is `{}`.

## What was changed for linking (step 3)

- docs/install.md, accounts.md, mcp.md, trust.md, usingLog.md, updates.md, commandNaming.md: a Related footer up to README and across the start-here pages, then down to use cases, agent apps, platform guides, reference, how it works.
- docs/useCases/README.md: 20 use-case pages it did not list now have rows (Discord ×4, Reddit, TikTok, inbox ×9, log ×4, X managerMaxxing); Related footer up to README and the start-here pages.
- docs/useCases/twitter/README.md: replyGuyFunnel row; Related up to the use-case index and the X guide.
- Every docs/useCases/<platform>/<page>.md: Related footer up to the index (and the X index for X pages), its platform guide, mcp and trust. Skills get the same footer through skills:build.
- docs/harnesses/*.md (6 dead ends): Related up to harnesses/README.md, mcp, install. harnesses/README.md links up to README.
- docs/platformGuides/*.md: Related up to README, use cases, accounts, mcp, trust.
- docs/howItWorks.md: Related lists every page of the site's How-it-works sections (38 pages, 20 of them orphans before); each of those pages links back up.

## Not done (exact next fixes)

- docs/guides/*.md (21 dead ends, 10 orphans) are generated by renderGuide: add a Related footer in src/mcp/server/helpers/guides.ts linking each guide to its platform guide and the core guide, and list the guides from docs/reference.md's hand part.
- docs/specs/*.md (≈45 dead ends): add an `Up: [Specs](README.md)` line; docs/specs/README.md is generated, so the footer goes in the spec pages or in specsIndex.
- docs/platforms/** (≈400 orphans/dead ends): captured API notes; give each platform folder a README that lists its captures (generated by the capture tool) rather than hand-editing captures.
- Private folders (decisions, proposals, providerResearch, …): not on the site; link each from its decision index if they are meant to be read.
- CHANGELOG.md, skills.md, docs/voice/perPersonVoice.md, docs/commandNaming.md (orphan): link from README's docs list.
- scripts/checks/docLinksBaseline.json lists the remaining orphans and dead ends by file; `bun run check:docLinks` fails on any new one and on any broken link.

Guide sizes (check:agnostic) did not grow: the rewrites are kept at or under the old length, and the guideChars baseline moved down for facebookMarketplace, xSending, governor and logMcpInstructions.
