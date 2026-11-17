import { describe, expect, test } from 'bun:test'
import { batchOf, pushLoop } from './index'

const quiet = { messages: [], alerts: [], text: null }

describe('the inbox push stream', () => {
  test('a reader with nothing new gives no batch, and a new message gives the same block the prompt hook shows', () => {
    expect(batchOf('session1', 'hermes', () => quiet)).toBeNull()
    const read = () => ({ messages: [{ with: 'Kennedy' }], alerts: [], text: '>>> NEW DISCORD MESSAGE (1): Kennedy wrote' })
    expect(batchOf('session1', 'hermes', read)).toEqual({ reader: 'session1', host: 'hermes', count: 1, context: '>>> NEW DISCORD MESSAGE (1): Kennedy wrote' })
  })

  test('the loop emits once per batch the watchers bring in and nothing on quiet rounds', async () => {
    const reads = [quiet, { messages: [{}], alerts: [], text: 'one' }, quiet, { messages: [{}, {}], alerts: [], text: 'two' }]
    let i = 0
    const seen: string[] = []
    const waits: number[] = []
    const sent = await pushLoop('session1', 'opencode', (b) => seen.push(`${b.count}:${b.context}`), {
      read: () => reads[i++] ?? quiet,
      wait: async (_root, ms) => {
        waits.push(ms)
      },
      rounds: 4,
      fallbackMs: 5,
    })
    expect(sent).toBe(2)
    expect(seen).toEqual(['1:one', '2:two'])
    expect(waits).toEqual([5, 5, 5, 5])
  })

  test('an alert alone, such as a refused second watcher, is pushed too', () => {
    const read = () => ({ messages: [], alerts: ['!!! REFUSED discord a'], text: '>>> ONE PROCESS PER ACCOUNT' })
    expect(batchOf('r', 'claudeCode', read)?.count).toBe(0)
  })
})
