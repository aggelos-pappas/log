import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '../../../inbox/store/index'
import { NOT_SAID, REACTION } from '../../../inbox/lastWord/index'
import { hermesHome } from '../../../agentHooks/hermes/client'
import { FAMILY_PATTERNS, MAX_TEXT_CHARS, SEND_TOOLS, SEND_WINDOW_MS } from '../types'
import type { CorpusRow, CorpusSide } from '../types'

export interface OwnerMessage {
  text: string
  at: string
  chatKey: string
  platform: string
}

const SEND_ARGS = /(SendLive|DmLive)$/
const VOICE_TOOL = /(^|_)voice$/

export function normalText(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
}

export function chatKeyOf(name: string | null | undefined): string {
  return String(name ?? '').toLowerCase().replace(/^@/, '').replace(/\s+/g, ' ').trim() || 'unknown'
}

export function corpusIdOf(side: CorpusSide, source: string, text: string, momentKey: string | null = null): string {
  return createHash('sha1').update(`${side}\n${source}\n${momentKey ?? ''}\n${normalText(text)}`).digest('hex').slice(0, 24)
}

export function familyOf(model: string | null | undefined): string {
  const name = String(model ?? '')
  return FAMILY_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? (name ? 'other' : 'agent')
}

export function usableText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > MAX_TEXT_CHARS) return false
  if (REACTION.test(trimmed) || NOT_SAID.test(trimmed)) return false
  if (/^(https?:\/\/\S+\s*)+$/.test(trimmed)) return false
  if (/^[/!.]\w+/.test(trimmed)) return false
  return /[a-z]/i.test(trimmed)
}

export function saveCorpus(rows: readonly Omit<CorpusRow, 'id'>[], now = new Date(), handle: Database = db()): number {
  const insert = handle.prepare('INSERT OR IGNORE INTO conventionCorpus (id, side, family, model, source, chatKey, momentKey, text, at, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  let added = 0
  handle.transaction(() => {
    for (const row of rows) {
      if (!usableText(row.text)) continue
      added += insert.run(corpusIdOf(row.side, row.source, row.text, row.momentKey), row.side, row.family, row.model, row.source, row.chatKey, row.momentKey, row.text.trim(), row.at, now.toISOString()).changes
    }
  })()
  return added
}

export function corpusOf(side?: CorpusSide, handle: Database = db()): CorpusRow[] {
  const rows = side ? handle.prepare('SELECT id, side, family, model, source, chatKey, momentKey, text, at FROM conventionCorpus WHERE side = ?').all(side) : handle.prepare('SELECT id, side, family, model, source, chatKey, momentKey, text, at FROM conventionCorpus').all()
  return rows as CorpusRow[]
}

export function corpusCount(side: CorpusSide, handle: Database = db()): number {
  try {
    return (handle.prepare('SELECT COUNT(*) AS n FROM conventionCorpus WHERE side = ?').get(side) as { n: number }).n
  } catch {
    return 0
  }
}

export function sendWindows(handle: Database = db()): [number, number][] {
  try {
    const rows = handle.prepare('SELECT tool, startedAt, ms FROM spans WHERE parentId IS NULL').all() as { tool: string; startedAt: number; ms: number }[]
    return rows.filter((r) => SEND_TOOLS.test(r.tool)).map((r) => [r.startedAt, r.startedAt + r.ms + SEND_WINDOW_MS] as [number, number]).sort((a, b) => a[0] - b[0])
  } catch {
    return []
  }
}

function inWindow(ms: number, windows: readonly [number, number][]): boolean {
  let low = 0
  let high = windows.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (windows[mid][0] > ms) high = mid - 1
    else low = mid + 1
  }
  for (let i = high; i >= 0 && i >= high - 20; i--) if (windows[i][0] <= ms && ms <= windows[i][1]) return true
  return false
}

