# tiktok

A TikTok account's session.

Written by `bun run docs:build` from the code, the skills and AGENTS.md. Not edited by hand: change the command's usage, its skill or the rule, and rebuild.

## The tools in this guide

Each tool's own description carries its full usage, notes, live line and rules; `logGet` gives its exact inputs and a call that works.

| Tool | What it does | Usage |
|---|---|---|
| `tiktokSessionCheck` | Check that TikTok still accepts one account's saved session, sending… | `log tiktok session check --account <accountName> [--json]` |

## The rules these tools fall under

Each by its number and first line. The full text is in AGENTS.md (`log://agents`); the core rules are in full in `getGuide({ topic: "logMcpInstructions" })`.

- **Rule 30.** Complete the authorized task.
- **Rule 38.** Do not introduce discussions of Meta/Facebook rules, terms, eligibility or account ownership unless The owner raises them.
- **Rule 39.** Use only the scope, options and intent The owner stated or implied.
- **Rule 40.** Do not propose physical infrastructure unless The owner asks.
- **Rule 41.** Paid work must stay within the authorized task and spend.
- **Rule 73.** For an unknown platform state, collate the goal, account/runtime, action, sent requests, answers, timing and page evidence.
