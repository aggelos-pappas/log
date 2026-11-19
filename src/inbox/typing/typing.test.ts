import { describe, expect, test } from 'bun:test'
import { clearTyping, recordTyping, typingNow, waitOutTyping } from './index'

const chat = { platform: 'discord', account: 'typingAccount', conversationId: 'c1' }
const other = { ...chat, conversationId: 'c2' }

describe('typing is kept per chat for as long as it lasts', () => {
  test('a typing event shows for ten seconds, and their message clears it', () => {
    const at = new Date('2026-11-20T00:00:00Z')
    recordTyping(chat, 'ada', at)
    expect(typingNow(chat, new Date(at.getTime() + 5_000))).toEqual(['ada'])
    expect(typingNow(chat, new Date(at.getTime() + 11_000))).toEqual([])
    recordTyping(chat, 'ada', at)
    clearTyping(chat, 'ada')
    expect(typingNow(chat, new Date(at.getTime() + 1_000))).toEqual([])
  })

  test('someone typing in another chat is not typing in this one', () => {
    const at = new Date('2026-11-20T01:00:00Z')
    recordTyping(other, 'linus', at)
    expect(typingNow(chat, new Date(at.getTime() + 1_000))).toEqual([])
    expect(typingNow(other, new Date(at.getTime() + 1_000))).toEqual(['linus'])
  })
})

describe('a send waits out their typing', () => {
  const run = (typingFor: number, wroteAt: number | null, hold = 20_000) => {
    let clock = 0
    return waitOutTyping({ typing: () => (clock < typingFor ? ['ada'] : []), wrote: () => wroteAt !== null && clock >= wroteAt, wait: async (ms) => void (clock += ms) }, hold)
  }

  test('nobody typing goes straight on', async () => {
    expect(await run(0, null)).toBe('clear')
  })

  test('typing that stops without a message lets the line go', async () => {
    expect(await run(3_000, null)).toBe('clear')
  })

  test('typing that turns into a message holds the rest', async () => {
    expect(await run(4_000, 3_000)).toBe('wrote')
  })

  test('still typing at the limit holds the rest', async () => {
    expect(await run(60_000, null)).toBe('stillTyping')
  })
})
