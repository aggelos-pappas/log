import { describe, expect, test } from 'bun:test'
import type { LastWord } from '../lastWord/index.ts'
import { waitingFrom } from './index.ts'

const word = (over: Partial<LastWord>): LastWord => ({ platform: 'twitter', account: 'xAccount', kind: 'dm', personKey: '1-2', conversationIds: ['1-2'], with: '@fakeBird', lastAt: '2026-11-16T10:00:00Z', lastFromMe: false, lastText: 'are you around', theyReacted: null, youReactedOnly: false, waiting: true, followUp: false, ...over })

describe('who is waiting on the owner, across platforms', () => {
  test('every row names the person and the platform and account it is on', () => {
    const report = waitingFrom([word({}), word({ platform: 'discord', account: 'discordAccount', with: 'fakeFinch', lastText: 'pick up' }), word({ with: '@quiet', waiting: false, followUp: true, theyReacted: 'fire', lastText: '' })], { now: new Date('2026-11-17T00:00:00Z') })
    expect(report.waiting.map((r) => [r.who, r.platform, r.account])).toEqual([['@fakeBird', 'twitter', 'xAccount'], ['fakeFinch', 'discord', 'discordAccount']])
    expect(report.followUps[0].said).toBe('(reacted fire)')
    expect(report.byPlatform).toEqual([{ platform: 'discord', waiting: 1, followUps: 0 }, { platform: 'twitter', waiting: 1, followUps: 1 }])
  })

  test('older than the window, another platform, or the owner spoke last is left out', () => {
    const report = waitingFrom([word({ lastAt: '2026-10-01T00:00:00Z' }), word({ platform: 'slack' }), word({ waiting: false, lastFromMe: true })], { platform: 'twitter', now: new Date('2026-11-17T00:00:00Z') })
    expect(report.waiting).toEqual([])
  })

  test('a chat on an account that is no longer set up is left out', () => {
    const report = waitingFrom([word({}), word({ account: 'removedAccount', with: '@ghost' })], { accounts: ['xAccount'], now: new Date('2026-11-17T00:00:00Z') })
    expect(report.waiting.map((r) => r.who)).toEqual(['@fakeBird'])
  })
})
