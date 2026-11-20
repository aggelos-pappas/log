import { describe, expect, test } from 'bun:test'
import type { LastWordMessage } from '../lastWord/index'
import { autoLabel, labelOfChat, turnsOf } from './client'
import type { LabelEntry } from './types'

const NOW = Date.parse('2026-11-18T12:00:00Z')
const DAY = 86_400_000

const said = (lines: [boolean, string, number][]): LastWordMessage[] => lines.map(([fromOwner, text, daysAgo], i) => ({ conversationId: 'grace_ships', seq: i, ms: NOW - daysAgo * DAY + i, at: new Date(NOW - daysAgo * DAY + i).toISOString(), fromOwner, senderUserId: fromOwner ? 'owner' : 'grace', senderLabel: fromOwner ? null : 'grace_ships', text, files: 0 }))

const chatting = (turns: number, daysAgo = 1): [boolean, string, number][] => Array.from({ length: turns + 1 }, (_, i) => [i % 2 === 1, i % 2 ? 'haha fair' : 'whats good', daysAgo])

describe('labelling the people in the dms (worked out from log.db)', () => {
  test('someone who never wrote back is skip, and a chat quiet for three weeks is cold', () => {
    expect(autoLabel(said([[true, 'yo', 1]]), NOW).label).toBe('skip')
    expect(autoLabel(said(chatting(8, 30)), NOW).label).toBe('cold')
  })

  test('a few back and forths is warming, enough of them while they still write is readyToAsk', () => {
    expect(autoLabel(said(chatting(3)), NOW).label).toBe('warming')
    expect(turnsOf(said(chatting(7)))).toBe(7)
    expect(autoLabel(said(chatting(7)), NOW).label).toBe('readyToAsk')
  })

  test('an ask with no answer since is askedWaiting, and once they answer it the chat is judged again', () => {
    const asked = said([...chatting(7), [true, 'would you be up to try it https://treg.to/?ref=xAccount', 0]])
    expect(autoLabel(asked, NOW).label).toBe('askedWaiting')
    const answered = said([...chatting(7), [true, 'would you be up to try it', 0], [false, 'yeah send it', 0]])
    expect(autoLabel(answered, NOW).label).toBe('readyToAsk')
  })

  test('a label the owner set wins over the worked out one, and a stored group is never auto labelled', () => {
    const chat = { platform: 'discord', account: 'discordAccount', storedAsGroup: false, with: 'grace_ships', personKey: 'grace', conversationIds: ['grace'], messages: said(chatting(7)) }
    const set: LabelEntry[] = [{ platform: 'discord', account: 'discordAccount', person: 'grace', label: 'friend', by: 'the owner', at: '2026-11-18T00:00:00Z' }]
    expect(labelOfChat(chat, [], NOW)?.label).toBe('readyToAsk')
    expect(labelOfChat(chat, set, NOW)).toMatchObject({ label: 'friend', set: true })
    expect(labelOfChat({ ...chat, storedAsGroup: true }, [], NOW)?.label).toBe('skip')
  })
})
