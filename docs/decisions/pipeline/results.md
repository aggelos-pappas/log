# SubQ matrix results

Run with `bun docs/decisions/pipeline/runMatrix.ts` on 2026-11-20. Scores are 0-4 per criterion (expected value over SubQ's probabilities). Raw output: `subqResults.json`.

## D1: What labels should each conversation carry?

**SubQ's overall pick: B (Two fields: who and where)**, probability 89%, confidence 0.85.

| Option | correct | plays | learnable | owner | effort | total (of 20) |
|---|---|---|---|---|---|---|
| A Today's seven labels | 0.7 | 1.6 | 2.3 | 2.1 | 3.7 | 10.4 |
| B Two fields: who and where | 3.2 | 2.4 | 2.8 | 3.0 | 1.9 | 13.4 |
| C Two fields plus next move | 3.3 | 3.9 | 2.4 | 2.6 | 1.6 | 13.8 |
| D Free-text summary only | 0.4 | 0.5 | 0.6 | 1.4 | 1.1 | 4.0 |

Per criterion, SubQ's single best option: correct: B, plays: C, learnable: B, owner: B, effort: A. Highest total: C (13.8).

## D2: What should label each conversation, every time a message lands?

**SubQ's overall pick: D (Distilled local labeller)**, probability 99%, confidence 0.99.

| Option | accuracy | latency | cost | privacy | upkeep | effort | total (of 24) |
|---|---|---|---|---|---|---|---|
| A Today's counting rules | 0.9 | 3.9 | 3.9 | 4.0 | 1.5 | 3.8 | 18.1 |
| B SubQ on every message | 2.9 | 1.8 | 0.9 | 1.8 | 3.6 | 3.1 | 14.2 |
| C Zero-shot local classifier | 2.0 | 3.8 | 3.6 | 4.0 | 2.8 | 3.0 | 19.1 |
| D Distilled local labeller | 3.1 | 3.9 | 3.7 | 3.9 | 2.6 | 2.7 | 20.0 |
| E Fine-tuned small generative model | 2.3 | 2.3 | 2.2 | 3.9 | 1.6 | 1.5 | 13.9 |

Per criterion, SubQ's single best option: accuracy: D, latency: A, cost: A, privacy: A, upkeep: D, effort: A. Highest total: D (20.0).

## D3: How should log find that two accounts are the same person?

**SubQ's overall pick: D (B, then SubQ on the review band)**, probability 50%, confidence 0.34.

| Option | recall | precision | explain | cost | effort | total (of 20) |
|---|---|---|---|---|---|---|
| A Today's Fellegi-Sunter, three comparisons | 1.2 | 3.1 | 3.8 | 3.9 | 3.8 | 15.8 |
| B More comparisons in the same model | 2.9 | 3.3 | 3.9 | 3.2 | 2.3 | 15.6 |
| C LLM decides each pair | 2.4 | 2.0 | 1.9 | 0.7 | 1.6 | 8.6 |
| D B, then SubQ on the review band | 3.3 | 3.8 | 3.8 | 2.8 | 2.0 | 15.7 |

Per criterion, SubQ's single best option: recall: D, precision: D, explain: B, cost: A, effort: A. Highest total: A (15.8).

## D4: Where does the ground truth come from?

**SubQ's overall pick: C (Owner labels chosen by active learning, plus confident SubQ labels)**, probability 100%, confidence 1.00.

| Option | quality | ownerTime | stable | total (of 12) |
|---|---|---|---|---|
| A Only the owner's hand labels | 3.8 | 0.6 | 3.4 | 7.8 |
| B Only SubQ's labels | 1.5 | 3.7 | 0.9 | 6.1 |
| C Owner labels chosen by active learning, plus confident SubQ labels | 3.3 | 2.2 | 3.0 | 8.5 |

Per criterion, SubQ's single best option: quality: C, ownerTime: B, stable: C. Highest total: C (8.5).

## Claims

- C1: 1.00
- C2: 1.00
- C3: 1.00
- C4: 1.00
- C5: 1.00
- C6: 1.00
- C7: 1.00
- C8: 1.00
- C9: 0.98
- C10: 1.00
- C11: 1.00