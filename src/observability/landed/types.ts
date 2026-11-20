import type { Percentiles } from '../timing/types'

export interface LandedRow {
  platform: string
  source: string
  sourceAtMs: number | null
  appendedAt: string | null
  shownAt: string | null
}

export interface LandedStats {
  platform: string
  source: string
  messages: number
  stored: Percentiles
  pushed: Percentiles
  landedToPushed: Percentiles
  notPushed: number
}

export const LANDED_TARGET_P95_MS = 5000
