# Proposal: one pipeline of who each person is and where they are

Built from `issue.md`, `research.md` and the SubQ matrix in `results.md` (run 2026-11-20, 256k input tokens).

## The decisions

| Decision | Pick | Why |
|---|---|---|
| D1 labels | **Two fields: who and where** (B), with the next move added once outcomes exist (C) | B wins on correctness, learnability and readability (SubQ 89%); C scores highest only on 'plays' and needs outcomes log hasn't recorded yet |
| D2 labeller | **Distilled local labeller** (D), with a zero-shot classifier on day one | SubQ 99%; best accuracy and still under 50 ms on the CPU; papers 2209.11055, 2406.17633 |
| D3 linking | **More comparisons in Fellegi-Sunter, then SubQ on the review band** (D) | Most recall and precision; totals are close (15.6-15.8) and SubQ was unsure (0.34), so measure on real pairs before building the SubQ step |
| D4 ground truth | **His labels picked by active learning + confident SubQ labels** (C) | SubQ 100%; papers 2504.15432 (LLM-only labels are unstable), 2511.11574, 2506.03857 |

## How it works

1. **Two fields.** `who`: lead, client, partner, friend, community, bot. `where`, only for leads and clients: new, warming, need found, offered, call booked, won, lost, gone quiet. Both lists are the owner's and editable. Bots, friends and partners never get a sales stage.
2. **Day one.** A zero-shot local classifier fills both fields from the label names, replacing the counting rules. The rules stay as features (back and forths, days quiet, open ask).
3. **Ground truth.** log picks the 30-40 chats it is least sure of and shows them as a form in the chat; the owner labels them in about ten minutes. SubQ labels every chat once, giving candidate labels where unsure; disagreements go to the owner.
4. **The labeller.** SetFit on the MiniLM log already ships, trained on his labels plus SubQ's confident ones. It runs on each new message during the inbox push, in under 50 ms, and stores the label, its confidence and the message that moved it. Low-confidence chats queue for SubQ, then the owner.
5. **Linking.** Fellegi-Sunter gains comparisons: writing style, activity hours, topics with the owner, mentions of another handle ("my insta is ..."), shared group chats. Hard vetoes for different known real names and two identities talking in the same chat. Merges across existing people are re-checked (2607.26298). The review band goes to a multi-step SubQ check (2511.22832). The owner still says yes.
6. **Context everywhere.** The chat card, the voice pack, the plays and the hook show the person (all linked accounts), who they are, the stage, and what moved them. Plays pick their move from the stage.
7. **Later.** Outcomes (won, lost, call booked) are recorded as they happen; once there are enough, log learns which moves moved people forward (2610.25461, 2504.08754, 2511.01181) and adds the next-move field.

## The CPU stack

Measured on this laptop (Ryzen 9 8945HS, no NVIDIA GPU) on 2026-11-20, 30 runs of one message through `@huggingface/transformers` on onnxruntime:

| Model | Size | Per message p50 / p95 | First load |
|---|---|---|---|
| `Xenova/all-MiniLM-L6-v2` (already shipped) | 23 MB | 5.7 / 7.5 ms | 5.9 s |
| `SamLowe/roberta-base-go_emotions-onnx` int8 | 125 MB | 24 / 35 ms | 25 s |

| Job | Model or project | License | Form | Runs |
|---|---|---|---|---|
| who and where (trained) | SetFit (huggingface/setfit) head on the shipped MiniLM | Apache-2.0 | body: the shipped ONNX; head: a few KB of logistic-regression weights in JSON | every new message, in the inbox push |
| day one (untrained) | nearest-label prototypes on the shipped MiniLM; `knowledgator/gliclass-small-v1.0` int8 ONNX (174 MB) only if prototypes miss the bar | Apache-2.0 | ONNX | until the owner's labels exist |
| emotion of each message | GoEmotions RoBERTa ONNX (the text counterpart of emotion2vec) | MIT | int8 ONNX | every new message, as a feature |
| emotion in voice notes | emotion2vec+ base | its own license | PyTorch only | later; export and licence check first |
| writing-style fingerprint | LUAR-MUD or StyleDistance | Apache-2.0 / MIT | no ONNX published; export once with optimum, int8 | once per message into log.db |
| cheap style features | function words, character n-grams, length, case, punctuation (as in style_fingerprint, VoicePrint) | MIT | code | in the voice gate, under 1 ms |
| copying the other person | ConvoKit coordination measure | MIT | code | in the voice score |
| linking | log's Fellegi-Sunter plus Splink's comparison levels and EM weight learning | MIT | code | in `src/people`, no Splink install |
| which chats the owner labels | dedupe-style uncertainty sampling | MIT | code | a form in the chat |
| training labels | SubQ, once over all chats, candidate labels when unsure | paid API | one-off | unsure chats go to the owner |

Per new message: MiniLM ~6 ms + head under 1 ms + emotion ~24 ms + features under 1 ms, about 30 ms, inside the 50 ms target. Only the one-off jobs (SubQ labelling, SetFit training, the LUAR export) leave the machine or need Python. Nothing needs a GPU.

## Done when

- On 40 held-out chats the owner labels, agreement is at least 90% on `who` and 80% on `where`; no bot, friend or partner is in a sales stage.
- Labelling a new message adds under 50 ms p95 to the inbox push on this laptop.
- Linking finds the known cross-platform pairs the owner names (for example one friend's Discord, X and Instagram) and makes no wrong merge on the owner's checked list.
- The person, who and stage appear on the chat card and in the voice pack.

## Measured: SubQ when the head is unsure, the bot guard, and linking (2026-11-21, a copy of log.db)

`bun scripts/pipeline/benchFallback.ts` with `LOG_DB` on a copy: 268 chats SubQ labelled, 6 kinds of who, 5 folds by chat (the head is retrained on the other four each time).

| | who agreement with SubQ on held-out chats |
|---|---|
| head alone (before) | 47.8% |
| head with the bot guard | 48.5% |
| served label with SubQ under 0.5 confidence (after) | 98.5%, with 95.9% of chats sent to SubQ |

| bar | sent to SubQ | served agreement | head agreement on the chats it keeps |
|---|---|---|---|
| 0.3 | 62.3% | 81.7% | 51.5% |
| 0.4 | 89.9% | 94.4% | 44.4% |
| 0.5 | 95.9% | 98.5% | 63.6% |
| 0.6 | 98.1% | 100% | 100% |

The head is unsure on almost every chat, so at the 0.5 bar nearly every chat that gets new messages goes to SubQ. That is cheap: 23.9 DM chats a day get new inbound messages, at about $0.0000224 a chat that is about $0.0005 a day, a hundredth of the $0.05 daily cap (and less in practice, since an unsure chat is asked again only after 3 new messages). The bot guard drops 61 of 66 stored bot verdicts; the 5 kept are named system and bot accounts. Chats the teacher called bot with no bot signal (spam-like DMs) now read as their next likeliest label until the signal fires.

Linking on the same copy: 87 candidate pairs, EM over 3 blocking sessions. `log people suggest` gives 12 pairs (9 strong) against 9 before; the three new ones are a handle handed over in a DM, a handle said as their own, and a loose handle match with a display name. The friend's Discord, X and Instagram accounts now come out together as one person, the Instagram pair at 6.3 bits from a handle handed over in a DM plus "my insta". `--check` asked SubQ about the 3 review-band pairs for $0.00005.
