export const WAITING_DEFAULT_SINCE = '14d'

export const WAITING_PREVIEW_CHARS = 160

export interface WaitingRow {
  who: string
  platform: string
  account: string
  kind: 'dm' | 'group'
  said: string
  at: string
}

export interface WaitingReport {
  source: 'waitingOnYou'
  readFrom: 'log.db'
  since: string | null
  waiting: WaitingRow[]
  followUps: WaitingRow[]
  byPlatform: { platform: string; waiting: number; followUps: number }[]
}

export interface WaitingOptions {
  platform?: string | null
  account?: string | null
  since?: string | null
  limit?: number
  now?: Date
  accounts?: readonly string[] | null
}
