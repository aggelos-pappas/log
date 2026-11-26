import { describe, expect, test } from 'bun:test'
import { COMPACT_TOOLS, isWatchSession, slowestTools } from './index'

describe('log timing answers short by default', () => {
  test('it keeps the slowest tools by p99 in their own order, and --all keeps every one', () => {
    const stats = Array.from({ length: 30 }, (_, i) => ({ tool: `tool${i}`, p99: (i * 7) % 30 }))
    const shown = slowestTools(stats, COMPACT_TOOLS)
    expect(shown).toHaveLength(COMPACT_TOOLS)
    expect(Math.min(...shown.map((t) => t.p99))).toBe(30 - COMPACT_TOOLS)
    expect(shown.map((t) => t.tool)).toEqual(stats.filter((t) => shown.includes(t)).map((t) => t.tool))
  })

  test('a watcher is one long connection, so its length is listed apart from the calls that wait', () => {
    expect(['cli instagram watch', 'cli discord watch', 'cli twitter chat watch'].every(isWatchSession)).toBe(true)
    expect(['discordRead', 'cli watchers status', 'watchersStart', 'twitterDmLive'].some(isWatchSession)).toBe(false)
  })
})
