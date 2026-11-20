import { describe, expect, test } from 'bun:test'
import { AdsPowerError } from '../adsPower/types'
import type { AdsPowerClient } from '../adsPower/types'
import { driverNameOf } from '../driver/client'
import { memoryMoveLedger, moveAccounts, moveOne, planMoves, releaseMoved } from './index'
import type { MoveCheck, MoveDeps } from './index'

type Row = Record<string, unknown> & { id: string }

const REDDIT_COOKIES = [{ name: 'reddit_session', value: 'old', domain: '.reddit.com', path: '/' }]
const DISCORD_ORIGINS = [{ origin: 'https://discord.com', localStorage: [{ name: 'token', value: '"t0"' }] }]

function world(rows: Row[]) {
  const writes: { id: string; data: Record<string, unknown> }[] = []
  const twenty = {
    rows,
    writes,
    async list() {
      return rows.map((r) => ({ ...r }))
    },
    async get(_o: string, id: string) {
      return rows.find((r) => r.id === id) ?? null
    },
    async create() {
      throw new Error('no create')
    },
    async update(_o: string, id: string, data: Record<string, unknown>) {
      writes.push({ id, data })
      const row = rows.find((r) => r.id === id)!
      Object.assign(row, data)
      return row
    },
    async loginSecrets() {
      return null
    }
  }
  return twenty
}

function fakeAdsPower(options: { up?: boolean; keyMismatch?: boolean; startFails?: boolean } = {}) {
  const calls: string[] = []
  const client: AdsPowerClient = {
    status: async () => options.up !== false,
    listProfiles: async () => {
      if (options.keyMismatch) throw new AdsPowerError('adsPowerKeyMismatch', '/api/v2/browser-profile/list: API Key mismatch')
      return []
    },
    ensureGroup: async () => 'g',
    createProfile: async () => ({ profileId: 'x', profileNo: null }),
    updateProfile: async () => {},
    deleteProfiles: async (ids) => void calls.push(`delete ${ids.join(',')}`),
    startBrowser: async (id, o) => {
      calls.push(`start ${id}${o?.headless ? ' headless' : ''}`)
      if (options.startFails) throw new AdsPowerError('adsPowerRequestFailed', 'kernel missing')
      return { profileId: id, cdpUrl: `ws://cdp/${id}`, debugPort: null }
    },
    activeBrowser: async () => null,
    stopBrowser: async (id) => void calls.push(`stop ${id}`),
    kernels: async () => [],
    downloadKernel: async () => ({ status: 'completed', progress: 100 }),
    profileUserAgents: async () => ({})
  }
  return { client, calls }
}

const reddit = (over: Partial<Row> = {}): Row => ({ id: 'r1', accountName: 'grace_ships', platform: 'REDDIT', cookies: REDDIT_COOKIES, storageOrigins: [], adsPowerProfileId: 'k1', browserDriver: '', ...over })
const discord = (over: Partial<Row> = {}): Row => ({ id: 'd1', accountName: 'linus_k', platform: 'DISCORD', cookies: [], storageOrigins: DISCORD_ORIGINS, adsPowerProfileId: null, browserDriver: 'adsPower', ...over })

function depsOf(rows: Row[], ads = fakeAdsPower(), verdict: (name: string) => MoveCheck = () => ({ verdict: 'signedIn', code: null, detail: null })) {
  const twenty = world(rows)
  const checked: string[] = []
  const ledger = memoryMoveLedger()
  const deps: MoveDeps = {
    twenty: twenty as never,
    adsPower: ads.client,
    readState: async (cdpUrl) => ({ cookies: [{ name: 'reddit_session', value: `fresh ${cdpUrl}`, domain: '.reddit.com', path: '/' }, { name: 'other', value: 'x', domain: '.example.com', path: '/' }], origins: [] }),
    check: async (account) => (checked.push(account.accountName), verdict(account.accountName)),
    ledger,
    env: {},
    now: () => new Date('2026-11-20T10:00:00Z')
  }
  return { deps, twenty, checked, ledger, ads }
}

