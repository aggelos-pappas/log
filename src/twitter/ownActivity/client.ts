import type { Database } from 'bun:sqlite'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { twitterStateRoot } from '../../directApi/engine/index'
import { recordAction } from '../../inbox/claims/index'
import { db } from '../../inbox/store/index'
import { localTime } from '../../inbox/watch/index'
import { insertEventRow } from '../../storage/platform/index'
import type { TwitterEngineRun, TwitterEngineSpec, TwitterSessionAnswer } from '../account/session/types'
import { LOG_WRITE_ACTIONS, OWN_FILE, OWN_FRESH_MS } from './types'
import type { LogWrite, LogWrites, OwnItem, OwnRefresh, OwnSeen } from './types'

const idOfUrl = (url: unknown): string | null => (typeof url === 'string' ? (url.match(/status(?:es)?\/(\d+)/)?.[1] ?? null) : null)

export function logWriteOf(request: Pick<TwitterEngineSpec, 'action' | 'tweetUrl' | 'userId'>, answer: TwitterSessionAnswer): LogWrite | null {
  if (!LOG_WRITE_ACTIONS.includes(String(request.action)) || !answer.ok || answer.event !== 'sent') return null
  const target = idOfUrl(request.tweetUrl)
  return { action: String(request.action), tweetId: answer.tweetId ? String(answer.tweetId) : target, target, userId: request.userId ? String(request.userId) : answer.userId ? String(answer.userId) : null }
}

export function recordLogWrite(account: string, request: TwitterEngineSpec, run: TwitterEngineRun, handle?: Database): void {
  try {
    const write = logWriteOf(request, run.answer)
    if (!write) return
    recordAction({ kind: 'logWrite', platform: 'twitter', account, conversationId: '', by: process.pid, detail: JSON.stringify(write) }, new Date(), handle ?? db())
  } catch {}
}

export function logWritesOf(handle: Database, account: string): LogWrites {
  const rows = handle.prepare("SELECT detail FROM actions WHERE kind = 'logWrite' AND platform = 'twitter' AND account = ?").all(account) as { detail: string | null }[]
  const tweets = new Set<string>()
  const users = new Set<string>()
  for (const r of rows) {
    try {
      const w = JSON.parse(r.detail ?? '{}') as LogWrite
      if (w.action === 'follow' && w.userId) users.add(w.userId)
      else for (const id of [w.tweetId, w.target]) if (id) tweets.add(`${w.action}:${id}`)
    } catch {}
  }
  return { tweets, users }
}

export function byLog(item: OwnItem, writes: LogWrites): boolean {
  if (item.kind === 'follow') return writes.users.has(item.userId)
  if (item.kind === 'like' || item.kind === 'repost') return writes.tweets.has(`${item.kind}:${item.tweetId}`)
  return writes.tweets.has(`${item.kind}:${item.id}`)
}

const WORDS: Record<OwnItem['kind'], string> = { reply: 'replied to', quote: 'quoted', post: 'posted', repost: 'reposted', like: 'liked a post by', follow: 'followed' }

