import { GOVERNOR_DAILY_CAP } from '../types'

export function governorDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function governorDailyCap(env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.FBK_GOVERNOR_DAILY) || GOVERNOR_DAILY_CAP
}
