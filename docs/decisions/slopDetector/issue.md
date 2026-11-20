# A detector for frontier-model writing conventions

## What the owner sees

The owner, 2026-11-20: the AI-slop check keeps blocking drafts and isn't right. He wants a detector of the writing conventions frontier models (Claude, GPT, Gemini, Grok, DeepSeek) put into text, not a generic "AI or human" detector. It must run locally, stay small, and fit log's speed rules.

## What log does today (docs/specs/aiTells.md, src/voice/aiTells)

- Watermark reading: hidden characters, odd spaces, pasted HTML block a send; curly quotes and em dashes read as `stylistic`.
- Vale rules from tbhb/vale-ai-tells run on the draft; rules the owner hits in over 2% of his messages are muted.
- An AI-phrase index: literal phrases from vale-ai-tells, FeedHive ai-slop-detector, ai-vocabulary, SLOP_Detector, phrases people complained about on X, and AI-written samples, embedded with Jina (1024 dims). The draft is cut into lines and word windows, each chunk's nearest AI phrase is found by cosine and reranked with Jina's reranker, and the draft fails when it is closer to an AI phrase than the owner's own p99.
- In the voice score (#238) this is one signal, `notAiTell`, weight 0.10, beside his phrasing 0.15, nearest real reply 0.15, SubQ voice 0.35, answers them 0.15, not mirroring them 0.10.
- It costs: the AI-tells reading runs once per option at p50 2.3 s (#238 measurement); Jina calls are now capped at 4 s with a local fallback.

## Why it misfires

It asks whether a chunk is near a list of generic AI phrases, by meaning. Short casual lines sit near many phrases by meaning; the lists were written for essays and marketing copy, not DMs; and nothing in it was learnt from the drafts models actually write for this owner versus what he really says.

## Data log has

- About 137,000 of the owner's messages in log.db (Discord 127,977, X 9,543, Instagram 226, Slack 123), with the other side of every chat.
- Agent drafts for his chats: drafts the gate saw (passed and failed) in log's run records, and the #238 replay of 20 waiting DMs with options.
- The shipped MiniLM (5.7/7.5 ms per message p50/p95 on this CPU) and onnxruntime.

## The machine

Windows 11, Ryzen 9 8945HS, no NVIDIA GPU.

## Done when

- At most 5% of the owner's own held-out messages are flagged, in every length band.
- At least 90% of held-out frontier drafts written for his chats are flagged, or are caught by another signal, without SubQ.
- The check adds under 20 ms p95 per option on the CPU, with no network call.
- Each flag names the words or the habit, beside how he says it.
