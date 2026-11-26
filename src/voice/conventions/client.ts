import { db, dbPath } from '../../inbox/store/index'
import { getState, putState } from '../../storage/state/index'
import { ruleHits, valeRules } from '../aiTells/client'
import type { AiTellRule } from '../aiTells/types'
import { bandOfWords, gramHits, habitHits, repeatedOpeners, tokensOf, wordCountOf } from './helpers/profile'
import { ABSTAIN_BELOW_WORDS, BANDS, CONVENTIONS_KEY, FLAG_COST, HABIT_WORDS, RULE_COST } from './types'
import type { BandCalibration, BandName, ConventionFlag, ConventionsModel, ConventionsReading } from './types'

export interface LoadedConventions {
  key: string
  model: ConventionsModel
  vocab: Map<string, number>
  rules: AiTellRule[]
  muted: Set<string>
}

let cached: LoadedConventions | null = null
let rulesCache: AiTellRule[] | null = null

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const pct = (n: number) => `${n < 0.01 && n > 0 ? (n * 100).toFixed(1) : Math.round(n * 100)}%`

export function bandOf(words: number): BandName {
  return bandOfWords(words)
}

export function bandWords(band: BandName): string {
  const found = BANDS.find((b) => b.name === band)!
  return Number.isFinite(found.max) ? `${found.min}-${found.max} words` : `${found.min}+ words`
}

