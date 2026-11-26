import { getState, putState } from '../../storage/state/index'
import { passKey } from '../passes/index'
import { CALIBRATION_KEY, DEFAULT_THRESHOLD, HELD_OUT_PASS, NEAREST_HIGH, NEAREST_LOW, NOT_HERE_COST, RULE_HIT_COST, SCORE_WEIGHTS, SIGNAL_FIX, SIGNAL_WORDS, THRESHOLD_CEILING, THRESHOLD_FLOOR, VERDICTS_KEPT } from './types'
import type { Calibration, ScoreRow, ScoreSignals, SignalName, Verdict, VoiceScore } from './types'

export interface ScoreInput {
  voice: number
  friendLike: number
  toThem: number | null
  inContext: number
  answerRequired: boolean
  nobodyToAnswer?: boolean
  fitsTheRoom?: number | null
  buildsOn: number | null
  firstContact?: boolean
  openerOnly: number
  neverSays: string[]
  watermark: { level: string }
  scrambler?: { suspicious: number }
  phrases?: { familiarity: number | null; floor: number; median?: number }
  notHere?: string[]
  aiTells?: { score: number; p50: number; p99: number; hits: unknown[]; closest: unknown[]; skipped?: string }
  conventions?: { value: number | null }
  nearestCosine?: number | null
  convergence?: number | null
  theyWrote?: boolean
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

export function signalsOf(input: ScoreInput): ScoreSignals {
  const phrasing = input.phrases && input.phrases.familiarity !== null ? clamp(input.phrases.familiarity / Math.max(input.phrases.median ?? input.phrases.floor, 0.01) - NOT_HERE_COST * (input.notHere?.length ?? 0)) : input.notHere?.length ? clamp(1 - NOT_HERE_COST * input.notHere.length) : null
  const nearest = typeof input.nearestCosine === 'number' ? clamp((input.nearestCosine - NEAREST_LOW) / (NEAREST_HIGH - NEAREST_LOW)) : null
  const ai = input.aiTells
  const closeness = ai && !ai.skipped && ai.closest.length ? (ai.score <= ai.p50 ? 1 : ai.score >= ai.p99 ? 0 : (ai.p99 - ai.score) / Math.max(ai.p99 - ai.p50, 1e-6)) : null
  const notAiTell = input.conventions ? (input.conventions.value === null ? null : clamp(input.conventions.value)) : ai ? (closeness === null && !ai.hits.length ? null : clamp((closeness ?? 1) - RULE_HIT_COST * ai.hits.length)) : null
  const subqVoice = mean([input.voice, input.friendLike, ...(input.toThem === null ? [] : [input.toThem])])
  const owed = [...(input.answerRequired && !input.nobodyToAnswer ? [input.inContext] : []), ...(typeof input.fitsTheRoom === 'number' ? [input.fitsTheRoom] : []), ...(input.buildsOn === null ? [] : [input.buildsOn])]
  return { phrasing, nearest, notAiTell, subqVoice, answersThem: owed.length ? mean(owed) : null, convergence: typeof input.convergence === 'number' ? clamp(input.convergence) : null }
}

export function hardBlocks(input: Pick<ScoreInput, 'neverSays' | 'watermark' | 'scrambler' | 'firstContact' | 'openerOnly' | 'theyWrote'>, openerPass = 0.7): string[] {
  const out: string[] = []
  if (input.neverSays.length) out.push(`a phrase the owner never says: ${input.neverSays.join(', ')}`)
  if (input.watermark.level === 'artifacts') out.push('AI artifacts in the text (watermark)')
  if (input.scrambler?.suspicious) out.push(`${input.scrambler.suspicious} hidden or lookalike character(s)`)
  if (input.firstContact && !input.theyWrote && input.openerOnly < openerPass) out.push(`a first message with an ask in it (openerOnly ${input.openerOnly.toFixed(2)})`)
  return out
}

export function scoreOf(signals: ScoreSignals, blocks: string[], threshold = currentThreshold()): VoiceScore {
  const present = (Object.keys(SCORE_WEIGHTS) as SignalName[]).filter((name) => signals[name] !== null)
  const total = present.reduce((sum, name) => sum + SCORE_WEIGHTS[name], 0) || 1
  const rows: ScoreRow[] = (Object.keys(SCORE_WEIGHTS) as SignalName[]).map((signal) => {
    const value = signals[signal]
    const weight = value === null ? 0 : SCORE_WEIGHTS[signal] / total
    return { signal, value, weight, contribution: value === null ? 0 : weight * value }
  })
  const score = Number(rows.reduce((sum, r) => sum + r.contribution, 0).toFixed(4))
  return { score, threshold, pass: !blocks.length && score >= threshold, blocks, rows }
}

export function scoreTable(score: VoiceScore): string {
  const head = `voice score ${score.score.toFixed(2)} (pass at ${score.threshold.toFixed(2)})${score.blocks.length ? `, blocked: ${score.blocks.join('; ')}` : ''}`
  const lines = score.rows.map((r) => `  ${SIGNAL_WORDS[r.signal].padEnd(20)} ${r.value === null ? '   -' : r.value.toFixed(2)}  × ${r.weight.toFixed(2)} = ${r.contribution.toFixed(2)}`)
  return [head, `  ${'signal'.padEnd(20)} value  weight  share`, ...lines].join('\n')
}

export function weakestSignals(score: VoiceScore, limit = 2): SignalName[] {
  return score.rows.filter((r) => r.value !== null && r.value < score.threshold).sort((a, b) => (a.value ?? 0) * a.weight - (b.value ?? 0) * b.weight || (a.value ?? 0) - (b.value ?? 0)).slice(0, limit).map((r) => r.signal)
}

export function fixWords(signal: SignalName): string {
  return `${SIGNAL_WORDS[signal]}: ${SIGNAL_FIX[signal]}`
}

export function thresholdFrom(scores: readonly number[], share = HELD_OUT_PASS): number {
  if (!scores.length) return DEFAULT_THRESHOLD
  const sorted = [...scores].sort((a, b) => a - b)
  const at = sorted[Math.min(sorted.length - 1, Math.floor((1 - share) * sorted.length))]
  return Math.floor(Math.max(THRESHOLD_FLOOR, Math.min(THRESHOLD_CEILING, at)) * 1000) / 1000
}

export function readCalibration(): Calibration | null {
  try {
    return getState<Calibration>('voiceCalibration', CALIBRATION_KEY)?.body ?? null
  } catch {
    return null
  }
}

export function saveCalibration(calibration: Calibration, now = Date.now()): void {
  putState('voiceCalibration', CALIBRATION_KEY, calibration, now)
}

export function currentThreshold(): number {
  return readCalibration()?.threshold ?? DEFAULT_THRESHOLD
}

export function verdictKey(text: string, lastMessageId: string): string {
  return `${passKey(text)}:${lastMessageId}`
}

function readVerdicts(): Verdict[] {
  try {
    return getState<Verdict[]>('voiceVerdicts', CALIBRATION_KEY)?.body ?? []
  } catch {
    return []
  }
}

export function recordVerdict(text: string, lastMessageId: string | null, verdict: Omit<Verdict, 'key' | 'lastMessageId' | 'at'>, now = new Date()): void {
  if (!lastMessageId || !text.trim()) return
  const key = verdictKey(text, lastMessageId)
  const kept = [...readVerdicts().filter((v) => v.key !== key), { ...verdict, key, lastMessageId, at: now.toISOString() }].slice(-VERDICTS_KEPT)
  putState('voiceVerdicts', CALIBRATION_KEY, kept, now.getTime())
}

export function verdictFor(text: string, lastMessageId: string | null): Verdict | null {
  if (!lastMessageId || !text.trim()) return null
  const key = verdictKey(text, lastMessageId)
  return readVerdicts().find((v) => v.key === key) ?? null
}
