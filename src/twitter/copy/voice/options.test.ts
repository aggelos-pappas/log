import { describe, expect, test } from 'bun:test'
import type { DecisionRequest } from '../../../subq/decisions/index'
import { readVoices } from './index'

describe('several options are graded in one SubQ request', () => {
  test('three options make one request, each judged on its own, and come back in order', async () => {
    const asked: DecisionRequest[] = []
    const decide = async (request: DecisionRequest) => {
      asked.push(request)
      const answers = Object.fromEntries(Object.keys(request.questions).map((key) => [key, { type: 'noul' as const, noul: key.endsWith('_2') ? 0.3 : 0.9 }]))
      return { model: 'subq-snap-1.1', answers, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    const readings = await readVoices({ to: 'grace_ships', text: '', context: 'shipped the new build' }, [{ text: 'bro thats mad' }, { text: 'Congratulations on this milestone!' }, { text: 'yo what changed in it', phrasesNewToOwner: ['changed in'] }], 'GUIDE', decide)
    expect(asked).toHaveLength(1)
    expect(Object.keys(asked[0].questions)).toContain('voice_3')
    expect(asked[0].questions.voice_2.instructions.startsWith('Judge option 2 only')).toBe(true)
    const state = asked[0].state as { dm?: string; options: { option: number; dm: string; wordPairsOwnerHasNeverWritten?: string[] }[] }
    expect(state.dm).toBeUndefined()
    expect(state.options.map((o) => o.dm)).toEqual(['bro thats mad', 'Congratulations on this milestone!', 'yo what changed in it'])
    expect(state.options[2].wordPairsOwnerHasNeverWritten).toEqual(['changed in'])
    expect(readings.map((r) => r.voice)).toEqual([0.9, 0.3, 0.9])
    expect(readings[1].pass).toBe(false)
  })

  test('one option is the same request as a single draft', async () => {
    const asked: DecisionRequest[] = []
    const decide = async (request: DecisionRequest) => {
      asked.push(request)
      return { model: 'm', answers: { voice: { type: 'noul' as const, noul: 0.9 } }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    await readVoices({ to: 'linus_k', text: '' }, [{ text: 'yeah lets go' }], 'GUIDE', decide)
    expect((asked[0].state as { dm: string }).dm).toBe('yeah lets go')
    expect(Object.keys(asked[0].questions)).toContain('voice')
  })
})
