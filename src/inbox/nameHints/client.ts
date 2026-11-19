import { existsSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { dbPath } from '../store/client'
import { editDistance } from '../../useCases/router/helpers/typos'
import { FTS_BOOST, HINT_THRESHOLD, MAX_HINTS, NAMES_BUDGET, NOT_NAMES, READ_TOOLS } from './types'
import type { NameHint, NamedChat } from './types'

export type CountMessages = (chat: NamedChat) => number

export type MentionsOf = (said: string, chat: NamedChat) => number

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

export function promptWords(prompt: string): string[] {
  const words = prompt.toLowerCase().match(/[@]?[\p{L}\p{N}_.]+/gu) ?? []
  return [...new Set(words.map((w) => w.replace(/^@/, '').replace(/[._]+$/, '')).filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !NOT_NAMES.has(w)))]
}

function tokensOf(name: string): string[] {
  const parts = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3)
  return [...new Set([plain(name), ...parts])]
}

export function editsFor(said: string, name: string): number {
  const word = plain(said)
  const limit = word.length >= 5 ? 2 : 1
  let best = limit + 1
  for (const token of tokensOf(name)) {
    if (token === word) return 0
    if (token[0] !== word[0]) continue
    best = Math.min(best, editDistance(word, token, limit))
  }
  return best
}

export function nameScore(edits: number, mentions: number): number {
  return Math.min(1, 1 - 0.25 * edits + (mentions > 0 ? FTS_BOOST : 0))
}

export function nameHints(prompt: string, chats: readonly NamedChat[], count: CountMessages = (chat) => chat.messages, mentions: MentionsOf = () => 0): NameHint[] {
  const hints: NameHint[] = []
  for (const said of promptWords(prompt)) {
    const limit = plain(said).length >= 5 ? 2 : 1
    const found = chats.map((chat) => ({ said, chat, edits: editsFor(said, chat.name) })).filter((h) => h.edits <= limit)
    if (!found.length) continue
    const fewest = Math.min(...found.map((h) => h.edits))
    for (const h of found.filter((f) => f.edits === fewest).slice(0, 12)) hints.push({ ...h, chat: { ...h.chat, messages: count(h.chat) }, score: nameScore(h.edits, mentions(said, h.chat)) })
  }
  return hints
    .filter((h) => h.score >= HINT_THRESHOLD)
    .sort((a, b) => b.score - a.score || b.chat.messages - a.chat.messages || String(b.chat.lastMessageAt).localeCompare(String(a.chat.lastMessageAt)))
    .slice(0, MAX_HINTS)
}

export function hintLine(hint: NameHint): string {
  const { chat } = hint
  const read = READ_TOOLS[chat.platform]
  const last = chat.lastMessageAt ? `${chat.lastMessageAt.slice(5, 16).replace('T', ' ')} UTC` : 'unknown'
  const next = read ? ` → ${read.tool} { account: "${chat.account}", ${read.key}: "${chat.name}" }` : ''
  return `"${hint.said}" → ${chat.name} · ${chat.platform} ${chat.kind} ${chat.conversationId} · ${chat.messages} msgs · last ${last}${next}`
}

export function nameHintsText(prompt: string, chats: readonly NamedChat[], count?: CountMessages, mentions?: MentionsOf): string {
  const hints = nameHints(prompt, chats, count, mentions)
  if (!hints.length) return ''
  const lines = ['>>> NAMED IN THE PROMPT (pointers into log.db; read the chat by its name, never list every chat):']
  for (const line of hints.map(hintLine)) if ([...lines, line].join('\n').length <= NAMES_BUDGET) lines.push(line)
  return lines.length > 1 ? lines.join('\n') : ''
}

export function namedChats(database: Database): NamedChat[] {
  return database.query(`SELECT platform, account, conversationId, kind, name, lastMessageAt, 0 AS messages FROM chats WHERE kind IN ('dm', 'group') AND name IS NOT NULL AND name <> ''`).all() as NamedChat[]
}

export function messageCounter(database: Database): CountMessages {
  const query = database.query(`SELECT COUNT(*) AS n FROM messages WHERE chatId = (SELECT chatId FROM chats WHERE platform = ? AND account = ? AND conversationId = ?)`)
  return (chat) => Number((query.get(chat.platform, chat.account, chat.conversationId) as { n: number } | null)?.n ?? 0)
}

export function mentionCounter(database: Database): MentionsOf {
  let query: ReturnType<Database['query']> | null = null
  try {
    query = database.query(`SELECT COUNT(*) AS n FROM searchIndex WHERE searchIndex MATCH ? AND conversationId = ? LIMIT 1`)
  } catch {
    return () => 0
  }
  return (said, chat) => {
    try {
      return Number((query!.get(`text:"${plain(said)}"`, chat.conversationId) as { n: number } | null)?.n ?? 0)
    } catch {
      return 0
    }
  }
}

export function storedNameHints(prompt: string, database: Database): string {
  if (!promptWords(prompt).length) return ''
  return nameHintsText(prompt, namedChats(database), messageCounter(database), mentionCounter(database))
}

export function promptNameHints(prompt: string, path: string = dbPath()): string {
  if (!promptWords(prompt).length || !existsSync(path)) return ''
  const database = new Database(path, { readonly: true })
  try {
    return storedNameHints(prompt, database)
  } catch {
    return ''
  } finally {
    database.close()
  }
}

export function closestNamed<T>(items: readonly T[], said: string, namesOf: (item: T) => readonly (string | null | undefined)[]): T[] {
  const wanted = said.trim().toLowerCase()
  const word = plain(wanted)
  if (!word) return [...items]
  const limit = word.length >= 5 ? 2 : word.length >= 4 ? 1 : 0
  const scored = items.map((item) => {
    const names = namesOf(item).filter((n): n is string => Boolean(n))
    const edits = Math.min(limit + 1, ...names.map((n) => (n.toLowerCase().includes(wanted) || plain(n).includes(word) ? 0 : editsFor(word, n))))
    return { item, edits }
  })
  const kept = scored.filter((s) => s.edits <= limit)
  const fewest = Math.min(...kept.map((s) => s.edits))
  return kept.filter((s) => s.edits === fewest).map((s) => s.item)
}
