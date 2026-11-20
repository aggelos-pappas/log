---
name: log-inbox-warm-people
description: "Working the warm people in your dms. A log play (docs/useCases/inbox/warmPeople.md): The people already in the owner's dms are the easiest yes. Every one of them carries a label worked out from log.db: warming (talking, no ask yet), readyToAsk (enough back and forths and they still write), askedWaiting (he asked and they haven't answered), cold (quiet for three weeks), skip (never wrote back). The owner sets friend (never pitch) and client (money, he answers) by hand, and his label always wins. The agent pulls the readyToAsk people, reads each chat, and drafts the ask in his words."
when_to_use: "Use when the owner asks for this, in words like: \"who's warm\", \"who can i ask now\", \"label my people\", \"who have we been warming up\", \"mark him as a friend\""
metadata:
  summary: "Working the warm people in your dms"
---

# Working the warm people in your dms

This is the log play `inbox/warmPeople`. Before anything else, call the log MCP tool `getGuide({ useCase: "inbox/warmPeople" })`: it returns this page and makes it the session's play, so every log tool's answer says which step you are on and a send with no play loaded is refused (rules 157, 158). Then follow the steps in order.

Draft every message from that person's own thread and the owner's real replies (`voice` with no text, `search`), never from memory, and never send two that read alike (`sameAsSent`).

The people already in the owner's dms are the easiest yes. Every one of them carries a label worked out from log.db: warming (talking, no ask yet), readyToAsk (enough back and forths and they still write), askedWaiting (he asked and they haven't answered), cold (quiet for three weeks), skip (never wrote back). The owner sets friend (never pitch) and client (money, he answers) by hand, and his label always wins. The agent pulls the readyToAsk people, reads each chat, and drafts the ask in his words.

How the owner asks for it: "who's warm", "who can i ask now", "label my people", "who have we been warming up", "mark him as a friend"

## Run it from a fresh context

Say: **"go on docs/useCases/inbox/warmPeople.md"**. The agent reads this page and runs the steps.

## The steps


| # | Step | Tool | Done when |
| --- | --- | --- | --- |
| 1 | List everyone with their label, or only one label | `inboxLabels` { label? } | each person with a label and why |
| 2 | Fix a label the owner corrects: friend, client or any other, or undo to go back | `inboxLabel` { platform, account, chat, as, by: "<owner>", undo? } | the tool says the label is set |
| 3 | For each readyToAsk person, read the chat and draft one ask in his words, never to friend or client | `voice` { to, with } | a gated draft per person |
| 4 | Show the owner the people and the drafts, then send the ones he says yes to | the reply to the owner | he knows who is warm and what goes out |
