import { describe, expect, test } from 'bun:test'
import { aiPhrasesNear, featuresLine, packOf, renderPack, topWordPairs } from './index'
import { PACK_ASK, STOCK_NOT_HIM } from './types'
import type { VoiceProfile } from '../pairs/types'

const profile: VoiceProfile = { key: 'chat:discord:D1', replies: 40, medianWords: 6, lowercase: 0.95, commas: 0.01, fullStops: 0.02, questions: 0.3, exclamations: 0.05, emoji: 0, openers: ['bro', 'yeah'], words: ['bro', 'mad'], burst: { median: 2, oneShare: 0.4, gapSeconds: 8, messageWords: 5 } }

const near = [
  { said: 'shipped the new build', reply: 'bro thats mad', chat: 'grace_ships', tier: 'sameChat', at: '2026-11-19T10:00:00Z', saidBy: 'grace_ships' },
  { said: 'got 1500 users', reply: 'bro 1500 is massive', chat: 'linus_k', tier: 'anywhere', at: '2026-11-18T10:00:00Z', saidBy: 'linus_k' },
  { said: 'what do you think', reply: 'yeah lets go', chat: 'grace_ships', tier: 'samePerson', at: '2026-11-17T10:00:00Z', saidBy: 'grace_ships' },
  { said: 'unanswered', reply: '', chat: 'linus_k', tier: 'samePlatform', at: null },
]

describe('the grounding pack a writer reads before drafting', () => {
  test('his real replies come as they wrote -> he answered, this chat first and then his other chats', () => {
    const pack = packOf({ chat: 'grace_ships (discord dm)', near, chatReplies: ['bro thats mad', 'bro thats mad fr'], profile, aiPhrases: ['delve into the details', 'happy to help'], theirLines: ['shipped the new build'] })
    expect(pack.thisChat.map((p) => p.reply)).toEqual(['bro thats mad', 'yeah lets go'])
    expect(pack.allChats.map((p) => p.reply)).toEqual(['bro 1500 is massive'])
    expect(pack.ask).toBe(PACK_ASK)
    const text = renderPack(pack)
    expect(text).toContain('grace_ships wrote: shipped the new build')
    expect(text).toContain('he answered: bro thats mad')
    expect(text.indexOf('bro thats mad')).toBeLessThan(text.indexOf('bro 1500 is massive'))
  })

  test('his features fit on one line: length, burst, case, what he uses and never uses, his word pairs, his openers', () => {
    const line = featuresLine(profile, ['bro thats mad', 'bro thats mad fr', 'yeah bro'])
    expect(line).toContain('median 6 words a message')
    expect(line).toContain('2 message(s) a burst')
    expect(line).toContain('uses questions 30%')
    expect(line).toContain('never commas, full stops, emoji')
    expect(line).toContain('his word pairs here: bro thats, thats mad')
    expect(line).toContain('opens with bro, yeah')
    expect(line.includes('\n')).toBe(false)
  })

  test('two or three contrastive lines are labelled not him: AI phrases near this reply and how they write', () => {
    const pack = packOf({ chat: 'c', near, chatReplies: [], profile, aiPhrases: ['delve into the details', 'happy to help', 'a third'], theirLines: ['older line', 'shipped the new build'] })
    expect(pack.notHim).toEqual([
      { text: 'delve into the details', why: 'an AI phrase close to this kind of reply' },
      { text: 'happy to help', why: 'an AI phrase close to this kind of reply' },
      { text: 'shipped the new build', why: 'how they write, not him' },
    ])
    const stock = packOf({ chat: 'c', near: [], chatReplies: [], profile: null, aiPhrases: [], theirLines: [] })
    expect(stock.notHim.map((n) => n.text)).toEqual(STOCK_NOT_HIM.slice(0, 2))
    expect(stock.features).toContain('no messages of his here yet')
  })

  test('AI phrases are picked by meaning when a vector is there and by shared words when it is not', () => {
    const phrases = [{ text: 'excited to dive into your build', source: 's' }, { text: 'happy to help with anything', source: 's' }, { text: 'a very long phrase that has far too many words in it to be a chat line', source: 's' }]
    expect(aiPhrasesNear(phrases, [[1, 0], [0, 1], [1, 0]], { text: 'x', vector: [0, 1] }, 1)).toEqual(['happy to help with anything'])
    expect(aiPhrasesNear(phrases, null, { text: 'shipped the build today' }, 2)).toEqual(['excited to dive into your build'])
  })

  test('his top word pairs here count each reply once and need two uses', () => {
    expect(topWordPairs(['bro bro bro', 'yeah bro'])).toEqual([])
    expect(topWordPairs(['bro thats mad', 'bro thats it'])).toEqual(['bro thats'])
  })
})
