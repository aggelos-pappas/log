import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const LOCAL = 'src/accounts/store/helpers/localAccounts.ts'
const STORE = 'src/accounts/store/client.ts'
const CLI = 'src/cli/localAccount/index.ts'
const RULES = 'src/mcp/server/helpers/agentRules.ts'

export const localAccounts = {
  description: 'Local accounts: the file, add and list, and how every command reads accounts from it',
  specPath: 'docs/specs/localAccounts.md',
  codePaths: [
    'src/accounts/store/helpers/localAccounts.ts',
    'src/accounts/store/client.ts',
    'src/cli/localAccount/index.ts',
    'src/console/signIn/client.ts',
    'src/cli/runner/client.ts',
    'src/mcp/server/helpers/agentRules.ts',
  ],
  anchors: {
    'REQ-LOCAL-01': [
      { kind: 'symbol', file: LOCAL, name: 'localAccountsPath' },
      { kind: 'symbol', file: LOCAL, name: 'writeLocalAccounts' },
      { kind: 'uses', file: LOCAL, name: 'logHome' },
      { kind: 'string', file: LOCAL, includes: 'localAccounts.json' },
    ],
    'REQ-LOCAL-03': [
      { kind: 'value', file: LOCAL, name: 'LOCAL_ID_PREFIX', equals: 'local:' },
      { kind: 'symbol', file: LOCAL, name: 'upsertLocalAccount' },
      { kind: 'symbol', file: CLI, name: 'localAccountCommand' },
    ],
    'REQ-LOCAL-04': [{ kind: 'symbol', file: LOCAL, name: 'readLocalAccounts' }],
    'REQ-LOCAL-05': [
      { kind: 'symbol', file: STORE, name: 'createAccountStore' },
      { kind: 'uses', file: 'src/cli/runner/client.ts', name: 'createAccountStore' },
    ],
    'REQ-LOCAL-08': [
      { kind: 'symbol', file: STORE, name: 'retiredObject' },
      { kind: 'string', file: STORE, includes: 'twentyRemoved' },
    ],
    'REQ-LOCAL-09': [{ kind: 'symbol', file: RULES, name: 'COMMAND_RULES' }],
    'REQ-LOCAL-10': [
      { kind: 'symbol', file: CLI, name: 'localAccountDeps' },
      { kind: 'symbol', file: CLI, name: 'saveLogin' },
      { kind: 'symbol', file: 'src/console/signIn/client.ts', name: 'saveAccountLogin' },
    ],
  },
  rubrics: {
    'REQ-LOCAL-01': noul('Does localAccountsPath return the LOG_LOCAL_ACCOUNTS environment value when it is set and the default file otherwise, and does writeLocalAccounts write the file readable by its owner only (mode 0o600)?'),
    'REQ-LOCAL-03': noul('Does localAccount add accept any platform in PLATFORMS, save the row with upsertLocalAccount under the id LOCAL_ID_PREFIX, then the platform, a colon and the accountName, set adsPowerProfileId and browserDriver adsPower when the adsPower flag is given, ?'),
    'REQ-LOCAL-04': noul('Does localAccount list print every row from readLocalAccounts with its platform, accountName, adsPowerProfileId and sessionState?'),
    'REQ-LOCAL-05': noul('Does createContext build the account store with createAccountStore, and do its list, get, create, update and loginSecrets for socialAccounts read and write only the local file through readLocalAccounts, upsertLocalAccount and writeLocalAccounts?'),
    'REQ-LOCAL-07': noul('Does update on socialAccounts write the change to the local file with writeLocalAccounts when the row is in the file, ?'),
    'REQ-LOCAL-08': noul('For every object other than socialAccounts, do list, get, create and update in createAccountStore reject with an AccountStoreError whose code is twentyRemoved, naming the object, without any network call?'),
    'REQ-LOCAL-09': noul('In src/mcp/server/helpers/agentRules.ts, the COMMAND_RULES object has one key per command with the rule numbers it falls under. Does its localAccount key (the line that starts with localAccount: inside COMMAND_RULES, near the top of COMMAND_RULES) list the number 97 in its array?'),
    'REQ-LOCAL-10': noul('Does localAccount login refuse with terminalOnly before prompting when there is no terminal, ask for the email and password through masked prompts, and save them only through saveAccountLogin with signInRequestOf (method password), so an account missing from the file, a platform outside PASSWORD_PLATFORMS and an empty or over-long value refuse with the same codes as the console and write nothing, never printing either value?'),
    unspecifiedBehavior: noul('Does the local accounts code reach a network for an account, or keep listings, groups or conversations in the local file, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-LOCAL-01': MET,
    'REQ-LOCAL-03': MET,
    'REQ-LOCAL-04': MET,
    'REQ-LOCAL-05': MET,
    'REQ-LOCAL-07': MET,
    'REQ-LOCAL-08': MET,
    'REQ-LOCAL-09': MET,
    'REQ-LOCAL-10': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