const flat = (text: string, max = 160) => {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

function whenOf(item: OwnItem, seenAt: string): string {
  const parsed = item.at ? Date.parse(item.at) : NaN
  return localTime(Number.isNaN(parsed) ? seenAt : new Date(parsed).toISOString())
}

export function ownLine(item: OwnItem, seenAt: string): string {
  const who = item.kind === 'post' ? '' : ` @${item.handle ?? item.userId}`
  const said = !item.text ? '' : item.kind === 'like' ? ` ("${flat(item.text, 80)}")` : `: "${flat(item.text)}"`
  return `${whenOf(item, seenAt)} he ${WORDS[item.kind]}${who}${said}${item.url ? ` ${item.url}` : ''}`
}

export function storeOwnItems(account: string, items: readonly OwnItem[], handle: Database = db(), now: Date = new Date()): number {
  let added = 0
  for (const item of items) {
    const inserted = insertEventRow(handle, { eventId: `ownActivity:twitter:${account}:${item.kind}:${item.id}`, platform: 'twitter', account, conversationId: '', type: 'ownActivity', with: item.handle ?? '', text: '', box: '', payload: item as unknown as Record<string, unknown>, sourceAt: '', receivedAt: now.toISOString(), source: 'live' }, now)
    if (inserted) added++
  }
  return added
}

function itemOf(payload: string): OwnItem | null {
  try {
    const item = JSON.parse(payload) as OwnItem
    return item && item.kind && item.id ? item : null
  } catch {
    return null
  }
}

export function ownItemsAfter(handle: Database, after: number, settledBefore: string): { items: OwnSeen[]; through: number } {
  const rows = handle.prepare("SELECT seq, account, payload, receivedAt FROM events WHERE seq > ? AND platform = 'twitter' AND type = 'ownActivity' ORDER BY seq LIMIT 200").all(after) as { seq: number; account: string; payload: string; receivedAt: string }[]
  const firstUnsettled = rows.find((r) => r.receivedAt > settledBefore)
  const settled = rows.filter((r) => !firstUnsettled || r.seq < firstUnsettled.seq)
  const through = firstUnsettled ? Math.max(after, firstUnsettled.seq - 1) : (rows.at(-1)?.seq ?? after)
  const writes = new Map<string, LogWrites>()
  const items: OwnSeen[] = []
  for (const r of settled) {
    const item = itemOf(r.payload)
    if (!item) continue
    if (!writes.has(r.account)) writes.set(r.account, logWritesOf(handle, r.account))
    if (!byLog(item, writes.get(r.account)!)) items.push({ platform: 'twitter', account: r.account, item, seenAt: r.receivedAt, seq: r.seq })
  }
  return { items, through }
}

export function ownChangesSince(account: string, who: { userId?: string | null; handle?: string | null }, since: string, handle: Database = db()): string[] {
  const name = who.handle?.replace(/^@/, '').toLowerCase() ?? null
  const rows = handle.prepare("SELECT payload, receivedAt FROM events WHERE platform = 'twitter' AND account = ? AND type = 'ownActivity' AND receivedAt > ? ORDER BY seq").all(account, since) as { payload: string; receivedAt: string }[]
  const writes = logWritesOf(handle, account)
  const out: string[] = []
  for (const r of rows) {
    const item = itemOf(r.payload)
    if (!item) continue
    const them = Boolean((who.userId && item.userId === String(who.userId)) || (name && item.handle?.toLowerCase() === name))
    if (them && !byLog(item, writes)) out.push(`by hand, outside log: ${ownLine(item, r.receivedAt)}`)
  }
  return out
}

export function ownCheckedAt(account: string, root: string = twitterStateRoot()): number | null {
  const path = join(root, account, OWN_FILE)
  return existsSync(path) ? statSync(path).mtimeMs : null
}

export async function refreshOwnActivity(account: string, engine: (spec: TwitterEngineSpec) => Promise<TwitterEngineRun>, nowMs: number = Date.now(), checkedAt: (account: string) => number | null = ownCheckedAt, handle?: Database): Promise<OwnRefresh> {
  const last = checkedAt(account)
  if (last !== null && nowMs - last < OWN_FRESH_MS) return { ok: true, fresh: true, added: 0 }
  const run = await engine({ action: 'ownActivity' })
  if (!run.answer.ok) return { ok: false, fresh: false, added: 0, refused: `${run.answer.code ?? 'refused'}: ${run.answer.detail ?? ''}`.trim() }
  const items = ((run.answer as unknown as { items?: OwnItem[] }).items ?? []).filter((i) => i && i.id)
  return { ok: true, fresh: false, added: storeOwnItems(account, items, handle ?? db(), new Date(nowMs)) }
}
