import type { Database } from 'bun:sqlite'
import { getState, putState } from '../../storage/state/index'
import { chatsOf, personKeyOf, saidOnly } from '../lastWord/index'
import type { LastWordMessage, PersonChat } from '../lastWord/index'
import { db } from '../store/index'
import { ACTIVE_DAYS, ASK, COLD_DAYS, LABELS, READY_TURNS } from './types'
import type { Label, LabelEntry, LabelList, LabelQuery, Labelled } from './types'

const DAY = 86_400_000

export function isLabel(value: string): value is Label {
  return (LABELS as readonly string[]).includes(value)
}

export function labelList(): LabelEntry[] {
  return getState<LabelList>('inboxLabels', 'all')?.body.entries ?? []
}

const samePerson = (a: Pick<LabelEntry, 'platform' | 'account' | 'person'>, b: Pick<LabelEntry, 'platform' | 'account' | 'person'>): boolean => a.platform === b.platform && a.account === b.account && a.person === b.person

export function setLabel(target: { platform: string; account: string; chat: string }, label: Label | null, by: string, now: Date = new Date()): LabelEntry[] {
  const person = personKeyOf(target.chat)
  const kept = labelList().filter((e) => !samePerson(e, { platform: target.platform, account: target.account, person }))
  const entries = label ? [...kept, { platform: target.platform, account: target.account, person, label, by, at: now.toISOString() }] : kept
  putState('inboxLabels', 'all', { entries } satisfies LabelList, now.getTime())
  return entries
}

export function turnsOf(said: readonly LastWordMessage[]): number {
  let turns = 0
  for (let i = 1; i < said.length; i++) if (said[i].fromOwner !== said[i - 1].fromOwner) turns++
  return turns
}

export function autoLabel(said: readonly LastWordMessage[], now: number = Date.now()): { label: Label; why: string } {
  const theirs = said.filter((m) => !m.fromOwner)
  if (!theirs.length) return { label: 'skip', why: 'they never wrote back' }
  const last = said[said.length - 1]
  const quiet = Math.floor((now - last.ms) / DAY)
  if (quiet >= COLD_DAYS) return { label: 'cold', why: `nothing either way for ${quiet} days` }
  const askAt = said.map((m, i) => (m.fromOwner && ASK.test(m.text) ? i : -1)).filter((i) => i >= 0).pop()
  if (askAt !== undefined && !said.slice(askAt + 1).some((m) => !m.fromOwner)) return { label: 'askedWaiting', why: `you asked "${said[askAt].text.replace(/\s+/g, ' ').slice(0, 70)}" and they haven't answered` }
  const turns = turnsOf(said)
  const theirLast = theirs[theirs.length - 1]
  const fresh = now - theirLast.ms < ACTIVE_DAYS * DAY
  if (turns >= READY_TURNS && fresh) return { label: 'readyToAsk', why: `${turns} back and forths, they wrote ${Math.floor((now - theirLast.ms) / DAY)}d ago, no open ask` }
  return { label: 'warming', why: `${turns} back and forths so far${askAt === undefined ? ', no ask yet' : ', they answered your last ask'}` }
}

export function labelOfChat(chat: Pick<PersonChat, 'platform' | 'account' | 'storedAsGroup' | 'with' | 'personKey' | 'conversationIds' | 'messages'>, entries: readonly LabelEntry[], now: number = Date.now()): Labelled | null {
  const said = saidOnly(chat.messages)
  if (!said.length) return null
  const last = said[said.length - 1]
  const set = entries.find((e) => samePerson(e, { platform: chat.platform, account: chat.account, person: chat.personKey }))
  const auto = chat.storedAsGroup ? { label: 'skip' as Label, why: 'a group, label it by hand to work it' } : autoLabel(said, now)
  return {
    platform: chat.platform,
    account: chat.account,
    with: chat.with,
    person: chat.personKey,
    conversationIds: chat.conversationIds,
    label: set?.label ?? auto.label,
    set: !!set,
    why: set ? `set by ${set.by} at ${set.at}` : auto.why,
    lastAt: last.at,
    lastFromMe: last.fromOwner,
    turns: turnsOf(said),
  }
}

export function labelsOf(query: LabelQuery = {}, on: Database = db(), now: number = Date.now()): Labelled[] {
  const entries = labelList()
  const rows: Labelled[] = []
  for (const chat of chatsOf({ platform: query.platform, account: query.account }, on)) {
    const row = labelOfChat(chat, entries, now)
    if (!row || (query.label && row.label !== query.label)) continue
    rows.push(row.label === 'skip' ? row : { ...row, with: chat.named() })
  }
  return rows.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt))
}
