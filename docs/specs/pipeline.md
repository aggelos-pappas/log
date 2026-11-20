---
title: "Who each person is and where they are"
---

# Who each person is and where they are

Every chat in the owner's inbox carries two fields: `who` the person is to the owner and, only for a lead or a client, `where` they are in the sales cycle. A small model on the CPU fills both on every new message, the owner's own labels always win and train it, and SubQ labels the rest once. Nothing here sends a message on any platform. The design and the measured CPU stack: [the pipeline proposal](../decisions/pipeline/proposal.md); how to use it: [Pipeline labels](../pipelineLabels.md).

## The fields

### REQ-PIPELINE-01: Two owner-editable lists, and no sales stage for a bot, friend, partner or community

`who` is one of lead, client, partner, friend, community or bot (`WHO_LABELS`); `where` is one of new, warming, needFound, offered, callBooked, won, lost or goneQuiet (`WHERE_LABELS`). Each label has a one-line meaning, and the owner replaces either list in `~/.logCli/settings.json` under `pipelineLabels` (`pipelineLabels()`), keeping the defaults when the key is missing or holds fewer than two labels. Only community, a lead or a client (`SALES_WHO`) ever gets a `where`: the owner turns people from his communities into clients, so community is the top of the cycle, not a dead end. A bot, friend or partner never gets one: `guessOf`, `setLabel` and `labelOfChat` all drop it for anyone else, and `log inbox label` refuses to store one, saying why.

Checked by: code and SubQ

### REQ-PIPELINE-02: Old labels still read the same

Readers of the seven old labels keep working. `labelOfChat` maps the fields back (`oldLabelOf`): a bot is `skip`, a friend or partner is `friend`, a client is `client`, a lead who won is `client`, a lost or quiet lead is `cold`, and otherwise the counting rules decide as before, with community never `readyToAsk`. An owner entry set with `--as friend` or `--as client` (`OLD_LABEL_FIELDS`) reads as `who` friend or client. `log inbox labels` prints both, and `--who`/`--where` filter by the new fields.

Checked by: code and SubQ

## The labeller

### REQ-PIPELINE-03: Day one is nearest-prototype on the shipped MiniLM, with the counting signals and a bot detector as features

`labelChats` embeds a window of the chat's last `WINDOW_MESSAGES` said messages, both sides, each line marked `me:` or `them:` (`windowText`), with the shipped embedder, and scores it against one prototype per label built from the label's meaning and its `SEED_PHRASES` (`buildPrototypes`, softmax at `PROTOTYPE_TEMPERATURE`). When the owner has labelled at least one chat of every `who`, those chats' vectors join the prototypes (`withExemplars`). The counting signals become features (`featuresOf`: back and forths, days quiet, an open ask, who wrote last, their share, never wrote back). `botSignal` scores a bot from its name (`BOT_NAMES`, a `bot` word, system handles), messages that share one template, replies faster than `FAST_REPLY_MS` on the median of long replies, and notices nobody answers; at `BOT_THRESHOLD` or more, and only when the teacher (or the owner) also says bot (`botVerdict`), the chat is a bot with no stage. For a lead or client a chat quiet `QUIET_DAYS` is goneQuiet and one with fewer than `NEW_TURNS` back and forths is new (offered if the owner's ask is open). A stored group is community and is never embedded.

Checked by: code and SubQ

### REQ-PIPELINE-04: A trained head, applied on the CPU, wins once it exists

`scripts/pipeline/trainHead.py`, run by `log inbox label train` through `uv run --with scikit-learn --with numpy`, fits a logistic regression on the stored MiniLM vectors plus the scaled features (a SetFit head on a frozen body: the body stays the shipped ONNX so TypeScript can apply it) from the owner's labels (weight 1) and SubQ's labels at `TEACHER_MIN_CONFIDENCE` or more (weight 0.5), and the result (weights, label order, model, `trainedAt`, counts) is stored in log.db's `pipelineHeads` table (`saveHead`). Training is refused below `HEAD_MIN_ROWS` labelled chats or `HEAD_MIN_KINDS` kinds of who. `guessOf` applies the newest head (`applyLayer`) when it knows at least `HEAD_MIN_KINDS` labels, all in the owner's lists, and falls back to the prototypes otherwise.

Checked by: code and SubQ

### REQ-PIPELINE-05: Stored per chat on every new message, cached by the last message

Each chat's `who`, `where`, confidence, margin, scores, features, MiniLM vector, the message that last moved the label (`movedBySeq`, `movedById`) and the top `EMOTIONS_KEPT` emotions of the latest inbound message (`SamLowe/roberta-base-go_emotions-onnx`, pinned in the models manifest, run by `localEmotions`) live in log.db's `chatPipeline` table (migration 24). A chat is labelled again only when its last message or the labeller (`modelTag`) changed. The inbox push runs `pushLabeller` before each batch: it labels the chats that got messages since its last pass, waits at most `PUSH_LABEL_WAIT_MS` for it and never blocks the push, and the conversation block the hook and the push show carries `log's read of them` (`pipelineLine`).

Checked by: code and SubQ

## Ground truth

