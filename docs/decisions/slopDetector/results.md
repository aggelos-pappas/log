# SubQ matrix results

Run with `bun docs/decisions/slopDetector/runMatrix.ts` on 2026-11-21. Scores 0-4 per criterion. Raw: `subqResults.json`.

## D1: What should detect frontier-model writing conventions in a draft of the owner's DM?

**SubQ's overall pick: F (C + D + structure, length-calibrated)**, probability 97%, confidence 0.96. Probabilities: A 0%, B 0%, C 2%, D 1%, E 0%, F 97%, G 0%

| Option | ownerPass | catches | explain | speed | small | effort | total (of 24) |
|---|---|---|---|---|---|---|---|
| A Today's AI-phrase index | 0.6 | 1.1 | 2.2 | 0.4 | 3.5 | 3.8 | 11.5 |
| B Rule linter | 2.6 | 1.8 | 3.3 | 3.9 | 3.7 | 3.3 | 18.6 |
| C Owner-baseline over-use profile | 3.3 | 2.5 | 3.7 | 4.0 | 3.8 | 3.4 | 20.7 |
| D Small classifier on MiniLM | 2.4 | 2.9 | 0.9 | 3.9 | 3.6 | 3.1 | 16.8 |
| E Perplexity zero-shot | 0.7 | 1.0 | 0.4 | 0.8 | 0.9 | 1.4 | 5.2 |
| F C + D + structure, length-calibrated | 3.5 | 3.5 | 3.8 | 4.0 | 3.4 | 2.6 | 20.8 |
| G SlopTotal ensemble | 1.4 | 1.8 | 1.9 | 0.7 | 0.3 | 0.9 | 7.0 |

Per criterion best: ownerPass: F, catches: F, explain: F, speed: C, small: C, effort: C

## D2: Where should the frontier-model side of the training data come from?

**SubQ's overall pick: D (B plus C)**, probability 89%, confidence 0.85. Probabilities: A 0%, B 1%, C 10%, D 89%

| Option | relevance | coverage | cost | paired | total (of 16) |
|---|---|---|---|---|---|
| A Public AI-text corpora | 0.8 | 2.3 | 3.6 | 0.1 | 6.8 |
| B Drafts log already has | 3.4 | 1.5 | 3.9 | 2.3 | 11.1 |
| C Fresh drafts from several frontier models | 3.6 | 3.7 | 2.2 | 3.9 | 13.4 |
| D B plus C | 3.8 | 3.9 | 2.8 | 3.5 | 14.0 |

Per criterion best: relevance: D, coverage: D, cost: B, paired: C

## Claims

- C1: 1.00
- C2: 1.00
- C3: 1.00
- C4: 1.00
- C5: 1.00
- C6: 1.00
- C7: 1.00
- C8: 1.00