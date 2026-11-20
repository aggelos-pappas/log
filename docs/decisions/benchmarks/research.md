# Benchmarks for log: the right test for each area, from the research

Read on 2026-11-21 from arXiv. Each area gives the test, why that test (with sources), and the number to watch. Everything runs read-only on the owner's real data in log.db; nothing is sent.

## 1. Voice: does a draft read as him?

- **Test:** the Individual Turing Test. For a real past moment, a pool holding his real reply and 2-4 drafts; the judge picks which one is him. Judges: the owner himself, then LUAR authorship similarity, then SubQ as judge. Report each separately.
- **Why:** 2603.01289 (Individual Turing Test, 10 years of private messages) found fine-tuning, RAG and memory methods all fail to pass with acquaintances as judges, so the pool test is the honest bar. 2611.24888 (Personal Imitation Game) passed it 7 in 10 with retrieval of one person's messages. 2608.19746 (PersonalBench) shows three lenses disagree: methods separate authors (LUAR AUC 0.918) but stay below the human-to-human floor (0.484-0.508 vs 0.626), so one judge is not enough. 2107.00061: untrained people judge at chance; paired examples help, so show pairs, not single texts.
- **Number:** how often the judge picks a draft over his real reply (chance with 3 drafts = 75%; a perfect imitation hits chance). LUAR similarity against his human floor.

## 2. AI-slop detector

- **Test:** his real messages vs drafts for the same moments, folds split by chat, one bar per length band set so 95% of his pass; AI drafts from several model families.
- **Why:** 2611.10901 (calibrate per length, abstain when too short); 2502.12150 and 2506.09975 (detectors fail on unseen models, so multi-model data); our own measurement (#240): 94% with chat leakage, 60% without.
- **Number:** AI drafts caught at 5% false flags per length band.

## 3. Name pointers in the hook

- **Test:** the owner's last 200 prompts; for each, every "NAMED IN THE PROMPT" match hand-marked right or wrong (e.g. "abel" from "able", "triyn" to Tin, "coemd" to Mo.techno). Precision and recall.
- **Why:** 2210.07472: on tweets, informal spelling and short context break both dictionary lookup and dense retrieval; recall 0.93 needed a hybrid with context. 2505.14549: names that are also common words are mishandled 20-40% more. The owner types fast with heavy typos, so a typo of a common word that lands near a contact name is the main failure. The fix the papers point to: only treat a token as a name when it is not a (corrected) common word, and require context (a capital, "with", "to", "from", "@", or the person in the current chat).
- **Number:** wrong pointers per 50 prompts; target at most 1.

## 4. Play router

- **Test:** the owner's real prompts, each labelled with the right play (or none); top-1 and top-3 accuracy, and how often "none" is right.
- **Why:** 2503.01763 (ToolRet, 43k tools): retrievers strong on normal search are poor at picking tools, so measure on real prompts, not fixtures. 2505.03275 (RAG-MCP): retrieving tools first tripled selection accuracy (43% vs 14%) and cut prompt tokens by over half. 2603.20313: vector search over MCP tools keeps 3-5 relevant tools.
- **Number:** top-1 accuracy; target 90%.

## 5. Context injected per turn

- **Test:** for a day of turns, count tokens log adds (storage notice, accounts, pointers, live activity) and how many lines were new since the last turn; then an A/B on a fixed task set with and without the unchanged blocks.
- **Why:** 2302.00093: irrelevant context sharply lowers accuracy. 2611.07778: even unrelated statements degrade answers. 2605.10828 (First Drop of Ink): most of the damage comes from the first small share of distractors. 2611.04169: length is cheap, competing evidence is not; a wrong pointer to a real chat is the expensive kind. 2610.36114: harnesses lose tool output by cutting it at a fixed length; measure what reaches the model.
- **Number:** tokens injected per turn, share unchanged from the last turn, wrong pointers injected; target: only what changed.

## 6. Reply outcomes

- **Test:** from log.db, for each platform, reply rate and time to reply to messages log sent versus messages he sent by hand, matched by person and stage; later, outcome-labelled deals.
- **Why:** 2607.11749 (field experiment, 16,880 emails): GPT-5 rewriting changed neither open nor reply rates directly; positivity predicted replies (odds 3.32). So measure outcomes, not just style. 2504.01211 and 2609.26707: off-policy evaluation from logs needs to handle confounding (log sends to warmer people), and a small owner-labelled set can correct cheap model labels.
- **Number:** reply rate log vs hand, matched; target no worse.

## 7. Speed

- **Test:** p50/p95/p99 per tool from log timing over 24 h, with the slowest span inside each call; record full distributions, not averages.
- **Why:** 2107.11607: benchmark harnesses distort tail latency (warm-up, coordinated omission); measure from the caller's side over real traffic.
- **Number:** p95 and p99 per tool; Discord send under 20 s.

## 8. Watchers

- **Test:** for every message, the platform's own timestamp vs when log stored it and when it was pushed to the chat.
- **Why:** 2004.02167 and 2502.02430: freshness is set by how often each source changes; poll busy chats more and quiet ones less, using change signals.
- **Number:** landed-to-pushed p95; target under 5 s.

## 9. Sessions

- **Test:** read-only session checks every hour for 7 days per account; count drops and challenges.
- **Why:** 2406.07647: bots that alter their fingerprint inconsistently are what get caught; consistency matters more than disguise. 2606.14525: headless and automation artifacts are probed on many sites.
- **Number:** drops per week; target 0.

## 10. Pipeline labels and people linking

Already specified with their tests in `docs/decisions/pipeline/` (#236): agreement with 40 held-out owner labels; links found and wrong merges on his checked pairs.
