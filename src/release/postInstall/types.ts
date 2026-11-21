import type { ModelFetch } from '../../models/store/index'
import type { HarnessRefresh } from '../harnesses/index'

export const POST_INSTALL_STEPS = ['vendors', 'migrations', 'relateGraph', 'skills', 'models', 'harnesses'] as const

export type PostInstallStep = (typeof POST_INSTALL_STEPS)[number]

export const BLOCKING_STEPS: readonly PostInstallStep[] = ['vendors', 'migrations', 'skills']

export interface StepResult {
  ok: boolean
  detail?: string
}

export interface StepReport {
  step: PostInstallStep
  ok: boolean
  detail: string
}

export interface PostInstallReport {
  ok: boolean
  version: string
  steps: StepReport[]
  models: ModelFetch[]
  harnesses: HarnessRefresh[]
}

export interface PostInstallDeps {
  vendors(root: string): StepResult
  migrations(root: string): StepResult
  relateGraph(root: string): StepResult
  skills(root: string): StepResult
  models(root: string): Promise<ModelFetch[]>
  harnesses(root: string): HarnessRefresh[]
  log(line: string): void
}
