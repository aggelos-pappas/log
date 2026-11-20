import type { LocalModel, ModelKey, ModelSource } from '../manifest/index'

export const MODEL_STATUSES = ['ready', 'missing', 'mismatched', 'notInstalled', 'wrongVersion'] as const

export type ModelStatus = (typeof MODEL_STATUSES)[number]

export const FETCH_ACTIONS = ['already', 'adopted', 'downloaded', 'installed', 'failed'] as const

export type FetchAction = (typeof FETCH_ACTIONS)[number]

export type HashKind = 'sha256' | 'gitSha1'

export interface ModelCheck {
  key: ModelKey
  id: string
  revision: string
  source: ModelSource
  process: string
  bytes: number
  place: string | null
  status: ModelStatus
  ready: boolean
  installed: string | null
  problems: string[]
}

export interface ModelFetch extends ModelCheck {
  action: FetchAction
  detail: string
}

export interface StepAnswer {
  ok: boolean
  detail?: string
}

export interface ModelsDeps {
  place(model: LocalModel): string | null
  legacy(model: LocalModel): string[]
  size(path: string): number | null
  hash(path: string, kind: HashKind): Promise<string | null>
  download(url: string, dest: string): Promise<StepAnswer>
  move(from: string, to: string): boolean
  remove(path: string): void
  pipVersion(name: string): string | null
  pipInstall(spec: string): StepAnswer
  log(line: string): void
}

export interface CheckOptions {
  verify?: boolean
}

export const JUDGE_DIR_NAME = 'wolfDefenderSmall'
