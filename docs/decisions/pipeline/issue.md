# Knowing who each person is and where they are: labels, stages and linked people

## What the owner sees

The owner, 2026-11-20: log should "correctly label the people and where they are in the cycle", build a pipeline around the conversations he already has, and become context-aware, with small local models doing the labelling the way the play router routes prompts.

## Labels today (`log inbox labels`, 2026-11-20)

540 people: warming 110, readyToAsk 67, askedWaiting 10, friend 3, client 4, cold 183, skip 163. Only 7 were set by the owner; the rest come from `autoLabel` in `src/inbox/label/client.ts`, which counts and never reads:

- no reply from them: `skip`;
- nothing either way for `COLD_DAYS`: `cold`;
- the owner's last ask has no answer: `askedWaiting`;
- at least `READY_TURNS` back and forths, they wrote recently, no open ask: `readyToAsk`;
- otherwise `warming`.

Wrong labels on the live list:

| Who | Label | What it is |
|---|---|---|
| VIBE BOT (Discord, 41 back and forths) | readyToAsk | a bot |
| MEE6, the Discord system account | warming | bots |
| gr4ce_ig (Instagram) | readyToAsk | a close friend, labelled `friend` on Discord, but the identities aren't linked |
| linus_k (Slack) | readyToAsk | a business partner |
| Tin (Discord) | client | right, but only because the owner set it |

The seven labels also mix two things: **who someone is** (friend, client, bot, partner) and **where the conversation is** (warming, ready to ask, asked and waiting, cold).

## Linking people today (`docs/specs/people.md`, REQ-PEOPLE-04)

`log people suggest` uses Fellegi-Sunter record linkage over three comparisons: whether one identity shares the other's posts, the handle (same, same without digits, `_` and `.`, different) and the display name. On 2026-11-20 it suggested 9 pairs (4 strong). It did not suggest one known person's Instagram `gr4ce_ig` against their Discord `graceships` and X `grace_ships`, because the handles differ and nothing else is compared: not how they write, not what they talk about with the owner, not the times they are active, not the owner telling someone his other handle.

## What log already has

- `log.db`: every message on X, Discord, Slack and Instagram, with chats, identities, people and link events (REQ-PEOPLE-01 to 07).
- The play router: a local embedder (MiniLM, pinned, ONNX) ranks prompts against plays in about 150 ms.
- SubQ for reading text against evidence; the injection judge model as an example of a small local classifier in production.
- The per-chat card (REQ-VOICE-23) and the owner's real replies per chat.

## The machine

Windows 11, Ryzen 9 8945HS, no NVIDIA GPU. The labeller has to run on the CPU, per message, without slowing the inbox push (p95 0.35 s after #230).

## Done when

- Who someone is and where the conversation is are two separate fields, with the stages the owner defines.
- On a held-out set the owner labels, the labeller agrees with him at least 90% on "who" and 80% on "where", and never puts a bot, friend or partner in a sales stage.
- Every new message updates that chat's stage in under 50 ms on the CPU.
- Linking finds that friend's three accounts as one person (with the owner's yes) and doesn't merge two different people.
