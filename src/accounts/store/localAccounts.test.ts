import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAccountStore } from './client'
import { readLocalAccounts, upsertLocalAccount } from './helpers/index'
import { findAccount } from '../../platformKit/socialAccount/index'

function setup() {
  const path = join(mkdtempSync(join(tmpdir(), 'localAccounts')), 'localAccounts.json')
  upsertLocalAccount({ accountName: 'both', platform: 'DISCORD', adsPowerProfileId: 'k1' }, path)
  upsertLocalAccount({ accountName: 'onlyLocal', platform: 'DISCORD' }, path)
  return { path, store: createAccountStore({ LOG_LOCAL_ACCOUNTS: path }) }
}

describe('createAccountStore', () => {
  test('an account in the local file is found by its accountName', async () => {
    const { store } = setup()
    expect((await findAccount(store, 'onlyLocal')).id).toBe('local:discord:onlyLocal')
    expect((await findAccount(store, 'both')).adsPowerProfileId).toBe('k1')
  })

  test('a session saved to an account goes to the file', async () => {
    const { store, path } = setup()
    await store.update('socialAccounts', 'local:discord:onlyLocal', { sessionState: 'loggedIn' })
    expect(readLocalAccounts(path).find((r) => r.id === 'local:discord:onlyLocal')?.sessionState).toBe('loggedIn')
  })

  test('an update to an account the file does not have is refused as accountNotFound', async () => {
    const { store } = setup()
    await expect(store.update('socialAccounts', 'gone', { sessionState: 'loggedIn' })).rejects.toMatchObject({ code: 'accountNotFound' })
    expect(await store.get('socialAccounts', 'gone')).toBeNull()
  })

  test('a created account is written to the file under its local id', async () => {
    const { store, path } = setup()
    const row = await store.create('socialAccounts', { accountName: 'fresh', platform: 'REDDIT' })
    expect(row.id).toBe('local:reddit:fresh')
    expect(readLocalAccounts(path).map((r) => r.accountName).sort()).toEqual(['both', 'fresh', 'onlyLocal'])
  })

  test('login secrets come from the local row, and an account the file does not have has none', async () => {
    const { store } = setup()
    expect(await store.loginSecrets('local:discord:onlyLocal')).toEqual({ email: null, password: null, totpSecret: null, messengerPin: null })
    expect(await store.loginSecrets('gone')).toBeNull()
  })

  test('listings, conversations and groups were only ever in the account store, so every call on them is refused as twentyRemoved', async () => {
    const { store } = setup()
    await expect(store.list('agencyListings')).rejects.toMatchObject({ code: 'twentyRemoved' })
    await expect(store.get('agencyConversations', 'x')).rejects.toMatchObject({ code: 'twentyRemoved' })
    await expect(store.create('agencyGroups', { name: 'g' })).rejects.toMatchObject({ code: 'twentyRemoved' })
    await expect(store.update('agencyMessages', 'x', { body: 'b' })).rejects.toMatchObject({ code: 'twentyRemoved' })
  })
})
