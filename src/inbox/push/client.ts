import { existsSync, watch } from 'node:fs'
import { readPending } from '../pending/index'
import { inboxRoot } from '../watch/index'
import { PUSH_FALLBACK_MS, PUSH_SETTLE_MS, type InboxWait, type PendingReader, type PushBatch } from './types'

export function batchOf(reader: string, host: string, read: PendingReader = readPending): PushBatch | null {
  const pending = read(reader)
  if (!pending.messages.length && !pending.alerts.length) return null
  if (!pending.text) return null
  return { reader, host, count: pending.messages.length, context: pending.text }
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
  options: { root?: string; fallbackMs?: number; read?: PendingReader; wait?: InboxWait; rounds?: number } = {},
): Promise<number> {
  const root = options.root ?? inboxRoot()
  const wait = options.wait ?? waitForInbox
  let sent = 0
  for (let round = 0; options.rounds === undefined || round < options.rounds; round++) {
    const batch = batchOf(reader, host, options.read)
    if (batch) {
      emit(batch)
      sent++
    }
    await wait(root, options.fallbackMs ?? PUSH_FALLBACK_MS)
  }
  return sent
}
