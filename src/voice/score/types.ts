export type SignalName = 'phrasing' | 'nearest' | 'notAiTell' | 'subqVoice' | 'answersThem' | 'convergence'

export const SCORE_WEIGHTS: Readonly<Record<SignalName, number>> = {
  phrasing: 0.15,
  nearest: 0.15,
  notAiTell: 0.1,
  subqVoice: 0.35,
  answersThem: 0.15,
  convergence: 0.1,
}

export const SIGNAL_WORDS: Readonly<Record<SignalName, string>> = {
  phrasing: 'his phrasing',
  nearest: 'nearest real reply',
  notAiTell: 'not an AI tell',
  subqVoice: 'SubQ voice',
  answersThem: 'answers them',
  convergence: 'not mirroring them',
}

export const SIGNAL_FIX: Readonly<Record<SignalName, string>> = {
  phrasing: 'word pairs he has never written: swap them for his own phrasing below',
  nearest: 'far from anything he has written: borrow the shape of his nearest real reply',
  notAiTell: 'close to a known AI phrase: drop or reword that bit',
  subqVoice: 'does not read like him typing it: shorter, his register, his length here',
  answersThem: 'does not answer what they said: name their point in his words',
  convergence: 'mirrors their words or style more than he does with them: answer in his own words and shape, not theirs',
}

export const DEFAULT_THRESHOLD = 0.7
export const THRESHOLD_FLOOR = 0.5
export const THRESHOLD_CEILING = 0.85
export const HELD_OUT_PASS = 0.95
export const NEAREST_LOW = 0.3
export const NEAREST_HIGH = 0.8
export const NOT_HERE_COST = 0.15
export const RULE_HIT_COST = 0.5
export const VERDICTS_KEPT = 300
export const CALIBRATION_KEY = 'owner'

export type ScoreSignals = Record<SignalName, number | null>

export interface ScoreRow {
  signal: SignalName
  value: number | null
  weight: number
  contribution: number
}

export interface VoiceScore {
  score: number
  threshold: number
  pass: boolean
  blocks: string[]
  rows: ScoreRow[]
}

export interface Calibration {
  threshold: number
  measuredAt: string
  heldOut: number
  passBefore: number
  passAfter: number
  aiDrafts: number
  aiFailedBefore: number
  aiFailedAfter: number
  scores: number[]
  blocked?: string[]
}

export interface Verdict {
  key: string
  lastMessageId: string
  at: string
  pass: boolean
  score: number
  threshold: number
  voice: number
}
