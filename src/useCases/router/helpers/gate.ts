import { isCommonWord, typoShare } from '../../../inbox/nameHints/helpers/words'
import { LOG_BUILD_STRONG, LOG_BUILD_WEAK, TYPO_HEAVY_SHARE, TYPO_MIN_WORDS } from '../types'

export type PlaySkip = 'typos' | 'buildingLog'

export function buildingLog(prompt: string): boolean {
  const words = new Set(prompt.toLowerCase().match(/[a-z]+/g) ?? [])
  const strong = [...words].filter((w) => LOG_BUILD_STRONG.has(w)).length
  const weak = [...words].filter((w) => LOG_BUILD_WEAK.has(w)).length
  return (strong >= 1 && strong + weak >= 2) || (words.has('log') && weak >= 2)
}

export function playSkipOf(prompt: string, vocabulary: ReadonlySet<string> = new Set()): PlaySkip | null {
  const enough = (prompt.match(/[a-z]{3,}/gi) ?? []).length >= TYPO_MIN_WORDS
  if (enough && typoShare(prompt, (w) => isCommonWord(w) || vocabulary.has(w)) >= TYPO_HEAVY_SHARE) return 'typos'
  return buildingLog(prompt) ? 'buildingLog' : null
}
