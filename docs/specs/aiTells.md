---
title: "AI tells and watermark"
---

# AI tells and watermark

Every X and Discord send's copy is read for what AI chat interfaces leave in text (the watermark reading), and every draft the voice gate reads is also read for AI phrasing against curated lists and the owner's own writing. Rules 111 and 112.

## Watermark reading

### REQ-AITELLS-01: The reading is clean, stylistic or artifacts

The copy is read by the vendored claude-watermark-checker. Any deterministic finding (zero-width or other hidden characters, odd spaces, pasted Claude HTML) makes it `artifacts`; only curly quotes or em dashes make it `stylistic`; nothing found is `clean`. The statistical watermark is always said to be `unknown`.

Checked by: code and SubQ

### REQ-AITELLS-02: planSend refuses copy with artifacts

`planSend` refuses a send whose copy reads as `artifacts`, with the code `aiArtifacts`, naming what was found. Nothing is sent.

Checked by: code and SubQ

### REQ-AITELLS-03: The plan carries the reading and every send logs it

A send `planSend` allows carries its watermark reading, and both a direct send and each queue send log it in one line.

Checked by: code and SubQ

### REQ-AITELLS-13: A Discord send is read the same way before anything goes out

`log discord send` (MCP `discordSend`, `discordSendLive`) reads the whole message with the same watermark reading before the dry run or any send. Copy that reads as `artifacts` is refused with `aiArtifacts`, naming what was found, and nothing is sent. Otherwise the reading is logged in one line, printed in the dry run and carried in its `--json`, live or not. Rule 111.

Checked by: code and SubQ

## AI phrasing

### REQ-AITELLS-04: vale-ai-tells rules run on the draft

The tbhb/vale-ai-tells rules (`vendor/aiTells/valeAiTells/styles`, its substitution and existence rules) are run on the draft the way Vale would, and any hit that is not muted fails it.

Checked by: code and SubQ

### REQ-AITELLS-05: The index embeds every literal phrase with Jina

`log voice aiIndex` collects every literal phrase from vale-ai-tells first, then ai-slop-detector, ai-vocabulary, SLOP_Detector, the X complaints and the AI-written samples, and embeds them with Jina `jina-embeddings-v5-omni-small` at 1024 dimensions. The vectors and the index are stored in the .db, and an index made with another model is rebuilt (rule 137).

Checked by: code and SubQ

### REQ-AITELLS-06: Phrases quoted on X are kept only when close to a curated one

A phrase from the X complaints list is kept in the index only when it sits at cosine 0.6 or more from a curated phrase.

Checked by: code and SubQ

### REQ-AITELLS-07: the owner's own p50 and p99 are measured

The index measures the owner's own messages from the voice index against the phrases and keeps his p50 and p99 closeness.

Checked by: code and SubQ

### REQ-AITELLS-08: Vale rules the owner uses himself are muted

A vale rule that hits in over 2% of the owner's own messages is muted and never fails a draft.

Checked by: code and SubQ

### REQ-AITELLS-09: Phrases the owner says himself never fail a draft

A phrase vale flags that the owner says himself in 5 or more of his own messages is his voice and never fails a draft.

Checked by: code and SubQ

### REQ-AITELLS-10: Each chunk's closest AI phrase is found and reranked

The draft is cut into lines and word windows, each chunk's closest AI phrase is found by cosine, and the closest are reranked with `jina-reranker-v3.5`.

Checked by: code and SubQ

### REQ-AITELLS-11: A draft closer to AI phrasing than the owner's p99 fails

The draft fails when a vale rule hits or its closest chunk sits closer to an AI phrase than the owner's own p99.

Checked by: code and SubQ

### REQ-AITELLS-12: The Jina index is read only when asked for

The Jina AI-phrase index (REQ-AITELLS-05 to 11) is read by the gate only when `LOG_AI_TELLS=jina` (`aiTellsMode`); then `log voice` checks it is current (`ensureAiIndex`, `aiIndexStale`) and a draft whose AI tells reading fails does not pass. By default the frontier-conventions detector below is the gate's AI reading, and the Jina code stays only as that fallback.

Checked by: code and SubQ

## Frontier-model conventions

### REQ-AITELLS-14: The training corpus lives in log.db

