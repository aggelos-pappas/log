# Proposal: drafts grounded in the owner's own replies, one defined gate score, ranked options

Decided by the SubQ matrix in `docs/decisions/voiceOptions/` (results.md). Research: `docs/decisions/voiceOptions/research.md`.

## Goal

Most first drafts pass the voice gate, and a refusal always says what to change, in his words. The gate is one defined rule that passes his own real messages and gives the same verdict at send as when it was gated.

## 1. The grounding pack (`voice` with no text, and the writer's first read)

`voice { to, with, context }` with no text returns, before any draft is written:

- **Nearest replies:** his real replies to the incoming messages most like `context`, by embedding similarity over the voice index (embeddings already in `log.db`, REQ-VOICE-11): up to 5 from this chat, then up to 5 from his other chats, each as the pair "they wrote → he answered".
- **His features, one line:** median words per message and per burst in this chat (REQ-VOICE-20), case, punctuation he uses and never uses, his 10 most-used word pairs here, his usual openers.
- **Contrastive lines:** 2-3 lines he would never write: the AI-tells nearest to this kind of reply (`src/voice/aiTells`) and, where it exists, how the other person writes, labelled "not him".
- **The ask:** write 3-5 short options from these, in his words.

The pack is built locally from `log.db`; nothing extra leaves the machine. No outside call in the pack may block: the Jina embeddings call gets a hard timeout of a few seconds and falls back to the local embedder (`storedEmbedder`), and his reply embeddings are read from `log.db`, never re-embedded.

## 2. One calibrated score

`voiceScore = Σ wᵢ·sᵢ` over the signals the gate already computes, each in 0..1, with fixed weights written in one place (`src/voice/score`):

| Signal | Source |
|---|---|
| his phrasing | share of the draft's pairs he has written (REQ-VOICE-07) |
| nearest reply | similarity to his nearest real replies in the pack |
| not an AI tell | distance from the nearest known AI phrase |
| SubQ voice | SubQ's voice answer (and chat answer when there is a chat) |
| answers them | the context answer, only when an answer is owed (REQ-VOICE-25) |

- **Threshold, calibrated:** set so his own held-out real replies pass 95% of the time, re-measured by `log voice calibrate` and stored with the date. The calibration also reports how many AI-written drafts of the same chats it fails.
- **Hard blocks, unchanged:** a never-said phrase (REQ-VOICE-03), watermark artifacts (REQ-VOICE-05) and an ask in a first message (REQ-VOICE-04) fail whatever the score.
- **Stable:** a text's verdict is cached by its exact text and the chat's last message id (extending REQ-VOICE-18), so the send reuses the pre-gate verdict when nobody has written since.
- **Readable:** the result prints the score, the threshold, and each signal's contribution in one table.

## 3. Ranked options

`voice { to, with, context, options: [..] }` grades 3-5 options in one call (one SubQ request for all of them) and returns them ranked by `voiceScore`, with pass or fail each. A fail is returned only when no option passes, and then with the fix for the best one: each failing span next to his nearest real phrasing for it, and which signal or block failed, in plain words. The send tools take the chosen option's text as now.

## Done when

- `log voice calibrate`: his held-out replies pass at least 95%.
- A replay of 20 real messages waiting on him (read-only, no sends): at least 18 get a passing option on the first call.
- The same text gets the same verdict at gate and at send.
- `voice` p95 under 7 s; no stage inside a send waits more than a few seconds on Jina or SubQ.

## Later

- A refine round (critique-refine, arXiv 2510.24469) when a best option fails, if first-try passes stay under the bar.
- A small local model or a style vector (arXiv 2503.05213, 2607.21620) only if the grounding pack can't reach the bar.
