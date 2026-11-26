import type { Database } from 'bun:sqlite'
import { randomBytes } from 'node:crypto'
import { identityLinkedEvent, identityNotLinkedEvent, identityUnlinkedEvent, insertEventRow, personNamedEvent } from '../storage/platform/index'
import { identitiesNamed, infoOf, keyOf } from './helpers/identity'
import { personCardOf } from './helpers/card'
import { sharedLinkTo } from './helpers/match'
import { mentionedTokens } from '../relate/graph/helpers/mentions'
import { PEOPLE_IN_PROMPT, PERSON_ID_PREFIX } from './types'
import type { IdentityInfo, IdentityRef, MessageSource, PersonCard, PersonRow } from './types'

export type Resolved = { ok: true; personId: string | null; identities: IdentityInfo[] } | { ok: false; problem: string }

export function personIdentities(handle: Database, personId: string): IdentityInfo[] {
  const rows = handle.prepare('SELECT platform, userId FROM identityLinks WHERE personId = ? AND revokedAt IS NULL ORDER BY platform, userId').all(personId) as { platform: string; userId: string }[]
  return rows.map((r) => infoOf(handle, r))
}

export function listPeople(handle: Database): PersonRow[] {
  const persons = handle.prepare('SELECT personId, name FROM persons ORDER BY updatedAt DESC').all() as { personId: string; name: string | null }[]
  return persons.map((p) => ({ ...p, identities: personIdentities(handle, p.personId) })).filter((p) => p.identities.length > 0)
}

export function resolveWho(handle: Database, spec: string): Resolved {
  const text = spec.trim()
  if (text.startsWith(PERSON_ID_PREFIX)) {
    const identities = personIdentities(handle, text)
    return identities.length ? { ok: true, personId: text, identities } : { ok: false, problem: `no person ${text} with a linked identity` }
  }
  const byName = handle.prepare('SELECT personId FROM persons WHERE lower(name) = lower(?)').all(text) as { personId: string }[]
  if (byName.length === 1) return resolveWho(handle, byName[0].personId)
  const found = identitiesNamed(handle, text).map((r) => infoOf(handle, r))
  if (!found.length) return { ok: false, problem: `log.db knows no one called ${text}; name them as platform:handle, e.g. discord:someone or twitter:@someone` }
  const people = [...new Set(found.map((f) => f.personId).filter((p): p is string => Boolean(p)))]
  if (people.length === 1) return resolveWho(handle, people[0])
  if (people.length > 1) return { ok: false, problem: `${text} matches identities of ${people.length} different people (${people.join(', ')}); say which with platform:handle or the person id` }
  const platforms = new Set(found.map((f) => f.platform))
  if (platforms.size > 1) return { ok: false, problem: `${text} matches identities on ${[...platforms].join(' and ')} that aren't linked: ${found.map((f) => `${f.platform}:${f.handle ?? f.userId}`).join(', ')}. Link them with log people link, or say which with platform:handle` }
  return { ok: true, personId: null, identities: [found.find((f) => !f.userId.startsWith('@')) ?? found[0]] }
}

function oneIdentity(handle: Database, spec: string): IdentityInfo | string {
  const found = identitiesNamed(handle, spec).map((r) => infoOf(handle, r))
  if (!found.length) return `log.db knows no identity ${spec}`
  const platforms = new Set(found.map((f) => f.platform))
  if (platforms.size > 1) return `${spec} is on ${[...platforms].join(' and ')}: say which, e.g. ${[...platforms][0]}:${spec.replace(/^.*:/, '')}`
  return found.find((f) => !f.userId.startsWith('@')) ?? found[0]
}

export interface SeenIdentity {
  identity: IdentityInfo
  seenIn: MessageSource
}

export interface LinkResult {
  ok: boolean
  problem?: string
  personId?: string
  linked: IdentityInfo[]
  already: IdentityInfo[]
  seen: SeenIdentity[]
}

function refOf(spec: string): IdentityRef | null {
  const text = spec.trim()
  const colon = text.indexOf(':')
  if (colon <= 0) return null
  const who = text.slice(colon + 1).trim()
  const bare = who.replace(/^@/, '')
  if (!bare) return null
  return { platform: text.slice(0, colon).toLowerCase(), userId: !who.startsWith('@') && /^\d{5,}$/.test(who) ? who : `@${bare.toLowerCase()}` }
}

export function linkableIdentity(handle: Database, spec: string): IdentityInfo | SeenIdentity | string {
  const one = oneIdentity(handle, spec)
  if (typeof one !== 'string' || !one.startsWith('log.db knows no identity')) return one
  const ref = refOf(spec)
  const seenIn = ref ? sharedLinkTo(handle, ref) : null
  if (!ref || !seenIn) return `${one}, and no message in log.db shares a link to it`
  return { identity: { platform: ref.platform, userId: ref.userId, handle: ref.userId.startsWith('@') ? ref.userId.slice(1) : null, name: null, personId: null, runByLogAs: null }, seenIn }
}

