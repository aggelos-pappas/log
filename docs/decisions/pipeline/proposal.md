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

## Done when

- On 40 held-out chats the owner labels, agreement is at least 90% on `who` and 80% on `where`; no bot, friend or partner is in a sales stage.
- Labelling a new message adds under 50 ms p95 to the inbox push on this laptop.
- Linking finds the known cross-platform pairs the owner names (for example Mandeep's Discord, X and Instagram) and makes no wrong merge on the owner's checked list.
- The person, who and stage appear on the chat card and in the voice pack.
