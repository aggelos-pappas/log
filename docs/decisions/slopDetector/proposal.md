# Proposal: a frontier-conventions detector learnt from the owner

From `issue.md`, `research.md`, `repos.md` and the SubQ matrix in `results.md` (310k input tokens).

## Decisions

| Decision | Pick | SubQ |
|---|---|---|
| D1 detector | **F**: owner-baseline over-use profile + MiniLM classifier head + structural checks, calibrated per length band | 97% |
| D2 AI-side data | **D**: drafts log already has, topped up with fresh drafts from several frontier models on his real moments, each paired with his real reply | 89% |

Today's Jina phrase index scored 0.6 of 4 on letting his own messages pass and 0.4 on speed. Perplexity detectors (Binoculars, Fast-DetectGPT) and the SlopTotal ensemble scored lowest: too big and too slow for the CPU, and weak on short text.

## How it works

1. **Data.** His messages from log.db are the human side. The AI side is the agent drafts log already has for his chats, plus a few hundred of his real past moments answered by Claude, GPT, Gemini, Grok and DeepSeek with today's grounding pack, each paired with what he really said. It is refreshed when models change.
2. **Over-use profile** (slop-forensics method, sam-paech/slop-forensics). Words, bigrams and trigrams the drafts use far more than he does, stored with their ratio and his nearest real phrasing. Pure code, under 1 ms.
3. **Classifier head** (Idiosyncrasies, locuslab/llm-idiosyncrasies). A logistic head on the shipped MiniLM embedding plus character n-grams, trained on his messages against the drafts. About 6 ms.
4. **Structure.** Opener repetition across the 3-5 options (SlopBench), em dash and markdown leakage (The Last Fingerprint), sentence-length variance, Biber-lite features (hedges, connectives, nominalisations). Under 1 ms.
5. **Calibration** (arXiv 2611.10901). One threshold per length band, set so 95% of his held-out messages pass in every band; lines too short to tell get no verdict.
6. **In the gate.** It replaces the Jina phrase index as the `notAiTell` signal. Each flag names the words or the habit beside how he says it. The vale rules and the watermark reading stay as they are.

## Done when

- At most 5% of his held-out messages are flagged, in every length band.
- At least 90% of held-out frontier drafts are flagged, or caught by another signal, without SubQ.
- Under 20 ms p95 per option on the CPU, with no network call.
- Each flag names the words or habit beside his phrasing.

## Measured before building (2026-11-21, read-only, nothing sent)

Human side: the owner's messages from log.db. AI side: the 81 drafts (one per moment plus 3-5 options) written as him for the 20 waiting DMs in the #238 replay, all by one model family.

| Detector | His messages flagged | AI drafts caught |
|---|---|---|
| `nakas/gpttrace-ettin150-text-v5e`, int8 ONNX, #3 on RAID, off the shelf (400 of his) | 52% | 30% |
| Character 2-4 grams + MiniLM, logistic regression, his messages from any chat (1,500), 5-fold | 5% (bar) | 94% |
| Same, his messages from the same 20 chats only (733), folds split by chat | 5% (bar) | 60% |

The 94% was inflated: with his messages drawn from other chats the classifier partly learnt the topic. Holding the chats fixed, it catches 60% at a 5% false-flag rate. Off-the-shelf detectors are worse than chance on his short DMs (they warn they are unreliable under ~150 words). So the classifier is trained on his data, and the next gains come from paired data (his real reply and model drafts for the same moment, from several model families) and from the over-use list and structural checks, which are not yet measured. The classifier's job is to stop slop, not to fail options that are already indistinguishable from him.
