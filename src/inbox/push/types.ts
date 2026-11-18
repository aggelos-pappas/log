export const PUSH_FALLBACK_MS = 15000

export const PUSH_SETTLE_MS = 400

export const PUSH_QUIET_MAX_MINUTES = 720

export interface PushQuiet {
  until: string
  by: string
}

export type QuietUntil = (now: number) => number

export const PUSH_HOSTS = ['claudeCode', 'hermes', 'opencode'] as const

export type PushHost = (typeof PUSH_HOSTS)[number]

export interface PushBatch {
  reader: string
  host: string
  count: number
  context: string
}

export type PendingReader = (reader: string) => { messages: readonly unknown[]; alerts: readonly string[]; text: string | null }

export type InboxWait = (root: string, ms: number) => Promise<void>
