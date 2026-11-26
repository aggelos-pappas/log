# Results: the voice-options matrix (SubQ, 2026-11-20)

`bun docs/decisions/voiceOptions/runMatrix.ts` ran 19 calls on `subq-snap-preview`, with 425,721 input tokens. Each call carried this folder's `issue.md` and `research.md`, `docs/specs/voiceGate.md`, the agent's voice-gate notes, `src/models/manifest/types.ts`, `src/voice/aiTells/client.ts` and `src/voice/pairs/client.ts`. Scores are 0 to 4 per criterion; the raw answers are in `subqResults.json`. All 11 claims were judged true at 0.99 or above.

## What log builds

1. **D1, B: a grounding pack, not a local generator.** Before the agent writes, `voice` hands it his real replies to the messages most like the one it is answering (that chat first, then all his chats), one line of his measured features, and 2-3 contrastive lines he never writes; the agent writes 3-5 options from it. SubQ picked it at 98% and it led on every criterion. A small local model writing the options (C, D) scored lower on sounding like him (2.2 against 3.3) and on speed: small models struggle most with informal writing (claim C2), and the agent writing from his real replies is already the strongest generator on the machine. A style vector (E) and fine-tuning (F) are out for now; F can't run on this laptop (C4).
2. **D2, B: one calibrated score plus three hard blocks.** One number from a fixed, written weighting of the signals the gate already has, with its threshold set so his own held-out messages pass 95% of the time. Hard blocks stay only for never-said phrases, watermark artifacts and a pitch in a first message. SubQ picked it at 99%. Local-only verification (D) scored 0.3 higher in total on stability and speed but lower on agreement and safety, so B takes D's two strengths: the local signals carry most of the weight, and each exact text's verdict is cached, so send matches the pre-gate.
3. **D3, D: ranked options, a fail only when none passes.** `voice` grades all the options in one call and returns them ranked; a fail happens only when none passes, and then it comes with the fix for the best one in his words (B). SubQ's pick here was weak (38%, confidence 0.17) and C, a refine round, was within 0.3, so the refine round is the follow-up if first-try passes stay under the done-when bar.

## D1: Where should a draft in the owner's voice come from, so most first tries pass the gate?

**SubQ's overall pick: B (Grounding pack for the agent)**, probability 98%, confidence 0.98.

| Option | passRate | latency | machineFit | effort | privacy | upkeep | total (of 24) |
|---|---|---|---|---|---|---|---|
| A Today: the agent writes, the gate grades | 1.0 | 2.7 | 3.9 | 3.7 | 3.0 | 3.2 | 17.5 |
| B Grounding pack for the agent | 3.3 | 3.2 | 3.8 | 3.2 | 3.6 | 3.5 | 20.6 |
| C Small local model writes options (ONNX) | 2.2 | 2.1 | 3.5 | 2.6 | 3.7 | 3.5 | 17.6 |
| D Small local model writes options (llama.cpp) | 2.2 | 1.9 | 2.6 | 2.0 | 3.8 | 3.3 | 15.8 |
| E Local model steered by his style vector | 2.0 | 1.8 | 2.0 | 1.0 | 3.8 | 2.2 | 12.8 |
| F Fine-tune a model on his chats | 2.0 | 0.4 | 0.2 | 0.6 | 2.8 | 0.3 | 6.4 |

Per criterion, SubQ's single best option: passRate: B, latency: B, machineFit: B, effort: B, privacy: B, upkeep: B

Highest total: B (20.6).

## D2: How should the gate decide pass or fail, so it is defined, stable and agrees with his own real messages?

**SubQ's overall pick: B (One calibrated authorship score plus three hard blocks)**, probability 99%, confidence 0.98.

| Option | agreement | stability | defined | safety | latency | effort | total (of 24) |
|---|---|---|---|---|---|---|---|
| A Today: every check must pass | 1.0 | 0.3 | 0.8 | 3.6 | 2.0 | 3.7 | 11.4 |
| B One calibrated authorship score plus three hard blocks | 3.1 | 2.2 | 3.4 | 3.5 | 2.2 | 2.0 | 16.5 |
| C SubQ alone, one question | 1.4 | 0.7 | 1.9 | 1.3 | 2.6 | 2.5 | 10.3 |
| D Local authorship verification only | 2.4 | 3.8 | 3.1 | 2.0 | 3.4 | 2.0 | 16.8 |
| E Today's checks, cached and lower variance | 1.2 | 3.3 | 1.2 | 3.6 | 2.1 | 2.9 | 14.2 |

