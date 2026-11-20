import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readTurns, turnEnded, turnLines, turnStarted, turnStats } from './index'

function scratch(): Database {
  const handle = new Database(':memory:')
  handle.exec(`CREATE TABLE state (scope TEXT NOT NULL, key TEXT NOT NULL, body TEXT NOT NULL, updatedAt INTEGER NOT NULL, PRIMARY KEY (scope, key))`)
  handle.exec(`CREATE TABLE spans (spanId TEXT PRIMARY KEY, traceId TEXT NOT NULL, callId TEXT NOT NULL, parentId TEXT, tool TEXT NOT NULL, name TEXT NOT NULL, source TEXT NOT NULL, pid INTEGER NOT NULL, startedAt REAL NOT NULL, ms REAL NOT NULL, ok INTEGER NOT NULL, attrs TEXT NOT NULL DEFAULT '{}')`)
  return handle
}

const span = (handle: Database, id: string, tool: string, startedAt: number, ms: number, source = 'bun', parentId: string | null = null) =>
  handle.prepare(`INSERT INTO spans VALUES (?, ?, ?, ?, ?, 'call', ?, 1, ?, ?, 1, '{}')`).run(id, id, id, parentId, tool, source, startedAt, ms)

describe('a whole agent turn is timed from the prompt hook to the Stop hook', () => {
  test('the turn splits into log tool time and agent time, counting only top-level tool calls inside it', () => {
    const handle = scratch()
    const t0 = 1_800_000_000_000
    turnStarted('session1', 'hermes', t0, handle)
    span(handle, 'a', 'discordChats', t0 + 5_000, 2_030)
    span(handle, 'b', 'discordRead', t0 + 30_000, 2_780)
    span(handle, 'c', 'discordRead', t0 + 30_100, 900, 'python', 'b')
    span(handle, 'd', 'hook:PostToolUse:hookEventProcess:hermes', t0 + 33_000, 120, 'hook')
    span(handle, 'e', 'inboxWaiting', t0 - 60_000, 800)
    const row = turnEnded('session1', 9, t0 + 95_000, handle)
    expect(row).toMatchObject({ host: 'hermes', ms: 95_000, tools: 2, toolMs: 4_810, agentMs: 90_190, hostTools: 9 })
    expect(turnEnded('session1', 9, t0 + 96_000, handle)).toBeNull()
    expect(readTurns(t0 - 1, handle)).toEqual([{ session: 'session1', host: 'hermes', startedAt: t0, ms: 95_000, tools: 2, toolMs: 4_810, agentMs: 90_190, hostTools: 9 }])
  })

  test('p50, p95 and p99 over the turns, with each turn listed', () => {
    const handle = scratch()
    const t0 = 1_800_000_000_000
    for (const [i, ms] of [10_000, 20_000, 180_000].entries()) {
      turnStarted(`s${i}`, 'claudeCode', t0 + i * 1_000_000, handle)
      turnEnded(`s${i}`, null, t0 + i * 1_000_000 + ms, handle)
    }
    const stats = turnStats(readTurns(t0 - 1, handle))
    expect({ n: stats.n, p50: stats.p50, p99: stats.p99 }).toEqual({ n: 3, p50: 20_000, p99: 180_000 })
    const text = turnLines(stats, 24).join('\n')
    expect(text).toContain('Turns in the last 24 h: 3')
    expect(text.split('\n')).toHaveLength(5)
  })

  test('a Stop with no started turn, or no session, records nothing', () => {
    const handle = scratch()
    expect(turnEnded('nobody', null, Date.now(), handle)).toBeNull()
    turnStarted('', 'hermes', Date.now(), handle)
    expect(readTurns(0, handle)).toEqual([])
  })
})