### REQ-PIPELINE-06: The owner labels what log is least sure of

`log inbox label queue` (`inboxLabelQueue`) returns up to `QUEUE_SIZE` chats by uncertainty (the larger of one minus the margin and the mean normalised entropy of who and where), taken round by round across platforms so one platform can't fill it, skipping groups and chats the owner already labelled (`labelQueue`). The owner answers with `log inbox label --who <w> [--where <s>]` (`inboxLabel`); his entry replaces any other for that person.

Checked by: code and SubQ

### REQ-PIPELINE-07: SubQ labels every chat once, as a dry run until applied

`log inbox label teach` (`inboxLabelTeach`) lists the chats with no owner or SubQ label and prints the input tokens and dollars at `SUBQ_USD_PER_MILLION_INPUT` (`teachPlan`) without sending anything. Only `--apply` asks SubQ's decision model one who and one where choice per chat (`teach`) and stores each answer as a label entry by `subq` with its confidence and, under `TEACHER_MIN_CONFIDENCE`, the two candidate labels. A SubQ entry never replaces the owner's (`setLabel`), and it is shown only when it is surer than the labeller.

Checked by: code and SubQ

## Outcomes

### REQ-PIPELINE-08: Whether people answer what log sent, against the owner's own sends, matched by person and stage

`log inbox outcomes` (`inboxOutcomes`) reads log.db only and sends nothing. A send is a run of the owner's said messages in a one-to-one dm (the owner and one person write at least `ONE_TO_ONE_SHARE` of it, bots left out) before the person writes again (`sendsOfPerson`). log sent it when a line is a `partSent` send record's message id, a sent queue item's text to that person (the queue's name is its play, `playOfQueue`), or falls in a root span of a send tool on that platform (`SEND_TOOL`, `sendSpans`); every other send is the owner's by hand. A log send's play is the last guide (`getGuide` useCase) or plugin play skill loaded in the agent session whose send call came within `AGENT_CALL_REACH_MS` (`agentSends` over the agent host's state.db). Stage at a send is the labelled stage once the message that moved the person there was sent, else new, warming or goneQuiet from the history before it (`stageAt`); moved on is a later stage `MOVE_WINDOW_MS` after (`movedForward`). Only sends since log first sent on each account count for both sides (`sinceOf`), and a window counts a send only once it has passed. The report (`reportOf`) gives per platform, per who and per stage the reply rate within 24 hours and 7 days with a Wilson interval, the median time to reply and the moved-on rate, raw and matched: matched compares log and hand sends to the same person at the same stage with Mantel-Haenszel weights (`matchedWindow`) and a bootstrap interval over people. It adds the stage moves, each play's rates with its matched gap, and with `--feelings` the warmth of each send (the GoEmotions positive share, `POSITIVE_AT`) against a reply as a raw and a person-and-stage Mantel-Haenszel odds ratio. `--json` returns the report and a block view for a card (`outcomeBlocks`).

Checked by: code and SubQ

## Asking SubQ when the head is unsure

### REQ-PIPELINE-09: Unsure chats go to SubQ off the push path, within a daily cap, and the head retrains itself

On every new message `labelChats` asks `fallbackReason` whether the chat needs the teacher: it has no SubQ label yet, its SubQ label is `TEACHER_STALE_MESSAGES` messages old, the head's stage differs from SubQ's with at least `STAGE_CHANGE_SCORE`, the bot signal fired but SubQ never said bot, or the head is under `FALLBACK_BELOW` after `UNSURE_MIN_NEW` new messages. An owner-labelled chat is never asked about. Such chats are queued in log.db (`queueForTeacher`, state `pipelineTeach`) and the head's label is used meanwhile. The push process runs `startTeacher`, which claims the drain in log.db so only one push loop asks, and every `TEACH_EVERY_MS` `drainTeacher` sends up to `TEACH_BATCH` queued chats to SubQ, never past the day's cap (`subqDailyUsd`: `subqDailyUsd` under `pipelineLabels` in settings.json, default `SUBQ_DAILY_USD` = $0.05). Each answer is stored by `subq` with its confidence, candidates and the last message it read (`throughSeq`); each run (chats, tokens, dollars, what stopped it) is logged in log.db per day. Once `RETRAIN_AFTER` SubQ labels are newer than the head, the head is retrained. `log inbox label teach` shows the queue and today's spend; `LOG_PIPELINE_TEACHER=off` turns the background asking off. `scripts/pipeline/benchFallback.ts` measures held-out agreement and the daily cost on a copy of log.db.

Checked by: code and SubQ

### REQ-PIPELINE-10: A bot needs the bot signal and the teacher, and never a two-way human conversation

A chat is a bot only when `botVerdict` holds: the bot signal is at `BOT_THRESHOLD` or more and SubQ or the owner says bot. A chat where the owner and the person go back and forth (`humanTalk`: `TWO_WAY_TURNS` turns with `TWO_WAY_OWNER_LINES` lines from the owner) or one with an account the owner runs is never a bot. A stored row that says bot without that (`withoutFalseBot`) reads as its next likeliest label in `labelOfChat` and `pipelineLine`.

Checked by: code and SubQ
