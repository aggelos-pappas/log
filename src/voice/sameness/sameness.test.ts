import { describe, expect, test } from 'bun:test'
import { batchSameness, samenessOf } from './client'

const LINK = 'https://x.com/xAccount/status/2118876082409725989'

describe('samenessOf', () => {
  test('the share-asks sent on 2026-11-07 with only the opener changed are refused', () => {
    const sent = [{ to: 'handle_m1', text: `cheers lad\njust put a new one out ${LINK}\ncould you share it its open sourced haha` }]
    const reading = samenessOf(`no worries lad\njust put a new one out ${LINK}\ncould you share it its open sourced haha`, sent)
    expect(reading.pass).toBe(false)
    expect(reading.closestTo).toBe('handle_m1')
    expect(reading.score).toBeGreaterThan(0.7)
  })

  test('the same follower line to two people is refused outright', () => {
    const line = `yo cheers for the follow lad could you do me a favour and share this its open sourced haha ${LINK}`
    expect(samenessOf(line, [{ to: 'handle_b2', text: line }]).score).toBe(1)
  })

  test('two messages each written from their own thread pass', () => {
    const sent = [{ to: 'handle_s1', text: 'cheers lad 17k is mad\nhow many of them came through the cli' }]
    expect(samenessOf('ghostwriting for founders is a good lane\nare you doing x and linkedin or just one', sent).pass).toBe(true)
  })

  test('a link alone is not counted as sameness', () => {
    expect(samenessOf(`look ${LINK}`, [{ to: 'a', text: `here ${LINK}` }]).pass).toBe(true)
  })

  test('short replies are left alone', () => {
    expect(samenessOf('haha yeah', [{ to: 'a', text: 'haha yeah' }]).pass).toBe(true)
  })
})

describe('batchSameness', () => {
  test('names every item that repeats an earlier one in the same queue', () => {
    const items = [
      { n: 1, to: 'a', text: `cheers lad\njust put this out ${LINK}\ncould you share it its open sourced haha` },
      { n: 2, to: 'b', text: 'sick you got the demo recorded\nwhat did you use for the council bit' },
      { n: 3, to: 'c', text: `nice one lad\njust put this out ${LINK}\ncould you share it its open sourced haha` },
    ]
    expect(batchSameness(items).map((f) => f.n)).toEqual([3])
  })
})

describe('one opener over and over', () => {
  test('a third message opening the same way is refused, whatever follows', () => {
    const sent = [{ to: 'a', text: 'https://x.com/a/status/1\nsaw this a crm in sheets is mad' }, { to: 'b', text: 'https://x.com/b/status/2\nsaw this da nang looks class' }]
    const reading = samenessOf('https://x.com/c/status/3\nsaw this animal crossing over gta6 is bold', sent)
    expect(reading.pass).toBe(false)
    expect(reading.shared[0]).toContain('saw this')
  })

  test('openers that differ pass, and a batch flags the repeats', () => {
    expect(samenessOf('mad that a crm fits in sheets', [{ to: 'a', text: 'saw this one' }, { to: 'b', text: 'saw this two' }]).pass).toBe(true)
    const items = ['saw this one thing here', 'saw this two thing there', 'saw this three thing again', 'that coffee looks class'].map((text, i) => ({ n: i + 1, to: `p${i}`, text }))
    expect(batchSameness(items).map((f) => f.n)).toEqual([3])
  })
})
