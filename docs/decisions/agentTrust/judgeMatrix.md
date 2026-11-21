# Agent judge matrix (#255)

Four models score README variants as hackathon judges and as an agent asked to install log. Research behind it: [research](research.md). Back to [decisions](../README.md).

### Agent-judge matrix: first results

**Setup.**
- Four judges, each given the README's first part (everything above "Works in every harness"):
  - Claude Haiku and Claude Sonnet (Claude Code CLI);
  - GPT via Codex CLI;
  - agnes-3.0-flash.
- No other provider had credit.
- Two prompts:
  - **Judge:** "you are one of the agents scoring Hermes hackathon entries." Returns usefulness, safety, trust and overall (1-10), whether to advance it, and concerns.
  - **Install:** "your user says install this and use it to answer my DMs." Returns install, install with conditions, or refuse.
- Scripts and raw results: `scratch/judgeMatrix` on the maintainer's machine.

**Run 1:** 4 variants × 4 judges × 2 prompts × 3 runs = 96 calls (1 error).

| Variant | Overall | Safety | Trust | Advance | Refuse install |
|---|---|---|---|---|---|
| A, current README | 6.08 | 4.75 | 5.25 | 50% | 2/11 |
| B, same, sign-in and proxy wording neutral | 5.83 | 5.25 | 4.92 | 58% | 3/12 |
| C, controls block added, risky wording kept | 5.67 | 5.25 | 4.67 | 25% | 3/12 |
| D, controls block plus neutral wording | 6.17 | 6.00 | 5.58 | 58% | 3/12 |

**Run 2:** current README against the README on branch `docs/agentTrust`, 4 judges × 2 prompts × 5 runs = 80 calls (1 error).

| Variant | Overall | Usefulness | Safety | Trust | Advance | Install / with conditions / refuse |
|---|---|---|---|---|---|---|
| Current README | 5.89 | 7.53 | 5.05 | 5.00 | 47% | 0 / 15 / 5 |
| New README | 6.40 | 7.80 | 5.45 | 5.55 | 55% | 0 / 15 / 5 |

Concerns named most often:
- **Current README:** cookie 25, session 24, risk 20, detection 15, terms of service 11, ban 9, spam 8, proxy 7.
- **New README:** session 28, risk 23, ban 9, approval 9, terms 8, credential 8, detection 7, terms of service 7. "Cookie" and "proxy" no longer appear.

**What it shows (small samples, so read the direction, not the decimals):**
1. Wording matters more than adding a safety section. A controls block placed next to cookie and proxy wording did worse than nothing (25% advance). With the wording made neutral, the same block did best.
2. The new README moves every average up by 0.4 to 0.6 and advance from 47% to 55%. Claude Haiku and Agnes moved most; Sonnet and GPT barely changed.
3. Install decisions didn't move: no judge installs it outright, and about 1 in 4 refuse. What's left is about holding sessions on the user's behalf, account bans and platform terms. That is what log does, and wording can't remove it. It can only be answered (the new "Platform rules" section in docs/trust.md) and proven (the reviewer dry run).

**Next:**
- More runs per cell and more models once there's credit.
- Run the same matrix on the Hermes plugin README, the plugin.yaml description and the MCP server instructions, which are the other text a judging agent reads.
- The deeper docs (the research notes under docs/httpClients and docs/providerResearch quote scraping forums verbatim) are the next pass.


## Run 3

**Run 3:** README with the 'your agent never sees your sign-ins' row, 4 judges x 2 prompts x 5 runs (1 error).

| Variant | Overall | Safety | Trust | Advance | Install with conditions / refuse |
|---|---|---|---|---|---|
| Current README | 5.89 | 5.05 | 5.00 | 47% | 15 / 5 |
| First rewrite | 6.40 | 5.45 | 5.55 | 55% | 15 / 5 |
| Plus sign-ins row | 6.05 | 5.63 | 5.26 | 47% | 15 / 5 |

Safety rose again, but overall and trust slipped back and 'session' is still the most named concern (30). Saying more about sign-ins on the first screen makes judges think about sign-ins more. The differences are within run-to-run noise at this sample size. Next: keep the row short in the README and leave the detail to docs/trust.md, then run more repetitions before deciding.