export function linkIdentities(handle: Database, specs: readonly string[], by: string, options: { name?: string | null; evidence?: string | null; now?: Date } = {}): LinkResult {
  const now = options.now ?? new Date()
  const identities: IdentityInfo[] = []
  const seen: SeenIdentity[] = []
  for (const spec of specs) {
    const found = linkableIdentity(handle, spec)
    if (typeof found === 'string') return { ok: false, problem: found, linked: [], already: [], seen: [] }
    const one = 'seenIn' in found ? found.identity : found
    if ('seenIn' in found && !seen.some((s) => keyOf(s.identity) === keyOf(one))) seen.push(found)
    if (!identities.some((i) => keyOf(i) === keyOf(one))) identities.push(one)
  }
  if (identities.length < 2 && !options.name) return { ok: false, problem: 'name at least two identities to link, or one with --name to start a person', linked: [], already: [], seen: [] }
  return handle.transaction((): LinkResult => {
    const fresh = identities.map((i) => (seen.some((s) => keyOf(s.identity) === keyOf(i)) ? i : infoOf(handle, i)))
    const people = [...new Set(fresh.map((i) => i.personId).filter((p): p is string => Boolean(p)))]
    if (people.length > 1) return { ok: false, problem: `these identities already belong to ${people.length} different people (${people.join(', ')}); unlink one first, merging people isn't built yet`, linked: [], already: [], seen: [] }
    const personId = people[0] ?? `${PERSON_ID_PREFIX}${randomBytes(6).toString('hex')}`
    const at = now.toISOString()
    if (!people.length || options.name) insertEventRow(handle, personNamedEvent(personId, options.name ?? null, by, at), now)
    const linked: IdentityInfo[] = []
    const already: IdentityInfo[] = []
    for (const i of fresh) {
      if (i.personId === personId) {
        already.push(i)
        continue
      }
      const seenIn = seen.find((s) => keyOf(s.identity) === keyOf(i))?.seenIn ?? null
      insertEventRow(handle, identityLinkedEvent(personId, i, by, options.evidence ?? null, at, seenIn ? { handle: i.handle, ...seenIn } : null), now)
      linked.push({ ...i, personId })
    }
    return { ok: true, personId, linked, already, seen }
  }).immediate()
}

export function unlinkIdentity(handle: Database, spec: string, by: string, now: Date = new Date()): { ok: boolean; problem?: string; identity?: IdentityInfo; personId?: string } {
  const one = oneIdentity(handle, spec)
  if (typeof one === 'string') return { ok: false, problem: one }
  if (!one.personId) return { ok: false, problem: `${spec} isn't linked to anyone` }
  insertEventRow(handle, identityUnlinkedEvent(one.personId, one, by, now.toISOString()), now)
  return { ok: true, identity: one, personId: one.personId }
}

export function markNotLinked(handle: Database, first: string, second: string, by: string, now: Date = new Date()): { ok: boolean; problem?: string } {
  const a = oneIdentity(handle, first)
  if (typeof a === 'string') return { ok: false, problem: a }
  const b = oneIdentity(handle, second)
  if (typeof b === 'string') return { ok: false, problem: b }
  insertEventRow(handle, identityNotLinkedEvent(a, b, by, now.toISOString()), now)
  return { ok: true }
}

export function cardFor(handle: Database, spec: string, now: number = Date.now()): { ok: true; card: PersonCard } | { ok: false; problem: string } {
  const who = resolveWho(handle, spec)
  if (!who.ok) return who
  return { ok: true, card: personCardOf(handle, who.personId, who.identities, now) }
}

export function cardsNamedIn(handle: Database, prompt: string, now: number = Date.now()): PersonCard[] {
  const { tagged, bare } = mentionedTokens(prompt)
  const tokens = [...new Set([...tagged, ...bare])]
  if (!tokens.length) return []
  const marks = tokens.map(() => '?').join(',')
  const byHandle = handle.prepare(`SELECT DISTINCT l.personId FROM identityLinks l JOIN identities i ON i.platform = l.platform AND i.userId = l.userId WHERE l.revokedAt IS NULL AND (lower(i.handle) IN (${marks}) OR lower(l.userId) IN (${marks}))`).all(...tokens, ...tokens.map((t) => `@${t}`)) as { personId: string }[]
  const persons = handle.prepare('SELECT personId, name FROM persons WHERE name IS NOT NULL').all() as { personId: string; name: string }[]
  const byName = persons.filter((p) => p.name.toLowerCase().split(/[^\p{L}\p{N}_]+/u).some((w) => w.length >= 4 && tokens.includes(w)))
  const ids = [...new Set([...byHandle.map((r) => r.personId), ...byName.map((p) => p.personId)])].slice(0, PEOPLE_IN_PROMPT)
  return ids.map((personId) => personCardOf(handle, personId, personIdentities(handle, personId), now)).filter((c) => c.identities.length > 0)
}
