# How log works

log runs social accounts from the terminal or from an AI agent. Every account
lives in one place, every action goes through the platform's own API or the
account's own browser, and the platform's answers decide whether a step worked.
Read this page first if you want to know how log thinks before you read the
code.

## The big idea: the platform's answer decides

When log does something (a click, a search, a post), the platform's own client
makes internal API calls. log records them and reads them. Those answers decide
what happened, never the screen, a timer, or the fact that a step ran. What we
sent matters as much as what came back: one search sent coordinates that placed
the account in the wrong city, and only the request showed it.

## When a step lands somewhere new

log already knows most of the states a platform can be in. When a step lands
somewhere it doesn't know, it follows the same seven steps:

1. **Read the internal API.** Code pulls each step's calls out of its
   recording: what we sent, what came back, and how many seconds after our
   action (`exchanges.json`, `exchanges.md`).
2. **Put everything about that moment together.** The goal, the account (home,
   platform, browser, the proxy's exit), what we did (the action, the mouse,
   how long it took), every internal call, the page, the screenshot and the
   earlier steps.
3. **Ask SubQ what it means.** Not what to do next, but: was the goal met, does
   everything fit the account, should something never have come up, does the
   page agree with the API, did our action cause it, and what does each call
   say about the goal.
4. **Say it loudly.** The reading comes first in the step's result
   (`>>> UNKNOWN STATE`), and a hook puts it into the agent's context.
5. **Keep going until the goal is reached.** A Stop hook holds the agent's turn
   until a step's reading says the goal is met.
6. **Write down what went wrong as P.E.E.** Point (the issue, in one sentence),
   Evidence (quoted from the step's reading), Explain (why it shows that, and
   what caused it). Once the goal is reached, add how it was fixed.
7. **Name the state,** so next time it is known and nobody has to work it out
   again.

It works the same on every platform. In practice:

```bash
log inspect start --account <a> --goal "Set the Marketplace location to Galway, Ireland" --detach
log inspect do <action>                                  # reads the step; >>> UNKNOWN STATE when we don't know
log inspect finding --account <a> --step <step> --point "<the issue>" --explain "<why, and what caused it>"
log inspect finding --account <a> --fixes 1 --fix "<how it was fixed>"
log inspect goal --account <a>                           # the goal, whether it is reached, every finding
```

## Where accounts live

Accounts live in [Twenty](twenty.md) as `socialAccounts`: one row per account,
with its platform, session and proxy. Marketplace listings are
`agencyListings`. log reads the row before a run and writes the result back
after it. A single user can keep accounts in a local file instead.

## Platforms

log is **platform-agnostic**. Each platform has its own engine:

- **Facebook:** Marketplace listings (publish, check, campaigns) and groups
  (join, read, poll, members). It uses Facebook's direct API first (fbk,
  `vendor/fbk`) and the account's browser behind it, always through a proxy in
  the account's home country.
- **X:** session checks, follows, replies, quotes, likes, DMs and a reply
  queue. Direct API only (twikit, `vendor/twikit`): no proxy and no browser.
- **Reddit:** the session check on its direct API (reverseChud, `vendor/reverseChud`), and
  `log inspect` in the account's browser with no proxy.

A command that acts on one platform names it first: `log facebook publish`,
`log twitter reply`, `log reddit session check`. A new platform is one
command, `log new platform <name>`. Every platform's internal calls are read
with rea (their code as well as their network) and documented under
`docs/platforms/<platform>/`.

The current list of platforms, and which commands run where, is in
[the reference](reference.md#the-platforms), generated from the code.

## Browsers

log is **browser-agnostic** too. Each account's browser is a driver chosen in
Twenty: [AdsPower](https://www.adspower.com/share/pD25Iu) first (one profile per account), Camoufox kept, and more to
come, each one more driver (`src/browser/<name>`). Every driver opens through
the same gates:

- the proxy the platform needs;
- the launch self-check;
- a raw recording (HAR) of every request;
- one human-like mouse.

Details: [Browsers](browsers.md) and
[the browser layer](reference.md#the-browser-layer).

## How the CLI is built

- A command registry that generates its own usage.
- Commands return results instead of printing them, so they are easy to test.
- A [Clack](https://github.com/bombshell-dev/clack) guided menu (`log launch`)
  on top of the scriptable commands.

The rules behind all of this are in AGENTS.md.

## Related

How log works, page by page:

- **Specs:** [Specs](specs/README.md)
- **The ideas:** [The models log uses](models.md) · [The live inbox](liveInbox.md) · [Pipeline labels: who and where](pipelineLabels.md) · [Unify storage: what's wrong with how log stores data, and the schema it moves to](unifyStorage.md) · [Storage against the book: what Designing Data-Intensive Applications says about the unifyStorage work](storageAgainstTheBook.md) · [How log reads its data: where JSON fits, time series, locality, cache and atomicity](storageReadPath.md) · [Why tool calls are slow: process start-up, measured](hookStartup.md) · [Antigravity hooks](antigravityHooks.md) · [Tool call speed: what the owner and VIBE BOT worked out, and what to bring in](toolCallSpeed.md) · [Tool calls against the book: what the tail-latency literature says about log's own calls](toolCallsAgainstTheBook.md) · [Accounts and listings](accountsAndListings.md) · [The account lifecycle](lifecycle.md) · [Twenty: one home for many accounts](twenty.md) · [Signing in](signingIn.md) · [What works today](status.md)
- **Browsers and proxies:** [Browsers](browsers.md) · [Browser setup](browserSetup.md) · [AdsPower](adsPower.md) · [Proxies](proxies.md) · [One browser identity](browserIdentity.md) · [Proxy providers](proxyVendors/README.md) · [curl_cffi vs httpcloak: SubQ matrix](httpClients/README.md)
- **Facebook in depth:** [Listening to Facebook groups](groupListening.md) · [Reading a Facebook group's members](groupMembers.md) · [Reading a Facebook group's posts](groupRead.md) · [Buyer conversations](conversations.md) · [Voice notes](voiceNotes.md) · [The listing monitor](listingMonitor.md) · [Listing photos](listingMedia.md) · [From a recording to a reusable flow](recordToFlow.md) · [How a Marketplace listing gets posted](listingPublish/README.md)
- **Working on log:** [Where the code lives](layout.md) · [Naming conventions](namingConventions.md) · [The context layer: hook conventions](contextLayer.md) · [Call timing](callTiming.md) · [Knowledge base](knowledgeBase.md) · [Relate graph: connected context for the agent](relateGraph.md) · [Running log on servers](deployment.md) · [X (Twitter) in log](twitterPlatform.md) · [OpenCode hooks](opencodeHooks.md) · [Contributing](contributing.md) · [REA and the Facebook web client](rea/README.md)

Up: [log's README](../README.md) · Start here: [Install](install.md) · [Connect your agent](mcp.md) · [Trust](trust.md)
