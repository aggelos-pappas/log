import type { Database } from 'bun:sqlite'
import { assembleEngineStore } from '../../engineStore/client'
import { ENGINE_STORES } from '../../engineStore/types'
import type { EngineStoreName } from '../../engineStore/types'
import type { ChatRow } from '../types'

export const SERVER_CHAT_KINDS: readonly string[] = ['channel', 'thread', 'forumPost']

export const CHANNEL_SENDERS = 3

export const CATALOG_STORES: readonly { store: EngineStoreName; list: string }[] = [
  { store: 'discordServers', list: 'channels' },
  { store: 'discordThreads', list: 'threads' },
]

export const CATALOG_PLATFORMS: readonly string[] = [...new Set(CATALOG_STORES.map((s) => ENGINE_STORES[s.store].platform))]

export interface CatalogEntry {
  id: string
  platform: string
  kind: string | null
  name: string | null
  server: string | null
  serverId: string | null
}

export interface ChatPlace {
  kind: string
  name: string | null
  server: string | null
  serverId: string | null
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

const isServerKind = (kind: string | null | undefined): boolean => SERVER_CHAT_KINDS.includes(String(kind))

export const serverKindsSql = (): string => SERVER_CHAT_KINDS.map((k) => `'${k}'`).join(', ')

export function roomCatalog(handle: Database): Map<string, CatalogEntry> {
  const out = new Map<string, CatalogEntry>()
  for (const { store, list } of CATALOG_STORES) {
    const platform = ENGINE_STORES[store].platform
    const accounts = handle.prepare('SELECT DISTINCT account FROM engineState WHERE store = ?').all(store) as { account: string }[]
    for (const { account } of accounts) {
      const rows = handle.prepare('SELECT part, body FROM engineState WHERE store = ? AND account = ?').all(store, account) as { part: string; body: string }[]
      const body = assembleEngineStore(store, rows)
      const entries = Array.isArray(body?.[list]) ? (body![list] as Record<string, unknown>[]) : []
      for (const e of entries) {
        const id = text(e.id)
        if (!id) continue
        const entry: CatalogEntry = { id, platform, kind: text(e.kind), name: text(e.name), server: text(e.server), serverId: text(e.serverId) }
        out.set(`${account}:${id}`, entry)
        if (!out.has(id)) out.set(id, entry)
      }
    }
  }
  return out
}

export function channelNameOf(entry: { name: string | null; server: string | null }): string | null {
  let name = entry.name ?? ''
  if (entry.server && name.startsWith(`${entry.server} `)) name = name.slice(entry.server.length + 1)
  name = name.replace(/^#/, '').trim()
  return name || null
}

const kept = new WeakMap<Database, { stamp: string; catalog: Map<string, CatalogEntry> }>()

function catalogOn(handle: Database): Map<string, CatalogEntry> {
  const stores = JSON.stringify(CATALOG_STORES.map((s) => s.store))
  let row: { n: number; at: number }
  try {
    row = handle.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(updatedAt), 0) AS at FROM engineState WHERE store IN (SELECT value FROM json_each(?))').get(stores) as { n: number; at: number }
  } catch {
    return new Map()
  }
  const stamp = `${row.n}:${row.at}`
  const held = kept.get(handle)
  if (held && held.stamp === stamp) return held.catalog
  const catalog = row.n ? roomCatalog(handle) : new Map<string, CatalogEntry>()
  kept.set(handle, { stamp, catalog })
  return catalog
}

function entryOf(catalog: Map<string, CatalogEntry>, platform: string, account: string, conversationId: string): CatalogEntry | null {
  const entry = catalog.get(`${account}:${conversationId}`) ?? catalog.get(conversationId) ?? null
  return entry && entry.platform === platform ? entry : null
}

function placeFrom(entry: CatalogEntry): ChatPlace {
  return { kind: isServerKind(entry.kind) ? entry.kind! : SERVER_CHAT_KINDS[0], name: channelNameOf(entry), server: entry.server, serverId: entry.serverId }
}

export function placeOf(handle: Database, platform: string, account: string, conversationId: string): ChatPlace | null {
  if (!CATALOG_PLATFORMS.includes(platform)) return null
  const entry = entryOf(catalogOn(handle), platform, account, conversationId)
  return entry ? placeFrom(entry) : null
}

export function placeNameOf(handle: Database, platform: string, account: string, conversationId: string): string | null {
  const place = placeOf(handle, platform, account, conversationId)
  const stored = handle.prepare('SELECT kind, name, serverId FROM chats WHERE platform = ? AND account = ? AND conversationId = ?').get(platform, account, conversationId) as { kind: string; name: string | null; serverId: string | null } | null
  const channel = place?.name ?? (stored && isServerKind(stored.kind) ? stored.name : null)
  const server = place?.server ?? null
  if (!channel && !server) return null
  return [server, channel ? `#${channel}` : null].filter(Boolean).join(' ')
}

export interface PlacedChat {
  chat: ChatRow
  known: boolean
}

export function placedChat(handle: Database, chat: ChatRow): PlacedChat {
  const place = placeOf(handle, chat.platform, chat.account, chat.conversationId)
  if (place) return { chat: { ...chat, kind: (isServerKind(chat.kind) ? chat.kind : place.kind) as ChatRow['kind'], name: place.name, serverId: place.serverId ?? chat.serverId }, known: true }
  if (CATALOG_PLATFORMS.includes(chat.platform) && chat.serverId && !isServerKind(chat.kind)) return { chat: { ...chat, kind: SERVER_CHAT_KINDS[0] as ChatRow['kind'], name: null }, known: false }
  return { chat, known: false }
}

export function repairChatPlaces(handle: Database): number {
  const catalog = catalogOn(handle)
  const platforms = JSON.stringify(CATALOG_PLATFORMS)
  const rows = handle.prepare('SELECT chatId, platform, account, conversationId, kind, name, serverId FROM chats WHERE platform IN (SELECT value FROM json_each(?))').all(platforms) as { chatId: string; platform: string; account: string; conversationId: string; kind: string; name: string | null; serverId: string | null }[]
  const update = handle.prepare('UPDATE chats SET kind = ?, name = ?, serverId = ? WHERE chatId = ?')
  let corrected = 0
  for (const r of rows) {
    const entry = entryOf(catalog, r.platform, r.account, r.conversationId)
    const place = entry ? placeFrom(entry) : null
    const kind = place ? (isServerKind(r.kind) ? r.kind : place.kind) : r.serverId && !isServerKind(r.kind) ? SERVER_CHAT_KINDS[0] : r.kind
    const name = place ? place.name : kind !== r.kind ? null : r.name
    const serverId = place?.serverId ?? r.serverId
    if (kind === r.kind && name === r.name && serverId === r.serverId) continue
    update.run(kind, name, serverId, r.chatId)
    corrected += 1
  }
  return corrected
}

export function channelSendersOf(handle: Database, platform: string, account: string, limit: number = CHANNEL_SENDERS): Map<string, string[]> {
  const rows = handle.prepare(`SELECT c.conversationId, COALESCE(i.displayName, i.handle, m.senderLabel) AS label FROM chats c JOIN messages m ON m.chatId = c.chatId LEFT JOIN identities i ON i.platform = m.senderPlatform AND i.userId = m.senderUserId WHERE c.platform = ? AND c.account = ? AND c.kind IN (${serverKindsSql()}) AND m.fromOwner = 0 ORDER BY m.sentAtMs DESC, m.seq DESC`).all(platform, account) as { conversationId: string; label: string | null }[]
  const out = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.label) continue
    const held = out.get(r.conversationId) ?? []
    if (held.length < limit && !held.includes(r.label)) held.push(r.label)
    out.set(r.conversationId, held)
  }
  return out
}
