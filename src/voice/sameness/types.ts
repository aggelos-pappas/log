export const SAMENESS_LIMIT = 0.5

export const SAMENESS_MIN_PAIRS = 3

export const SAMENESS_WINDOW_HOURS = 24

export const OPENER_WORDS = 2

export const OPENER_REPEAT_LIMIT = 2

export interface SentText {
  to: string
  text: string
}

export interface SamenessReading {
  score: number
  limit: number
  closestTo: string | null
  shared: string[]
  pass: boolean
}
