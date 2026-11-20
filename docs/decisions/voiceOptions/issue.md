# Drafts in the owner's voice: suggest first, then check once

## What the owner sees

Every message log sends as the owner goes through the voice gate (`docs/specs/voiceGate.md`). The agent writes a draft in its own words, the gate grades it, and most first drafts fail. The owner, 2026-11-20: "it keeps getting rejected and there isn't any suggestion... it's a mixture of stats that isn't really defined".

## What the gate does today

- **Many separate pass/fail checks.** A draft passes only when every one passes (REQ-VOICE-06): the voice answer, the answers-them (context) answer, the friend-like answer, the opener answer, the chat answer, the builds-on answer for voice notes, his own word pairs at or above his 10th percentile (REQ-VOICE-07), no never-said phrase (REQ-VOICE-03), no AI tell close to a known AI phrase, and no watermark artifact (REQ-VOICE-05).
- **The verdict moves between runs.** The voice, context, friend-like, opener and chat answers come from SubQ (`api.subq.ai/v1/systemone`). Near the line a SubQ reading varies by about ±0.1, and on thin threads the same words went from 0.66 to 0.21 (the `log-voice-gate` skill, "A pre-gated pass can still fail at send").
- **A fail returns scores, not a fix.** The result names the pairs he never wrote and the closest AI phrase, but no rewrite. The agent re-rolls; three fails in a row make Hermes pause the log MCP server for 30-60 s, and about eight hard-stop the turn.
- **The draft starts from the agent, not from him.** The writer reads the chat's card (REQ-VOICE-24), but nothing hands it his real replies to messages like the one it is answering, his measured traits, or examples of what he never writes.

## Measured on 2026-11-20 (`log timing --tool voice`, last 24 h)

| Stage | p50 | p95 | p99 |
|---|---|---|---|
| voice (whole call, 39 calls) | 2.08 s | 6.18 s | 7.05 s |
| voice.aiTells | 960 ms | 1.90 s | 3.19 s |
| SubQ systemone | 719 ms | 1.37 s | 3.98 s |
| Jina embeddings | 355 ms | 763 ms | 764 ms |
| Jina rerank | 315 ms | 409 ms | 538 ms |

Inside sends, `discordSendLive` showed a Jina embeddings call at p95 167 s over 2 calls (no timeout) and `voice.gate` at p95 85 s. One gate is a few seconds; the time is lost to rewrite rounds and to the one unbounded Jina call.

## What log already has to build on

- **His writing, indexed:** the voice index of every reply he wrote, with embeddings stored once in `log.db` (REQ-VOICE-11), his word pairs, the per-chat card (REQ-VOICE-23), his real replies in the chat (REQ-VOICE-12) and his burst shape (REQ-VOICE-20).
- **What he never writes:** the never-said phrases and the AI-tells list (`src/voice/aiTells`).
- **Local models through ONNX** (`src/models/manifest`): an injection classifier, MiniLM embeddings and LFM2.5-VL-450M (a 450M vision-language model), pinned and downloaded by `log models`.

## The machine

Windows 11, AMD Ryzen 9 8945HS (8 cores, Radeon 780M integrated graphics, no NVIDIA GPU), Bun 1.4, Python 3.12. The model has to run on the CPU; fine-tuning a 7B model with LoRA needs about 16 GB of NVIDIA VRAM (WeClone's documented requirement), which this laptop doesn't have.

## Done when

- Of 20 real messages waiting on the owner, at least 18 get one passing option on the first try.
- His own real messages (held out) pass the gate at least 95% of the time.
- The same text gets the same verdict at send as it got when gated.
- The `voice` p95 stays under 7 s, and no call inside a send can wait more than a few seconds on an outside service.
