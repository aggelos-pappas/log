# Agent trust research (#255)

Why agents reading log marked it down, and what the papers say about fixing it. Decision: [README](../../../README.md) and [trust page](../../trust.md); results in [judge matrix](judgeMatrix.md); page-by-page state in [docs audit](docsAudit.md). Back to [decisions](../README.md).

### Research: who won, what judges complained about, and what the papers say

#### How it was judged
- Nous: "Agents scored every entry, then five community judges ranked the finalists to pick the top 10" (https://x.com/NousResearch/status/2123882430620733742).
  - Judges: @HermesWatcher, @KSimback, @rlaope, @LiorNsnd and @iamlukethedev.
- Teknium in the Nous Discord: entries "had thorough code inspections before they got sent to judges to rank. Plugins that had major issues were ranked lower."
- About 1,000 entries; a third-party re-judge lists 1,464 (https://imd-judged-the-hermes-plugin-hac.imd.site/).
- The marketplace has a `hackathon-judge` plugin with a 45-row checklist: 12 build-guide rules, 18 catalog rules, 5 prerequisites, 5 hackathon requirements and 5 qualitative criteria. That is very likely close to what the scoring agents checked.

#### The top 10 and what they have in common
| Place | Plugin | One-line pitch (from the README) |
| --- | --- | --- |
| 1 | Foreman (PedValme/foreman) | "A green check the agent did not rig": blocks agents that weaken tests or commit secrets |
| 2 | Housemate (RaYYeR220/housemate) | Old phones become room speakers for Hermes, with spoken approvals |
| 3 | Plan Mode (100yenadmin/hermes-plan-mode) | The agent explores read-only and must get the plan approved before writing |
| 4 | Seedguard (Investorquab/Seedguard) | "The model never sees your keys; your tools can still use them" |
| 5 | Ariadne (miracle352/hermes-ariadne) | Record a session, replay it with no model, and see what changed |
| 6 | Mandate (JoeProAI/mandate) | Least-privilege rulebook for unattended cron jobs: "29 of 29 attack calls blocked" |
| 7 | safe-swap (itsolaph/hermes-safe-swap) | Rewrites dangerous commands (force push, rm -r) into recoverable ones |
| 8 | Promise Keeper (MokiMeow/promise-keeper) | Rules said in chat, enforced on every tool call, changeable only by you |
| 9 | Hermes Canvas (0xbyt4/hermes-canvas) | Live plan canvas whose box status comes from hooks, not the model |
| 10 | Hermes Gadget SDK (adolandev) | Hermes on 29 hardware boards with a face per profile |

Seven of the ten are about **the user keeping control of the agent**: guardrails, approvals, secrets, rollback. The other three are hardware or desktop experiences.

What the winning READMEs share:
1. **The first line is a promise that protects the user**, not a list of capabilities.
2. **Real numbers up front**: "29 of 29 blocked", "0 of 120 attack runs did harm vs 18 with defaults", "162 tests pass".
3. **A "For judges" section** with one command that proves it works without an API key (Mandate: `make bench` and `make prove`).
4. **What it does not do**, said plainly (safe-swap: "It is not a guard"; Housemate lists what wasn't tested).
5. **Behaviour comes from deterministic hooks, not the model** (Canvas, Foreman, Promise Keeper).
6. **Badges for CI and tests**, and dependencies listed as fail-closed.

#### How our README reads next to them
It opens with "One command for every social account you run… let Claude Code, Codex or Cursor do it through the MCP server." To a reviewing model that means **an agent acting as a person on social platforms**, with the controls (owner approval, voice gate, governors, one session per account) far below the first screen. It has no numbers, no "for judges" command and no "what it won't do" section. The docs underneath carry the risk words counted above.

#### What people in the Nous Discord complained about (#hackathon, after the results)
- **Design bakery:** "so many entries seem to tackle variations of the same problem: agent safety, permissions, guardrails… surprised there wasn't more diversity… were the plugins actually tested hands-on… or primarily evaluated through AI scoring?"
- **coolbean:** asked to see scores and feedback.
- **Arch.xyz:** "No memory plugin were in the top 10."
- **Arts Bro:** mocked a winner's "it took hours, and it was worth it".
- **Us:** agents actively dislike the tool's concept (outbound, and holding cookies and secrets) and judge it lower even though it's useful. We asked whether submission docs should be written for agents. No answer yet.

#### What the research says (arXiv)
- **Advertising to Agents** (arXiv 2605.23916):
  - Wording in a tool's listing changes which tool agents pick. Stacked praise raised pick rate by about 43 points.
  - Structured fields (limits and specs as fields) helped agents choose correctly, and sales text next to them erased that gain.
- **Which Metadata Matters for LLM Tool Selection in MCP?** (arXiv 2610.14334):
  - 367,174 MCP tools studied.
  - The parameter schema shifts selection the most; descriptions that explain parameters raise selection.
- **ToolTweak** (arXiv 2510.02554): rewriting only names and descriptions moved selection from about 20% to 81%, and the effect transfers between models.
- **Warning-induced over-abstention / AgentAbstain** (arXiv 2611.14864):
  - Risk wording alone makes agents refuse legitimate tasks (Gemini went from 9.8% to 86.3%).
  - Caution-first prompting makes it worse.
  - Verifying the claim against authoritative evidence fixes much of it.
- **OR-Bench** (ICML 2025, cui25a): models over-refuse harmless requests that look like harmful ones on the surface, across 32 models in 8 families.

Inference, not proven for this hackathon: an agent scoring entries with a safety-first checklist reads "contacting people" and "holds cookies and sessions" as risk and scores down. That's the same behaviour these papers measure on tool selection and refusals. Our controls exist but aren't the first thing it reads, and nothing in the repo lets it verify them quickly.

#### Changes this adds to the plan above
1. **Rewrite the README's first screen as a control promise.** For example: "Your agent answers your DMs in your voice, and nothing sends until you approve it." Then the controls, then the platforms.
2. **Add a "For judges / reviewers" section** with one keyless command that proves the controls: a dry run that shows a send blocked without approval, the voice gate refusing, and a governor cap.
3. **Publish numbers**: sends approved versus blocked, voice-gate pass rate (#224), tests passing, and an outbound rate cap.
4. **Add "What log will not do"**: no scraping of people's data, no sends without the owner, no buying accounts, credentials never leave the machine.
5. **Structured fields over prose** in the plugin manifest and MCP tool descriptions: limits and approvals as fields, no sales wording. Per 2605.23916 and 2610.14334, that is what agents trust.
6. **Run our own copy of the `hackathon-judge` checklist** and the agent-reader benchmark before the next submission, and fix every row.
7. **Find log's score on the third-party re-judge** to see where it ranked and why.


### More research: context engineering for agent readers (from the Vibe Coder University research thread, 2026-11-21)

These papers were found through the VIBE BOT research thread. Lost in the Middle, The Stack, StarCoder 2, RepoBench, EASYTOOL and ToolTweak are established. The rest are recent preprints that haven't been read in full here, so check the version before citing them.

#### What an agent actually reads
- **The agent mostly sees the MCP tool list, not the README.** A host only puts the README in context if something fetches it. So the tool names, descriptions and schemas, plus `plugin.yaml`, are the main thing being judged. The README and `docs/trust.md` matter to coding agents that read the repo.
- [Lost in the Middle](https://arxiv.org/abs/2307.03172): models use facts at the start and end of long context more reliably than facts in the middle. That supports putting the controls first, as #256 does.
- [From Docs to Descriptions: smell-aware evaluation of MCP server descriptions](https://arxiv.org/abs/2602.18914): a checklist for MCP descriptions that leave out or misstate side effects. The closest match to our problem. Next step: audit log's tool descriptions with its criteria.
- [Tools are under-documented: document expansion boosts tool retrieval (Tool-DE, ICLR 2026)](https://arxiv.org/abs/2510.22670): richer, structured tool descriptions get picked correctly more often.
- [EASYTOOL](https://arxiv.org/abs/2401.06201): short, task-shaped tool instructions beat long prose.
- [Verification-guided context optimization for tool calling](https://arxiv.org/abs/2512.13860): rewrite the tool docs and keep a revision only if measured tool use improves. This is the loop the judge matrix should become.

#### Trust and calibration
- [MCPShield: adaptive trust calibration in MCP agents](https://arxiv.org/abs/2602.14281): how agents assess the risk of third-party tools.
- [Towards verifiably safe tool use](https://arxiv.org/abs/2601.08012): point to enforced limits and evidence, not claims in prose.
- [The confidence dichotomy in tool-use agents](https://arxiv.org/abs/2601.07264): whether an agent trusts a tool is only useful if that trust matches how reliable the tool really is.
- [Tool preferences in agentic LLMs are unreliable](https://arxiv.org/abs/2505.18135) and [ToolTweak](https://arxiv.org/abs/2510.02554): wording changes which tool gets picked, which is also a warning that you can win selection without being any safer.
- [Stability of tool-integrated agents](https://arxiv.org/abs/2506.21967) and [Quantitative certification of tool selection](https://arxiv.org/html/2510.03992): test across reworded prompts and competing tools, not one model's opinion.

#### Training data
- [The Stack](https://arxiv.org/abs/2211.15533) and [StarCoder 2 / The Stack v2](https://arxiv.org/abs/2402.19173): code models are trained on GitHub repos and their docs. There is no public dataset of "good" and "bad" repos to aim at. We also can't know whether a given hosted model has seen log.
- `llms.txt` is a proposal, not something models are trained on. There is no single doc format every frontier model follows.

#### What this changes in the plan
1. **Cosine similarity is the wrong lever.** It decides which text an embedding search pulls up. It doesn't decide how a model reads text already in its context. What the evidence supports is structured, factual descriptions with the important facts first, not a positive tone.
2. **Use one shape for every tool description and agent-facing doc:** job, when to use it, the exact action, side effects and whether approval is needed, evidence (a test or file), and limits. A read tool says "read only, sends nothing"; a send tool names the approval check that runs and links its test.
3. **Measure four things separately, not a mood score:**
   - (a) the agent restates what log does and its controls correctly;
   - (b) it picks the right tool for a harmless read task;
   - (c) it uses it safely;
   - (d) it stops or asks before an unapproved send.

   False refusals on harmless tasks count as failures. So does going along with an unsafe request.
4. **Next experiment:** take one MCP tool (`discordRead` and `discordSendLive`) and write two descriptions, the current one and one in the structured shape. Run the harmless read and the unapproved send across the matrix models, five repeats each, and store the results here.
5. **Description audit:** score every tool description against the From Docs to Descriptions checklist and fix the worst ones first.


### Docs research for #255: structure, linking and wording that agents read well

This is research to guide the rewrite of all docs, building on the papers already listed in this issue. I opened every paper below (arXiv abstract or full abstract via the arXiv API). Numbers come from the abstracts. Where a paper gives no number, the cell says so.

#### 1. New papers

| # | Paper | arXiv | Finding | Number |
|---|---|---|---|---|
| 1 | Structure-Aware Semantic Chunking with Title-Chain Prefixes (2026) | 2608.00824 | Splitting Markdown at headers and adding the heading chain (H1 > H2 > H3) to each chunk improves retrieval. Without the heading chain, even human annotators could not agree on what a chunk was about. | MRR@5 0.374 → 0.463 (+23.8%); annotator kappa 0.45 → 0.04 without prefixes |
| 2 | Does Document Structure Help Dense Retrieval? Placebo-controlled ablation (2026) | 2610.10170 | Chunks that follow real section boundaries with real heading paths beat fixed windows and a shuffled-heading placebo. The gain comes from what the headings say, not from extra tokens. Naive two-stage hierarchical retrieval hurts. | +0.010 to +0.022 cov-nDCG@10 (small but significant) |
| 3 | A Systematic Investigation of Document Chunking Strategies (2026) | 2603.06976 | Across 36 chunking methods, content-aware (paragraph-group) chunking beats fixed-size splitting by a wide margin. | nDCG@5 ≈0.459 vs <0.244; Hit@5 ≈59% |
| 4 | LARAG: Link-Aware Retrieval in Hyperlinked Technical Documentation (2026) | 2605.07517 | Using the author's own hyperlinks between doc pages as retrieval metadata gives better answers while retrieving fewer chunks and generating fewer tokens. | Best BERTScore F1 on 20 expert queries (no single headline delta) |
| 5 | WebWalker: Benchmarking LLMs in Web Traversal (2025) | 2501.07572 | Agents have trouble going through a site's subpages to find information that sits deeper than the landing page. Search alone returns shallow content. | No headline number in abstract (benchmark is "challenging") |
| 6 | Lost in the Middle (2023) | 2307.03172 | Models use information at the start or end of their context best, and do much worse with information in the middle, even long-context models. | Qualitative U-shaped curve (no single number in abstract) |
| 7 | Evaluating AGENTS.md: Are Repository-Level Context Files Helpful? (2026) | 2602.11988 | Context files do not generally raise task success, and they raise cost. Agents follow the instructions in them, but repo overviews do not help. | >20% higher inference cost; no general success gain |
| 8 | On the Impact of AGENTS.md Files on Efficiency of AI Coding Agents (2026) | 2601.20404 | With AGENTS.md present, agents finished faster and used fewer output tokens, with similar task completion. | −28.64% median runtime, −16.58% output tokens |
| 9 | Toward an Evidence-Based Template for Agent Instruction Files (2026) | 2611.02383 | Many repos keep several instruction formats, and these often disagree. Most files are rarely updated. A template raises coverage. | 16.1% of paired sections diverge; 40.4% of files edited once; coverage 18.7% → 82.8% with a template |
| 10 | Guardrails Beat Guidance: rules, skills and config for coding agents (2026) | 2604.11088 | Every rule that helped on its own was a negative constraint ("do not …"). Every rule that hurt was a positive directive. | 25,532 rules, 5,000+ runs; +13.8pp for rule files (curated = random) |
| 11 | Do They Do as They Are Told? Adherence to context-file instructions (2026) | 2611.13709 | Agents usually follow context-file instructions. Adherence is split, though: some instruction types are always followed and others never are. | No headline number in abstract |
| 12 | Lessons Outlive Their Failures: rules for AI coding agents (2026) | 2610.32578 | Stale documentation was the largest class of agent failures. One LLM audit run found only about half of the known drift. Mechanical checks stopped recurrence. | Drift 48 of 118 failures; audit recall ≈50% |
| 13 | AI Cannot Review What Humans Catch: reviews of agent instruction files (2026) | 2611.18582 | Most changes to instruction files get no real review, and AI reviewers miss factual and staleness problems. | >70% unreviewed; agents recovered 1.3–3.9% of human concerns |
| 14 | What Evidence Do Language Models Find Convincing? (2024) | 2402.11782 | Models judge sources mostly by relevance to the question. They largely ignore things humans weigh, such as scientific references or a neutral tone. | Qualitative (ConflictingQA counterfactuals) |
| 15 | Whose Facts Win? LLM Source Preferences under Knowledge Conflicts (2026) | 2601.03746 | Models prefer institutional sources over people or social media, but simply repeating a claim from a weaker source can reverse that preference. | 13 LLMs; repetition bias cut by up to 79.2% by their fix |
| 16 | Evaluating Verifiability in Generative Search Engines (2023) | 2304.09848 | Answers look trustworthy, but many sentences are not backed by their citations, and many citations do not support their sentence. | 51.5% of sentences fully supported; 74.5% citation precision |
| 17 | Beyond Over-Refusal: Scenario-Based Diagnostics (2025) | 2510.08158 | False refusals come from specific trigger words in otherwise safe requests, and are worse in multi-turn, context-heavy settings. Rephrasing and telling the model to ignore the trigger word both reduce them. | Qualitative "substantial" improvement (4 Llama models) |
| 18 | Deactivating Refusal Triggers (2026) | 2603.11388 | Refusals are tied to surface cues, and many of those cues are harmless. Benign text that contains them gets refused. | Qualitative |
| 19 | MCP Tool Descriptions Are Smelly! (2026) | 2602.14878 | Almost all MCP tool descriptions have at least one smell, and most common is not stating the purpose. Better descriptions improve success but can add steps, and compact versions keep most of the gain. | 97.1% smelly; 56% no clear purpose; +5.85pp success; +67.46% steps |
| 20 | Which Metadata Matters for LLM Tool Selection in MCP? (2026) | 2610.14334 | Parameter names and schema shape affect *whether* a tool is picked at all, not only how it is called. Tool order matters too. | 367,174 tools analysed |
| 21 | Manifest-Assisted Retrieval: evidence gaps for llms.txt (2026) | 2610.38361 | No source isolates a benefit from /llms.txt. AI tools almost never fetch it automatically. | 0 automatic requests in 45 trials; 97% of domains with the file got no requests |
| 22 | Categorizing the Content of GitHub README Files (2018) | 1802.06997 | READMEs usually explain what a project is and how to use it, but many leave out its purpose and status. Labelled sections make information easier to find. | 4,226 sections, 393 repos; classifier F1 0.746 |
| 23 | Deep Agentic Search for Repository-Level Code QA (2026) | 2608.01507 | For read-only questions about a repo, indexed retrieval beat delegated grep-style exploration. The largest share of failures were silent hand-off errors that ended in confident wrong answers. | 65.2% vs 46.2% correct; 41.8% of failures at hand-off |

Context: three of these (2602.11988, 2601.20404, 2604.11088) partly disagree about whether context files help. What they agree on is that short, constraint-style instructions work and overviews do not.

#### 2. Rules for log's docs

Each rule can be checked by a script or a quick read.

1. **First paragraph = what, for whom, and limits.** Every page opens with 2–4 sentences: what this part of log does, who it is for, and what it does *not* do. Check: the first paragraph has a "does not" or "only" sentence. *(1802.06997: READMEs lack purpose/status; 2307.03172: content at the start is used best; 2602.14878: 56% of descriptions miss their purpose)*
2. **Headings are a path a reader can follow.** Use one H1 per page. Each H2/H3 names its topic in plain words, not "Notes" or "More" alone. Each section makes sense when read alone with its heading chain, so don't write "as above". Check: no duplicate or generic headings, and no "see above/below". *(2608.00824: heading-chain prefix +23.8% MRR; 2610.10170: real headings beat placebo)*
3. **Sections are paragraph-sized and self-contained.** Keep H2 sections short (about 300 words or less) and split long ones at natural topic breaks. Check: word count per section. *(2603.06976: paragraph-group chunks ≈0.459 vs <0.244 nDCG@5)*
4. **Every page links up and sideways.** Each page links to its parent (README or docs index) and to at least 2 related pages. Check: link-graph script, no orphan or dead-end pages. *(2605.07517: author hyperlinks improve RAG answers with fewer chunks; 2501.07572: agents struggle to reach deep subpages)*
5. **Depth from README ≤ 2.** Every doc is reachable from README in two clicks or fewer, through one docs index that gives each page a one-line description. Don't count on llms.txt to help here. Check: BFS over links from README. *(2501.07572; 2610.38361: 0/45 automatic llms.txt fetches)*
6. **Descriptive link text.** Link text names what the target page says, e.g. "how approval gates block sends", not "here" or a bare path. Check: lint bans "here", "this", "link" and bare URLs as link text. *(2605.07517: links carry retrieval signal; 2402.11782: relevance is what models weigh)*
7. **Each claim sits next to its evidence.** Any number, safety property or "never/always" claim links, in the same sentence, to the file, test or command that proves it. Check: claims with numbers or "never/always" carry a link. *(2304.09848: only 51.5% of cited sentences are fully supported, so readers and models reward claims that are; 2402.11782: models weigh relevance, so the evidence must sit right next to the claim)*
8. **Say each fact once and link to it everywhere else.** Counts, limits and the list of platforms each have one home page. Other pages link to it instead of restating it. Check: script compares numbers across files, and CI fails on mismatch. *(2611.02383: 16.1% of parallel sections diverge; 2610.32578: drift was 48/118 failures; 2601.03746: repetition sways models more than source quality)*
9. **Describe sensitive features by mechanism, with consent in the same sentence.** Write "log reads your own DMs with your browser session, and sends nothing until you approve". Don't let words like cookie, session, scrape or bypass stand alone. Keep the risk-word linter, and have it require the owner/approval context within the same sentence. *(2510.08158: refusals come from trigger words, and rephrasing reduces them; 2603.11388: harmless cues trigger refusal)*
10. **Limits are concrete, not hedged.** List known limits as plain statements ("log does not do X", "sends per account are capped at N per day", with the real value and a link to where it is set) on a limits section linked from README. Don't scatter vague hedges. Check: each page links the limits section. *(2405.00623: specific first-person uncertainty lowers overreliance more than general hedges; 1802.06997: status is often missing)*
11. **AGENTS.md holds rules, not a tour.** Keep it short, put "do not …" constraints each paired with a check or command, and leave the repo overview out (link to docs instead). Keep one instruction file as the source, and generate or link the others. Check: length cap, and no second file with diverging text. *(2602.11988: overviews don't help, +20% cost; 2604.11088: negative constraints help, positive directives hurt; 2611.13709: some instruction types are never followed; 2601.20404: −28.64% runtime when present)*
12. **MCP tool descriptions state purpose first and use the user's words.** First sentence is what the tool does. Then when to use it versus its neighbour tool, then limits. Parameter names match how a request would phrase them. Keep it compact. Check: description lint for a purpose sentence and a limits line. *(2602.14878: 97.1% smelly, compact variants keep most of the gain; 2610.14334: schema names change which tool is selected)*

Rules 4–8 should be enforced in CI by a docs lint (links resolve, parent link present, depth ≤ 2, link text, number consistency), not by LLM review. *(2610.32578: one LLM audit found ~50% of drift; 2611.18582: AI reviewers recovered 1.3–3.9% of human concerns)*
