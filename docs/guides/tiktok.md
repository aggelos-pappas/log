# tiktok

TikTok search, full video exports and account sessions.

Written by `bun run docs:build` from the code, the skills and AGENTS.md (rule 55). Not edited by hand: change the command's usage, its skill or the rule, and rebuild.

## Current scope

This guide describes the current command implementation. Legacy storage names and deferred features in procedure text do not define the native hosted schema. Active rules 171, 172 and 175 govern the target: existing private workspace log.db, central identity/team authorization and minimal routing metadata, with no required Twenty or agency/CRM model. Preserve current execution gates while migrating legacy dependencies explicitly.

## The tools in this guide

| Tool | What it does |
|---|---|
| `tiktokSessionCheck` | Check that TikTok still accepts one account's saved session, sending… |
| `tiktokSearch` | Search TikTok videos in the open account browser |
| `tiktokScrape` | Export full TikTok video details from a query, hashtag or video link |

## Every tool, in full

### `tiktokSessionCheck`

Check that TikTok still accepts one account's saved session, sending nothing.
Check that TikTok still accepts an account's saved session, on the direct-API engine, sending nothing; the answer goes to Twenty
log tiktok session check --account <accountName> [--json]
Checks that TikTok still accepts the account's saved session, on the direct-API engine (login check not implemented yet, no browser). Sends nothing.
TikTok's own answer decides. The result goes to socialAccounts.sessionState, and refreshed cookies are merged back into the row.
Fill the named fields; each value goes through whole.
Before first using this tool in a session, load its guide: getGuide({ topic: "tiktok" }) (TikTok search, full video exports and account sessions).
AGENTS.md (log://agents): rules 175, 63, 2, 73, 83, 30, 38, 39, 40, 41. When matt says to do something, do it completely (rule 30).

### `tiktokSearch`

Search TikTok videos in the open account browser.
Search TikTok videos through the account’s open browser and return video links, captions, creators and available display metadata
log tiktok search --account <name> --query <text or #hashtag> [--limit <1-100>] [--pages <1-10>] [--json]
Uses the account’s open Log inspect browser. Pages counts recorded browser batches, starting with navigation and followed by bounded scrolls. Results retain TikTok’s order. Counts are display text; exhaustive coverage is not claimed.
Fill the named fields; each value goes through whole.
Before first using this tool in a session, load its guide: getGuide({ topic: "tiktok" }) (TikTok search, full video exports and account sessions).
AGENTS.md (log://agents): rules 8, 19, 26, 29, 35, 63, 73, 94, 30, 38, 39, 40, 41. When matt says to do something, do it completely (rule 30).

### `tiktokScrape`

Export full TikTok video details from a query, hashtag or video link.
Collect full video details from TikTok search or a video link using the bundled omkarcloud scraper, retaining its output format
log tiktok scrape --account <name> (--query <text or #hashtag> | --url <video link>) [--limit <1-100>] [--pages <1-10>] [--output <file.json>] [--json]
Searches through the open Log browser, then extracts each video through Log’s bundled omkarcloud/tiktok-scraper engine. Each videos entry preserves the upstream parser output exactly. The collection includes failures, pending links and bounded search coverage. Saves progress after every video when --output is given.
Fill the named fields; each value goes through whole.
Before first using this tool in a session, load its guide: getGuide({ topic: "tiktok" }) (TikTok search, full video exports and account sessions).
AGENTS.md (log://agents): rules 8, 19, 26, 29, 35, 63, 73, 94, 30, 38, 39, 40, 41. When matt says to do something, do it completely (rule 30).

## The rules these tools fall under, in full

From the current AGENTS.md (`log://agents`). Historical citations are consolidated; archived instructions do not override the active scope.

**Rule 2.** 2026-10-18 · Put platform code under src/<platform>/<area>/<domain>; shared code stays in its shared library/domain. Use index.ts, types.ts, client.ts, machine.ts and helpers where appropriate. Keep scripts and Python in domain folders.

**Rule 8.** 2026-10-18 · Platform actions require the user authorization their tool defines. Send, post, react, join, edit and delete only when authorized; preserve explicit live confirmation, governor and account gates. Ordinary reads do not need new approval.

**Rule 19.** 2026-10-18 · Every browser action records its raw HAR and timed step evidence, with no switch to disable capture. Raw private captures may contain credentials. Keep them in the selected private runtime/browser-host storage, never in git, central payload logs or user-facing output. Retention/pruning must preserve required analysis evidence.

**Rule 26.** 2026-10-19 · Stream progress while work runs, one meaningful line per stage, with the run log retained. Explain stages in plain words; do not leave the user waiting silently for a final buffered result.

**Rule 29.** 2026-10-19 · Record a browser page with the existing inspect tool before implementing actions on it. Preserve per-step snapshots, screenshots, HAR and the reading of the internal calls.

**Rule 30.** 2026-10-19 · Complete the authorized task. Do not repeatedly request confirmation already given. Distinguish implemented behavior, proposed contracts and unverified assumptions.

**Rule 35.** 2026-10-19 · Browser work uses one account browser through its active day, with actions as tabs/steps; close only for a logged lifecycle reason. Preserve existing proxy-country, locale/timezone, device/profile, headed visibility, capture, active-hours and launch-budget gates. Keep checkpoint stops and account-specific constraints in the browser/flow guides. Do not create a fresh browser per action.

**Rule 38.** 2026-10-19 · Do not introduce discussions of Meta/Facebook rules, terms, eligibility or account ownership unless Matt raises them.

**Rule 39.** 2026-10-19 · Use only the scope, options and intent Matt stated or implied. Do not add unrelated alternatives to research, comparisons, plans or implementation.

**Rule 40.** 2026-10-19 · Do not propose physical infrastructure unless Matt asks. His available implementation scope is hosted/cloud environments and the tools already selected.

**Rule 41.** 2026-10-19 · Paid work must stay within the authorized task and spend. Ask before adding a paid operation he did not authorize; do not substitute a new paid provider implicitly.

**Rule 63.** 2026-10-22 · Platform commands are log <platform> <command> <what>. Shared commands remain shared. Preserve the naming boundary described in docs/commandNaming.md.

**Rule 73.** 2026-10-23 · For an unknown platform state, collate the goal, account/runtime, action, sent requests, answers, timing and page evidence. Use the existing REA/SubQ reading workflow when applicable, report the unknown state, write Point/Evidence/Explain and the fix, then name the state. Preserve paid-work scope. This runtime analysis does not add SubQ to commit/CI gates.

**Rule 83.** 2026-10-25 · New platforms use the existing scaffold, shared account/session boundary, command/catalog wiring, platform documentation and spec anchors. Native hosted scaffolds must not recreate a Twenty dependency.

**Rule 94.** 2026-10-29 · Every platform call goes through Log and its governor, never a scratch client with account tokens/cookies. A refusal, failed send, 429, block, disable, captcha or cooldown stops that run/account until Matt authorizes continuation. Do not retry through refusals. Bulk reading and sending are separate sessions; cold DMs stay a few a day, minutes apart, and opening a DM counts as a write.

**Rule 175.** 2026-11-11 · Use existing log.db and platform-agnostic engine contracts for native schemas. Do not copy Twenty agency prefixes or CRM/SMS structures. Old listing/campaign functionality is deferred. Add only missing account/credential and hosted execution contracts; preserve existing identity, message, queue, job and governor authorities.