export function charGramsOf(text: string, low: number, high: number): Map<string, number> {
  const chars = Array.from(text.toLowerCase().replace(/\s\s+/g, ' '))
  const counts = new Map<string, number>()
  for (let n = low; n <= Math.min(high, chars.length); n++) for (let i = 0; i + n <= chars.length; i++) {
    const gram = chars.slice(i, i + n).join('')
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

export function probabilityOf(loaded: Pick<LoadedConventions, 'model' | 'vocab'>, text: string, embedding: ArrayLike<number> | null): number {
  const { model } = loaded
  let z = model.bias
  const entries: [number, number][] = []
  let norm = 0
  for (const [gram, count] of charGramsOf(text, model.ngram[0], model.ngram[1])) {
    const at = loaded.vocab.get(gram)
    if (at === undefined) continue
    const value = (1 + Math.log(count)) * model.idf[at]
    entries.push([at, value])
    norm += value * value
  }
  norm = Math.sqrt(norm) || 1
  for (const [at, value] of entries) z += (model.gramWeights[at] * value) / norm
  if (embedding && embedding.length === model.embedWeights.length) {
    let size = 0
    for (let i = 0; i < embedding.length; i++) size += embedding[i] * embedding[i]
    size = Math.sqrt(size) || 1
    for (let i = 0; i < embedding.length; i++) z += (model.embedWeights[i] * embedding[i] * model.embedScale) / size
  }
  return 1 / (1 + Math.exp(-z))
}

function cachedRules(): AiTellRule[] {
  return (rulesCache ??= valeRules())
}

export function loadConventions(model: ConventionsModel, key = model.builtAt, rules: AiTellRule[] = cachedRules()): LoadedConventions {
  return { key, model, vocab: new Map(model.vocab.map((g, i) => [g, i])), rules, muted: new Set([...model.mutedRules, ...model.ownersPhrases]) }
}

export function saveConventions(model: ConventionsModel, now = Date.now()): void {
  putState('voiceConventions', CONVENTIONS_KEY, model, now)
  cached = null
}

export function conventionsBuiltAt(): string | null {
  try {
    const row = db().prepare("SELECT json_extract(body, '$.builtAt') AS builtAt FROM state WHERE scope = 'voiceConventions' AND key = ?").get(CONVENTIONS_KEY) as { builtAt: string | null } | null
    return row?.builtAt ?? null
  } catch {
    return null
  }
}

export function openConventions(): LoadedConventions | null {
  try {
    const row = db().prepare("SELECT updatedAt FROM state WHERE scope = 'voiceConventions' AND key = ?").get(CONVENTIONS_KEY) as { updatedAt: number } | null
    if (!row) return null
    const key = `${dbPath()}:${row.updatedAt}`
    if (cached?.key === key) return cached
    const body = getState<ConventionsModel>('voiceConventions', CONVENTIONS_KEY)?.body
    if (!body?.vocab?.length) return null
    cached = loadConventions(body, key)
    return cached
  } catch {
    return null
  }
}

export function bandCalibrationOf(model: Pick<ConventionsModel, 'bands'>, band: BandName): BandCalibration | null {
  return model.bands.find((b) => b.band === band) ?? null
}

export function readConventions(loaded: LoadedConventions, text: string, embedding: ArrayLike<number> | null, options: { openerRepeat?: boolean; ms?: number } = {}): ConventionsReading {
  const started = performance.now()
  const words = wordCountOf(text)
  const band = words ? bandOf(words) : null
  const calibration = band ? bandCalibrationOf(loaded.model, band) : null
  const abstain = !calibration || words < ABSTAIN_BELOW_WORDS || calibration.abstain
  const probability = abstain ? null : probabilityOf(loaded, text, embedding)
  const hits = ruleHits(text, loaded.rules, loaded.muted).filter((h) => !(calibration?.mutedRules ?? []).includes(h.rule))
  const flags: ConventionFlag[] = [
    ...gramHits(text, loaded.model.profile).filter((g) => g.ratio >= (calibration?.gramRatio ?? 0)).map((g) => ({ kind: 'gram' as const, what: g.gram, why: `models write it ${g.ratio.toFixed(0)}x as often as he does`, his: g.his })),
    ...habitHits(text, loaded.model.profile, options.openerRepeat === true).map((h) => ({ kind: 'habit' as const, what: HABIT_WORDS[h.habit], why: h.habit === 'openerRepeat' ? 'models open every option the same way; he varies' : `models ${pct(h.ai)}, him ${pct(h.owner)}`, his: null })),
    ...hits.map((h) => ({ kind: 'rule' as const, what: h.match, why: h.message, his: null })),
  ]
  const ownFlags = flags.filter((f) => f.kind !== 'rule').length
  const overLine = probability !== null && calibration ? probability > calibration.threshold : false
  const closeness = probability === null || !calibration ? null : probability <= calibration.ownerP50 ? 1 : probability >= calibration.threshold ? 0 : (calibration.threshold - probability) / Math.max(calibration.threshold - calibration.ownerP50, 1e-6)
  const value = closeness === null ? (flags.length ? clamp(1 - FLAG_COST * ownFlags - RULE_COST * hits.length) : null) : clamp(closeness - FLAG_COST * ownFlags - RULE_COST * hits.length)
  return { band, words, probability: probability === null ? null : Number(probability.toFixed(4)), threshold: calibration && !abstain ? calibration.threshold : null, abstain, flagged: overLine || flags.some((f) => f.kind === 'habit'), flags, hits, value: value === null ? null : Number(value.toFixed(4)), ms: Number((options.ms ?? performance.now() - started).toFixed(2)) }
}

export function withoutLinks(text: string): string {
  return text.split(/\r?\n/).map((line) => line.replace(/https?:\/\/\S+/g, ' ').replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
}

export async function readConventionsOf(loaded: LoadedConventions, linked: readonly string[], embed: (texts: string[]) => Promise<ArrayLike<number>[]>): Promise<ConventionsReading[]> {
  const texts = linked.map(withoutLinks)
  const repeats = repeatedOpeners(texts)
  return Promise.all(texts.map(async (text, i) => {
    const started = performance.now()
    const vector = text.trim() && wordCountOf(text) >= ABSTAIN_BELOW_WORDS ? (await embed([text]).catch(() => []))[0] ?? null : null
    const reading = readConventions(loaded, text, vector, { openerRepeat: repeats.has(i) })
    return { ...reading, ms: Number((performance.now() - started).toFixed(2)) }
  }))
}

export function ownedConventions(reading: ConventionsReading, owned: string): ConventionsReading {
  return { ...reading, flagged: false, flags: [], hits: [], value: 1, owned }
}

export function conventionsLine(reading: ConventionsReading): string {
  if (reading.owned) return `ai conventions: his own words, never an AI tell: he sent ${reading.owned}`
  const flags = reading.flags.map((f) => (f.kind === 'gram' ? `"${f.what}" (${f.why}${f.his ? `; he'd say: "${f.his.replace(/\n/g, ' / ').slice(0, 120)}"` : ''})` : f.kind === 'habit' ? `${f.what} (${f.why})` : `"${f.what}" (${f.why})`))
  const where = reading.band ? bandWords(reading.band) : 'empty'
  const verdict = reading.abstain ? `too short to tell (${reading.words} words), no verdict` : `${reading.probability!.toFixed(2)} model-written against his 95% line ${reading.threshold!.toFixed(2)} for ${where}`
  const head = reading.flagged ? 'AI CONVENTIONS' : 'ai conventions: reads like him'
  return `${head}: ${verdict}${flags.length ? `; ${flags.join('; ')}` : ''}`
}

export function conventionsNear(loaded: Pick<LoadedConventions, 'model'> | null, text: string, limit = 2): string[] {
  if (!loaded) return []
  const words = new Set(tokensOf(text).filter((w) => w.length > 3))
  const grams = loaded.model.profile.grams.filter((g) => g.gram.includes(' '))
  const scored = grams.map((g) => ({ g, shared: g.gram.split(' ').filter((w) => words.has(w)).length }))
  return scored.sort((a, b) => b.shared - a.shared || b.g.ratio - a.g.ratio).slice(0, limit).map((x) => x.g.gram)
}
