import { editDistance } from '../../../useCases/router/helpers/typos'
import { FILLER_WORDS } from './types'
import type { ChatMatch, DiscordChat, SavedChannel } from './types'

const FILLER = new Set<string>(FILLER_WORDS)

export function wordsOf(text: string): string[] {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

export function normalizedName(text: string): string {
  const words = wordsOf(text)
  const kept = words.filter((w) => !FILLER.has(w))
  return (kept.length ? kept : words).join(' ')
}

export function labelOf(chat: DiscordChat): string {
  if (chat.name?.trim()) return chat.name.trim()
  return chat.members.join(', ') || '(no name)'
}

function namesOf(chat: DiscordChat): string[] {
  return [...(chat.name?.trim() ? [chat.name] : []), ...(chat.kind === 'dm' || !chat.name?.trim() ? chat.members : [])]
}

function typoOf(said: string[], names: string[]): boolean {
  if (said.length !== 1 || said[0].length < 4) return false
  const word = said[0]
  const limit = word.length >= 5 ? 2 : 1
  const tokens = new Set(names.flatMap((n) => [n.replace(/ /g, ''), ...n.split(' ')]).filter((t) => t.length >= 3))
  return [...tokens].some((t) => t[0] === word[0] && editDistance(word, t, limit) <= limit)
}

function scoreOf(said: string[], chat: DiscordChat): { score: number; how: 'exact' | 'words' | 'prefix' | 'typo' } | null {
  const names = namesOf(chat).map((n) => normalizedName(n)).filter(Boolean)
  const phrase = said.join(' ')
  const own = chat.kind === 'dm' || chat.name?.trim() ? names : []
  if (own.some((n) => n === phrase)) return { score: 4, how: 'exact' }
  if (names.some((n) => n === phrase)) return { score: 3, how: 'exact' }
  const pool = new Set(names.flatMap((n) => n.split(' ')))
  if (said.every((w) => pool.has(w))) return { score: 2, how: 'words' }
  if (said.every((w) => w.length >= 3 && [...pool].some((p) => p.startsWith(w)))) return { score: 1, how: 'prefix' }
  if (typoOf(said, names)) return { score: 0.5, how: 'typo' }
  return null
}

export function matchChat(chats: readonly DiscordChat[], said: string): ChatMatch {
  const text = said.trim()
  const byId = chats.find((c) => c.id === text)
  if (byId) return { ok: true, chat: byId, label: labelOf(byId), how: 'id' }
  const words = normalizedName(text).split(' ').filter(Boolean)
  if (!words.length) return { ok: false, code: 'chatNotFound', detail: `"${said}" names no chat`, candidates: [] }
  const scored = chats.map((chat) => ({ chat, hit: scoreOf(words, chat) })).filter((s) => s.hit) as { chat: DiscordChat; hit: { score: number; how: 'exact' | 'words' | 'prefix' | 'typo' } }[]
  if (!scored.length) return { ok: false, code: 'chatNotFound', detail: `no DM or group matches "${said}" (read as "${words.join(' ')}")`, candidates: [] }
  const best = Math.max(...scored.map((s) => s.hit.score))
  const top = scored.filter((s) => s.hit.score === best)
  if (top.length > 1) return { ok: false, code: 'chatAmbiguous', detail: `${top.length} chats match "${said}" (read as "${words.join(' ')}"): say which`, candidates: top.slice(0, 8).map((s) => ({ id: s.chat.id, label: labelOf(s.chat) })) }
  return { ok: true, chat: top[0].chat, label: labelOf(top[0].chat), how: top[0].hit.how }
}

export function withSavedChannels(chats: readonly DiscordChat[], saved: readonly SavedChannel[]): DiscordChat[] {
  const servers = new Map(chats.filter((c) => c.serverId && c.server?.trim()).map((c) => [String(c.serverId), c.server!.trim()]))
  const kept = new Set(chats.map((c) => c.id))
  const aliases = saved.flatMap((c) => {
    const name = c.name?.trim()
    if (!name || kept.has(c.id)) return []
    const server = c.serverId ? servers.get(String(c.serverId)) ?? null : null
    return [{ id: c.id, kind: c.kind, name: server ? `${server} #${name}` : name, members: [], ...(server ? { server, serverId: c.serverId } : {}) }]
  })
  return [...chats, ...aliases]
}
