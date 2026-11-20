import { HF_ENDPOINT, LOCAL_MODELS } from './types'
import type { LocalModel, ModelKey } from './types'

export function modelByKey(key: ModelKey, models: readonly LocalModel[] = LOCAL_MODELS): LocalModel {
  const found = models.find((m) => m.key === key)
  if (!found) throw new Error(`no local model ${key} in the models manifest`)
  return found
}

export function revisionOf(id: string, models: readonly LocalModel[] = LOCAL_MODELS): string {
  return models.find((m) => m.id === id)?.revision ?? 'main'
}

export function pipSpecOf(model: LocalModel): string {
  return `${model.id}==${model.revision}`
}

export function pipSpecs(models: readonly LocalModel[] = LOCAL_MODELS): string[] {
  return models.filter((m) => m.source === 'pip').map(pipSpecOf)
}

export function shortRevision(revision: string): string {
  return /^[0-9a-f]{40}$/.test(revision) ? revision.slice(0, 7) : revision
}

export function modelPin(model: Pick<LocalModel, 'id' | 'revision'>): string {
  return `${model.id}@${model.revision}`
}

export function modelPins(models: readonly LocalModel[] = LOCAL_MODELS): string[] {
  return models.map(modelPin)
}

export function fileUrl(model: LocalModel, path: string, endpoint: string = process.env.HF_ENDPOINT?.trim() || HF_ENDPOINT): string {
  return `${endpoint.replace(/\/+$/, '')}/${model.id}/resolve/${model.revision}/${path}`
}

export function megabytes(bytes: number): string {
  return bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : bytes > 0 ? `${Math.max(1, Math.round(bytes / 1e3))} kB` : 'a pip package'
}
