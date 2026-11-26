export interface StyleFeatures {
  words: number
  lowercase: number
  commas: number
  fullStops: number
  questions: number
  exclamations: number
  emoji: number
}

export interface ConvergenceInput {
  draft: string
  theirLast: readonly string[]
  hisHere: readonly { said: string; reply: string }[]
  hisBaseline: readonly string[]
  baselinePairs?: readonly { said: string; reply: string }[]
}

export interface Convergence {
  hisMirror: number
  draftMirror: number
  hisStyleShift: number
  draftStyleShift: number
  gap: number
  signal: number | null
}

export interface StyleCompare {
  his: StyleFeatures
  hisHere: StyleFeatures | null
  theirs: StyleFeatures | null
}

export const STYLE_KEYS: readonly (keyof StyleFeatures)[] = ['words', 'lowercase', 'commas', 'fullStops', 'questions', 'exclamations', 'emoji']
export const WORDS_SCALE = 20
export const MIRROR_MIN_LETTERS = 4
export const CONVERGENCE_COST = 2
export const STYLE_SPREAD_MIN = 0.05
export const BASELINE_REPLIES = 500
export const HERE_MIN_PAIRS = 3
export const STYLE_WEIGHT = 0.5
