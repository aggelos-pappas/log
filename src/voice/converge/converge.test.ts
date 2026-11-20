import { describe, expect, test } from 'bun:test'
import { compareLines, convergenceOf, hisFacts, mirrorShare, styleOf } from './index'

const baseline = ['bro thats mad', 'yeah lets go', 'haha fair', 'bro 1500 is massive', 'nah not yet']

describe('how the other person talks is not how he talks: drafts that mirror them more than he does lose', () => {
  test('a draft that copies their words and their style scores lower than one in his own shape', () => {
    const theirLast = ['Honestly, the onboarding flow felt really clunky today.', 'Would you consider simplifying the onboarding flow?']
    const hisHere = [{ said: 'Shipped the dashboard today, thoughts?', reply: 'bro thats clean' }, { said: 'Any feedback on pricing?', reply: 'nah its fair' }]
    const mirror = convergenceOf({ draft: 'Honestly, I would consider simplifying the onboarding flow, it felt clunky.', theirLast, hisHere, hisBaseline: baseline })
    const his = convergenceOf({ draft: 'bro yeah its a lot of steps', theirLast, hisHere, hisBaseline: baseline })
    expect(mirror.draftMirror).toBeGreaterThan(0.5)
    expect(mirror.hisMirror).toBe(0)
    expect(mirror.gap).toBeGreaterThan(0.4)
    expect(mirror.signal!).toBeLessThan(0.2)
    expect(his.signal!).toBeGreaterThan(mirror.signal!)
  })

  test('nothing of theirs to answer means no convergence signal', () => {
    expect(convergenceOf({ draft: 'yo', theirLast: [], hisHere: [], hisBaseline: baseline }).signal).toBeNull()
  })

  test('mirroring counts only words of four letters or more and leaves links out', () => {
    expect(mirrorShare('the pricing page https://example.com/pricing', 'pricing is high')).toBeCloseTo(0.5, 6)
  })

  test('the pack compares how he talks to this person with how he talks everywhere, and labels theirs not to copy', () => {
    const lines = compareLines({ his: styleOf(baseline)!, hisHere: styleOf(['Yeah, sounds good.', 'Sure, will do.'])!, theirs: styleOf(['Hey! 😊 How are you?'])! })
    expect(lines[0]).toContain('how he writes everywhere: median 3 words')
    expect(lines[1]).toContain('how he talks to this person')
    expect(lines[1]).toContain('commas more')
    expect(lines[2]).toMatch(/^how they talk, NOT to copy: .*emoji 100%/)
  })

  test('his facts are his own first-person lines and numbers, once each', () => {
    expect(hisFacts(['we run it out of our crm', 'bro thats mad', 'got 430000 views in 2 months', 'we run it out of our crm'])).toEqual(['we run it out of our crm', 'got 430000 views in 2 months'])
  })
})
