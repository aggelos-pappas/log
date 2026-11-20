import type { HarnessRefresh } from '../harnesses/index'
import type { InstallKind } from '../version/index'

export interface RunningWatcher {
  platform: string
  account: string
}

export interface RunningState {
  service: boolean
  watchers: RunningWatcher[]
  browsers: string[]
}

export const RESUME_STATUSES = ['stopping', 'installing', 'verifying', 'resumed', 'rolledBack', 'failed'] as const

export type ResumeStatus = (typeof RESUME_STATUSES)[number]

export interface ResumeRecord {
  from: string
  to: string
  kind: InstallKind
  root: string
  commit: string | null
  at: string
  running: RunningState
  status: ResumeStatus
  resumed: string | null
  harnesses: HarnessRefresh[] | null
  error: string | null
}

export interface StepResult {
  ok: boolean
  detail?: string
}

export interface InstalledAt {
  version: string
  kind: InstallKind
  root: string
  commit: string | null
}

export interface UpdateTarget {
  version: string
  notesUrl: string | null
}

export interface UpdateDeps {
  busy(): string[]
  running(): RunningState
  writeResume(record: ResumeRecord): void
  stop(state: RunningState, root: string): StepResult
  install(kind: InstallKind, version: string, root: string): StepResult
  afterInstall(root: string): StepResult
  verify(version: string, root: string): StepResult
  rollback(previous: InstalledAt): StepResult
  start(state: RunningState, root: string): string[]
  refreshHarnesses(root: string): HarnessRefresh[]
  recordUpdated(from: string, to: string, resumed: string): void
  sleep(ms: number): Promise<void>
  now(): number
  log(line: string): void
}

export interface UpdateOptions {
  settleTries?: number
  settleMs?: number
}

export const SETTLE_TRIES = 6

export const SETTLE_MS = 5000

export type UpdateOutcome =
  | { ok: true; from: string; to: string; resumed: string; harnesses: HarnessRefresh[]; text: string }
  | { ok: false; code: 'updateBusy' | 'updateFailed'; detail: string; rolledBack: boolean }
