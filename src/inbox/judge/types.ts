export type JudgeKind = 'malware' | 'injection'

export type JudgeVerdict = 'clean' | 'suspect' | 'held'

export interface JudgeRule {
  name: string
  kind: JudgeKind
  strong: boolean
  why: string
  test: (text: string) => boolean
}

export interface JudgeHit {
  name: string
  kind: JudgeKind
  strong: boolean
  why: string
}

export interface JudgeReading {
  verdict: JudgeVerdict
  hits: JudgeHit[]
}

export const SCRAMBLED_NAME = /\b[A-Za-z]{12,}\b/g
export const SCRAMBLED_MIN = 3
export const CASE_FLIPS_MIN = 5
export const UPPER_SHARE_MIN = 0.4
export const BASE64_RUN = /[A-Za-z0-9+/]{200,}={0,2}/
