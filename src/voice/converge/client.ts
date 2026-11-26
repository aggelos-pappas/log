import { BASELINE_REPLIES, CONVERGENCE_COST, HERE_MIN_PAIRS, STYLE_WEIGHT, MIRROR_MIN_LETTERS, STYLE_KEYS, STYLE_SPREAD_MIN, WORDS_SCALE } from './types'
import type { Convergence, ConvergenceInput, StyleCompare, StyleFeatures } from './types'

const EMOJI = /\p{Extended_Pictographic}/u
const clamp = (n: number) => Math.max(0, Math.min(1, n))

function linesOf(texts: readonly string[]): string[] {
  return texts.flatMap((t) => t.split('\n')).map((l) => l.replace(/https?:\/\/\S+/g, ' ').trim()).filter(Boolean)
}

export function styleOf(texts: readonly string[]): StyleFeatures | null {
  const lines = linesOf(texts)
  if (!lines.length) return null
  const share = (test: (line: string) => boolean) => lines.filter(test).length / lines.length
  const counts = lines.map((l) => (l.match(/[\p{L}\p{N}']+/gu) ?? []).length).sort((a, b) => a - b)
  return {
    words: Math.min(1, counts[Math.floor(counts.length / 2)] / WORDS_SCALE),
    lowercase: share((l) => l === l.toLowerCase()),
    commas: share((l) => l.includes(',')),
    fullStops: share((l) => /\.(\s|$)/.test(l)),
    questions: share((l) => l.includes('?')),
    exclamations: share((l) => l.includes('!')),
    emoji: share((l) => EMOJI.test(l)),
  }
}

export function styleDistance(a: StyleFeatures, b: StyleFeatures): number {
  return STYLE_KEYS.reduce((sum, key) => sum + Math.abs(a[key] - b[key]), 0) / STYLE_KEYS.length
}

function contentWords(text: string): string[] {
  return (text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[\p{L}\p{N}']+/gu) ?? []).filter((w) => w.length >= MIRROR_MIN_LETTERS)
}

export function mirrorShare(text: string, theirs: string): number {
  const mine = contentWords(text)
  if (!mine.length) return 0
  const said = new Set(contentWords(theirs))
  return mine.filter((w) => said.has(w)).length / mine.length
}

function styleShift(baseline: StyleFeatures | null, moved: StyleFeatures | null, theirs: StyleFeatures | null): number {
  if (!baseline || !moved || !theirs) return 0
  const spread = styleDistance(baseline, theirs)
  const shift = spread - styleDistance(moved, theirs)
  return spread < STYLE_SPREAD_MIN ? shift : shift / spread
}

export function convergenceOf(input: ConvergenceInput): Convergence {
  const theirs = input.theirLast.join('\n')
  const answered = input.hisHere.filter((p) => p.said.trim() && p.reply.trim())
  const mirrored = (answered.length >= HERE_MIN_PAIRS ? answered : (input.baselinePairs ?? []).filter((p) => p.said.trim() && p.reply.trim())).slice(-BASELINE_REPLIES)
  const hisMirror = mirrored.length ? mirrored.reduce((sum, p) => sum + mirrorShare(p.reply, p.said), 0) / mirrored.length : 0
  const draftMirror = theirs.trim() ? mirrorShare(input.draft, theirs) : 0
  const baseline = styleOf(input.hisBaseline.slice(-BASELINE_REPLIES))
  const theirStyle = styleOf(input.theirLast)
  const hisHereStyle = answered.length >= HERE_MIN_PAIRS ? styleOf(answered.map((p) => p.reply)) : null
  const hisStyleShift = hisHereStyle ? styleShift(baseline, hisHereStyle, styleOf(answered.map((p) => p.said))) : 0
  const draftStyleShift = styleShift(hisHereStyle ?? baseline, styleOf([input.draft]), theirStyle)
  if (!theirs.trim() || !input.draft.trim()) return { hisMirror, draftMirror, hisStyleShift, draftStyleShift, gap: 0, signal: null }
  const gap = Math.max(draftMirror - hisMirror, STYLE_WEIGHT * draftStyleShift)
  return { hisMirror, draftMirror, hisStyleShift, draftStyleShift, gap: Number(gap.toFixed(4)), signal: Number(clamp(1 - CONVERGENCE_COST * Math.max(0, gap)).toFixed(4)) }
}

export function styleLine(style: StyleFeatures): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return `median ${Math.round(style.words * WORDS_SCALE)} words, ${pct(style.lowercase)} lowercase, commas ${pct(style.commas)}, full stops ${pct(style.fullStops)}, questions ${pct(style.questions)}, ! ${pct(style.exclamations)}, emoji ${pct(style.emoji)}`
}

export function compareLines(compare: StyleCompare): string[] {
  const out = [`how he writes everywhere: ${styleLine(compare.his)}`]
  if (compare.hisHere) {
    const moved = STYLE_KEYS.filter((k) => Math.abs(compare.hisHere![k] - compare.his[k]) >= 0.1).map((k) => `${k} ${compare.hisHere![k] > compare.his[k] ? 'more' : 'less'}`)
    out.push(`how he talks to this person: ${styleLine(compare.hisHere)}${moved.length ? ` (vs everywhere: ${moved.join(', ')})` : ' (the same as everywhere)'}`)
  }
  if (compare.theirs) out.push(`how they talk, NOT to copy: ${styleLine(compare.theirs)}`)
  return out
}

export function convergenceLine(c: Convergence): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return `convergence: the draft reuses ${pct(c.draftMirror)} of its words from their last messages (he reuses ${pct(c.hisMirror)} here); style shift toward them ${c.draftStyleShift.toFixed(2)} (his here ${c.hisStyleShift.toFixed(2)}); gap ${c.gap.toFixed(2)}`
}

const FACT = /\b(i|im|i'm|ive|i've|we|were|we're|weve|we've|my|our|mine)\b|\d/i

export function hisFacts(replies: readonly string[], limit = 5): string[] {
  const seen = new Set<string>()
  return replies.flatMap((r) => r.replace(/\([^)]*\)/g, ' ').split('\n')).map((l) => l.trim()).filter((l) => l.split(/\s+/).length >= 4 && FACT.test(l)).filter((l) => (seen.has(l.toLowerCase()) ? false : (seen.add(l.toLowerCase()), true))).slice(0, limit)
}
