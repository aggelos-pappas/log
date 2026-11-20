import { existsSync, watch } from 'node:fs'
import { readPending } from '../pending/index'
import { deleteState, getState, putState } from '../../storage/state/index'
import { inboxRoot } from '../watch/index'
import { PUSH_FALLBACK_MS, PUSH_SETTLE_MS, type InboxWait, type PendingReader, type PushBatch, type PushQuiet, type QuietUntil } from './types'

export function batchOf(reader: string, host: string, read: PendingReader = readPending): PushBatch | null {
  const pending = read(reader)
  if (!pending.messages.length && !pending.alerts.length) return null
  if (!pending.text) return null
  return { reader, host, count: pending.messages.length, context: pending.text }
}

export const quietUntil: QuietUntil = (now) => {
  const row = getState<PushQuiet>('pushQuiet', 'all')
  const at = row ? Date.parse(row.body.until) : Number.NaN
  return at > now ? at : 0
}

export function setQuiet(minutes: number, by: string, now: number = Date.now()): string | null {
  if (minutes <= 0) {
    deleteState('pushQuiet', 'all')
    return null
  }
  const until = new Date(now + minutes * 60000).toISOString()
  putState('pushQuiet', 'all', { until, by } satisfies PushQuiet, now)
  return until
}

export const waitForInbox: InboxWait = (root, ms) =>
  new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        watcher?.close()
      } catch {}
      setTimeout(resolve, PUSH_SETTLE_MS)
    }
    const timer = setTimeout(finish, ms)
    let watcher: ReturnType<typeof watch> | null = null
    try {
      if (existsSync(root)) watcher = watch(root, { recursive: true }, (_event, name) => {
        if (!name || String(name).endsWith('watch.log')) finish()
      })
    } catch {}
  })

export async function pushLoop(
  reader: string,
  host: string,
  emit: (batch: PushBatch) => void,
  options: { root?: string; fallbackMs?: number; read?: PendingReader; wait?: InboxWait; rounds?: number; quiet?: QuietUntil; now?: () => number } = {},
): Promise<number> {
  const root = options.root ?? inboxRoot()
  const wait = options.wait ?? waitForInbox
  let sent = 0
  const now = options.now ?? Date.now
  const quiet = options.quiet ?? quietUntil
  for (let round = 0; options.rounds === undefined || round < options.rounds; round++) {
    const until = quiet(now())
    if (until) {
      await wait(root, Math.max(1000, Math.min(until - now(), options.fallbackMs ?? PUSH_FALLBACK_MS)))
      continue
    }
    const batch = batchOf(reader, host, options.read)
    if (batch) {
      emit(batch)
      sent++
    }
    await wait(root, options.fallbackMs ?? PUSH_FALLBACK_MS)
  }
  return sent
}
