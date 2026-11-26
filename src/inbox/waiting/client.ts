import { lastWordOf, waitingOf } from '../lastWord/index.ts'
import type { LastWord } from '../lastWord/index.ts'
import { sinceOf } from '../senders/index.ts'
import { readLocalAccounts } from '../../accounts/store/helpers/localAccounts.ts'
import { WAITING_DEFAULT_SINCE, WAITING_PREVIEW_CHARS } from './types.ts'
import type { WaitingOptions, WaitingReport, WaitingRow } from './types.ts'

const rowOf = (w: LastWord): WaitingRow => ({ who: w.with, platform: w.platform, account: w.account, kind: w.kind, said: (w.theyReacted ? `(reacted ${w.theyReacted})` : w.lastText).replace(/\s+/g, ' ').trim().slice(0, WAITING_PREVIEW_CHARS), at: w.lastAt })

export function waitingFrom(words: readonly LastWord[], options: WaitingOptions = {}): WaitingReport {
  const since = sinceOf(options.since ?? WAITING_DEFAULT_SINCE, options.now)
  const limit = Math.max(1, options.limit ?? 200)
  const yours = options.accounts?.length ? new Set(options.accounts.map((a) => a.toLowerCase())) : null
  const kept = words.filter((w) => (!yours || yours.has(w.account.toLowerCase())) && (!options.platform || w.platform === options.platform) && (!options.account || w.account.toLowerCase() === options.account.replace(/^@/, '').toLowerCase()) && (!since || w.lastAt >= since))
  const { waiting, followUps } = waitingOf(kept)
  const platforms = [...new Set([...waiting, ...followUps].map((w) => w.platform))].sort()
  return {
    source: 'waitingOnYou',
    readFrom: 'log.db',
    since,
    waiting: waiting.slice(0, limit).map(rowOf),
    followUps: followUps.slice(0, limit).map(rowOf),
    byPlatform: platforms.map((platform) => ({ platform, waiting: waiting.filter((w) => w.platform === platform).length, followUps: followUps.filter((w) => w.platform === platform).length })),
  }
}

export function configuredAccounts(): string[] {
  return readLocalAccounts().map((r) => String(r.accountName ?? r.name ?? '')).filter(Boolean)
}

export function readWaiting(options: WaitingOptions = {}): WaitingReport {
  return waitingFrom(lastWordOf({ ...(options.platform ? { platform: options.platform } : {}), ...(options.account ? { account: options.account } : {}) }), { accounts: configuredAccounts(), ...options })
}
