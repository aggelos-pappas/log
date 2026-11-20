import type { Embedder } from '../../../search/conversations/types'
import { BOT_THRESHOLD, HEAD_MIN_KINDS, NEVER_STAGED, NEW_TURNS, PROTOTYPE_TEMPERATURE, QUIET_DAYS, SALES_WHO, SEED_PHRASES } from '../types'
import type { Features, Guess, HeadLayer, PipelineHead, PipelineLabels, Prototypes } from '../types'

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function softmax(values: readonly number[]): number[] {
  const top = Math.max(...values)
  const exps = values.map((v) => Math.exp(v - top))
  const sum = exps.reduce((a, b) => a + b, 0) || 1
  return exps.map((e) => e / sum)
}

function normalized(v: Float32Array): Float32Array {
  const n = Math.hypot(...v) || 1
  return v.map((x) => x / n)
}

export function prototypeTexts(label: string, meaning: string): string[] {
  return [`${label}: ${meaning}`, ...(SEED_PHRASES[label] ?? [])]
}

export async function buildPrototypes(labels: PipelineLabels, embedder: Pick<Embedder, 'embed' | 'model'>): Promise<Prototypes> {
  const side = async (list: Record<string, string>) => {
    const out: { label: string; vector: Float32Array }[] = []
    for (const [label, meaning] of Object.entries(list)) {
      const vectors = await embedder.embed(prototypeTexts(label, meaning))
      const mean = new Float32Array(vectors[0].length)
      for (const v of vectors) for (let i = 0; i < v.length; i++) mean[i] += v[i] / vectors.length
      out.push({ label, vector: normalized(mean) })
    }
    return out
  }
  return { model: embedder.model, who: await side(labels.who), where: await side(labels.where) }
}

export function withExemplars(prototypes: Prototypes, exemplars: readonly { who: string; vector: Float32Array }[]): Prototypes {
  if (!exemplars.length || prototypes.who.some((p) => !exemplars.some((e) => e.who === p.label))) return prototypes
  return {
    ...prototypes,
    who: prototypes.who.map((p) => {
      const mine = exemplars.filter((e) => e.who === p.label && e.vector.length === p.vector.length)
      if (!mine.length) return p
      const mean = new Float32Array(p.vector.length)
      for (const e of mine) for (let i = 0; i < mean.length; i++) mean[i] += e.vector[i] / mine.length
      const n = Math.hypot(...mean) || 1
      return { label: p.label, vector: normalized(p.vector.map((x, i) => x + mean[i] / n)) }
    }),
  }
}

export function prototypeScores(vector: Float32Array, side: Prototypes['who']): Record<string, number> {
  const probs = softmax(side.map((p) => cosine(vector, p.vector) / PROTOTYPE_TEMPERATURE))
  return Object.fromEntries(side.map((p, i) => [p.label, probs[i]]))
}

export function headInput(vector: Float32Array, features: Features, head: Pick<PipelineHead, 'features' | 'featureScale'>): number[] {
  return [...vector, ...head.features.map((name, i) => (features[name as keyof Features] ?? 0) / (head.featureScale[i] || 1))]
}

export function applyLayer(layer: HeadLayer, input: readonly number[]): Record<string, number> {
  const logits = layer.weights.map((row, k) => row.reduce((sum, w, i) => sum + w * (input[i] ?? 0), layer.bias[k] ?? 0))
  const probs = softmax(logits)
  return Object.fromEntries(layer.labels.map((label, k) => [label, probs[k]]))
}

function renormalized(scores: Record<string, number>): Record<string, number> {
  const sum = Object.values(scores).reduce((a, b) => a + b, 0) || 1
  return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v / sum]))
}

function ranked(scores: Record<string, number>): { top: string; first: number; second: number } {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return { top: sorted[0]?.[0] ?? '', first: sorted[0]?.[1] ?? 0, second: sorted[1]?.[1] ?? 0 }
}

const rounded = (scores: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 1000) / 1000]))

export function stageAllowed(who: string): boolean {
  return SALES_WHO.includes(who) && !NEVER_STAGED.includes(who)
}

export function guessOf(vector: Float32Array, features: Features, labels: PipelineLabels, prototypes: Prototypes, head: PipelineHead | null, botWhy: readonly string[] = []): Guess {
  const useHead = Boolean(head && head.who.labels.length >= HEAD_MIN_KINDS && head.who.labels.every((l) => l in labels.who))
  const input = useHead && head ? headInput(vector, features, head) : []
  let whoScores = useHead && head ? applyLayer(head.who, input) : prototypeScores(vector, prototypes.who)
  if ('bot' in whoScores) {
    const detected = features.botScore >= BOT_THRESHOLD ? features.botScore : 0
    const bot = useHead ? Math.max(detected, whoScores.bot) : detected
    whoScores = renormalized(Object.fromEntries(Object.entries(whoScores).map(([k, v]) => [k, k === 'bot' ? bot : v * (1 - bot)])))
  }
  const who = ranked(whoScores)
  if (who.top === 'bot' && features.botScore >= BOT_THRESHOLD) {
    return { who: 'bot', where: null, confidence: who.first, margin: who.first - who.second, whoScores: rounded(whoScores), whereScores: {}, source: 'bot', why: botWhy.join('; ') || 'reads as a bot' }
  }
  if (!stageAllowed(who.top)) return { who: who.top, where: null, confidence: who.first, margin: who.first - who.second, whoScores: rounded(whoScores), whereScores: {}, source: useHead ? 'head' : 'prototype', why: `nearest to ${who.top} (${Math.round(who.first * 100)}%), no sales stage for ${who.top}` }
  const useWhereHead = Boolean(useHead && head && head.where.labels.length && head.where.labels.every((l) => l in labels.where))
  let whereScores = useWhereHead && head ? applyLayer(head.where, input) : prototypeScores(vector, prototypes.where)
  if (!useWhereHead) {
    const quiet = features.daysQuiet >= QUIET_DAYS
    whereScores = renormalized(
      Object.fromEntries(
        Object.entries(whereScores).map(([k, v]) => {
          const fresh = features.turns < NEW_TURNS
          if (k === 'goneQuiet') return [k, quiet ? 1 : 0]
          if (quiet) return [k, 0]
          if (fresh && 'new' in labels.where) return [k, k === (features.openAsk && 'offered' in labels.where ? 'offered' : 'new') ? 1 : 0]
          if (k === 'new') return [k, 0]
          if (k === 'offered') return [k, features.openAsk ? v * 3 : v]
          return [k, v]
        }),
      ),
    )
  }
  const where = ranked(whereScores)
  return {
    who: who.top,
    where: where.top || null,
    confidence: Math.min(who.first, where.first),
    margin: Math.min(who.first - who.second, where.first - where.second),
    whoScores: rounded(whoScores),
    whereScores: rounded(whereScores),
    source: useHead ? 'head' : 'prototype',
    why: `nearest to ${who.top} (${Math.round(who.first * 100)}%) and ${where.top} (${Math.round(where.first * 100)}%)${features.daysQuiet >= QUIET_DAYS ? `, quiet ${features.daysQuiet} days` : ''}${features.openAsk ? ', an ask is open' : ''}`,
  }
}

export function entropyOf(scores: Record<string, number>): number {
  const values = Object.values(scores).filter((v) => v > 0)
  if (values.length < 2) return 0
  return -values.reduce((sum, p) => sum + p * Math.log(p), 0) / Math.log(Object.keys(scores).length)
}
