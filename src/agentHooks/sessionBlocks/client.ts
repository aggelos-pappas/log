import type { Database } from 'bun:sqlite'
import { getState, pruneState, putState } from '../../storage/state/index'
import { BLOCKS_KEEP_MS, REQUESTS_BUCKET } from './types'
import type { BlockStore } from './types'

export function stateBlockStore(handle?: Database): BlockStore {
  return {
    seen: (key) => getState<string>('hookBlocks', key, {}, ...(handle ? [handle] : []))?.body ?? null,
    keep: (key, fingerprint, now) => putState('hookBlocks', key, fingerprint, now, ...(handle ? [handle] : [])),
    prune: (olderThan) => void pruneState('hookBlocks', '', olderThan, ...(handle ? [handle] : [])),
  }
}

export function freshBlock(block: string, session: string, text: string, fingerprint: string = text, store: BlockStore = stateBlockStore(), force = false, now: number = Date.now()): string {
  if (!text) return ''
  const key = `${session}|${block}`
  try {
    if (!force && store.seen(key) === fingerprint) return ''
    store.keep(key, fingerprint, now)
    store.prune(now - BLOCKS_KEEP_MS)
  } catch {}
  return text
}

export function numbersOut(text: string): string {
  return text.replace(/\d+(?:[.:,]\d+)*/g, '#')
}

export function accountsFingerprint(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/, its one session open \([^)]*\)/, '').replace(/ \(\d{1,2}\/\d{1,2} [^)]*\)/, '').replace(/(\d+)\/(\d+) requests/, (_, used: string, cap: string) => `~${Math.floor(Number(used) / REQUESTS_BUCKET) * REQUESTS_BUCKET}/${cap} requests`))
    .join('\n')
}

export function memoryBlockStore(): BlockStore & { keys(): string[] } {
  const kept = new Map<string, { fingerprint: string; at: number }>()
  return {
    seen: (key) => kept.get(key)?.fingerprint ?? null,
    keep: (key, fingerprint, now) => void kept.set(key, { fingerprint, at: now }),
    prune: (olderThan) => {
      for (const [key, row] of kept) if (row.at < olderThan) kept.delete(key)
    },
    keys: () => [...kept.keys()],
  }
}
