export const UPDATE_MODES = ['ask', 'notify', 'auto'] as const

export type UpdateMode = (typeof UPDATE_MODES)[number]

export const UPDATE_CHANNELS = ['stable', 'beta'] as const

export type UpdateChannel = (typeof UPDATE_CHANNELS)[number]

export interface UpdateSettings {
  check: boolean
  auto: UpdateMode
  channel: UpdateChannel
}

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = { check: true, auto: 'ask', channel: 'stable' }

export interface LatestRelease {
  version: string
  notesUrl: string | null
  source: 'github' | 'npm'
}

export interface UpdatedRecord {
  from: string
  to: string
  resumed: string
  at: string
  told: boolean
}

export interface UpdateState {
  latest: string | null
  notesUrl: string | null
  source: LatestRelease['source'] | null
  channel: UpdateChannel
  checkedAt: string | null
  checkingAt: string | null
  toldVersion: string | null
  toldSessions: string[]
  updated: UpdatedRecord | null
}

export const EMPTY_UPDATE_STATE: UpdateState = { latest: null, notesUrl: null, source: null, channel: 'stable', checkedAt: null, checkingAt: null, toldVersion: null, toldSessions: [], updated: null }

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface CheckDeps {
  fetch: FetchLike
  now: () => number
  timeoutMs: number
}

export const CHECK_EVERY_MS = 24 * 3600 * 1000

export const CHECK_TIMEOUT_MS = 2000

export const CHECKING_GRACE_MS = 10 * 60 * 1000

export const TOLD_SESSIONS_KEPT = 200
