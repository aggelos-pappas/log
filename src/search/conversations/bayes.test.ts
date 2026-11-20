import { describe, expect, test } from 'bun:test'
import { bayesFusion, combine, IGNORANCE, massOf, pignistic } from './helpers/index'

describe('bayesFusion (BayesRAG, arXiv 2601.07329, appendix A.1)', () => {
  test('a mass function splits a score into relevant, irrelevant and unsure', () => {
    const m = massOf(1)
    expect(m.yes).toBeCloseTo(0.7)
    expect(m.no).toBeCloseTo(0)
    expect(m.unsure).toBeCloseTo(0.3)
    expect(massOf(0).no).toBeCloseTo(0.6)
  })

  test('combining with ignorance changes nothing', () => {
    const m = massOf(0.8)
    const { belief, conflict } = combine(IGNORANCE, m)
    expect(conflict).toBe(0)
    expect(belief.yes).toBeCloseTo(m.yes)
    expect(belief.unsure).toBeCloseTo(m.unsure)
  })

  test('two retrievers that agree beat one alone', () => {
    const both = bayesFusion([[{ id: 'a', score: 9 }, { id: 'x', score: 1 }], [{ id: 'a', score: 0.9 }, { id: 'y', score: 0.1 }]])
    const one = bayesFusion([[{ id: 'a', score: 9 }, { id: 'x', score: 1 }]])
    expect(both[0].id).toBe('a')
    expect(both[0].likelihood).toBeGreaterThan(one[0].likelihood)
  })

  test('two retrievers that disagree are penalized, and the conflict is reported', () => {
    const fused = bayesFusion([
      [{ id: 'agree', score: 8 }, { id: 'clash', score: 10 }, { id: 'low', score: 0 }],
      [{ id: 'agree', score: 0.8 }, { id: 'clash', score: 0 }, { id: 'low', score: 1 }],
    ])
    const agree = fused.find((f) => f.id === 'agree')!
    const clash = fused.find((f) => f.id === 'clash')!
    expect(agree.score).toBeGreaterThan(clash.score)
    expect(clash.conflict).toBeGreaterThan(0.3)
  })

  test('the prior multiplies the likelihood, and an unconnected hit can drop below a connected one', () => {
    const lists = [[{ id: 'loud', score: 10 }, { id: 'linked', score: 7 }, { id: 'z', score: 0 }]]
    const plain = bayesFusion(lists)
    const withPrior = bayesFusion(lists, { prior: (id) => (id === 'linked' ? 0.95 : 0.1) })
    expect(plain[0].id).toBe('loud')
    expect(withPrior[0].id).toBe('linked')
    expect(withPrior[0].score).toBeCloseTo(withPrior[0].likelihood * 0.95)
  })

  test('the pignistic score splits what is unsure in half', () => {
    expect(pignistic({ yes: 0.5, no: 0.1, unsure: 0.4 })).toBeCloseTo(0.7)
  })

  test('ranks are kept per list and ties break by id', () => {
    const fused = bayesFusion([[{ id: 'b', score: 1 }, { id: 'a', score: 1 }]])
    expect(fused.map((f) => f.id)).toEqual(['a', 'b'])
    expect(fused[0].ranks).toEqual([2])
  })

  test('a third retriever that corroborates one hit lifts it over a hit only one retriever found', () => {
    const keyword = [{ id: 'otherChat', score: 7 }, { id: 'theirChat', score: 6 }, { id: 'z', score: 0 }]
    const relation = [{ id: 'theirChat', score: 1 }]
    const two = bayesFusion([keyword])
    const three = bayesFusion([keyword, relation])
    expect(two[0].id).toBe('otherChat')
    expect(three[0].id).toBe('theirChat')
    expect(three[0].ranks).toEqual([2, 1])
  })

  test('a retriever with nothing to say leaves the ranking alone', () => {
    const keyword = [{ id: 'a', score: 3 }, { id: 'b', score: 1 }]
    expect(bayesFusion([keyword, []]).map((f) => [f.id, f.likelihood])).toEqual(bayesFusion([keyword]).map((f) => [f.id, f.likelihood]))
  })

  test('a chat that only the relationship retriever found ranks below one the text retrievers found there too', () => {
    const keyword = [{ id: 'theirTopic', score: 5 }, { id: 'elsewhere', score: 3 }]
    const meaning = [{ id: 'theirTopic', score: 0.6 }, { id: 'elsewhere', score: 0.5 }]
    const relation = [{ id: 'theirTopic', score: 1 }, { id: 'theirNoise', score: 1 }]
    const fused = bayesFusion([keyword, meaning, relation], { trust: [undefined, undefined, 0.5], missed: ['weakNo', 'weakNo', 'ignorance'], probability: [false, false, true] })
    expect(fused.map((f) => f.id)).toEqual(['theirTopic', 'theirNoise', 'elsewhere'])
    expect(fused[1].likelihood).toBeLessThan(0.6)
  })

  test('relationship scores are probabilities already, so a weaker room is still evidence for, never against', () => {
    const relation = [{ id: 'strong', score: 0.99 }, { id: 'weaker', score: 0.95 }]
    const stretched = bayesFusion([relation])
    const kept = bayesFusion([relation], { probability: [true] })
    expect(stretched.find((f) => f.id === 'weaker')!.likelihood).toBeLessThan(0.5)
    expect(kept.find((f) => f.id === 'weaker')!.likelihood).toBeGreaterThan(0.8)
  })
})
