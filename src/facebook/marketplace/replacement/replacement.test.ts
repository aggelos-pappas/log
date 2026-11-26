import { describe, expect, test } from 'bun:test'
import { FIXTURE_CAMPAIGN, marketplaceFixture } from '../../../accounts/store/index'
import { getListing } from '../agencyListing/index'
import { findAccount } from '../../../platformKit/socialAccount/index'
import { blockedListings, fillCampaign, healCampaign, recordAccountIssue, setStatusAndReplace, sweepBlockedListings } from './index'

const statusOf = (store: ReturnType<typeof marketplaceFixture>, object: string, id: string) => store.rows[object].find((r) => r.id === id)!

describe('losing an account', () => {
  test('banned: kept with its reason, live listings ACCOUNT_LOST, campaign ones replaced in the same country', async () => {
    const store = marketplaceFixture()
    const account = await findAccount(store, 'galwayOne')
    const report = await setStatusAndReplace(store, account, 'banned', 'accountDisabled', 'Your account has been disabled')

    expect(statusOf(store, 'socialAccounts', 'galwayOne')).toMatchObject({ accountStatus: 'BANNED', statusReason: 'accountDisabled' })
    expect(report.lost.map((l) => l.id).sort()).toEqual(['abroad', 'liveOne', 'readyOne'])
    expect(statusOf(store, 'agencyListings', 'soldOne').status).toBe('SOLD')
    expect(statusOf(store, 'agencyListings', 'abroad').status).toBe('ACCOUNT_LOST')

    expect(report.replacements).toHaveLength(2)
    const used = report.replacements.map((r) => r.account?.id)
    expect(new Set(used).size).toBe(2)
    for (const id of used) expect(['galwayThree', 'dublinOne']).toContain(id as string)
    expect(used[0]).toBe('galwayThree')
    for (const r of report.replacements) {
      expect(statusOf(store, 'agencyListings', r.old.id).status).toBe('REPLACED')
      expect(r.next).toMatchObject({ status: 'ready', generation: 1, replacesId: r.old.id, campaignId: FIXTURE_CAMPAIGN, locationCountry: 'IE' })
    }
    expect(store.rows.socialAccounts.some((r) => r.id === 'galwayOne')).toBe(true)
    expect(store.rows.agencyListings.filter((r) => ['readyOne', 'liveOne', 'abroad', 'soldOne'].includes(r.id))).toHaveLength(4)
  })

  test('never posts from another country: with no Irish account left it stays ACCOUNT_LOST and says why', async () => {
    const store = marketplaceFixture()
    for (const id of ['galwayThree', 'dublinOne']) await store.update('socialAccounts', id, { accountStatus: 'PAUSED' })
    const report = await setStatusAndReplace(store, await findAccount(store, 'galwayOne'), 'dead', 'setByHand')
    expect(report.replacements.every((r) => r.next === null)).toBe(true)
    expect(statusOf(store, 'agencyListings', 'liveOne')).toMatchObject({ status: 'ACCOUNT_LOST', lastErrorCode: 'noReplacementAccount' })
    expect(store.rows.agencyListings.some((r) => r.socialAccountId === 'vietnam' && r.replacesId)).toBe(false)
  })

  test('heal retries ACCOUNT_LOST listings once accounts are back', async () => {
    const store = marketplaceFixture()
    for (const id of ['galwayThree', 'dublinOne']) await store.update('socialAccounts', id, { accountStatus: 'PAUSED' })
    await setStatusAndReplace(store, await findAccount(store, 'galwayOne'), 'dead', 'setByHand')
    await store.update('socialAccounts', 'galwayThree', { accountStatus: 'ACTIVE' })
    const healed = await healCampaign(store, FIXTURE_CAMPAIGN)
    expect(healed.filter((r) => r.next).map((r) => r.account?.id)).toEqual(['galwayThree'])
    expect(healed.filter((r) => !r.next)).toHaveLength(1)
  })

  test('a status that is not a loss replaces nothing; terminal statuses are never overwritten', async () => {
    const store = marketplaceFixture()
    const report = await setStatusAndReplace(store, await findAccount(store, 'galwayOne'), 'limited', 'rateLimited')
    expect(report.lost).toEqual([])
    expect(statusOf(store, 'agencyListings', 'liveOne').status).toBe('ACTIVE')
    expect(await recordAccountIssue(store, await findAccount(store, 'banned'), 'checkpointed', null)).toBeNull()
    expect(statusOf(store, 'socialAccounts', 'banned').accountStatus).toBe('BANNED')
    expect(await recordAccountIssue(store, await findAccount(store, 'galwayTwo'), 'proxyCountryMismatch', null)).toBeNull()
  })
})

