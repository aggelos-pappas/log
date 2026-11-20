import { describe, expect, test } from 'bun:test'
import { compactChunk, snippetOf } from './index'

describe('search hits come back short unless --full', () => {
  test('a hit keeps the lines that hold the query words, cut to a width, and says how many more there are', () => {
    const text = ['grace_ships: morning', 'grace_ships: are you around for a call this week', 'the owner: maybe', 'the owner: thursday works for the call', 'grace_ships: sound', 'grace_ships: '.padEnd(400, 'x')].join('\n')
    const snippet = snippetOf(text, 'call this week')
    expect(snippet.split('\n')).toEqual(['grace_ships: morning', 'grace_ships: are you around for a call this week', 'the owner: thursday works for the call', '(3 more line(s) in this chunk: --full)'])
    expect(snippetOf('linus_k: '.padEnd(500, 'y'), 'nothing matches').length).toBeLessThanOrEqual(160)
  })

  test('the json form gives the message count and its ends instead of every message id', () => {
    const chunk = { id: 'c1', platform: 'discord', account: 'discordAccount', conversationId: '1000000000000000007', with: ['grace_ships'], at: null, messageIds: ['m1', 'm2', 'm3'], text: 'grace_ships: call?' }
    expect(compactChunk(chunk, 'call')).toEqual({ id: 'c1', platform: 'discord', account: 'discordAccount', conversationId: '1000000000000000007', with: ['grace_ships'], at: null, text: 'grace_ships: call?', messages: 3, firstMessageId: 'm1', lastMessageId: 'm3' })
  })
})
