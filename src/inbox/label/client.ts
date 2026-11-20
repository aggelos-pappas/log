import type { Database } from 'bun:sqlite'
import { getState, putState } from '../../storage/state/index'
import { chatsOf, personKeyOf, saidOnly } from '../lastWord/index'
import type { LastWordMessage, PersonChat } from '../lastWord/index'
import { db } from '../store/index'
import { pipelineRows } from '../pipeline/client'
import { SALES_WHO, TEACHER_BY } from '../pipeline/types'
import type { PipelineRow } from '../pipeline/types'
import { ACTIVE_DAYS, ASK, COLD_DAYS, LABELS, OLD_LABEL_FIELDS, READY_TURNS } from './types'
import type { Label, LabelEntry, LabelFields, LabelList, LabelQuery, Labelled } from './types'

const DAY = 86_400_000

export function isLabel(value: string): value is Label {
  return (LABELS as readonly string[]).includes(value)
}

export function labelList(): LabelEntry[] {
  return getState<LabelList>('inboxLabels', 'all')?.body.entries ?? []
}

const samePerson = (a: Pick<LabelEntry, 'platform' | 'account' | 'person'>, b: Pick<LabelEntry, 'platform' | 'account' | 'person'>): boolean => a.platform === b.platform && a.account === b.account && a.person === b.person

export function setLabel(target: { platform: string; account: string; chat: string }, value: Label | LabelFields | null, by: string, now: Date = new Date()): LabelEntry[] {
  const person = personKeyOf(target.chat)
  const all = labelList()
  const current = all.find((e) => samePerson(e, { platform: target.platform, account: target.account, person }))
  if (by === TEACHER_BY && current && current.by !== TEACHER_BY) return all
  const kept = all.filter((e) => e !== current)
  const fields: LabelFields | null = value === null ? null : typeof value === 'string' ? { label: value, ...(OLD_LABEL_FIELDS[value].who ? { who: OLD_LABEL_FIELDS[value].who! } : {}) } : value
  const where = fields?.who && SALES_WHO.includes(fields.who) ? (fields.where ?? null) : null
  const entries = fields ? [...kept, { platform: target.platform, account: target.account, person, ...fields, ...(fields.who ? { where } : {}), by, at: now.toISOString() }] : kept
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

function oldLabelOf(who: string | null, where: string | null, counted: Label): Label {
  if (!who) return counted
  if (who === 'bot') return 'skip'
  if (who === 'friend' || who === 'partner') return 'friend'
  if (who === 'client') return where === 'lost' || where === 'goneQuiet' ? 'cold' : 'client'
  if (who === 'lead') return where === 'won' ? 'client' : where === 'lost' || where === 'goneQuiet' ? 'cold' : counted
  if (who === 'community') return counted === 'readyToAsk' ? 'warming' : counted
  return counted
}

export function labelOfChat(chat: Pick<PersonChat, 'platform' | 'account' | 'storedAsGroup' | 'with' | 'personKey' | 'conversationIds' | 'messages'>, entries: readonly LabelEntry[], now: number = Date.now(), stored: PipelineRow | null = null): Labelled | null {
  const said = saidOnly(chat.messages)
  if (!said.length) return null
  const last = said[said.length - 1]
  const found = entries.find((e) => samePerson(e, { platform: chat.platform, account: chat.account, person: chat.personKey }))
  const owner = found && found.by !== TEACHER_BY ? found : undefined
  const teacher = found && found.by === TEACHER_BY && (!stored || (found.confidence ?? 0) > stored.confidence) ? found : undefined
  const auto = chat.storedAsGroup ? { label: 'skip' as Label, why: 'a group, label it by hand to work it' } : autoLabel(said, now)
  const handWho = owner?.who ?? (owner?.label ? OLD_LABEL_FIELDS[owner.label].who : null)
  const handWhere = owner?.who ? (owner.where ?? null) : owner?.label ? OLD_LABEL_FIELDS[owner.label].where : null
  const who = handWho ?? teacher?.who ?? stored?.who ?? null
  const rawWhere = owner && (owner.who || owner.label) ? (handWhere ?? (handWho ? null : stored?.where ?? null)) : teacher ? (teacher.where ?? null) : (stored?.where ?? null)
  const where = who && SALES_WHO.includes(who) ? rawWhere : null
  const labelledBy = owner ? owner.by : teacher ? TEACHER_BY : stored ? stored.source : 'counting'
  const why = owner ? `set by ${owner.by} at ${owner.at}` : teacher ? `the teacher (${TEACHER_BY}) said so at ${Math.round((teacher.confidence ?? 0) * 100)}%` : auto.why
  return {
    platform: chat.platform,
    account: chat.account,
    with: chat.with,
    person: chat.personKey,
    conversationIds: chat.conversationIds,
    label: owner?.label ?? (chat.storedAsGroup ? 'skip' : oldLabelOf(who, where, auto.label)),
    who,
    where,
    confidence: owner ? 1 : teacher ? (teacher.confidence ?? null) : (stored?.confidence ?? null),
    labelledBy,
    emotions: stored?.emotions ?? null,
    set: !!owner,
    why: !owner && !teacher && stored && stored.source !== 'group' ? `${why}; ${stored.source} ${Math.round(stored.confidence * 100)}%` : why,
    lastAt: last.at,
    lastFromMe: last.fromOwner,
    turns: turnsOf(said),
  }
}

export function labelsOf(query: LabelQuery = {}, on: Database = db(), now: number = Date.now()): Labelled[] {
  const entries = labelList()
  const stored = new Map(pipelineRows({ platform: query.platform, account: query.account }, on).map((r) => [`${r.platform}\u0000${r.account}\u0000${r.person}`, r]))
  const rows: Labelled[] = []
  for (const chat of chatsOf({ platform: query.platform, account: query.account }, on)) {
    const row = labelOfChat(chat, entries, now, stored.get(`${chat.platform}\u0000${chat.account}\u0000${chat.personKey}`) ?? null)
    if (!row || (query.label && row.label !== query.label) || (query.who && row.who !== query.who) || (query.where && row.where !== query.where)) continue
    rows.push(row.label === 'skip' ? row : { ...row, with: chat.named() })
  }
  return rows.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt))
}