describe('filling a campaign', () => {
  test('one ad on N accounts in its country, one per account, same city first', async () => {
    const store = marketplaceFixture()
    const ad = (await getListing(store, 'adTemplate'))!
    const report = await fillCampaign(store, 'campaignNew', ad, 10)
    const accounts = report.created.map((c) => c.account.accountName)
    expect(accounts.sort()).toEqual(['dublinOne', 'galwayOne', 'galwayThree', 'galwayTwo'])
    expect(report.short).toBe(6)
    expect(report.created.at(-1)!.account.accountName).toBe('dublinOne')
    for (const c of report.created) expect(c.listing).toMatchObject({ status: 'ready', campaignId: 'campaignNew', generation: 0 })
  })

  test('an account already in the campaign is not given a second slot', async () => {
    const store = marketplaceFixture()
    const ad = (await getListing(store, 'adTemplate'))!
    const report = await fillCampaign(store, FIXTURE_CAMPAIGN, ad, 5)
    expect(report.created.map((c) => c.account.accountName).sort()).toEqual(['dublinOne', 'galwayThree'])
  })
})

describe("the daily cap counts the account's own day (rule 18)", () => {
  test('a listing posted late in the evening locally counts for that local day, not the UTC one', async () => {
    const { countPostedToday } = await import('./index')
    const listing = (id: string, publishedAt: string) => ({ socialAccountId: id, publishedAt }) as never
    const listings = [listing('sydney', '2026-10-18T12:30:00Z'), listing('sydney', '2026-10-18T13:30:00Z')]
    const now = new Date('2026-10-18T14:00:00Z')
    expect(countPostedToday(listings, now, new Map([['sydney', 'Australia/Sydney']])).get('sydney')).toBe(1)
    expect(countPostedToday(listings, now).get('sydney')).toBe(2)
  })
})

describe('a blocked account takes its listings with it', () => {
  test('a checkpoint is a loss: its listings go ACCOUNT_LOST', async () => {
    const store = marketplaceFixture()
    const report = await recordAccountIssue(store, await findAccount(store, 'galwayOne'), 'checkpointed', 'Facebook sent the page to /checkpoint/1501092823525282/')
    expect(report?.status).toBe('checkpoint')
    expect(statusOf(store, 'agencyListings', 'readyOne').status).not.toBe('READY')
    expect(statusOf(store, 'agencyListings', 'soldOne').status).toBe('SOLD')
  })

  test('a wrong password leaves the account needing a login, and its listings are dead', async () => {
    const store = marketplaceFixture()
    const report = await recordAccountIssue(store, await findAccount(store, 'galwayOne'), 'wrongPassword', 'The password you entered is incorrect.')
    expect(report?.status).toBe('needsLogin')
    expect(report?.lost.map((l) => l.id).sort()).toEqual(['abroad', 'liveOne', 'readyOne'])
  })

  test('the sweep finds listings left on accounts already blocked, and only those', async () => {
    const store = marketplaceFixture()
    await store.update('socialAccounts', 'galwayOne', { accountStatus: 'NEEDS_LOGIN', statusReason: 'wrongPassword' })
    const found = await blockedListings(store)
    expect(found.map((r) => r.listing.id).sort()).toEqual(['abroad', 'liveOne', 'readyOne'])
    const report = await sweepBlockedListings(store)
    expect(report.lost).toHaveLength(3)
    expect(statusOf(store, 'agencyListings', 'soldOne').status).toBe('SOLD')
    expect(await blockedListings(store)).toEqual([])
  })
})
