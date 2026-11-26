# Twenty: deprecated

[Twenty](https://twenty.com) is an open-source CRM. log no longer uses it, and what still touches it is being removed: accounts ([#337](https://github.com/matthewdonsemail-lab/log/issues/337)), the knowledge base ([#338](https://github.com/matthewdonsemail-lab/log/issues/338)), and the Marketplace and group features ([#339](https://github.com/matthewdonsemail-lab/log/issues/339)). Don't set up Twenty for new work.
Accounts live in the local account store, `~/.logCli/localAccounts.json`
(`LOG_LOCAL_ACCOUNTS` moves it), with cookies, proxy, login and PINs sealed
in the [secret store](security/encryptedStore.md). With `LOG_ACCOUNTS=local`
log uses only that store and never asks Twenty for an account. Hosted log is
moving away from Twenty too: the private workspace (`log.db` plus protected
files) owns accounts, sessions and messages.

Until those land, Twenty is still read, only if it is set up, for:

- **the knowledge base** (`log kb`), which keeps its articles in a Twenty
  server and is off when `KB_TWENTY_URL` is unset ([Knowledge base](knowledgeBase.md));
- **sharing accounts across machines**, if you choose to keep them in a
  Twenty workspace instead of the local store;
- **the old Marketplace agency features** (listings, campaigns,
  conversations, groups), which read and write Twenty objects and are
  deferred.

## How the two stores work together

Without `LOG_ACCOUNTS=local`, and with a Twenty workspace configured
(`LOG_TWENTY_BASE_URL`, `LOG_TWENTY_API_KEY`), log reads local accounts first
and adds Twenty's: a local account wins over a Twenty account of the same
name. A run saves back to the store its account came from. In this mode new
accounts are created in Twenty; with `LOG_ACCOUNTS=local` they go in the
local store. `log localAccount pull` copies Twenty's accounts, cookies and
login included, into the local store.

In Twenty, every account is one row in `socialAccounts`, holding its platform
and handle, cookies and proxy, status (ACTIVE, NEEDS_LOGIN, CHECKPOINT,
BANNED…), home city and country, and browser profile. The local store keeps
the same fields. Listings (`agencyListings`), campaigns (`agencyCampaigns`)
and conversations (`agencyConversations`, `agencyMessages`) are Twenty rows
linked to the account they belong to.

## Setting it up (optional)

1. Get a Twenty workspace: [hosted](https://twenty.com), or
   [self-hosted](https://twenty.com/developers) with Docker.
2. Create an API key in the workspace's settings.
3. In `.env.local`, set `LOG_TWENTY_BASE_URL` (your workspace's address) and
   `LOG_TWENTY_API_KEY`, and remove `LOG_ACCOUNTS=local`.
4. Create everything log needs: the objects above, their fields and the links
   between them.

   ```bash
   node scripts/twenty/twentySetup.mjs           # lists what it will create, changes nothing
   node scripts/twenty/twentySetup.mjs --apply   # creates it
   ```

   It only ever adds. It never renames or deletes a field, so it is safe on a
   workspace you already use.
5. Add your accounts as rows in Twenty, or with `cookies save`.
   `log localAccount pull` copies them into the local store whenever you want
   to go back to local only.

Every command takes `--json` and never prompts, so scripts and agents can use
it.

## Where to read next

- Adding accounts to the local store: [Accounts](accounts.md).
- Every command, its flags, its MCP tool and the hooks that fire on it:
  [the reference](reference.md), generated from the code.
- How accounts, statuses, replacements and campaigns work:
  [Accounts and listings](accountsAndListings.md).
- How proxies load and are checked: [Proxies](proxies.md).
- Every error code: [the error catalog](errorCatalog.md).

## Working on the Twenty code

- `src/twenty/graphql/helpers/localAccounts.ts` is the local account store and
  its merge with Twenty (`withLocalAccounts`).
- `scripts/twenty/twentySetup.mjs` creates the objects, fields and relations
  log needs on any workspace, a fresh one included. It only adds; it prints the
  plan, and `--apply` creates them.
- `bun run twenty:client` regenerates `src/twenty/graphql/generated` from the
  live workspace (twenty-client-sdk). `bun run twenty:client:check` fails when
  it is out of date.
- Tests never call Twenty: they use `marketplaceFixture()`, an in-memory
  Twenty.

## Related

- Up: [How log works](howItWorks.md) · [log's README](../README.md)
