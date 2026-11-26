# memoryAndSearch

Memory, search, Relate graph, people, voice notes.

Written by `bun run docs:build` from the code, the skills and AGENTS.md. Not edited by hand: change the command's usage, its skill or the rule, and rebuild.

## Use cases these tools are part of

When the owner asks for one of these, follow its page step by step.

| Use case | What it is | How the owner asks for it |
|---|---|---|
| `getGuide({ useCase: "discord/serverReply" })` | Replying in a Discord server channel | "reply to <someone> in <server>", "answer him in the general", "message the guy in <server> #<channel> who mentioned me", "reply in the <server> server", "find what <someone> said in <server> and answer it" |
| `getGuide({ useCase: "discord/serverSearch" })` | Finding a conversation in a Discord server | "find the conversation I had with <someone> in <server> about <thing>", "what did <someone> say in <server> about <thing>", "search <server> for <words>", "read through the <server> server and find <thing>" |
| `getGuide({ useCase: "inbox/saidBy" })` | Someone's messages on every platform, found by name, newest first | "what did he say", "find his messages", "everything they said" |
| `getGuide({ useCase: "inbox/scopeAJob" })` | Scoping a job out of someone in a DM | "probe <person> so we can scope out what the task is", "scope it out with him", "find out what he actually wants done", "go through and then scope it out". |
| `getGuide({ useCase: "log/toolFromOneOff" })` | Turning a hand-rolled one-off into a log tool | "turn that one-off into a tool", "make that script a log command", "stop hand-rolling that", "vendor that query into log" |
| `getGuide({ useCase: "network/relationshipMachine" })` | Relationship state machine | "where am I with <person>", "how do I reach <person>". |
| `getGuide({ useCase: "network/whoToTalkTo" })` | Who to talk to next | "who in my network should I talk to", "who's in my network", "who do I need to speak to". |
| `getGuide({ useCase: "people/bots" })` | Bots | "there are bots in my network", "why is MEE6 a person". |
| `getGuide({ useCase: "people/facts" })` | Person facts | "what did I promise them", "what do I know about them". |
| `getGuide({ useCase: "twitter/affiliateMarketing" })` | Affiliate marketing through your DMs | "answer the people asking about <tool> in my dms with my affiliate link", "turn the dms about <tool> into affiliate money", "follow up everyone who asked about the tool", "get me onto <company>'s affiliate program and book the call". |
| `getGuide({ useCase: "twitter/collabMaxxing" })` | Collab maxxing: turn open conversations into collabs | "position a collab first then be like just a few quid so i can make a video about it", "start network maxxing and collab maxxing and trying to see what hes doing get him to reveal it all", "follow up on <someone> and the other people, small commitment from deals, not just new people but already open convos", "respond with the collabmaxxing", "selling the outcome", "let him name it", "check in with <someone> whats good there he is keen but isnt liquid", "just be nice to them there the poor people", "ask <someone> if i could become a contributor", "look on my twitter for missed opportunities". |
| `getGuide({ useCase: "twitter/dmInbox" })` | Reading the DM inbox: who is waiting on you | "who is waiting on me", "check my x dms", "go through my twitter inbox and tell me who needs a reply", "who am I waiting on in my dms". |
| `getGuide({ useCase: "twitter/followUps" })` | Following up in your own voice | "follow up with these, not for anything in particular, just warming up the relationship", "say it was cool to meet him", "ask him for some advice on what he's doing", "take him up on the doc he offered". |
| `getGuide({ useCase: "twitter/whoNeedsYou" })` | Finding who needs something from you, or who matters | "look through my messages and find someone who clearly needs something off me", "summarise everything on my twitter, how likely is it we make money", "who's worth following up". |

## The tools in this guide

Each tool's own description carries its full usage, notes, live line and rules; `logGet` gives its exact inputs and a call that works.

