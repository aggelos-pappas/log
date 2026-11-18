# tiktok

A TikTok account's session, and how it is doing: followers and each post's views, likes, comments, shares and saves.

Written by `bun run docs:build` from the code, the skills and AGENTS.md. Not edited by hand: change the command's usage, its skill or the rule, and rebuild.

## Use cases these tools are part of

When the owner asks for one of these, follow its page step by step.

| Use case | What it is | How the owner asks for it |
|---|---|---|
| `getGuide({ useCase: "tiktok/post" })` | Posting a video on TikTok, and deleting it | "post this on tiktok", "put the video on tiktok", "post it to tiktok with this caption", "delete that tiktok", "take the tiktok down" |

## The tools in this guide

Each tool's own description carries its full usage, notes, live line and rules; `logGet` gives its exact inputs and a call that works.

| Tool | What it does | Usage |
|---|---|---|
| `tiktokSessionCheck` | Check that TikTok still accepts one account's saved session, sending… | `log tiktok session check --account <accountName> [--json]` |
| `tiktokStats` | Read the account's followers and its own posts' views, likes… | `log tiktok stats --account <accountName> [--limit <n>] [--json]` |
| `tiktokPost` | Post one video on TikTok with no browser | `log tiktok post --account <accountName> --video <path> --caption "<caption>" [--visibility everyone\|friends\|onlyMe] [--approvedBy <who>] [--live] [--json]` |
| `tiktokPostLive` | Post one video on TikTok with no browser, live on TikTok | `log tiktok post --account <accountName> --video <path> --caption "<caption>" [--visibility everyone\|friends\|onlyMe] [--approvedBy <who>] [--live] [--json]` |
| `tiktokDelete` | Delete one of the account's own TikTok posts with no browser | `log tiktok delete --account <accountName> --id <postId> [--approvedBy <who>] [--live] [--json]` |
| `tiktokDeleteLive` | Delete one of the account's own TikTok posts with no…, live on TikTok | `log tiktok delete --account <accountName> --id <postId> [--approvedBy <who>] [--live] [--json]` |

## The rules these tools fall under

Each by its number and first line. The full text is in AGENTS.md (`log://agents`); the core rules are in full in `getGuide({ topic: "logMcpInstructions" })`.

- **Rule 8.** Platform actions require the user authorization their tool defines.
- **Rule 30.** Complete the authorized task.
- **Rule 38.** Do not introduce discussions of Meta/Facebook rules, terms, eligibility or account ownership unless The owner raises them.
- **Rule 39.** Use only the scope, options and intent The owner stated or implied.
- **Rule 40.** Do not propose physical infrastructure unless The owner asks.
- **Rule 41.** Paid work must stay within the authorized task and spend.
- **Rule 73.** For an unknown platform state, collate the goal, account/runtime, action, sent requests, answers, timing and page evidence.
- **Rule 94.** Every platform call goes through Log and its governor, never a scratch client with account tokens/cookies.
