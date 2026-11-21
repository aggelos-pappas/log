export const NEAR_OWN = 0.8
export const OWN_GRAM = 3
export const OWN_LENGTH_SLACK = 0.25
export const OWN_RARE_WORDS = 2
export const OWN_MIN_CHARS = 6

export interface OwnLine {
  line: string
  his: string
  overlap: number
}

export interface OwnMatch {
  lines: OwnLine[]
}

export interface OwnIndex {
  exact: Map<string, string>
  texts: string[]
  keys: string[]
  byWord: Map<string, number[]>
}
