import type { AdsPowerClient } from '../adsPower/types'
import type { BrowserDriverName } from '../driver/types'
import type { FacebookAccount, PlaywrightCookie } from '../../platformKit/socialAccount/index'
import type { AccountStore } from '../../accounts/store/index'

export const MOVE_TARGETS = ['camoufox', 'brave'] as const satisfies readonly BrowserDriverName[]
export type MoveTarget = (typeof MOVE_TARGETS)[number]

export type MoveSession = { cookies: PlaywrightCookie[]; origins: unknown[] }

export type MoveSource = 'adsPowerProfile' | 'storedSession'

export type MoveAction = 'move' | 'skip'

export interface MovePlanEntry {
  accountId: string
  accountName: string
  platform: string
  from: BrowserDriverName | null
  to: MoveTarget
  profileId: string | null
  action: MoveAction
  carries: MoveSource | null
  note: string
}

export interface MovePlan {
  to: MoveTarget
  adsPowerUp: boolean
  entries: MovePlanEntry[]
  releasable: MoveLedgerEntry[]
}

export type MoveOutcome = 'moved' | 'rolledBack' | 'failed' | 'skipped'

export interface MoveResult extends MovePlanEntry {
  outcome: MoveOutcome
  code: string | null
  detail: string
  carried: MoveSource | null
  check: { verdict: string; code: string | null; detail: string | null } | null
}

export interface MoveLedgerEntry {
  accountId: string
  accountName: string
  platform: string
  from: BrowserDriverName | null
  to: MoveTarget
  formerAdsPowerProfileId: string | null
  state: 'checking' | 'moved' | 'rolledBack' | 'released'
  at: string
}

export interface MoveLedger {
  get(accountId: string): MoveLedgerEntry | null
  put(entry: MoveLedgerEntry): void
  all(): MoveLedgerEntry[]
}

export interface MoveCheck {
  verdict: string
  code: string | null
  detail: string | null
}

export interface MoveDeps {
  accounts: AccountStore
  adsPower: AdsPowerClient
  readState: (cdpUrl: string, origins: string[]) => Promise<MoveSession>
  check: (account: FacebookAccount) => Promise<MoveCheck>
  ledger: MoveLedger
  log?: (line: string) => void
  now?: () => Date
  env?: Record<string, string | undefined>
}

export interface MoveOptions {
  account?: string
  all?: boolean
  to: MoveTarget
}

export const MOVE_NOT_CARRIED = "AdsPower's fingerprint (its user agent, canvas, WebGL and fonts) stays with the AdsPower profile: the new browser shows its own. Cookies and the platform's localStorage move; the proxy and locale are account fields and go with the account."
