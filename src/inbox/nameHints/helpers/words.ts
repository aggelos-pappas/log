import { editDistance } from '../../../useCases/router/helpers/typos'
import { STOP_WORDS } from '../../../useCases/router/types'
import { EVERYDAY_WORDS, NAME_CUES, NOT_NAMES, CHAT_WORDS } from '../types'
import { CORE_WORDS } from './coreWords'

export const COMMON_WORDS: ReadonlySet<string> = new Set([...CORE_WORDS.split(' '), ...NOT_NAMES, ...EVERYDAY_WORDS, ...CHAT_WORDS])

const SUFFIXES: readonly [string, string][] = [
  ['ies', 'y'],
  ['ied', 'y'],
  ['ing', ''],
  ['ing', 'e'],
  ['ed', ''],
  ['ed', 'e'],
  ['es', ''],
  ['s', ''],
  ['er', ''],
  ['ers', ''],
  ['ly', ''],
  ["'s", ''],
  ["'ll", ''],
  ["'re", ''],
  ["'ve", ''],
  ["n't", ''],
]

export function isCommonWord(word: string, common: ReadonlySet<string> = COMMON_WORDS): boolean {
  const w = word.toLowerCase()
  if (common.has(w)) return true
  for (const [end, put] of SUFFIXES) {
    if (w.length - end.length < 3 || !w.endsWith(end)) continue
    const stem = w.slice(0, -end.length)
    if (common.has(stem + put)) return true
    if (/(.)\1$/.test(stem) && common.has(stem.slice(0, -1))) return true
  }
  return false
}

const byLength = new Map<number, string[]>()
for (const word of COMMON_WORDS) byLength.set(word.length, [...(byLength.get(word.length) ?? []), word])

export function commonTypoLimit(word: string): number {
  return word.length >= 5 ? 2 : word.length >= 4 ? 1 : 0
}

export function commonWordNear(word: string, limit: number = commonTypoLimit(word), common: ReadonlySet<string> = COMMON_WORDS): string | null {
  const w = word.toLowerCase().replace(/[^a-z']/g, '')
  if (w.length < 2) return null
  if (isCommonWord(w, common)) return w
  if (!limit || w.length < 4) return null
  const pool = common === COMMON_WORDS ? null : [...common]
  for (let length = w.length - limit; length <= w.length + limit; length++) {
    for (const known of pool ? pool.filter((p) => p.length === length) : (byLength.get(length) ?? [])) {
      if (known.length < 4) continue
      if (editDistance(w, known, limit) <= limit) return known
    }
  }
  const letters = [...w].sort().join('')
  for (const known of pool ?? byLength.get(w.length) ?? []) if ([...known].sort().join('') === letters) return known
  return null
}

export interface PromptToken {
  word: string
  raw: string
  context: boolean
  strong: boolean
}

const SENTENCE_END = /[.!?]\s*$/

export function promptTokens(prompt: string): PromptToken[] {
  const out: PromptToken[] = []
  const pattern = /(@?)([\p{L}\p{N}_.']+)/gu
  let previous = ''
  let sentenceStart = true
  let match: RegExpExecArray | null
  let last = 0
  while ((match = pattern.exec(prompt))) {
    const between = prompt.slice(last, match.index)
    if (SENTENCE_END.test(between) || /\n/.test(between)) sentenceStart = true
    last = match.index + match[0].length
    const raw = match[2].replace(/[._']+$/, '').replace(/^[.']+/, '')
    const word = raw.toLowerCase()
    if (!word) continue
    const capital = /^\p{Lu}/u.test(raw) && !sentenceStart && !CHAT_WORDS.has(word) && !(raw.length > 1 && raw === raw.toUpperCase() && COMMON_WORDS.has(word))
    const upper = raw.length >= 2 && raw.length <= 4 && raw === raw.toUpperCase() && /\p{L}/u.test(raw) && !COMMON_WORDS.has(word)
    const handle = /[_\d]/.test(raw) && /\p{L}/u.test(raw)
    const strong = match[1] === '@' || ((capital || upper) && !STOP_WORDS.has(word) && !NOT_NAMES.has(word) && !(raw.length >= 5 && raw.startsWith('I') && isCommonWord(word.slice(1)))) || handle
    out.push({ word, raw, strong, context: strong || NAME_CUES.has(previous) })
    previous = word
    sentenceStart = false
  }
  return out
}

export type MatchLabel = 'right' | 'wrong' | 'unclear'

export function labelMatch(prompt: string, said: string, name: string): { label: MatchLabel; why: string } {
  const bare = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const token = promptTokens(prompt).find((t) => bare(t.word) === bare(said))
  if (token?.context) return { label: 'right', why: `name context around "${token.raw}"` }
  const exact = bare(name) === bare(said) || name.toLowerCase().split(/[^\p{L}\p{N}]+/u).some((part) => bare(part) === bare(said))
  const near = commonWordNear(said, exact ? 1 : commonTypoLimit(said))
  if (near) return { label: 'wrong', why: `"${said}" is ${near === said.toLowerCase() ? 'the word' : 'a typo of the word'} "${near}" with no name context` }
  if (exact) return { label: 'right', why: `"${said}" is exactly the name and not a common word` }
  return { label: 'unclear', why: `"${said}" is not a common word, but only a fuzzy match of ${name}` }
}

export function typoShare(prompt: string, known: (word: string) => boolean = (w) => isCommonWord(w)): number {
  const words = (prompt.replace(/https?:\/\/\S+/g, ' ').match(/[@#]?[A-Za-z'_\d]+/g) ?? []).filter((w) => /^[a-z']{3,}$/.test(w))
  if (!words.length) return 0
  return words.filter((w) => !known(w)).length / words.length
}
