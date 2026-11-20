---
title: "Pipeline labels: who and where"
---

# Pipeline labels: who and where

log gives every chat two fields. **Who** the person is to the owner: lead, client, partner, friend, community or bot. **Where** they are, only for a lead or a client: new, warming, needFound, offered, callBooked, won, lost or goneQuiet. A bot, a friend, a partner or someone from a community never gets a sales stage. The rules: [the pipeline spec](./specs/pipeline.md); the decisions behind it: [the pipeline proposal](./decisions/pipeline/proposal.md).

## How a chat gets its labels

| Step | What runs | Where |
|---|---|---|
| A message lands | the inbox push labels the chats that moved since its last pass, before it hands the batch over (it waits at most 250 ms and never holds the push) | `scripts/hooks/push.ts`, `pushLabeller` |
| The chat's meaning | the last 20 said lines, both sides, each marked `me:` or `them:`, embedded one by one with the shipped `Xenova/all-MiniLM-L6-v2` and averaged; a new message only adds its own line to the stored average | `labelChats` |
| Their feeling | the top 3 emotions of their latest message, from `SamLowe/roberta-base-go_emotions-onnx` (int8, 125 MB, MIT, pinned in the models manifest and fetched on first use) | `localEmotions` |
| The counting signals | back and forths, days quiet, an open ask, who wrote last, their share, never wrote back | `featuresOf` |
| Bots | the name (MEE6, `*bot`, system handles), messages that share one template, long replies faster than a person types, notices nobody answers | `botSignal` |
| Who and where | before any training: the nearest label, comparing the chat to each label's meaning and seed phrases; after training: the trained head | `guessOf` |
| Stored | who, where, confidence, the message that last moved it, the emotions, the vector, in log.db's `chatPipeline` table | migration 24 |

The pushed conversation block ends with `log's read of them: who lead, where needFound (72% sure, head, moved by message …); their last message feels curiosity 61%, …`.

## The owner's part

1. `log inbox label queue` (`inboxLabelQueue`) lists the 35 chats log is least sure of, spread across platforms.
2. For each, `log inbox label --platform <p> --account <a> --chat <id> --who <w> [--where <s>] --by "the owner"` (`inboxLabel`). His label always wins, over the model and over SubQ.
3. `log inbox label train` (`inboxLabelTrain`) trains the head. It runs `scripts/pipeline/trainHead.py` with `uv run --with scikit-learn --with numpy` (no torch, nothing installed into log's Python): a logistic regression on the frozen MiniLM vectors plus the counting signals, which is SetFit's head without its contrastive body fine-tune, so the shipped ONNX body stays the one TypeScript runs. The head (weights, label order, model, `trainedAt`, counts, cross-validated accuracy) goes into log.db's `pipelineHeads` table and is used from the next message.

`log inbox label teach` (`inboxLabelTeach`) is a dry run: it counts the chats with no owner or SubQ label and prints the SubQ cost ($0.04 per million input tokens, about a cent for all of them). `--apply` sends one who-and-where question per chat to SubQ's decision model and stores each answer by `subq` with its confidence and, when unsure, its two candidate labels. Training takes SubQ's labels at 80% confidence or more at half the weight of the owner's.

## Editing the lists

Both lists are the owner's. Put a `pipelineLabels` key in `~/.logCli/settings.json` with one line of meaning per label:

```json
{ "pipelineLabels": { "who": { "lead": "might buy from me", "client": "pays me", "friend": "personal" } } }
```

A list with fewer than two labels falls back to the defaults. Only `lead` and `client` carry a stage. After changing a list, retrain the head: a head whose labels aren't in the lists is not used.

## Old labels

`log inbox labels` still prints warming, readyToAsk, askedWaiting, friend, client, cold and skip next to who and where, worked out from them: a bot is skip, a friend or partner is friend, a won lead is client, a lost or quiet lead is cold, and otherwise the counting rules decide as before. Labels set with `--as friend` or `--as client` read as who friend or client.

## Speed

`scripts/pipeline/benchLabeller.ts` runs on a copy of log.db (`LOG_DB=<copy>`) and prints p50 and p95 per new message, the first full labelling of a chat, and the model load times.
