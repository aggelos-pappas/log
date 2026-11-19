import type { Database } from 'bun:sqlite'
import { randomBytes } from 'node:crypto'
import { openDatabase } from '../../storage/schema/client'
import { deleteState, getState, putState } from '../../storage/state/index'
import { msText, percentiles } from '../timing/helpers/report'
import { TURN_MAX_MS, TURN_TOOL_PREFIX } from './types'
import type { TurnRow, TurnStart, TurnStats } from './types'

function fieldOf(raw: string, name: string): unknown {
  try {
    return (JSON.parse(raw || '{}') as Record<string, unknown>)[name]
  } catch {
    return undefined
  }
}

export function turnStarted(session: string, host: string, at: number = Date.now(), handle: Database = openDatabase()): void {
  if (!session) return
  putState('turnStart', session, { at, host } satisfies TurnStart, at, handle)
}

export function turnEnded(session: string, hostTools: number | null, at: number = Date.now(), handle: Database = openDatabase()): TurnRow | null {
  if (!session) return null
  const start = getState<TurnStart>('turnStart', session, {}, handle)?.body
  if (!start) return null
  deleteState('turnStart', session, handle)
  const ms = at - start.at
  if (ms < 0 || ms > TURN_MAX_MS) return null
  const used = handle.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(ms), 0) AS ms FROM spans WHERE parentId IS NULL AND source <> 'hook' AND source <> 'turn' AND startedAt >= ? AND startedAt <= ?`).get(start.at, at) as { n: number; ms: number }
  const toolMs = Math.min(ms, used.ms)
  const row: TurnRow = { session, host: start.host, startedAt: start.at, ms, tools: used.n, toolMs, agentMs: ms - toolMs, hostTools }
  const id = randomBytes(8).toString('hex')
  handle
    .prepare(`INSERT OR IGNORE INTO spans (spanId, traceId, callId, parentId, tool, name, source, pid, startedAt, ms, ok, attrs) VALUES (?, ?, ?, NULL, ?, 'call', 'turn', ?, ?, ?, 1, ?)`)
    .run(id, id, id.slice(0, 12), `${TURN_TOOL_PREFIX}${start.host}`, process.pid, start.at, ms, JSON.stringify({ session, tools: row.tools, toolMs: row.toolMs, agentMs: row.agentMs, hostTools }))
  return row
}

export function turnEvent(event: string, raw: string, host: string, handle?: Database): void {
  try {
    const session = String(fieldOf(raw, 'session_id') ?? '')
    if (!session) return
    if (event === 'UserPromptSubmit') turnStarted(session, host, Date.now(), handle)
    if (event === 'Stop') {
      const count = Number(fieldOf(raw, 'tool_calls'))
      turnEnded(session, Number.isFinite(count) ? count : null, Date.now(), handle)
    }
  } catch {}
}

export function readTurns(sinceMs: number, handle: Database = openDatabase()): TurnRow[] {
  const rows = handle.prepare(`SELECT tool, startedAt, ms, attrs FROM spans WHERE source = 'turn' AND startedAt >= ? ORDER BY startedAt`).all(sinceMs) as { tool: string; startedAt: number; ms: number; attrs: string }[]
  return rows.map((r) => {
    const a = JSON.parse(r.attrs || '{}') as Partial<TurnRow>
    return { session: String(a.session ?? ''), host: r.tool.slice(TURN_TOOL_PREFIX.length), startedAt: r.startedAt, ms: r.ms, tools: Number(a.tools ?? 0), toolMs: Number(a.toolMs ?? 0), agentMs: Number(a.agentMs ?? r.ms), hostTools: a.hostTools ?? null }
  })
}

export function turnStats(turns: readonly TurnRow[]): TurnStats {
  return { ...percentiles(turns.map((t) => t.ms)), turns: [...turns] }
}

export function turnLines(stats: TurnStats, hours: number, show = 20): string[] {
  if (!stats.n) return [`No timed turns in the last ${hours} h. A turn is timed from the prompt hook to the Stop hook (Hermes: post_llm_call), from now on.`]
  const tool = percentiles(stats.turns.map((t) => t.toolMs))
  const agent = percentiles(stats.turns.map((t) => t.agentMs))
  const line = (t: TurnRow) => `  ${new Date(t.startedAt).toISOString().slice(0, 19).replace('T', ' ')}  ${t.host.padEnd(10)} ${msText(t.ms).padStart(8)}  log tools ${String(t.tools).padStart(3)} in ${msText(t.toolMs).padStart(8)}  agent ${msText(t.agentMs).padStart(8)}${t.hostTools === null ? '' : `  (${t.hostTools} tool calls in all)`}`
  return [
    `Turns in the last ${hours} h: ${stats.n}, p50 ${msText(stats.p50)}, p95 ${msText(stats.p95)}, p99 ${msText(stats.p99)}. log's tools p50 ${msText(tool.p50)}, p99 ${msText(tool.p99)}; the rest (the model and every other tool) p50 ${msText(agent.p50)}, p99 ${msText(agent.p99)}.`,
    `The newest ${Math.min(show, stats.n)}, each split into log's tool time and agent time:`,
    ...stats.turns.slice(-show).map(line),
  ]
}
