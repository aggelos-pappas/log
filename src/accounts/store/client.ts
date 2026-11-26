import { localAccountsPath, readLocalAccounts, upsertLocalAccount, writeLocalAccounts } from './helpers/localAccounts'
import { matchesFilter, secretsOf } from './helpers/memoryStore'
import { AccountStoreError } from './types'
import type { AccountObject, AccountObjects, AccountStore, LoginSecrets } from './types'

const ACCOUNTS = 'socialAccounts'

export function retiredObject(object: string): AccountStoreError {
  return new AccountStoreError('twentyRemoved', `${object} were kept in Twenty, which log no longer uses; they are retired until rebuilt on log.db (#339)`)
}

export function createAccountStore(env: Record<string, string | undefined> = process.env): AccountStore {
  const path = localAccountsPath(env)
  const accountsOnly = (object: AccountObject): void => {
    if (object !== ACCOUNTS) throw retiredObject(object)
  }
  return {
    async list<K extends AccountObject>(object: K, filter?: AccountObjects[K]['filter']) {
      accountsOnly(object)
      return readLocalAccounts(path).filter((row) => matchesFilter(row, filter as Record<string, unknown> | undefined)) as unknown as AccountObjects[K]['row'][]
    },
    async get<K extends AccountObject>(object: K, id: string) {
      accountsOnly(object)
      return (readLocalAccounts(path).find((r) => r.id === id) ?? null) as unknown as AccountObjects[K]['row'] | null
    },
    async create<K extends AccountObject>(object: K, data: AccountObjects[K]['create']) {
      accountsOnly(object)
      const fields = data as Record<string, unknown>
      return upsertLocalAccount({ ...fields, accountName: String(fields.accountName ?? fields.name ?? '') }, path) as unknown as AccountObjects[K]['row']
    },
    async update<K extends AccountObject>(object: K, id: string, data: AccountObjects[K]['update']) {
      accountsOnly(object)
      const rows = readLocalAccounts(path)
      const row = rows.find((r) => r.id === id)
      if (!row) throw new AccountStoreError('accountNotFound', `no socialAccount ${id} in ${path}`)
      Object.assign(row, data, { updatedAt: new Date().toISOString() })
      writeLocalAccounts(rows, path)
      return { ...row } as unknown as AccountObjects[K]['row']
    },
    async loginSecrets(accountId: string): Promise<LoginSecrets | null> {
      const row = readLocalAccounts(path).find((r) => r.id === accountId)
      return row ? secretsOf(row) : null
    }
  }
}
