import { execFile } from 'node:child_process'
import { timed } from '../../observability/timing/index'
import { callArgs } from './helpers/index'
import { db } from '../../inbox/store/index'
import { TREG_HEDGE_DEFAULT_MS, TREG_HEDGE_MIN_MS, TREG_HEDGE_REFRESH_MS, TREG_HEDGE_SAMPLE, TREG_MAX_OUTPUT, TREG_PRICE_KEEP_MS, TREG_TIMEOUT_MS } from './types'
import type { TregClient, TregRun, TregRunner } from './types'

export function tregBin(): string {
  return process.env.TREG_BIN || 'treg'
}

export const runTreg: TregRunner = (args, timeoutMs, signal) =>
  new Promise((resolve) => {
    execFile(tregBin(), args, { encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...(signal ? { signal } : {}) }, (error, stdout, stderr) => {
      const code = error ? (typeof (error as { code?: unknown }).code === 'number' ? ((error as { code: number }).code) : 1) : 0
      const missing = (error as { code?: unknown } | null)?.code === 'ENOENT'
      resolve({
        ok: !error,
        code,
        stdout: String(stdout ?? '').slice(0, TREG_MAX_OUTPUT),
        stderr: missing ? `treg isn't installed or isn't on the PATH (set TREG_BIN to its path)` : String(stderr ?? '').slice(-4000),
      })
    })
  })

function timedRun(run: TregRunner, name: string, args: string[], attrs: Record<string, unknown>): Promise<TregRun> {
  return timed(name, async (span) => {
    const result = await run(args, TREG_TIMEOUT_MS)
    span.attrs.exit = result.code
    return result
  }, attrs)
}

export function percentileOf(values: readonly number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

const hedgeDelays = new Map<string, { ms: number; at: number }>()

export function measuredHedgeMs(name: string, now: number = Date.now(), read: (name: string) => number[] = recentSpanMs): number {
  const held = hedgeDelays.get(name)
  if (held && Math.abs(now - held.at) < TREG_HEDGE_REFRESH_MS) return held.ms
  let p95: number | null = null
  try {
    p95 = percentileOf(read(name), 0.95)
  } catch {}
  const ms = Math.max(TREG_HEDGE_MIN_MS, Math.round(p95 ?? TREG_HEDGE_DEFAULT_MS))
  hedgeDelays.set(name, { ms, at: now })
  return ms
}

function recentSpanMs(name: string): number[] {
  return (db().prepare('SELECT ms FROM spans WHERE name = ? AND ok = 1 ORDER BY startedAt DESC LIMIT ?').all(name, TREG_HEDGE_SAMPLE) as { ms: number }[]).map((r) => r.ms)
}

export function hedgedRun(run: TregRunner, name: string, args: string[], attrs: Record<string, unknown>, afterMs: number): Promise<TregRun> {
  return timed(name, async (span) => {
    span.attrs.hedgeAfterMs = afterMs
    const first = new AbortController()
    const primary = run(args, TREG_TIMEOUT_MS, first.signal)
    let timer: ReturnType<typeof setTimeout> | undefined
    const late = new Promise<'late'>((resolve) => (timer = setTimeout(() => resolve('late'), afterMs)))
    const early = await Promise.race([primary, late])
    clearTimeout(timer)
    if (early !== 'late') {
      span.attrs.exit = early.code
      span.attrs.hedge = 'none'
      return early
    }
    const second = new AbortController()
    const tagged = [primary.then((result) => ({ result, at: 0 })), run(args, TREG_TIMEOUT_MS, second.signal).then((result) => ({ result, at: 1 }))]
    let won = await Promise.race(tagged)
    if (!won.result.ok) {
      const other = await tagged[1 - won.at]
      if (other.result.ok) won = other
    }
    ;(won.at === 0 ? second : first).abort()
    span.attrs.exit = won.result.code
    span.attrs.hedge = won.at === 1 ? 'won' : 'lost'
    return won.result
  }, attrs)
}

const keptByRunner = new WeakMap<TregRunner, Map<string, { run: TregRun; at: number }>>()

export function createTregClient(run: TregRunner = runTreg, hedgeMs: (name: string) => number = run === runTreg ? measuredHedgeMs : () => TREG_HEDGE_DEFAULT_MS): TregClient {
  const keptGets = keptByRunner.get(run) ?? new Map<string, { run: TregRun; at: number }>()
  keptByRunner.set(run, keptGets)
  return {
    search: (query, limit) => hedgedRun(run, 'treg.search', ['catalog', 'search', ...query.split(/\s+/).filter(Boolean), '--limit', String(limit)], {}, hedgeMs('treg.search')),
    get: async (id) => {
      const got = await hedgedRun(run, 'treg.get', ['catalog', 'get', id], { endpoint: id }, hedgeMs('treg.get'))
      if (got.ok) keptGets.set(id, { run: got, at: Date.now() })
      return got
    },
    call: (input) => timedRun(run, 'treg.call', callArgs(input), { endpoint: input.id }),
    keptGet: (id) => {
      const kept = keptGets.get(id)
      return kept && Date.now() - kept.at < TREG_PRICE_KEEP_MS ? kept.run : null
    },
  }
}