`log voice train` (MCP `voiceTrain`) keeps the AI side of its corpus in log.db's `conventionCorpus` table (migration 24): the drafts an agent wrote for his chats, read from the agent host's own tool calls (`agentSessionDrafts`: every `voice` text and option and every `…SendLive`/`…DmLive` text, with the session's model family), every draft the gate grades (`recordDrafts`, source `gate`), a JSON file of drafts (`--drafts`, `draftsFromFile`), and fresh paired drafts (REQ-AITELLS-15). His side is his own messages from `messages` (`ownerMessages`), leaving out any text an agent drafted and any message stored within `SEND_WINDOW_MS` of a send made through log, recent ones weighted more (`ownerSample`).

Checked by: code and SubQ

### REQ-AITELLS-15: Fresh drafts are paired with his real reply and capped in spend

`--fresh <n>` takes `n` of his past dm moments (`freshMoments`: what they wrote and his real reply, at most 3 per chat, newest first), builds the grounding pack for each from his other replies with the real reply left out (`freshPrompt`), and asks the frontier models in `FRESH_MODELS` (one family per moment in turn; `LOG_VOICE_TRAIN_MODELS` overrides) through the OpenAI-compatible endpoint in `.env.local` for `FRESH_OPTIONS` options as him. The estimate is printed before any call, a plan over `--spend` (default `SPEND_CAP_USD`, $3) is refused with `spendOverCap`, and `runFresh` stops before a call that would pass the cap. Each draft is stored with its model and family, beside his real reply for the same moment.

Checked by: code and SubQ

### REQ-AITELLS-16: An over-use profile and structural habits, each with his own phrasing

`buildProfile` keeps the words, bigrams and trigrams the AI drafts use at least `NGRAM_MIN_RATIO` times as often as he does (in `NGRAM_MIN_CHATS` chats or more, and in at most `GRAM_MAX_OWNER_SHARE` of his messages), each stored with his nearest real message by the MiniLM embedding. It also measures structural habits (`habitsOf`: em dash, curly quotes, markdown, a closing full stop, a capital to open, textbook apostrophes, essay connectives, hedges, even sentence lengths, semicolons, exclamation marks) on both sides, per length band, and a habit flags in a band only when he has it in at most `HABIT_MAX_OWNER_SHARE` of his messages of that length and the drafts `HABIT_MIN_RATIO` times as often. Options of one call that open with the same two words, when that opener is not one of his common ones, are flagged as `openerRepeat`.

Checked by: code and SubQ

### REQ-AITELLS-17: A small classifier head trained in Python and applied in TypeScript

`python/voiceConventions/train.py` fits a logistic regression (scikit-learn, class-balanced) on char 2-4 gram tf-idf plus the shipped MiniLM embedding, with folds split by chat (`GroupKFold`) for the held-out probabilities, and exports the vocabulary, idf, weights and bias as JSON. `probabilityOf` applies them on the CPU the same way (lowercase, runs of whitespace as one space, code points, sublinear tf, l2 norm), with no network call.

Checked by: code and SubQ

### REQ-AITELLS-18: One line per length band, set on his held-out messages

`calibrateBands` sets one line per band (1-5, 6-15 and 16+ words) on the held-out probabilities so that, with the habit flags of the same fold, at most 5% of his held-out messages in the band are flagged (`OWNER_PASS`). In each band it also keeps only the n-grams above a ratio his held-out messages reach at most `GRAM_BUDGET` of the time (`gramCutoff`), and mutes the vale rules he hits most until at most `RULE_BUDGET` of his messages there hit one (`bandMutedRules`). A draft under `ABSTAIN_BELOW_WORDS` words, or in a band whose held-out AUC is under `BAND_MIN_AUC`, gets no verdict from the classifier and a neutral signal. `log voice train` prints, held out by chat, his flagged and the AI drafts caught per band, the drafts caught per model family, and the p50 and p95 per option.

Checked by: code and SubQ

### REQ-AITELLS-19: The reading names the words and habits beside his phrasing

`readConventions` flags a draft when its probability is over its band's line or it has a habit that flags in its band. It names each over-used n-gram with how much more models write it and his nearest real phrasing, each habit with both rates, and each vale rule hit not muted for him (globally over `RULE_MUTE_SHARE` of his messages, or in the band). N-grams and rule hits do not flag a draft on their own: measured on his held-out messages, they took share from the 5% budget and caught fewer drafts than the classifier did with it. Its value falls from 1 at his band median to 0 at the line, less `FLAG_COST` per n-gram or habit and `RULE_COST` per rule hit; `conventionsLine` prints it.

Checked by: code and SubQ
