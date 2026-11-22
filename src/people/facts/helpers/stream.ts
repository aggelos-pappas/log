import type { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { modelByKey } from '../../../models/manifest/index'
import { placeOf } from '../../../models/store/index'
import { SCREEN_MODEL_KEY, SCREEN_SETTING, DECIDE_EVERY_MS, STREAM_IDLE_MS, STREAM_RETRY_MS } from '../types'
import type { FactDecider, Screener, StreamReport } from '../types'
import { decideQueued, queuedCount, screenStream } from './extract'
import { factDecider } from './decide'
import { gliner2Screener } from './screen'

export interface FactStream {
  tick: () => Promise<StreamReport | null>
  stop: () => void
}

export interface FactStreamOptions {
  env?: Record<string, string | undefined>
  screener?: () => Screener
  decider?: () => FactDecider
  log?: (line: string) => void
  clock?: () => number
}

export function factStream(handle: Database, options: FactStreamOptions = {}): FactStream | null {
  const env = options.env ?? process.env
  if (env[SCREEN_SETTING] === 'off') return null
  const dir = placeOf(modelByKey(SCREEN_MODEL_KEY), env)
  if (!options.screener && (!dir || !existsSync(dir))) return null
  const make = options.screener ?? (() => gliner2Screener(dir))
  const deciderOf = options.decider ?? (() => factDecider(env))
  const log = options.log ?? (() => undefined)
  const clock = options.clock ?? Date.now
  let screener: Screener | null = null
  let busy = false
  let retryAt = 0
  let nextDecide = 0
  let deciderProblem = ''
  let lastLines = clock()
  const stop = () => {
    screener?.stop?.()
    screener = null
  }
  return {
    async tick() {
      if (busy || clock() < retryAt) return null
      busy = true
      try {
        screener ??= make()
        const report = await screenStream(handle, screener, new Date(clock()))
        if (report.lines) {
          lastLines = clock()
          if (report.marked) log(`facts: screened ${report.lines} new dm line(s), marked ${report.marked} for the decider`)
        } else if (clock() - lastLines > STREAM_IDLE_MS) stop()
        if (clock() >= nextDecide && queuedCount(handle) > 0) {
          nextDecide = clock() + DECIDE_EVERY_MS
          const decider = deciderOf()
          if (!decider.ok) {
            if (deciderProblem !== decider.code) log(`facts: ${queuedCount(handle)} marked line(s) wait for the decider (${decider.code}: ${decider.problem})`)
            deciderProblem = decider.code
          } else {
            deciderProblem = ''
            const done = await decideQueued(handle, decider.decisions, { decideModel: decider.model, now: new Date(clock()), log })
            if (done.added || done.decided) log(`facts: the decider settled ${done.decided} marked line(s) into ${done.added} lasting fact(s), ${done.queued} still queued`)
          }
        }
        return report
      } catch (error) {
        retryAt = clock() + STREAM_RETRY_MS
        stop()
        log(`facts: the fact screen stopped (${error instanceof Error ? error.message : String(error)}); trying again in ${Math.round(STREAM_RETRY_MS / 60_000)} min`)
        return null
      } finally {
        busy = false
      }
    },
    stop,
  }
}
