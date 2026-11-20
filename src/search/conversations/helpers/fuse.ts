import { BAYES_ALPHA, BAYES_BETA, BAYES_CONFLICT_MAX, MISSED_NO, RRF_K } from '../types'
import type { Latency } from '../types'

export interface Fused {
  id: string
  score: number
  ranks: (number | null)[]
}

export function reciprocalRankFusion(lists: string[][], k = RRF_K): Fused[] {
  const byId = new Map<string, Fused>()
  lists.forEach((list, which) => {
    list.forEach((id, index) => {
      const entry = byId.get(id) ?? { id, score: 0, ranks: lists.map(() => null) }
      entry.score += 1 / (k + index + 1)
      entry.ranks[which] = index + 1
      byId.set(id, entry)
    })
  })
  return [...byId.values()].sort((a, b) => b.score - a.score)
}

export interface Scored {
  id: string
  score: number
}

export interface Belief {
  yes: number
  no: number
  unsure: number
}

export interface BayesFused extends Fused {
  likelihood: number
  prior: number
  conflict: number
}

export interface BayesOptions {
  alpha?: number
  beta?: number
  prior?: (id: string) => number
  trust?: readonly (number | undefined)[]
  missed?: readonly ('ignorance' | 'weakNo')[]
  probability?: readonly boolean[]
}

export const WEAK_NO: Belief = { yes: 0, no: MISSED_NO, unsure: 1 - MISSED_NO }

export const IGNORANCE: Belief = { yes: 0, no: 0, unsure: 1 }

export function massOf(score: number, alpha = BAYES_ALPHA, beta = BAYES_BETA): Belief {
  const yes = alpha * score
  const no = beta * (1 - score)
  return { yes, no, unsure: Math.max(0, 1 - yes - no) }
}

export function combine(held: Belief, next: Belief): { belief: Belief; conflict: number } {
  const conflict = held.yes * next.no + held.no * next.yes
  if (conflict >= BAYES_CONFLICT_MAX) return { belief: { yes: 0, no: 1, unsure: 0 }, conflict }
  const d = 1 - conflict
  return {
    conflict,
    belief: {
      yes: (held.yes * next.yes + held.yes * next.unsure + held.unsure * next.yes) / d,
      no: (held.no * next.no + held.no * next.unsure + held.unsure * next.no) / d,
      unsure: (held.unsure * next.unsure) / d,
    },
  }
}

export function pignistic(belief: Belief): number {
  return belief.yes + belief.unsure / 2
}

function normalized(list: readonly Scored[]): Map<string, number> {
  const scores = list.map((s) => s.score)
  const lo = Math.min(...scores)
  const hi = Math.max(...scores)
  return new Map(list.map((s) => [s.id, hi > lo ? (s.score - lo) / (hi - lo) : 1]))
}

export function bayesFusion(lists: readonly (readonly Scored[])[], options: BayesOptions = {}): BayesFused[] {
  const norms = lists.map((list, which) => (options.probability?.[which] ? new Map(list.map((s) => [s.id, Math.min(1, Math.max(0, s.score))])) : normalized(list)))
  const rankOf = lists.map((list) => new Map(list.map((s, at) => [s.id, at + 1])))
  const ids = new Set(lists.flatMap((list) => list.map((s) => s.id)))
  const out: BayesFused[] = []
  for (const id of ids) {
    let belief = IGNORANCE
    let conflict = 0
    for (const [which, norm] of norms.entries()) {
      const score = norm.get(id)
      const mass = score === undefined ? (options.missed?.[which] === 'weakNo' && lists[which].length ? WEAK_NO : null) : massOf(score, options.trust?.[which] ?? options.alpha, options.beta)
      if (!mass) continue
      const step = combine(belief, mass)
      belief = step.belief
      conflict = Math.max(conflict, step.conflict)
    }
    const likelihood = pignistic(belief)
    const prior = options.prior ? Math.min(1, Math.max(0, options.prior(id))) : 1
    out.push({ id, score: likelihood * prior, likelihood, prior, conflict, ranks: rankOf.map((ranks) => ranks.get(id) ?? null) })
  }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

export function percentiles(samples: number[]): Latency {
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0)
  return { p50: at(50), p95: at(95), p99: at(99), runs: sorted.length }
}