Per criterion, SubQ's single best option: agreement: B, stability: D, defined: B, safety: B, latency: D, effort: A

Highest total: D (16.8).

## D3: What should a failed draft come back with?

**SubQ's overall pick: D (Ranked passing options instead of a fail)**, probability 38%, confidence 0.17.

| Option | roundsToPass | hardStops | faithful | latency | effort | total (of 20) |
|---|---|---|---|---|---|---|
| A Today: sub-scores and named pairs | 0.7 | 0.5 | 1.0 | 0.8 | 3.7 | 6.7 |
| B The fix, in his words | 2.5 | 2.6 | 3.2 | 2.6 | 2.8 | 13.7 |
| C One automatic refine round | 2.9 | 3.1 | 3.2 | 2.7 | 2.3 | 14.1 |
| D Ranked passing options instead of a fail | 3.5 | 3.7 | 2.6 | 2.6 | 2.0 | 14.4 |

Per criterion, SubQ's single best option: roundsToPass: D, hardStops: D, faithful: B, latency: D, effort: A

Highest total: D (14.4).

## Claims

- C1: 1.00
- C2: 1.00
- C3: 1.00
- C4: 1.00
- C5: 1.00
- C6: 1.00
- C7: 1.00
- C8: 1.00
- C9: 1.00
- C10: 1.00
- C11: 1.00

## Measured after the build (2026-11-20, on a copy of the live log.db, nothing sent)

### `log voice calibrate`

40 of his own dm replies, one per chat first, each graded with that reply left out of its chat's evidence, his word pairs and the nearest replies; 10 AI-written lines from `vendor/aiTells/aiExamples` graded against the same chats.

| | today's every-check gate | the one score |
|---|---|---|
| his held-out replies that pass | 13 of 40 (33%) | 38 of 40 (95%) |
| AI-written lines that fail | 10 of 10 | 10 of 10 |
| threshold | each check at its own bar | 0.709, stored dated in `state` |

The AI-written lines are long essay sentences, so failing them is an easy bar; they show the score does not pass everything, not how it handles a careful imitation.

### Replay of 20 real messages waiting on him

The 20 newest one-to-one DMs from `inboxWaiting` across X, Discord and Instagram (bots, system accounts, groups and media-only chats left out; one chat the owner had already answered in the copy was swapped for the next newest). For each: today's flow is one draft graded once by today's gate; the new flow is the pack, then 3-5 options written from it, graded in one `voice { options }` call.

| | first-call passes |
|---|---|
| today's flow: one draft, today's every-check gate | 11 of 20 |
| the same one draft, the one score | 16 of 20 |
| the new flow: pack, 3-5 options, one call | 20 of 20 |

Every option's verdict was kept by its text and the chat's last message id, so the send of the chosen option reuses it: 20 of 20 found with the same verdict.

### Convergence (REQ-VOICE-33)

The gap is how much more the draft mirrors their words or style than he does with this person (0 = no more than him).

| | mean gap | median gap | drafts above 0.25 |
|---|---|---|---|
| today's one draft | 0.20 | 0.22 | 9 of 20 |
| the top option from the pack | 0.14 | 0.15 | 3 of 20 |

### Latency

| | calls | p50 | p95 | p99 |
|---|---|---|---|---|
| `voice` before (live MCP, warm, last 72 h) | 153 | 3.70 s | 7.05 s | 14.2 s |
| `voice` after (CLI, a cold process per call, pack + options + single) | 125 | 4.97 s | 9.05 s | 12.1 s |
| pack only (wall time, cold) | 20 | 4.2 s | | |
| longest Jina call inside the gate after | | | 3.4 s (bound 4 s) | |

The after numbers come from a new process per call, which pays the voice index open (1.1 s) and the chat list (0.4 s) a warm MCP keeps; the warm p95 under 7 s is not measured yet. The AI tells stage runs once per option (p50 2.3 s) and is the next thing to make shared across options.
