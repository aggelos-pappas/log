import { existsSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { dbPath } from '../store/client'
import { editDistance } from '../../useCases/router/helpers/typos'
import { EVERYDAY_WORDS, FTS_BOOST, FUZZY_MIN_TOKEN, TYPO_MAX_USES, HINT_THRESHOLD, MAX_HINTS, NAMES_BUDGET, NOT_NAMES, READ_TOOLS, RECENT_DAYS, STALE_PENALTY } from './types'
import { commonWordNear, isCommonWord, promptTokens } from './helpers/words'
import type { PromptToken } from './helpers/words'
import type { NameHint, NamedChat } from './types'

export type CountMessages = (chat: NamedChat) => number

export type MentionsOf = (said: string, chat: NamedChat) => number

export type WordUses = (said: string) => number

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

export function nameCandidates(prompt: string): PromptToken[] {
  const seen = new Set<string>()
  const out: PromptToken[] = []
  for (const token of promptTokens(prompt)) {
    const word = token.word.replace(/[._]+$/, '')
    if (!word || seen.has(word) || /^[\d.]+$/.test(word)) continue
    if (NOT_NAMES.has(word) || (word.length < 4 && (!token.context || word.length < 2))) continue
    seen.add(word)
    out.push({ ...token, word })
  }
  return out
}

export function promptWords(prompt: string): string[] {
  return nameCandidates(prompt).map((t) => t.word)
}

function tokensOf(name: string): string[] {
  const parts = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2)
  return [...new Set([plain(name), ...parts.filter((t, i) => i === 0 || (t.length >= 3 && !EVERYDAY_WORDS.has(t) && !isCommonWord(t)))])]
}

export function swapped(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const differ = [...a].map((c, i) => (c === b[i] ? -1 : i)).filter((i) => i >= 0)
  return differ.length === 2 && differ[1] === differ[0] + 1 && a[differ[0]] === b[differ[1]] && a[differ[1]] === b[differ[0]]
}

export function editsFor(said: string, name: string, limit: number = plain(said).length >= 5 ? 2 : 1, swapOnly = false): number {
  const word = plain(said)
  let best = limit + 1
  for (const token of tokensOf(name)) {
    if (token === word) return 0
    if (swapOnly) {
      if (token.length >= FUZZY_MIN_TOKEN && swapped(word, token)) best = 1
      continue
    }
    if (!limit || token.length < FUZZY_MIN_TOKEN || token[0] !== word[0]) continue
    best = Math.min(best, editDistance(word, token, limit))
  }
  return best
}

export function nameScore(edits: number, mentions: number): number {
  return Math.min(1, 1 - 0.25 * edits + (mentions > 0 ? FTS_BOOST : 0))
}

export function nearCommonWord(said: string): boolean {
  return commonWordNear(plain(said), 1) !== null
}

export function editLimit(token: PromptToken, uses: number): number {
  const word = plain(token.word)
  if (isCommonWord(word)) return token.strong ? 0 : -1
  if (token.context) return word.length >= 5 ? 2 : word.length === 4 ? 1 : 0
  if (word.length < 4 || nearCommonWord(word)) return -1
  if (word.length < 6 || commonWordNear(word) !== null || uses > TYPO_MAX_USES) return 0
  return word.length >= 8 ? 2 : 1
}

const stale = (chat: NamedChat, newest: number) => !chat.lastMessageAt || newest - Date.parse(chat.lastMessageAt) > RECENT_DAYS * 86_400_000

export function nameHints(prompt: string, chats: readonly NamedChat[], count: CountMessages = (chat) => chat.messages, mentions: MentionsOf = () => 0, uses: WordUses = () => 0): NameHint[] {
  const hints: NameHint[] = []
  const newest = Math.max(0, ...chats.map((chat) => Date.parse(chat.lastMessageAt ?? '') || 0))
  for (const token of nameCandidates(prompt)) {
    const said = token.word
    const exactOnly = editLimit(token, limitNeedsUses(token) ? uses(said) : 0)
    if (exactOnly < 0) continue
    const swapOnly = exactOnly === 0 && !token.context && plain(said).length >= FUZZY_MIN_TOKEN
    const limit = swapOnly ? 1 : exactOnly
    const found = chats.map((chat) => ({ said, chat, edits: editsFor(said, chat.name, limit, swapOnly) })).filter((h) => h.edits <= limit)
    if (!found.length) continue
    const fewest = Math.min(...found.map((h) => h.edits))
    for (const h of found.filter((f) => f.edits === fewest).slice(0, 12)) {
      const penalty = h.edits > 0 && stale(h.chat, newest) ? STALE_PENALTY : 0
      hints.push({ ...h, chat: { ...h.chat, messages: count(h.chat) }, score: nameScore(h.edits, mentions(said, h.chat)) - penalty })
    }
  }
  return hints
    .filter((h) => h.score >= HINT_THRESHOLD)
    .sort((a, b) => b.score - a.score || String(b.chat.lastMessageAt).localeCompare(String(a.chat.lastMessageAt)) || b.chat.messages - a.chat.messages)
    .slice(0, MAX_HINTS)
}

function limitNeedsUses(token: PromptToken): boolean {
  return !token.context && plain(token.word).length >= 6
}

export function hintLine(hint: NameHint): string {
  const { chat } = hint
  const read = READ_TOOLS[chat.platform]
  const last = chat.lastMessageAt ? `${chat.lastMessageAt.slice(5, 16).replace('T', ' ')} UTC` : 'unknown'
  const next = read ? ` → ${read.tool} { account: "${chat.account}", ${read.key}: "${chat.name}" }` : ''
  return `"${hint.said}" → ${chat.name} · ${chat.platform} ${chat.kind} ${chat.conversationId} · ${chat.messages} msgs · last ${last}${next}`
}

export function nameHintsText(prompt: string, chats: readonly NamedChat[], count?: CountMessages, mentions?: MentionsOf, uses?: WordUses): string {
  const hints = nameHints(prompt, chats, count, mentions, uses)
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

export function wordUseCounter(database: Database): WordUses {
  let query: ReturnType<Database['query']> | null = null
  try {
    query = database.query(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM searchIndex WHERE searchIndex MATCH ? LIMIT ${TYPO_MAX_USES + 1})`)
  } catch {
    return () => 0
  }
  return (said) => {
    try {
      return Number((query!.get(`text:"${plain(said)}"`) as { n: number } | null)?.n ?? 0)
    } catch {
      return 0
    }
  }
}

export function storedNameHints(prompt: string, database: Database): string {
  if (!promptWords(prompt).length) return ''
  return nameHintsText(prompt, namedChats(database), messageCounter(database), mentionCounter(database), wordUseCounter(database))
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
