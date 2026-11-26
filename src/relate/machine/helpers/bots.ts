import type { Database } from 'bun:sqlite'
import { getState } from '../../../storage/state/index'
import type { LabelEntry, LabelList } from '../../../inbox/label/types'
import { PLATFORM_NAMES } from '../types'

export const BOT_WORD = /(?:^|[^a-z0-9])bot\d*(?:$|[^a-z0-9])/i

export const BOT_CAMEL = /[a-z0-9]Bot\d*(?![a-z])/

export const namedBot = (word: string): boolean => BOT_WORD.test(word) || BOT_CAMEL.test(word)

export interface BotKnowledge {
  keys: Set<string>
  why: Map<string, string>
}

const keyOf = (platform: string, userId: string): string => `${platform}:${userId}`

export function botKnowledge(handle: Database | null): BotKnowledge {
  const keys = new Set<string>()
  const why = new Map<string, string>()
  if (!handle) return { keys, why }
  const mark = (platform: string, userId: string, reason: string) => {
    if (!platform || !userId) return
    const key = keyOf(platform, userId)
    keys.add(key)
    if (!why.has(key)) why.set(key, reason)
  }
  try {
    for (const r of handle.prepare("SELECT platform, person FROM chatPipeline WHERE who = 'bot'").all() as { platform: string; person: string }[]) mark(r.platform, r.person, "log's own reading of a chat with them")
  } catch {}
  const human = new Set<string>()
  try {
    for (const r of handle.prepare("SELECT platform, userId, json_extract(extra, '$.bot') AS bot FROM identityProfiles WHERE json_extract(extra, '$.bot') IS NOT NULL").all() as { platform: string; userId: string; bot: number | boolean }[]) {
      if (Number(r.bot) === 1) mark(r.platform, r.userId, 'the platform marks it automated')
      else human.add(keyOf(r.platform, r.userId))
    }
  } catch {}
  try {
    const entries = getState<LabelList>('inboxLabels', 'all', {}, handle)?.body.entries ?? []
    for (const e of entries as LabelEntry[]) if (e.who === 'bot') mark(e.platform, e.person, 'the owner or the teacher labelled it a bot')
  } catch {}
  for (const r of handle.prepare('SELECT platform, userId, handle, displayName FROM identities').all() as { platform: string; userId: string; handle: string | null; displayName: string | null }[]) {
    const brand = PLATFORM_NAMES[r.platform as keyof typeof PLATFORM_NAMES] ?? ''
    const said = human.has(keyOf(r.platform, r.userId))
    for (const word of [r.handle, r.displayName]) {
      if (!word) continue
      if (brand && word.trim().toLowerCase() === brand.toLowerCase()) mark(r.platform, r.userId, 'the platform account itself')
      else if (!said && namedBot(word)) mark(r.platform, r.userId, 'its own name says it is automated')
    }
  }
  return { keys, why }
}

export const isBot = (knowledge: BotKnowledge, platform: string, userId: string | null | undefined): boolean => Boolean(userId) && knowledge.keys.has(keyOf(platform, String(userId)))
