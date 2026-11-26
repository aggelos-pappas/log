import { getState, putState } from '../../../storage/state/index'
import type { MoveLedger, MoveLedgerEntry } from '../types'

const KEY = 'ledger'

export function logDbMoveLedger(): MoveLedger {
  const read = (): Record<string, MoveLedgerEntry> => getState<Record<string, MoveLedgerEntry>>('browserMove', KEY)?.body ?? {}
  return {
    get: (accountId) => read()[accountId] ?? null,
    put: (entry) => putState('browserMove', KEY, { ...read(), [entry.accountId]: entry }),
    all: () => Object.values(read())
  }
}

export function memoryMoveLedger(): MoveLedger & { entries: Map<string, MoveLedgerEntry>; history: MoveLedgerEntry[] } {
  const entries = new Map<string, MoveLedgerEntry>()
  const history: MoveLedgerEntry[] = []
  return {
    entries,
    history,
    get: (accountId) => entries.get(accountId) ?? null,
    put: (entry) => {
      entries.set(entry.accountId, entry)
      history.push(entry)
    },
    all: () => [...entries.values()]
  }
}
