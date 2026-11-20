import { BOOTSTRAP_REPS, BOOTSTRAP_SEED, Z95 } from '../types'
import type { MatchedWindow, Rate } from '../types'

const round = (x: number | null, places = 3): number | null => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** places) / 10 ** places)

export function wilson(yes: number, n: number, z: number = Z95): Rate {
  if (!n) return { n, yes, rate: null, low: null, high: null }
  const p = yes / n
  const denom = 1 + (z * z) / n
  const centre = (p + (z * z) / (2 * n)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom
  return { n, yes, rate: round(p), low: round(Math.max(0, centre - half)), high: round(Math.min(1, centre + half)) }
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function seededRandom(seed: number = BOOTSTRAP_SEED): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function percentile(sorted: readonly number[], q: number): number | null {
  if (!sorted.length) return null
  const at = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[at]
}

export interface Unit {
  stratum: string
  cluster: string
  log: boolean
  outcome: boolean
}

interface Cell {
  logN: number
  logYes: number
  handN: number
  handYes: number
}

function cellsOf(units: readonly Unit[]): Map<string, Cell> {
  const cells = new Map<string, Cell>()
  for (const u of units) {
    const c = cells.get(u.stratum) ?? { logN: 0, logYes: 0, handN: 0, handYes: 0 }
    if (u.log) {
      c.logN++
      if (u.outcome) c.logYes++
    } else {
      c.handN++
      if (u.outcome) c.handYes++
    }
    cells.set(u.stratum, c)
  }
  return cells
}

export function matchedRates(units: readonly Unit[]): { log: number | null; hand: number | null; difference: number | null; strata: number; logSends: number; handSends: number } {
  let weight = 0
  let logSum = 0
  let handSum = 0
  let strata = 0
  let logSends = 0
  let handSends = 0
  for (const c of cellsOf(units).values()) {
    if (!c.logN || !c.handN) continue
    const w = (c.logN * c.handN) / (c.logN + c.handN)
    weight += w
    logSum += (w * c.logYes) / c.logN
    handSum += (w * c.handYes) / c.handN
    strata++
    logSends += c.logN
    handSends += c.handN
  }
  if (!weight) return { log: null, hand: null, difference: null, strata, logSends, handSends }
  return { log: logSum / weight, hand: handSum / weight, difference: (logSum - handSum) / weight, strata, logSends, handSends }
}

function resample<T>(units: readonly T[], clusterOf: (u: T) => string, random: () => number): T[] {
  const byCluster = new Map<string, T[]>()
  for (const u of units) {
    const list = byCluster.get(clusterOf(u))
    if (list) list.push(u)
    else byCluster.set(clusterOf(u), [u])
  }
  const clusters = [...byCluster.values()]
  const out: T[] = []
  for (let k = 0; k < clusters.length; k++) {
    const picked = clusters[Math.floor(random() * clusters.length)]
    for (const u of picked) out.push({ ...u, stratum: `${(u as { stratum: string }).stratum}\u0000${k}` })
  }
  return out
}

export function matchedWindow(units: readonly Unit[], reps: number = BOOTSTRAP_REPS, seed: number = BOOTSTRAP_SEED): MatchedWindow {
  const point = matchedRates(units)
  const cells = cellsOf(units)
  const kept = units.filter((u) => {
    const c = cells.get(u.stratum)
    return Boolean(c?.logN && c.handN)
  })
  const people = new Set(kept.map((u) => u.cluster)).size
  const base = { strata: point.strata, people, logSends: point.logSends, handSends: point.handSends, log: round(point.log), hand: round(point.hand), difference: round(point.difference) }
  if (point.difference === null || people < 2) return { ...base, low: null, high: null }
  const random = seededRandom(seed)
  const draws: number[] = []
  for (let r = 0; r < reps; r++) {
    const d = matchedRates(resample(kept, (u) => u.cluster, random)).difference
    if (d !== null) draws.push(d)
  }
  draws.sort((a, b) => a - b)
  return { ...base, low: round(percentile(draws, 0.025)), high: round(percentile(draws, 0.975)) }
}

export function oddsRatio(a: number, b: number, c: number, d: number): { ratio: number | null; low: number | null; high: number | null } {
  if (!(a + b) || !(c + d)) return { ratio: null, low: null, high: null }
  const [A, B, C, D] = [a, b, c, d].map((x) => x + 0.5)
  const ratio = (A * D) / (B * C)
  const se = Math.sqrt(1 / A + 1 / B + 1 / C + 1 / D)
  return { ratio: round(ratio, 2), low: round(Math.exp(Math.log(ratio) - Z95 * se), 2), high: round(Math.exp(Math.log(ratio) + Z95 * se), 2) }
}

export interface ExposureUnit {
  stratum: string
  cluster: string
  exposed: boolean
  outcome: boolean
}

export function mantelHaenszel(units: readonly ExposureUnit[]): number | null {
  const strata = new Map<string, [number, number, number, number]>()
  for (const u of units) {
    const s = strata.get(u.stratum) ?? [0, 0, 0, 0]
    s[(u.exposed ? 0 : 2) + (u.outcome ? 0 : 1)]++
    strata.set(u.stratum, s)
  }
  let top = 0
  let bottom = 0
  for (const [a, b, c, d] of strata.values()) {
    const n = a + b + c + d
    if (!(a + b) || !(c + d)) continue
    top += (a * d) / n
    bottom += (b * c) / n
  }
  return top && bottom ? top / bottom : null
}

export function mantelHaenszelInterval(units: readonly ExposureUnit[], reps: number = BOOTSTRAP_REPS, seed: number = BOOTSTRAP_SEED): { ratio: number | null; low: number | null; high: number | null } {
  const ratio = mantelHaenszel(units)
  if (ratio === null) return { ratio: null, low: null, high: null }
  const random = seededRandom(seed)
  const draws: number[] = []
  for (let r = 0; r < reps; r++) {
    const d = mantelHaenszel(resample(units, (u) => u.cluster, random))
    if (d !== null && Number.isFinite(d)) draws.push(d)
  }
  draws.sort((a, b) => a - b)
  return { ratio: round(ratio, 2), low: round(percentile(draws, 0.025), 2), high: round(percentile(draws, 0.975), 2) }
}
