import { describe, expect, test } from 'bun:test'
import { currentThreshold, hardBlocks, readCalibration, recordVerdict, saveCalibration, scoreOf, scoreTable, signalsOf, thresholdFrom, verdictFor, weakestSignals } from './index'
import { DEFAULT_THRESHOLD, SCORE_WEIGHTS } from './types'
import type { ScoreInput } from './client'

const base: ScoreInput = { voice: 0.9, friendLike: 0.9, toThem: 0.9, inContext: 0.9, answerRequired: true, buildsOn: null, openerOnly: 1, neverSays: [], watermark: { level: 'clean' }, scrambler: { suspicious: 0 } }

describe('one calibrated voice score over the signals the gate already has', () => {
  test('the weights are written in one place and add up to one', () => {
    expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })

  test('each signal maps to 0..1 and a missing one is left out, its weight shared by the rest', () => {
    const signals = signalsOf({ ...base, phrases: { familiarity: 0.4, floor: 0.2, median: 0.5 }, notHere: ['commas'], nearestCosine: 0.55, aiTells: { score: 0.7, p50: 0.6, p99: 0.8, hits: [], closest: [{}] } })
    expect(signals.phrasing).toBeCloseTo(0.8 - 0.15, 6)
    expect(signals.nearest).toBeCloseTo(0.5, 6)
    expect(signals.notAiTell).toBeCloseTo(0.5, 6)
    expect(signals.subqVoice).toBeCloseTo(0.9, 6)
    expect(signals.answersThem).toBeCloseTo(0.9, 6)
    const score = scoreOf({ ...signals, nearest: null }, [], 0.7)
    expect(score.rows.find((r) => r.signal === 'nearest')).toMatchObject({ value: null, weight: 0, contribution: 0 })
    expect(score.rows.reduce((a, r) => a + r.weight, 0)).toBeCloseTo(1, 6)
  })

  test('an answer that is not owed does not count, and a skipped AI closeness is not a signal', () => {
    const signals = signalsOf({ ...base, answerRequired: false, aiTells: { score: 0, p50: 0.6, p99: 0.8, hits: [], closest: [], skipped: 'jina timed out' } })
    expect(signals.answersThem).toBeNull()
    expect(signals.notAiTell).toBeNull()
  })

  test('the hard blocks fail a draft whatever its score: never-said, watermark, an ask in a first message', () => {
    const signals = signalsOf(base)
    expect(scoreOf(signals, hardBlocks(base), 0.5).pass).toBe(true)
    expect(scoreOf(signals, hardBlocks({ ...base, neverSays: ['spot on'] }), 0.5).pass).toBe(false)
    expect(scoreOf(signals, hardBlocks({ ...base, watermark: { level: 'artifacts' } }), 0.5).pass).toBe(false)
    expect(hardBlocks({ ...base, firstContact: true, openerOnly: 0.2 })[0]).toContain('first message with an ask')
    expect(hardBlocks({ ...base, firstContact: false, openerOnly: 0.2 })).toEqual([])
    expect(hardBlocks({ ...base, firstContact: true, theyWrote: true, openerOnly: 0.2 })).toEqual([])
  })

  test('the result prints the score, the threshold and each signal in one table', () => {
    const table = scoreTable(scoreOf(signalsOf({ ...base, nearestCosine: 0.8 }), [], 0.7))
    expect(table.split('\n')[0]).toMatch(/^voice score 0\.\d\d \(pass at 0\.70\)$/)
    for (const words of ['his phrasing', 'nearest real reply', 'not an AI tell', 'SubQ voice', 'answers them']) expect(table).toContain(words)
  })

  test('the weakest signals name what to fix', () => {
    const score = scoreOf(signalsOf({ ...base, voice: 0.2, friendLike: 0.3, toThem: 0.3, nearestCosine: 0.9 }), [], 0.7)
    expect(weakestSignals(score)[0]).toBe('subqVoice')
  })

  test('the threshold is set so 95% of his held-out replies pass, inside its floor and ceiling', () => {
    const scores = Array.from({ length: 40 }, (_, i) => 0.6 + i * 0.01)
    const threshold = thresholdFrom(scores)
    expect(scores.filter((s) => s >= threshold).length / scores.length).toBeGreaterThanOrEqual(0.95)
    expect(thresholdFrom([0.1, 0.2, 0.3])).toBe(0.5)
    expect(thresholdFrom([0.99, 0.99, 0.99])).toBe(0.85)
    expect(thresholdFrom([])).toBe(DEFAULT_THRESHOLD)
  })

  test('the calibration is stored dated and becomes the threshold', () => {
    saveCalibration({ threshold: 0.66, measuredAt: '2026-11-20T10:00:00Z', heldOut: 40, passBefore: 0.4, passAfter: 0.95, aiDrafts: 10, aiFailedBefore: 1, aiFailedAfter: 0.9, scores: [] })
    expect(readCalibration()?.measuredAt).toBe('2026-11-20T10:00:00Z')
    expect(currentThreshold()).toBe(0.66)
  })

  test('a verdict is kept per exact text and the chat\'s last message id', () => {
    recordVerdict('yo how did the stream go', 'm42', { pass: true, score: 0.81, threshold: 0.7, voice: 0.9 })
    expect(verdictFor('Yo how did the  stream go', 'm42')).toMatchObject({ pass: true, score: 0.81 })
    expect(verdictFor('yo how did the stream go', 'm43')).toBeNull()
    expect(verdictFor('yo how did the stream go', null)).toBeNull()
    recordVerdict('yo how did the stream go', 'm42', { pass: false, score: 0.5, threshold: 0.7, voice: 0.5 })
    expect(verdictFor('yo how did the stream go', 'm42')?.pass).toBe(false)
  })
})