export function ownerMessages(handle: Database = db(), aiTexts: ReadonlySet<string> = new Set()): { messages: OwnerMessage[]; droppedAsSends: number } {
  const rows = handle.prepare("SELECT m.text AS text, m.sentAt AS at, m.sentAtMs AS ms, c.platform AS platform, c.conversationId AS conversationId, c.name AS name FROM messages m JOIN chats c USING (chatId) WHERE m.fromOwner = 1 AND m.text <> '' ORDER BY m.sentAt").all() as { text: string; at: string; ms: number | null; platform: string; conversationId: string; name: string | null }[]
  const windows = sendWindows(handle)
  const seen = new Set<string>()
  const messages: OwnerMessage[] = []
  let droppedAsSends = 0
  for (const row of rows) {
    if (!usableText(row.text)) continue
    const key = normalText(row.text)
    const ms = row.ms ?? Date.parse(row.at)
    if (aiTexts.has(key) || (Number.isFinite(ms) && inWindow(ms, windows))) {
      droppedAsSends++
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    messages.push({ text: row.text.trim(), at: row.at, chatKey: chatKeyOf(row.name ?? `${row.platform}:${row.conversationId}`), platform: row.platform })
  }
  return { messages, droppedAsSends }
}

interface ToolCall {
  name: string
  args: Record<string, unknown>
}

function callsIn(raw: string): ToolCall[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const out: ToolCall[] = []
  for (const call of Array.isArray(parsed) ? parsed : []) {
    const fn = (call as { function?: { name?: string; arguments?: unknown } }).function ?? (call as { name?: string; arguments?: unknown })
    const name = String(fn?.name ?? '')
    let args: unknown = fn?.arguments ?? {}
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args)
      } catch {
        args = {}
      }
    }
    const record = (args ?? {}) as Record<string, unknown>
    if (name === 'tool_call' && Array.isArray(record.calls)) for (const inner of record.calls as { name?: string; arguments?: unknown }[]) out.push({ name: String(inner?.name ?? ''), args: (inner?.arguments ?? {}) as Record<string, unknown> })
    else out.push({ name, args: record })
  }
  return out
}

export function draftsInCalls(calls: readonly ToolCall[], model: string | null, at: string | null): Omit<CorpusRow, 'id'>[] {
  const out: Omit<CorpusRow, 'id'>[] = []
  const family = familyOf(model)
  calls.forEach(({ name, args }, n) => {
    const bare = name.replace(/^mcp_+log_+/, '')
    const isVoice = VOICE_TOOL.test(name) && /log/.test(name)
    const isSend = SEND_ARGS.test(bare) && /log/.test(name)
    if (!isVoice && !isSend) return
    const who = chatKeyOf(String(args.with ?? args.to ?? args.channel ?? args.chat ?? args.userId ?? ''))
    const options = isVoice && Array.isArray(args.options) ? (args.options as unknown[]).filter((o): o is string => typeof o === 'string') : []
    const texts = [...(typeof args.text === 'string' ? [args.text] : []), ...options]
    const momentKey = options.length > 1 ? `call:${at ?? ''}:${n}` : null
    for (const text of texts) out.push({ side: 'ai', family, model, source: 'agentSession', chatKey: who, momentKey, text, at })
  })
  return out
}

export function hermesStateDb(): string {
  return join(hermesHome(), 'state.db')
}

export function agentSessionDrafts(path = hermesStateDb()): Omit<CorpusRow, 'id'>[] {
  if (!existsSync(path)) return []
  let handle: Database | null = null
  try {
    handle = new Database(path, { readonly: true })
    const models = new Map((handle.prepare('SELECT id, model FROM sessions').all() as { id: string; model: string | null }[]).map((r) => [r.id, r.model]))
    const rows = handle.prepare("SELECT session_id AS session, timestamp, tool_calls AS calls FROM messages WHERE tool_calls IS NOT NULL AND (tool_calls LIKE '%log%voice%' OR tool_calls LIKE '%SendLive%' OR tool_calls LIKE '%DmLive%')").all() as { session: string; timestamp: number; calls: string }[]
    return rows.flatMap((r) => draftsInCalls(callsIn(r.calls), models.get(r.session) ?? null, new Date(r.timestamp * 1000).toISOString()))
  } catch {
    return []
  } finally {
    handle?.close()
  }
}

export function draftsFromFile(path: string): Omit<CorpusRow, 'id'>[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown
  const items = Array.isArray(parsed) ? parsed : []
  const out: Omit<CorpusRow, 'id'>[] = []
  for (const [n, item] of (items as Record<string, unknown>[]).entries()) {
    const who = chatKeyOf(String(item.with ?? item.to ?? item.chat ?? ''))
    const model = typeof item.model === 'string' ? item.model : null
    const family = typeof item.family === 'string' ? item.family : familyOf(model)
    const source = typeof item.source === 'string' ? item.source : 'imported'
    const options = Array.isArray(item.options) ? (item.options as unknown[]).filter((o): o is string => typeof o === 'string') : []
    const texts = [...(typeof item.text === 'string' ? [item.text] : []), ...(typeof item.today === 'string' ? [item.today] : []), ...options]
    const side: CorpusSide = item.side === 'owner' ? 'owner' : 'ai'
    const momentKey = typeof item.momentKey === 'string' ? item.momentKey : options.length > 1 ? `${source}:${n}:${who}` : null
    for (const text of texts) out.push({ side, family, model, source, chatKey: who, momentKey, text, at: typeof item.at === 'string' ? item.at : null })
  }
  return out
}
