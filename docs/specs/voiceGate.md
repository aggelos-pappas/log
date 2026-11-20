---
title: "Voice gate"
---

# Voice gate

Every message log sends as the owner passes the voice gate first (`log voice`, MCP `voice`). The gate asks SubQ whether the owner typed it himself, reading his own writing across all his conversations. Rules 90, 98, 111 and 112.

## Reading

### REQ-VOICE-01: Every draft is read against the owner's writing across all his conversations

Every draft is sent to SubQ with the owner's writing guide, the DMs he wrote himself, and his real replies and closest wording from all his conversations, whether or not there is a chat with the person.

Checked by: code and SubQ

### REQ-VOICE-02: A chat with the person adds that chat's evidence

When there is a chat with the person, the draft is also read against the owner's replies, closest wording and latest messages in that chat, (an X dm is found by the one person in it, because X gives the same dm two conversation ids), and SubQ is asked whether it reads like him writing in that chat.

Checked by: SubQ

### REQ-VOICE-03: Phrases the owner never says fail the draft

A draft that contains a phrase from the list of phrases the owner never says fails, whatever SubQ answers.

Checked by: code and SubQ

## Opener

### REQ-VOICE-04: A first message is only the opener

A first message to someone the owner has never talked with fails when it carries an ask: a pitch, a question about a tool, product or service of his, a call, or a link to his own stuff. Rule 98. A chat where the owner has already sent messages (the voice index's latest messages in that chat) is never judged as a first message: SubQ is told so (`alreadyTalkedInThisChat`) and the opener check passes.

Checked by: SubQ

## Watermark

### REQ-VOICE-05: A draft with AI artifacts fails

A draft whose watermark reading finds artifacts (zero-width or other hidden characters, odd spaces, pasted Claude HTML) fails. Rule 111.

Checked by: code and SubQ

## Pass

### REQ-VOICE-06: A draft passes on one calibrated score and three hard blocks

A draft passes when no hard block is hit and its one voice score (REQ-VOICE-29) reaches the calibrated threshold (REQ-VOICE-30). The SubQ answers (voice, friend-like, chat, context when an answer is owed, room, builds-on) are signals inside the score, not separate pass/fail checks. The old every-check rule (the voice answer at `VOICE_PASS`, every other answer at `CONTEXT_PASS`, his phrasing at his floor, no AI tell) is still computed as `strictPass` and reported by `log voice calibrate` as today's gate, so the two can be compared on the same readings.

Checked by: code and SubQ

## His own phrasing and the scrambler

### REQ-VOICE-07: A draft written in word pairs the owner has never written fails

Every reply in the voice index is cut into pairs of words. The gate counts how many of the draft's pairs the owner has written at least twice, leaving out pairs that use words from what the other person said. A draft whose share is below the owner's own 10th percentile fails, measured over his replies with each reply's own pairs left out. The pairs he has never written are named in the result and handed to SubQ, so "is wild" fails because the owner never wrote it.

The pairs are split before any of that: a pair made of words he has written, in an order he never used, is `newPhrasing` and is what is measured and handed to SubQ; a pair holding a word he has never written at all is `newWords`, the vocabulary of a subject that is new to him, and is named apart in the result and in `phrasesLine` as not counted against him. On 2026-11-12 a scoping message about a job in a subject he has never written about was being failed for its nouns, not its voice.

Checked by: code and SubQ

### REQ-VOICE-20: A draft written on several lines is graded as the messages it sends

A draft of several lines goes out as one message per line (rule 90), so the voice question reads it the same way: `readVoice` in `src/twitter/copy/voice/client.ts` cuts it with `messagesOf` and hands SubQ `dmAsItWillBeSent` and `wordsInEachMessageAsSent`, and is told to read the messages and the burst of them, never one block. His length is each message against the chat's `burst.messageWords` and `medianWords`, and how many he sends in a row against `burst.median`. Before this, on 2026-11-12, six short lines of a scoping message scored `voice` 0.22 as one wall of text, and the same six lines as six messages scored 0.85. The owner: "it keeps scoring really low on the gate and it's because it's a mountain wall of text".

Checked by: code and SubQ

### REQ-VOICE-21: A subject he has never written about never counts against his voice

The voice question says outright that words for a new subject are new vocabulary, not a voice problem: the phrasing, the shape and the register are what is judged, never the topic. So a draft about a job in a subject the owner has no history in is read on how he says it, not on whether he has ever said it. The owner, 2026-11-12: "it's trying to search for things ive not talked about".

Checked by: SubQ

### REQ-VOICE-22: Outside X, his X guide is scoped to his vocabulary

`GUIDES/OWNER_WRITING_STYLE.md` is how the owner writes on X: a reply is 6 to 20 words, one line, no question at the end. That is not how he writes in a Discord, Slack or Instagram chat, where a burst of short lines and a run of questions is normal. `outsideXVoice` reads the chat's platform from the evidence (`platform`, `kind`), and for any platform other than `twitter` SubQ is told (`howOwnerWritesIsOnlyHisX`, `thisChatIsNotX`) to read `howOwnerWritesInThisChat` and `ownersRealRepliesHere` first and use `howOwnerWrites` only for his vocabulary and his spelling. On 2026-11-12 the X guide was failing a Discord DM for being a question with an ask in it.

Checked by: code and SubQ

### REQ-VOICE-08: The vendored watermark scrambler reads every draft

The draft goes through `vendor/aiWatermarkScrambler` (novatechflow/ai-watermark-scrambler, layer A) for invisible and lookalike characters. A draft with any fails, and its count and kinds are handed to SubQ. The statistical watermark is not checked here.

Checked by: code and SubQ

### REQ-VOICE-09: The gate runs inside every send and refuses a failing draft

Every send as the owner (Discord, Slack, an X dm, the X queue's dms, replies and quotes, Instagram text) runs the whole gate right before it goes out, after the account has caught up and before the chat is claimed, whether or not `log voice` ran first. A failing draft is refused with `voiceGateFailed` and nothing is sent; in the X queue the item is held with what failed. A pass is one line; a fail names only the checks that failed and why. Rule 137.

Checked by: code and SubQ

### REQ-VOICE-10: The chat's context is ranked for the moment and given in full

The gate takes the chat's messages from the .db (both ways), embeds them and what is being answered, keeps the closest 40 by cosine, reranks those with `jina-reranker-v3.5`, and gives SubQ the top 12 in full, in time order, with its question on whether the draft answers them in this conversation. Rule 137.

Checked by: code and SubQ

### REQ-VOICE-11: Embeddings are stored once in the .db, and only a verdict and the calibration beside them

A vector is stored in the .db's `embeddings` table by the text's hash, the model and the dimensions, and an embedder looks there first and embeds only what has no vector yet, so the owner's reply embeddings are read from the .db and never re-embedded per call. The AI tells index's phrase list and the owner's baseline are in `aiIndexes`. The only gate results kept are a verdict per exact text and chat's last message id (REQ-VOICE-31) and the dated calibration (REQ-VOICE-30), both in the `state` table; no reading is saved. Rule 137.

Checked by: code and SubQ

### REQ-VOICE-12: The gate inside a send reads the owner's real replies in that chat

The gate inside a send finds the chat in the owner's saved conversations by what the send knows (`chatIdFor`): its conversation id on that platform, or, on X, the conversation whose pair holds the person's user id, or their handle on that platform only. It gives SubQ his real replies there, the same evidence `log voice --with` gives. When the chat isn't there, the gate still reads his writing everywhere. On 2026-11-04 drafts that `voice` passed at 0.99 were refused inside the send at 0.36, because the send gave SubQ none of them. The opener rule (rule 98) only reads a first message: a chat with the owner's own messages in its history, or his replies from that chat or that person, is already talking (`alreadyTalkedIn`), and openerOnly is not asked. What the send answers (`momentAnswered`) is every message they sent after the owner last spoke, oldest first, one per line, so a run of messages is answered as a whole; the chat is ranked for the gate against that together with the draft itself, so the earlier moment a draft builds on is in front of SubQ (on 2026-11-05 a pitch to kewlkid passed `voice` at 0.89 and was refused in the send at 0.34, ranked against his last line alone). When the owner's own message is the newest, the send is news of his own, so nothing is passed as what they said and the gate asks whether it picks up on something specific about them. Rules 98 and 137.

Checked by: code and SubQ

### REQ-VOICE-13: A voice note is graded as spoken and must build on the conversation

`readVoice` in `src/twitter/copy/voice/client.ts` takes `spoken`. With it the `voice` question asks whether the owner would say it himself in a voice note, its length and punctuation never counting against it; `toThem` asks the same of how he talks in this chat; and a `buildsOn` question asks whether it takes what they are talking about further, across the whole conversation, rather than repeating what the owner already told them, which must reach `CONTEXT_PASS` to pass. Without `spoken` there is no `buildsOn` (it is `null`). `gateReading` in `src/cli/twitter/helpers/voice.ts` passes `spoken` on and skips `offProfile` for it, `gateSend` takes `spoken`, `failedParts` names a low `buildsOn`, and `log voice --spoken` gates a voice note the same way. With `spoken`, `gateReading` also hands `readVoice` `howOwnerTalks()`: the AssemblyAI transcripts of the owner's own voice notes (`ownersOwnVoiceNotes` in `src/extensions/voiceClone/helpers/recordings.ts`, only the ones recorded before `firstClonedAt`, so none the clone made), given to SubQ as `howOwnerTalksInHisOwnVoiceNotes`, which the spoken voice question reads first. Rule 149.

Checked by: code and SubQ

### REQ-VOICE-14: the owner can send one dm over the gate's refusal

`log twitter dm` takes `--overGate` (`OVER_GATE` in `src/cli/twitter/helpers/send.ts`). With it, the send skips `gateDeps.gate` and says so on its error stream; without it the gate runs and a refusal is `voiceGateFailed`. The copy's AI artifact check (`planSend`, `aiArtifacts`) runs either way, before the gate. `log discord send` takes `--overGate` the same way (its flag in `DISCORD_SEND_INPUT`, `src/cli/discord/index.ts`): with it the send skips `gateDeps.gate` and says so, without it a refusal is `voiceGateFailed`, and its AI artifact check still runs first. the owner, 2026-11-05: a message to kewlkid in his own words, and even his GitHub username on its own, were refused by the gate. Rule 152.

Checked by: code and SubQ

### REQ-VOICE-19: A task is gated as a brief, and its files go with it

`log discord send --brief` passes `brief` and the attached files to `gateSend`, which, after the sameness check, hands the draft to `gateBrief` instead of the voice reading. `gateBrief` refuses a draft the scrambler finds suspicious, then asks SubQ (`readBrief`, `src/voice/brief/client.ts`) the five `BRIEF_CHECKS` (`clear`, `why`, `doneWhen`, `kind`, `steerable`) and `fitsTheRoom` when there is a room, with the chat's ranked moments, the owner's writing guide and each attached file (`attachedOf`: its name, and the first `ATTACHED_TEXT_CHARS` characters of a text file). It passes only when every answer is at least `BRIEF_PASS` (0.7); a refusal names each failed check (`briefFailedParts`). `--file` attaches files to the last message only (`filesOf`): each must be under OUTBOX or ~/.logCli and at most 10 MB, else `fileRefused` before anything is sent. the owner, 2026-11-07. Rule 162.

Checked by: code and SubQ

### REQ-VOICE-18: A draft that was just gated is not sent to SubQ again

`gateSend` first looks up the verdict of this exact text for the chat's last message id (`verdictFor`, REQ-VOICE-31) and reuses it, pass or fail, so the send gives the same verdict the pre-gate gave when nobody has written since. Without one, when `gateSend` or the `log voice` command passed a draft, it records the pass by the draft's text (`recordPass`, `src/voice/passes`), and `gateSend` answers a send of the same text as passed without asking SubQ (`recentPass`) when that pass is under `PASS_REUSE_MS` (10 minutes) old and nothing has come in on the chat since (`incomingSince`). The sameness check (REQ-VOICE-16) still runs first. On a Discord DM or group whose .db is current (`readSourceFor`), the room the gate reads comes from `chatMessages`, not a read from Discord. the owner, 2026-11-07. Rule 161.

Checked by: code and SubQ

### REQ-VOICE-17: A refused draft says where to look before it is rewritten

When `gateSend` in `src/cli/twitter/helpers/voice.ts` refuses a draft with `voiceGateFailed`, or `sameAsSent` refuses it, the refusal ends with `rewriteSteps`: call `voice` with the person (and what they said) and no text, to read their thread and the owner's real replies to things like it; call `search` for what the owner has said on it before; then write from those, unlike anything sent today. the owner, 2026-11-07: "you don't even try to look ... you don't try to search". Rule 158.

Checked by: code and SubQ

### REQ-VOICE-16: No two messages read alike

`sameAsSent` in `src/cli/twitter/helpers/voice.ts` reads what the account sent in the last `SAMENESS_WINDOW_HOURS` (24) from the .db (`ownTextsSince` in `src/inbox/store/client.ts`, one text per conversation) and refuses the draft when `samenessOf` in `src/voice/sameness/client.ts` finds half or more of its word pairs (`SAMENESS_LIMIT`, 0.5), with links left out, already in one of them; a draft with fewer than `SAMENESS_MIN_PAIRS` (3) word pairs is never refused. `gateSend` runs it through `gateDeps.same` before the voice gate's reading, and the twitter dm and Discord sends run it before their `overGate` skip, refusing `sameAsSent`. `itemProblems` in `src/twitter/queue/plan/client.ts` adds a `sameAsSent` problem for every pending item that `batchSameness` finds repeating an earlier item of the same queue. the owner, 2026-11-07: the share-asks that day differed only in their first line. Rule 157.

Checked by: code and SubQ

### REQ-VOICE-15: Every send and voice note is gated against the room it goes to

`gateSend` in `src/cli/twitter/helpers/voice.ts` passes a room to `gateReading`: the one given (`room`), the one its `readRoom` reads, or one built with `roomOf` from the chat in the .db. `roomOf` in `src/voice/room/index.ts` gives the chat's kind, who else spoke in the last 24 hours, the last of them and how many days ago, how many of the owner's messages end the chat, whether nobody else has spoken lately, and `addressTo`, which for a channel or group with nobody else lately says to talk to it as a whole. `readVoice` in `src/twitter/copy/voice/client.ts` gives it to SubQ as `theRoom` and asks `fitsTheRoom`, and a draft scoring under `CONTEXT_PASS` fails. The Discord send and voice note pass a `readRoom` that reads the chat's last 20 messages through the engine with `roomFromRead`. When nobody else has spoken lately in a channel or group (`nobodyToAnswer`), there is nothing to answer, so `inContext` doesn't count towards the pass and isn't named in a refusal; `fitsTheRoom`, `buildsOn` and the voice still do. In a direct message where the owner sent the latest messages and they haven't answered yet, `fitsTheRoom` counts a follow-up that carries on from what the owner just sent them (a question about their own post he just shared) as addressed to them as the chat really is, and fails it only when it acts as if they had replied. Rules 155, 156.

Checked by: code and SubQ

## The conversation card

### REQ-VOICE-23: Every chat the owner sends to has one card, built only from that chat

`cardFor` in `src/inbox/card/client.ts` builds a card from the `messages` rows of the chats `chatsFor` finds, and an X dm kept under both of its ids (`A:B` and `A-B`) is one card. It holds who the chat is with, how it started, whose turn it is (`waitingOn`), what they said that the owner hasn't answered, what the owner asked that they haven't, his last lines there and the last lines either side. It is stored in `conversationCards` (migration 20) with the message `throughSeq` it was built through, and rebuilt only when a newer message exists. `appendEvent` calls `refreshWorkedCards`, which rebuilds only a chat that already has a card or is claimed, so no other chat costs anything.

Checked by: code and SubQ

### REQ-VOICE-24: The writer and the gate read the card first

`voice` with a chat and no text shows `renderCard` first, then what they said that is open, then the grounding pack (REQ-VOICE-28). `readVoice` gives the rendered card to SubQ as `thisConversation`. The owner, 12 November: "it keeps scoring really low on the gate and it's because it's a mountain wall of text".

Checked by: code and SubQ

### REQ-VOICE-25: An answer is owed only when the card says it waits on the owner, and their line is under a day old

When a card is known and the owner has spoken in the chat, `inContext` gates only when `answerOwed` is true: the card waits on the owner and their last line is under `ANSWER_OWED_MS` (a day) old. Otherwise the chat's own facts decide, not a guess from ranked moments.

Checked by: code

### REQ-VOICE-26: A chat with history is judged on that history

With `OWN_CHAT_MESSAGES` (5) or more of the owner's messages in the chat (`scopedToThisChat`), `gateReading` does not read his replies from other conversations (`evidenceAnywhere`), so a draft to one person is never graded against a chat with someone else.

Checked by: code

## Options

### REQ-VOICE-27: No Jina call inside the gate waits more than a few seconds

Every Jina embeddings and rerank call the gate makes is bounded by `JINA_GATE_MS` (4 s): `voiceDeps.aiEmbedder` passes it to `jinaEmbedder` as a fetch timeout with no retries, and `withinMs` races the call against it. `rankedContext` embeds through `embedBounded`, which falls back to the local embedder (`voiceDeps.embedder`, the stored MiniLM the router uses) when Jina is late, fails or has no key, and then ranks by cosine without a rerank (`rerankBounded` answers `null`). `readAiTells` keeps its rule hits and skips the closeness to AI phrases (`skipped`) when its embeddings are late. Building the AI tells index (`log voice aiIndex`) is not bounded. On 2026-11-20 one unbounded Jina embeddings call inside a Discord send took 167 s.

Checked by: code

### REQ-VOICE-28: The grounding pack comes before any draft

`voice { to, with }` with no text returns the grounding pack (`packFor`, `packOf`, `renderPack` in `src/voice/pack`), built locally from the .db and the voice index: his real replies to messages like what is open (they wrote, he answered), up to `PACK_PER_TIER` from this chat or person first and then up to `PACK_PER_TIER` from his other chats; one line of his features here (median length, burst, case, the punctuation he uses and never uses, his top word pairs here, his openers); how he talks to this person against how he writes everywhere, and how they talk, labelled not to copy (`compareLines`); his facts said in this chat (`hisFacts`), the only facts an option may state; two or three contrastive lines that are not him (AI phrases nearest to this kind of reply, and their own latest line); and the ask to write 3-5 options and grade them in one call. What is open defaults to what they sent since the owner last wrote.

Checked by: code

### REQ-VOICE-29: One voice score with fixed written weights

`scoreOf` in `src/voice/score` adds the signals the gate already has, each in 0..1, with the weights in `SCORE_WEIGHTS`: his phrasing (his share of familiar word pairs against his median, less `NOT_HERE_COST` for each thing he never writes here), the nearest real reply (cosine to his closest real reply by the local embedder), not an AI tell (the frontier-conventions reading, REQ-VOICE-34; with `LOG_AI_TELLS=jina` the distance from the nearest AI phrase between his p50 and p99, less `RULE_HIT_COST` per rule hit), SubQ voice (the mean of voice, friend-like and, with a chat, the chat answer), answers them (the context answer when owed, the room and builds-on answers when asked) and not mirroring them (REQ-VOICE-33). A missing signal is left out and the others share its weight. `hardBlocks` fail a draft whatever its score: a never-said phrase, watermark artifacts or hidden characters, and an ask in a first message to someone who has not written. `scoreTable` prints the score, the threshold and each signal's value, weight and share.

Checked by: code

### REQ-VOICE-30: The threshold is calibrated on his own held-out replies

`log voice calibrate` (MCP `voiceCalibrate`) holds out `CALIBRATE_COUNT` of his dm replies (`heldOutSample`, one per chat first), grades each against its chat's evidence with that reply left out of the evidence, his word pairs and the nearest replies, grades `CALIBRATE_AI_DRAFTS` AI-written lines against the same chats, and sets the threshold with `thresholdFrom` so `HELD_OUT_PASS` (95%) of his held-out replies pass, inside `THRESHOLD_FLOOR` and `THRESHOLD_CEILING`. It stores the threshold, the date, his pass rate under today's every-check gate and under the score, and the share of AI lines each fails, in the `state` table (`saveCalibration`), and every gate reads it (`currentThreshold`).

Checked by: code and SubQ

### REQ-VOICE-31: The same text gets the same verdict at gate and at send

Every gate with a known chat records its verdict by the exact text and the chat's last message id (`recordVerdict`), and `gateSend` reuses it when the chat's last message id is still the same (`verdictFor`), naming the time and score it came from. The pre-gate and the send read what is open from the chat the same way (`momentAnswered`), so a pre-gate without a hand-written context grades what the send grades.

Checked by: code

### REQ-VOICE-32: Options are graded together and ranked

`voice { to, with, options: [..] }` takes up to `OPTIONS_MAX` drafts (a list flag whose items are never split on commas) and grades them in one SubQ request (`readVoices`, `optionsRequestOf`: every question asked once per option, each option's own messages and unfamiliar pairs beside it), then ranks them passing first and by the score (`rankOptions`). The call fails only when no option passes, and then returns the fix for the best one (`fixFor`): each failing span (a never-said phrase, an AI tell, a pair he has never written, something he never writes here) next to his nearest real phrasing for it, and the weakest signals in plain words. Every option's verdict is recorded (REQ-VOICE-31), so the send of the chosen one reuses it.

Checked by: code and SubQ

### REQ-VOICE-33: A draft that mirrors them more than he does loses

LLMs over-converge to their conversation partner's style beyond human baselines (arXiv 2508.03276, 2605.29278), so an agent replying in a chat drifts into the other person's style rather than his. `convergenceOf` in `src/voice/converge` measures how much of the draft's words come from their last messages against how much of his replies reuse what they said (in this chat with `HERE_MIN_PAIRS` or more of his replies, else everywhere), and how far the draft's style (`styleOf`: length, case, commas, full stops, questions, !, emoji) moves toward theirs from how he writes to this person; the larger gap, at `STYLE_WEIGHT` for style, costs `CONVERGENCE_COST` per unit in the not-mirroring signal. `convergenceLine` prints both sides for the best option.

Checked by: code

### REQ-VOICE-34: Not an AI tell comes from the detector trained on him

Every gate reads each draft (all options of one call together) with the frontier-conventions detector (`ensureConventions`, `readConventionsOf`, REQ-AITELLS-14 to 19) and its value is the not-an-AI-tell signal; a draft too short to tell leaves the signal out. It adds the MiniLM embedding and a few lookups per option, with no network call. When the detector is missing, or older than his voice index, the gate starts `log voice train` in the background once (`trainInBackground`, marked in `state` for `BUILD_GRACE_MS`, only with `OWNER_MIN_FOR_TRAINING` of his messages in log.db, off with `LOG_VOICE_TRAIN=off`) and goes on with the older detector or none, never waiting for it. A flagged reading is listed in the failed parts with the words and habits beside his phrasing, and each flag is a failing span in the fix for the best option. Every option the gate grades is kept in the corpus as an AI draft (`recordDrafts`).

Checked by: code and SubQ