describe('browser move', () => {
  test('driverNameOf no longer infers AdsPower from a linked profile', () => {
    expect(driverNameOf({ browserDriver: null, adsPowerProfileId: 'k1' }, {})).toBe('camoufox')
    expect(driverNameOf({ browserDriver: 'adsPower', adsPowerProfileId: 'k1' }, {})).toBe('adsPower')
  })

  test('a dry run lists each account and makes no writes', async () => {
    const { deps, twenty, ads, checked } = depsOf([reddit(), discord(), { id: 'f1', accountName: 'grace_fb', platform: 'FACEBOOK', adsPowerProfileId: 'k2', browserDriver: '' }])
    const plan = await planMoves(deps, { all: true, to: 'camoufox' })
    expect(plan.entries.map((e) => [e.accountName, e.action, e.carries])).toEqual([
      ['grace_ships', 'move', 'adsPowerProfile'],
      ['linus_k', 'move', 'storedSession'],
      ['grace_fb', 'skip', null]
    ])
    expect(twenty.writes).toEqual([])
    expect(ads.calls).toEqual([])
    expect(checked).toEqual([])
  })

  test('moved: the profile is read headless, stopped, the session saved and the platform says signed in', async () => {
    const { deps, twenty, ads, ledger } = depsOf([reddit()])
    const plan = await planMoves(deps, { account: 'grace_ships', to: 'camoufox' })
    const [result] = await moveAccounts(deps, plan)
    expect(result.outcome).toBe('moved')
    expect(ads.calls).toEqual(['start k1 headless', 'stop k1'])
    expect(twenty.rows[0].browserDriver).toBe('camoufox')
    expect(twenty.rows[0].adsPowerProfileId).toBeNull()
    expect((twenty.rows[0].cookies as { name: string }[]).map((c) => c.name)).toEqual(['reddit_session'])
    expect(ledger.get('r1')).toMatchObject({ state: 'moved', formerAdsPowerProfileId: 'k1', to: 'camoufox' })
    expect(result.detail).toContain('fingerprint')
  })

  test('AdsPower down or refusing the key: the saved session carries, and it says so', async () => {
    for (const ads of [fakeAdsPower({ up: false }), fakeAdsPower({ keyMismatch: true })]) {
      const { deps, twenty } = depsOf([reddit()], ads)
      const plan = await planMoves(deps, { all: true, to: 'camoufox' })
      expect(plan.reach.code).toMatch(/adsPowerUnavailable|adsPowerKeyMismatch/)
      expect(plan.entries[0]).toMatchObject({ action: 'move', carries: 'storedSession' })
      const [result] = await moveAccounts(deps, plan)
      expect(result).toMatchObject({ outcome: 'moved', carried: 'storedSession' })
      expect(ads.calls).toEqual([])
      expect(twenty.rows[0].cookies).toEqual(REDDIT_COOKIES)
    }
  })

  test('AdsPower down and no saved session: skipped, nothing written', async () => {
    const { deps, twenty } = depsOf([reddit({ cookies: [] })], fakeAdsPower({ up: false }))
    const plan = await planMoves(deps, { all: true, to: 'camoufox' })
    expect(plan.entries[0].action).toBe('skip')
    expect((await moveAccounts(deps, plan))[0].outcome).toBe('skipped')
    expect(twenty.writes).toEqual([])
  })

  test('a profile that will not start fails with its code and changes nothing', async () => {
    const { deps, twenty, ads } = depsOf([reddit()], fakeAdsPower({ startFails: true }))
    const plan = await planMoves(deps, { all: true, to: 'brave' })
    const result = await moveOne(deps, plan.entries[0])
    expect(result).toMatchObject({ outcome: 'failed', code: 'adsPowerProfileWontStart' })
    expect(ads.calls).toEqual(['start k1 headless', 'start k1'])
    expect(twenty.writes).toEqual([])
  })

  test('not signed in after the move: everything is put back', async () => {
    const { deps, twenty, ledger } = depsOf([reddit()], fakeAdsPower(), () => ({ verdict: 'signInNeeded', code: 'loggedOut', detail: null }))
    const plan = await planMoves(deps, { all: true, to: 'camoufox' })
    const [result] = await moveAccounts(deps, plan)
    expect(result).toMatchObject({ outcome: 'rolledBack', code: 'browserMoveNotSignedIn' })
    expect(twenty.rows[0]).toMatchObject({ browserDriver: null, adsPowerProfileId: 'k1', cookies: REDDIT_COOKIES })
    expect(ledger.get('r1')?.state).toBe('rolledBack')
  })

  test('--all moves one account after another in platform order, skips last', async () => {
    const rows = [discord({ id: 'd2', accountName: 'b_disc' }), reddit({ id: 'r2', accountName: 'z_red' }), reddit(), { id: 'x1', accountName: 'grace_x', platform: 'TWITTER', adsPowerProfileId: 'k3', browserDriver: '' }]
    const { deps, checked } = depsOf(rows)
    const plan = await planMoves(deps, { all: true, to: 'camoufox' })
    expect(plan.entries.map((e) => e.accountName)).toEqual(['grace_ships', 'z_red', 'b_disc', 'grace_x'])
    await moveAccounts(deps, plan)
    expect(checked).toEqual(['grace_ships', 'z_red', 'b_disc'])
  })

  test('only --release deletes a former profile, and only moved ones', async () => {
    const { deps, ads } = depsOf([reddit()])
    await moveAccounts(deps, await planMoves(deps, { all: true, to: 'camoufox' }))
    expect(ads.calls.some((c) => c.startsWith('delete'))).toBe(false)
    const plan = await planMoves(deps, { all: true, to: 'camoufox' })
    expect(plan.releasable.map((e) => e.formerAdsPowerProfileId)).toEqual(['k1'])
    const released = await releaseMoved(deps, plan.releasable)
    expect(released).toEqual([{ accountName: 'grace_ships', profileId: 'k1', released: true, detail: 'deleted in AdsPower' }])
    expect(ads.calls).toContain('delete k1')
  })
})
