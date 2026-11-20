export const BLOCKS_KEEP_MS = 3 * 24 * 3600 * 1000

export const REQUESTS_BUCKET = 100

export interface BlockStore {
  seen(key: string): string | null
  keep(key: string, fingerprint: string, now: number): void
  prune(olderThan: number): void
}
