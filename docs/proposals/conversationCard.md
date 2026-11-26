# Conversation card: one short record per chat, read by the writer and the voice gate

Status: built (REQ-VOICE-23 to 26 in docs/specs/voiceGate.md). Supersedes PR #121, rebuilt on main.

## The problem

Before every send, both the agent drafting the message and the voice gate start from a pile: the owner's whole writing guide, his replies from every conversation on every platform, and the chat itself. Three things go wrong:

1. **Drafts come out as forms.** The writer gets a wall of text and answers with a list of questions. Drafts to one contact scored 0.15–0.22 against the 0.8 bar (12 Nov).
2. **Other people's chats leak in.** "His real replies to things like this" ranks lines from anywhere: a draft to one X contact was graded against replies from a Discord chat with someone else.
3. **"Is an answer owed?" is guessed.** #167 had to bolt on `nothingWaiting`, which infers who spoke last from ranked moments. The chat already knows this exactly.

## The card

One row per chat (a DM on X counts once, whatever its ids), built only from that chat's own `messages` rows:

| Field | What it holds |
|---|---|
| `with`, `platform`, `account`, `kind` | who and where |
| `messages`, `fromOwner`, `firstAt`, `lastAt` | size and age of the chat |
| `waitingOn` | `owner` (they wrote last, unanswered), `them` (the owner wrote last), or `null` |
| `startedWith` | the first 3 lines, so the writer knows how they met |
| `theyAskedOpen` | their questions the owner hasn't answered |
| `ownerAskedOpen` | the owner's questions they haven't answered (so a draft never asks twice) |
| `ownerSaid` | the owner's last 5 lines here, his voice for this person |
| `last` | the last 8 lines, either side |

Each line is cut to 280 characters, links stripped, reactions and "(could not open)" placeholders dropped. A card stays under about 2,500 characters.

**Storage:** a `conversationCards` table in log.db (migration 20), keyed by the chat. X's two ids for one DM (`A:B` and `A-B`) map to one card.

**Kept fresh cheaply:** `appendEvent` refreshes a card only for a chat that already has one or is claimed. `cardFor` rebuilds when newer messages exist than the card's `throughSeq`, otherwise it reads the stored row (about 110 ms).

## Who reads it

1. **The writer.** `voice --with <chat>` with no text answers with the card first, then how the owner writes in that chat, then at most 4 of his real replies, plus one instruction: answer what's open in one or two short lines, never a list of questions, never repeat what he already asked, nothing from another conversation.
2. **The gate.** The card goes to SubQ as `thisConversation`.
   - `waitingOn` replaces `nothingWaiting`: an answer is owed only when `waitingOn = owner` and their last line is under a day old (the behaviour #167 shipped, now from the source of truth).
   - Once the owner has 5 or more messages in the chat, replies from other conversations (`evidenceAnywhere`) are no longer read. A chat with history is judged on that history.
   - Every code check (never-says, watermark, sameness, thresholds) stays as is (rule 137). The 0.8 bar does not move.
3. **The queue.** Its pre-send re-check reads the card, so a "held: something changed" names what changed (a new line in `theyAskedOpen`, say).

## Requirements (docs/specs/voiceGate.md)

- **REQ-VOICE-23:** Every chat the owner sends to has one card, built only from that chat's messages, and an X dm's two ids share it.
- **REQ-VOICE-24:** The writer and the gate read the card first. The writer is told to answer what is open, in his length, without a list of questions.
- **REQ-VOICE-25:** An answer is owed only when the card says it waits on the owner and their last line is under a day old.
- **REQ-VOICE-26:** With 5 or more of the owner's messages in the chat, his replies from other chats are not read.
- REQ-VOICE-01 and REQ-VOICE-02 are updated to say the card comes first.

## Tests (bun:test, from real shapes)

- An X DM stored under both ids gives one card; a group with the same person gives its own.
- `waitingOn`: owner spoke last → `them`; they spoke last today → `owner`; reactions don't count as speaking.
- `theyAskedOpen` and `ownerAskedOpen` clear once answered.
- The card is rebuilt only when `throughSeq` is behind; a chat nobody claimed triggers no work.
- Gate: with 5+ owner messages, `evidenceAnywhere` isn't called; `waitingOn = them` means `inContext` doesn't gate.
- Regression: a dm the owner sent by hand passes, and a draft to one contact is graded with none of another chat's lines.

## Not in scope

- No change to the 0.8 bar or the sameness limit.
- No new platform behaviour: the card is built from the platform-neutral `messages` table, so Discord, Slack and Instagram get it for free.

## Rollout

1. A branch off main with PR #121's `src/inbox/card` code, renamed for the owner (`fromOwner`, `ownerSaid`), migration renumbered to 20.
2. Wire the writer, the gate and the queue as above; replace `nothingWaiting` with the card.
3. Tests and spec; the full suite; PR, merge, close #121.
4. Rebuild the cards for a live queue's chats and re-gate the drafts it held, as a live check.