| Tool | What it does | Usage |
|---|---|---|
| `routerIndex` | Is the prompt router's meaning index of plays, tools and skills… | `log router index [--apply] [--json]   (is the prompt router's meaning index current; --apply builds it)` |
| `relateBuild` | Project log.db into a new current Relate graph | `log relate build [--json]` |
| `relateStatus` | The Relate graph and how far it lags log.db | `log relate status [--owner start\|stop] [--json]` |
| `relateVerify` | Check every Relate graph count against log.db | `log relate verify [--json]` |
| `relateAsk` | The connected context | `log relate ask "<text>" [--json]` |
| `relateMachine` | A relationship state machine | `log relate machine [--person\|--to <h>] [--view\|--platform\|--form <v>] [--state <s>] [--cursor <n>] [--quiet] [--limit <n>] [--json]` |
| `relateQuery` | A read-only Cypher query on the Relate graph | `log relate query "<cypher>" [--platform <p>] [--json]` |
| `relateMap` | Network map | `log relate map [--person\|--to <h>] [--platform\|--form <v>] [--cursor <n>] [--quiet] [--limit <n>] [--json]` |
| `people` | List everyone linked across platforms, with each person's identities | `log people [--json]` |
| `peopleShow` | The person card for someone across every platform | `log people show <who> [--json]` |
| `peopleSuggest` | Accounts on different platforms that are probably one person, with… | `log people suggest [--limit <n>] [--check] [--json]   (--check asks SubQ)` |
| `peopleLink` | Make these identities one person, after the owner says yes | `log people link <identity> <identity>... --approvedBy "<the owner's words>" [--name "<name>"] [--evidence "<why>"]` |
| `peopleUnlink` | Take an identity out of its person, after the owner says so | `log people unlink <identity> --approvedBy "<the owner's words>"` |
| `peopleFacts` | Someone's lasting facts | `log people facts <who> [--all]` |
| `peopleFactsExtract` | Find facts in new DM lines and record them as events | `log people facts extract [--who <w>] [--since <t>] [--limit <n>] [--platform <p>]` |
| `peopleFactsRecall` | Recall current facts by meaning, with evidence | `log people facts recall "<q>" [--limit <n>]` |
| `peopleBots` | Record who each platform itself says is automated, so a bot with an… | `log people bots [--platform <p>] [--json]` |
| `peopleDifferent` | Record that two identities are not the same person, after the owner… | `log people different <identity> <identity> --approvedBy "<the owner's words>"` |
| `networkImport` | Read your network into log.db, replacing the last import | `log network import [--from <dir>] [--account <handle>] [--json]` |
| `networkStatus` | Your network's rings per person, live | `log network status [--platform <p>] [--json]` |
| `mediaDescriber` | Run the one media describer on this machine | `log media describer [--json]` |
| `mediaDescribe` | Queue one local image or video for the describer and wait for its… | `log media describe <path> [--wait <seconds>] [--json]` |
| `mediaStatus` | The media queue | `log media status [--json]` |
| `mediaView` | One media item | `log media view <id> [--json]` |
| `search` | Find where someone talked about something | `log search "<query>" [--limit <n>] [--fusion <rrf\|bayes>] [--platform <p>] [--account <a>] [--with <handle>] [--after <YYYY-MM-DD>] [--kind <k>] [--server <s>] [--channel <c>] [--full] [--json]` |
| `searchIndex` | Read every conversation through the platform's engine | `log search index [--platform <twitter\|discord>] [--account <a>] [--saved] [--rebuild]   (embeds only new or changed chunks, --rebuild all; --saved indexes what log.db holds, else reads every DM and group through the platform's engine first)` |
| `searchBench` | Time realistic queries on the built index, cold and warm, with p50… | `log search bench [--rounds <n>]   (times realistic queries on the built index, cold and warm, and prints p50, p95 and p99 beside a plain linear scan)` |
| `memorySearch` | Search log's memory | `log memory search "<query>" [--kind <kind>] [--limit <n>] [--json]` |
| `memorySync` | Collect every source into memory in log.db and index what changed | `log memory sync [--noAccounts] [--json]   (collects rules, skills, docs, infra notes, memory files, page states and accounts into memory in log.db, and indexes what changed)` |
| `memoryRemember` | Save an agent memory as a note in log.db, indexed at once | `log memory remember "<text>" [--title <t>] [--tags <a,b>] [--json]   (saves an agent memory as a note in log.db and indexes it at once)` |
| `memoryShow` | Show one memory article in full | `log memory show <key> [--json]   (one article in full, e.g. rule:73, skill:inspect, pageState:messengerPinCreate)` |
| `transcribe` | Transcribe every voice note in the saved X and Discord conversations… | `log transcribe [--platform twitter\|discord] [--account <a>] [--list] [--noIndex] [--json]` |
| `transcribeFile` | Transcribe one audio file with AssemblyAI, kept by its hash | `log transcribe file <path> [--json]   (one audio file, transcribed and kept by its hash)` |
| `saidBy` | Someone's messages on every platform, found by name, newest first | `log saidBy [--name <name>] [--limit <n>] [--json]` |

## The work, step by step: memory

From `skills/memory/SKILL.md`.

## memory

log's memory is one place for everything log-cli knows: the owner's rules,
the skills, the docs, the infra notes, every agent's memory files, the known
page states, the accounts, and the notes agents save. It lives in the
workspace `log.db` and is searched there, on this machine. It needs no server
or setting, so it always works.

### Hard boundaries

- **Never write a secret into it.** No password, token, API key, PIN, cookie,
  proxy URL or private key, in a note or anywhere else. Say where a login
  lives (a file path), never what it is. The scrubber hides what it can
  recognise, but it is a safety net, not permission.
- **Never mention Meta's or Facebook's rules from it** (rule 38).
  `docs/vendors` and the enforcement research are never collected.
- **Articles are never deleted by a sync.** An article removed from the repo
  stays in `kbArticles`; only chunks whose article is gone are dropped.

### Where it lives

- **Articles:** table `kbArticles` in the workspace `log.db`: `key`, `kind`,
  `title`, `body` (Markdown), `source`, `tags`, `author`, `contentHash`,
  `syncedAt`.
- **Search index:** table `kbChunks` in the same `log.db`: each chunk's text,
  article key, kind, title, source, the content hash and embedding model it
  came from, and its 384-dimension vector.
- Both come from `log.db`'s versioned schema (migration 33, `knowledgeBase`).

### Kinds

| Kind | From |
| --- | --- |
| `rule` | each numbered rule in AGENTS.md (`rule:73`) |
| `section` | each other AGENTS.md section (`agents:howWeFixProblems…`) |
| `skill` | `skills/*/SKILL.md` (`skill:inspect`) |
| `doc` | `docs/**/*.md`, the request docs included (`doc:docs/adsPower.md`) |
| `infra` | `docs/infra/*.md` (`doc:docs/infra/server.md`) |
| `memory` | every Claude Code memory file in `~/.claude/projects/*/memory` (`memory:log-cli/cloudflare-access`) |
| `pageState` | `PAGE_STATES` (`pageState:messengerPinCreate`) |
| `account` | log-cli's accounts (the local account store), status and setup only (`account:10000000000001`) |
| `note` | `log memory remember` |

### Commands

Agents call the MCP tools, never a hand-run `log memory …` (rule 163):

```
memorySearch { query: "why did the tunnel go down" }           best articles, keyword + meaning
memorySearch { query: "messenger pin", kind: "pageState", limit: 3 }
memoryShow { key: "rule:73" }                                  one article in full
memoryRemember { text: "…", tags: ["infra", "server"] }        a note, saved and indexed at once
memorySync {}                                                  refresh from every source (Monitor it, rule 26)
memorySync { noAccounts: true }                                without reading log-cli's accounts
```

In a terminal the same commands are `log memory search|show|remember|sync`. What
each one must do is in the spec, [Memory](../../docs/specs/memory.md).

### How a sync works

1. Collect every source (about 600 articles, under a second), scrubbing
   secrets from each body.
2. Read what `kbArticles` holds, compare each article's content hash, and
   write the new and changed ones in transactions of 200.
3. Re-index every article whose hash differs from the one its chunks carry,
   or whose chunks came from another embedding model, in chunks of about
   1,200 characters embedded with all-MiniLM-L6-v2 on this machine; drop
   chunks whose article is gone.

### How a search works

The chunks of the current model are ranked twice, by BM25 keyword score and
by cosine similarity to the query's embedding, and the two lists are fused
with reciprocal rank fusion. Each article appears once, at its best chunk.

### When a session learns something

Save it before the session ends, in one or two plain sentences with where it
came from:

```
memoryRemember { text: "The tunnel drops when its token file is replaced while it runs; restart the tunnel after changing the token (found 2026-10-27 in the tunnel's own log).", title: "Restart the tunnel after a token change", tags: ["infra", "server"] }
```

## The rules these tools fall under

Each by its number and first line. The full text is in AGENTS.md (`log://agents`); the core rules are in full in `getGuide({ topic: "logMcpInstructions" })`.

- **Rule 26.** Stream progress while work runs, one meaningful line per stage, with the run log retained.
- **Rule 30.** Complete the authorized task.
- **Rule 38.** Do not introduce discussions of Meta/Facebook rules, terms, eligibility or account ownership unless The owner raises them.
- **Rule 39.** Use only the scope, options and intent The owner stated or implied.
- **Rule 40.** Do not propose physical infrastructure unless The owner asks.
- **Rule 41.** Paid work must stay within the authorized task and spend.
- **Rule 73.** For an unknown platform state, collate the goal, account/runtime, action, sent requests, answers, timing and page evidence.
- **Rule 89.** Find conversational context by scoped search and existing private records.
- **Rule 94.** Every platform call goes through Log and its governor, never a scratch client with account tokens/cookies.
- **Rule 105.** One platform/account owns one continuous engine session and push connection.
- **Rule 134.** Existing workspace log.db is the native private record/coordination foundation.
- **Rule 137.** Preserve current context-aware voice and AI-artifact gates for messages sent as The owner.
- **Rule 138.** Media and voice-note context uses the existing private media descriptions and transcripts.
- **Rule 154.** Show people/chats by meaningful names and handles; keep routing ids internal unless needed for the specific technical artifact.
- **Rule 163.** Agent Log actions go through Log MCP tools; never work around a stale or unavailable MCP with shell Log commands or scratch clients.
