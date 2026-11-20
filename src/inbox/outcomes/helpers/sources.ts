import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { personKeyOf } from '../../lastWord/index'
import { normalText } from '../../../voice/conventions/helpers/corpus'
import { PLAY_SKILL, PLAY_TOOL, QUEUE_TOOL, SEND_TOOL, SPAN_SLACK_MS } from '../types'
import type { AgentSend, QueueSent } from '../types'

export function lineKey(text: string): string {
  return normalText(text.replace(/https?:\/\/\S*?\/status\/(\d+)\S*/g, ' status$1 ').replace(/https?:\/\/\S+/g, ' '))
}

export const platformOfTool = (tool: string): string => tool.replace(/^cli /, '').match(/^[a-z]+/)?.[0] ?? ''

export function sendRecordIds(on: Database): Set<string> {
  const rows = on.prepare("SELECT platform, json_extract(detail, '$.messageId') AS id FROM actions WHERE kind = 'partSent' AND json_valid(detail)").all() as { platform: string; id: string | number | null }[]
  return new Set(rows.filter((r) => r.id !== null && r.id !== '').map((r) => `${r.platform}\u0000${r.id}`))
}

export function playOfQueue(name: string, account: string): string {
  const stem = (name.split(/[\\/]/).pop() ?? name).replace(/\.queue$/i, '').replace(/[_-]?\d{4}-?\d{2}-?\d{2}[a-z]?$/i, '').replace(/[_-]+$/, '')
  return !stem || stem.toLowerCase() === account.toLowerCase() ? 'queue' : stem
}

export function queueSends(on: Database): QueueSent[] {
  let rows: { name: string; account: string; body: string }[] = []
  try {
    rows = on.prepare('SELECT name, account, body FROM queues').all() as typeof rows
  } catch {
    return []
  }
  const out: QueueSent[] = []
  for (const row of rows) {
    let items: Record<string, unknown>[] = []
    try {
      const body = JSON.parse(row.body) as { items?: unknown }
      items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : []
    } catch {
      continue
    }
    for (const item of items) {
      if (item.status !== 'sent' || item.action !== 'dm' || typeof item.sentId !== 'string' || typeof item.text !== 'string') continue
      const ms = Date.parse(String(item.attemptedAt ?? item.sentAtRun ?? ''))
      if (!Number.isFinite(ms)) continue
      out.push({ platform: '', account: row.account, person: personKeyOf(item.sentId), play: playOfQueue(row.name, row.account), ms, lines: item.text.split('\n').map(lineKey).filter(Boolean) })
    }
  }
  return out
}

export function sendSpans(on: Database): { platform: string; from: number; to: number }[] {
  try {
    const rows = on.prepare('SELECT tool, startedAt, ms FROM spans WHERE parentId IS NULL').all() as { tool: string; startedAt: number; ms: number }[]
    return rows.filter((r) => SEND_TOOL.test(r.tool)).map((r) => ({ platform: platformOfTool(r.tool), from: r.startedAt, to: r.startedAt + r.ms + SPAN_SLACK_MS })).sort((a, b) => a.from - b.from)
  } catch {
    return []
  }
}

interface Call {
  name: string
  args: Record<string, unknown>
}

function parsedArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') return (raw ?? {}) as Record<string, unknown>
  try {
    return (JSON.parse(raw) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function callsOf(raw: string): Call[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const out: Call[] = []
  for (const call of Array.isArray(parsed) ? parsed : []) {
    const fn = (call as { function?: { name?: string; arguments?: unknown } }).function ?? (call as { name?: string; arguments?: unknown })
    const name = String(fn?.name ?? '').replace(/^mcp_+log_+/, '')
    const args = parsedArgs(fn?.arguments)
    if (name === 'tool_call' && Array.isArray(args.calls)) for (const inner of args.calls as { name?: string; arguments?: unknown }[]) out.push({ name: String(inner?.name ?? '').replace(/^mcp_+log_+/, ''), args: parsedArgs(inner?.arguments) })
    else out.push({ name, args })
  }
  return out
}

export function playOfCall(call: Call): string | null {
  if (PLAY_TOOL.test(call.name) && typeof call.args.useCase === 'string') return call.args.useCase
  const skill = call.name === 'skill_view' && typeof call.args.name === 'string' ? PLAY_SKILL.exec(call.args.name) : null
  if (skill) return `${skill[1]}/${skill[2].replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())}`
  return null
}

export function agentSendsIn(rows: readonly { session: string; ms: number; calls: string }[]): AgentSend[] {
  const playOf = new Map<string, string>()
  const out: AgentSend[] = []
  for (const row of [...rows].sort((a, b) => a.ms - b.ms)) {
    for (const call of callsOf(row.calls)) {
      const play = playOfCall(call)
      if (play) playOf.set(row.session, play)
      if (!SEND_TOOL.test(call.name)) continue
      const who = String(call.args.with ?? call.args.to ?? call.args.channel ?? call.args.handle ?? '').replace(/^@/, '').toLowerCase()
      out.push({ ms: row.ms, platform: platformOfTool(call.name), with: who, play: QUEUE_TOOL.test(call.name) ? null : (playOf.get(row.session) ?? null) })
    }
  }
  return out
}

export function agentSends(path: string): AgentSend[] {
  if (!existsSync(path)) return []
  let handle: Database | null = null
  try {
    handle = new Database(path, { readonly: true })
    const rows = handle.prepare("SELECT session_id AS session, timestamp, tool_calls AS calls FROM messages WHERE tool_calls IS NOT NULL AND (tool_calls LIKE '%Live%' OR tool_calls LIKE '%getGuide%' OR tool_calls LIKE '%skill_view%')").all() as { session: string; timestamp: number; calls: string }[]
    return agentSendsIn(rows.map((r) => ({ session: r.session, ms: Math.round(r.timestamp * 1000), calls: r.calls })))
  } catch {
    return []
  } finally {
    handle?.close()
  }
}
