import type { Database } from 'bun:sqlite'
import { readBlobBytes } from '../../storage/platform/index.ts'
import { avatarDataUri } from '../../inbox/profiles/index.ts'
import type { Ask } from '../graph/types.ts'
import type { EvidenceTime, MachineAccount, PersonStanding, RoomFact, StageEvidence, StateMachineBlock } from '../machine/types.ts'
import { botKnowledge, type BotKnowledge } from '../machine/helpers/bots.ts'
import { factsOf, initialsOf, matterOf, personKeyOf } from '../machine/helpers/cells.ts'
import { evidenceOf, firstInteractions } from '../machine/helpers/read.ts'
import { joinedStanding, nextMoveOf, personBlock, stageLabelOf, standingOf, stepsOf } from '../machine/helpers/stages.ts'
import { MAP_LIMITS, MAP_DEFAULT_LIMIT, RING_LABELS, RING_TONES, TIER_RING } from './types.ts'
import type { MapAnswer, MapAsk, MapEdge, MapEdgeKind, MapHop, MapNode, MapRoom, MapRing, NetworkMapBlock } from './types.ts'

type Row = Record<string, unknown>
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
const avatarOf = (handle: Database | null, platform: string, userId: string): string | null => {
  if (!handle) return null
  const row = handle.prepare('SELECT avatarHash FROM identityProfiles WHERE platform = ? AND userId = ?').get(platform, userId) as { avatarHash: string | null } | null
  return row?.avatarHash ? avatarDataUri(readBlobBytes(handle, row.avatarHash)) : null
}
const isoMs = (v: unknown): number | null => {
  if (typeof v === 'number') return v
  const ms = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(ms) ? ms : null
}
const iso = (v: number | null): string | null => {
  if (v === null || !Number.isFinite(v)) return null
  try {
    return new Date(v).toISOString()
  } catch {
    return null
  }
}
const clip = (text: string, n: number): string => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat
}
const day = (v: string | null): string => (v ? v.slice(0, 10) : '')

async function rows(read: Ask, cypher: string, params: Record<string, unknown> = {}): Promise<Row[]> {
  try {
    return (await read(cypher, params)) as Row[]
  } catch {
    return []
  }
}

function merged(keys: readonly string[], evidence: Map<string, StageEvidence>, person: PersonFound): StageEvidence {
  const list = keys.map((k) => evidence.get(k)).filter((e): e is StageEvidence => Boolean(e))
  const first = list.find((e) => e.key === person.key) ?? list[0]
  const base: StageEvidence = first ? { ...first, near: [], rooms: [] } : {
    key: person.key, personId: person.personId ?? null, platform: person.platform, handle: person.handle, name: person.name,
    ring: null, followedAt: null, follows: false, nearAt: null, near: [], engagedAt: null, engagedHow: null,
    theyWroteAt: null, youWroteAt: null, lastAt: null, rooms: [],
  }
  const max = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.max(a, b))
  for (const f of ['followedAt', 'nearAt', 'engagedAt', 'theyWroteAt', 'youWroteAt'] as const) base[f] = null
  const earliest = (field: EvidenceTime, e: StageEvidence) => {
    const v = e[field]
    if (v === null) return
    const held = base[field]
    if (held === null || v < held) base[field] = v
  }
  for (const e of list) {
    base.follows ||= e.follows
    for (const f of ['followedAt', 'nearAt', 'engagedAt', 'theyWroteAt', 'youWroteAt'] as const) earliest(f, e)
    base.near.push(...e.near)
    base.rooms = [...(base.rooms ?? []), ...(e.rooms ?? [])]
    if (e.engagedHow && !base.engagedHow) base.engagedHow = e.engagedHow
    if (e.pointedAt != null && (base.pointedAt == null || e.pointedAt < base.pointedAt)) Object.assign(base, { pointedAt: e.pointedAt, pointedBy: e.pointedBy, pointedIn: e.pointedIn, pointedKind: e.pointedKind })
    base.lastAt = max(base.lastAt, e.lastAt)
    if (e.introducers?.length) base.introducers = [...new Set([...(base.introducers ?? []), ...e.introducers])]
  }
  base.handle ??= person.handle
  base.name ??= person.name
  base.near = [...new Set(base.near)]
  return base
}

function safeMachine(block: StateMachineBlock): StateMachineBlock {
  const seen = new Set<string>();
  const states = block.states.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  return { ...block, states, transitions: block.transitions.filter((t) => seen.has(t.from) && seen.has(t.to)) };
}

interface PersonFound {
  key: string
  keys: string[]
  personId: string | null
  platform: string
  handle: string | null
  name: string | null
}

function standingGroups(evidence: Map<string, StageEvidence>): PersonStanding[] {
  const groups = new Map<string, string[]>()
  for (const e of evidence.values()) {
    const group = e.personId ? `person:${e.personId}` : `${e.platform}:${(e.handle ?? e.key).toLowerCase()}`
    groups.set(group, [...(groups.get(group) ?? []), e.key])
  }
  return [...groups.values()].map((keys) => {
    const first = evidence.get(keys[0])!
    const person: PersonFound = { key: first.key, keys, personId: first.personId, platform: first.platform, handle: first.handle, name: first.name }
    const lanes = keys.map((k) => {
      const e = evidence.get(k)
      return e ? standingOf(e) : null
    }).filter((l): l is PersonStanding => Boolean(l))
    const joined = lanes.length > 1 ? joinedStanding(lanes) : null
    return joined ?? standingOf(merged(keys, evidence, person))
  })
}

async function accountsFor(read: Ask, e: StageEvidence): Promise<MachineAccount[]> {
  const rowsFound = await rows(read, `MATCH (j:Identity) WHERE (j.personId = $pid AND $pid IS NOT NULL) OR j.key = $key RETURN j.key AS key, j.platform AS platform, j.handle AS handle ORDER BY platform, key`, { pid: e.personId ?? null, key: e.key })
  return rowsFound.map((r) => ({ platform: String(r.platform), handle: String(r.handle ?? r.key), link: 'linked' as const }))
}

const roomMeaning = (r: RoomFact): string => {
  if (r.theirAt !== null && r.ownerAt !== null) return 'You both wrote here'
  if (r.theirAt !== null) return 'They wrote here'
  if (r.ownerAt !== null) return 'You wrote here'
  return 'A place you share'
}

function roomName(r: RoomFact): string {
  const name = r.name ?? (r.key.split(':').slice(1).join(':') || r.key)
  return r.server ? `${r.server} · ${name}` : name
}

async function roomsFor(read: Ask, s: PersonStanding, platform: string): Promise<MapRoom[]> {
  const out: MapRoom[] = []
  const seen = new Set<string>()
  const add = (key: string, name: string, server: string | null, kind: string, at: number | null, meaning: string) => {
    if (seen.has(key)) return
    seen.add(key)
    out.push({ key, name: clip(name, MAP_LIMITS.label), server: server ? clip(server, MAP_LIMITS.label) : null, kind, platform, meaning, at: iso(at), members: [] })
  }
  for (const r of s.evidence.rooms ?? []) {
    const times = [r.theirAt, r.ownerAt].filter((v): v is number => v !== null)
    add(r.key, roomName(r), r.server, r.kind, times.length ? Math.min(...times) : null, roomMeaning(r))
  }
  for (const r of await rows(read, `MATCH (i:Identity)-[:SAID|MEMBER_OF]->(g:Room) WHERE i.key = $key RETURN g.key AS key, coalesce(g.name, g.conversationId, g.key) AS name, g.server AS server, g.kind AS kind, min(coalesce(g.lastAtMs, g.lastSeenAt)) AS at`, { key: s.evidence.key })) {
    add(String(r.key), String(r.name ?? r.key), r.server ? String(r.server) : null, String(r.kind ?? 'room'), num(r.at), r.server ? 'Server or channel you share' : r.kind === 'dm' ? 'A direct chat' : 'A place you share')
  }
  return out.slice(0, 6)
}

function whyOf(s: PersonStanding): string {
  const e = s.evidence
  const parts: string[] = [`Ring ${TIER_RING[s.tier] ?? 4} — ${stageLabelOf(s.platform, s.stage)}`]
  if (e.engagedHow) parts.push(e.engagedHow)
  else if (e.theyWroteAt !== null && e.youWroteAt !== null) parts.push('you have both written in a direct chat')
  else if (e.theyWroteAt !== null) parts.push('they wrote to you first')
  else if (e.youWroteAt !== null) parts.push('you wrote to them')
  else if (e.pointedIn) parts.push(`in ${e.pointedIn}`)
  else if (e.near.length) parts.push(`shares ${e.near.slice(0, 2).join(', ')} with you`)
  if (e.introducers?.length) parts.push(`an intro is possible through ${e.introducers.slice(0, 2).join(', ')}`)
  const last = stepsOf(s.evidence).at(-1)
  if (last?.event) parts.push(`last: ${last.event}`)
  return clip(parts.join('; '), MAP_LIMITS.why)
}

async function edgesFor(read: Ask, keys: readonly string[]): Promise<MapEdge[]> {
  const edges: MapEdge[] = []
  const seen = new Set<string>()
  const add = (a: string, b: string, kind: MapEdgeKind, room: string, at: unknown) => {
    if (a === b) return
    const id = [a, b].sort().join('|') + kind
    if (seen.has(id)) return
    seen.add(id)
    edges.push({ a, b, kind, room: clip(room, MAP_LIMITS.label), at: iso(isoMs(at)) })
  }
  const shared = await rows(read, `MATCH (i:Identity)-[m:MEMBER_OF|SAID]->(g:Room)<-[n:MEMBER_OF|SAID]-(j:Identity) WHERE i.key IN $keys AND j.key IN $keys AND i.key < j.key AND g.kind <> 'dm' RETURN i.key AS a, j.key AS b, coalesce(g.name, g.conversationId, g.key) AS room, min(coalesce(m.firstSeenAt, m.firstAtMs, n.firstSeenAt, n.firstAtMs)) AS at`, { keys: [...keys] })
  for (const r of shared) add(String(r.a), String(r.b), 'shared', String(r.room ?? 'a shared room'), r.at)
  const dms = await rows(read, `MATCH (i:Identity)-[:SAID|MEMBER_OF]->(g:Room {kind: 'dm'})<-[:SAID|MEMBER_OF]-(j:Identity) WHERE i.key IN $keys AND j.key IN $keys AND i.key < j.key RETURN i.key AS a, j.key AS b, coalesce(g.name, g.conversationId, 'direct chat') AS room, min(g.lastAtMs) AS at`, { keys: [...keys] })
  for (const r of dms) add(String(r.a), String(r.b), 'direct', String(r.room ?? 'direct chat'), r.at)
  const withOwner = await rows(read, `MATCH (a:Account)-[:SAID]->(g:Room {kind: 'dm'})<-[:SAID|MEMBER_OF]-(i:Identity) WHERE i.key IN $keys RETURN i.key AS b, coalesce(g.name, g.conversationId, 'direct chat') AS room, min(g.lastAtMs) AS at`, { keys: [...keys] })
  for (const r of withOwner) add('owner', String(r.b), 'direct', String(r.room ?? 'direct chat'), r.at)
  for (const type of ['REPLIED_TO', 'MENTIONED', 'QUOTED'] as const) {
    const pointed = await rows(read, `MATCH (i:Identity)-[x:${type}]->(j:Identity) WHERE i.key IN $keys AND j.key IN $keys RETURN i.key AS a, j.key AS b, '${type.toLowerCase().replace(/_/g, ' ')}' AS room, min(x.firstAtMs) AS at`, { keys: [...keys] })
    const kind: MapEdgeKind = type === 'MENTIONED' ? 'mention' : type === 'QUOTED' ? 'quote' : 'reply'
    for (const r of pointed) add(String(r.a), String(r.b), kind, String(r.room), r.at)
  }
  const reacted = await rows(read, `MATCH (i:Identity)-[:ENGAGED]->(p:Post)<-[:ENGAGED]-(j:Identity) WHERE i.key IN $keys AND j.key IN $keys AND i.key < j.key RETURN i.key AS a, j.key AS b, 'reacted to the same post' AS room, min(p.lastAtMs) AS at`, { keys: [...keys] })
  for (const r of reacted) add(String(r.a), String(r.b), 'reacted', String(r.room), r.at)
  return edges.slice(0, MAP_LIMITS.edges)
}

function bridgePath(edges: readonly MapEdge[], handles: Map<string, string>, target: string): MapHop[] {
  if (!target || target === 'owner') return []
  const neighbours = new Map<string, MapEdge[]>()
  for (const e of edges) {
    neighbours.set(e.a, [...(neighbours.get(e.a) ?? []), e])
    neighbours.set(e.b, [...(neighbours.get(e.b) ?? []), { ...e, a: e.b, b: e.a }])
  }
  const queue: string[][] = [['owner']]
  const seen = new Set(['owner'])
  while (queue.length) {
    const route = queue.shift()!
    const last = route[route.length - 1]
    if (last === target) return route.map((key, i) => ({
      key,
      handle: handles.get(key) ?? (key === 'owner' ? 'You' : key),
      ...(i ? (() => { const e = edges.find((edge) => (edge.a === route[i - 1] && edge.b === key) || (edge.b === route[i - 1] && edge.a === key)); return e ? { room: e.room, at: e.at } : {} })() : {}),
    }))
    for (const e of neighbours.get(last) ?? []) if (!seen.has(e.b)) {
      seen.add(e.b)
      queue.push([...route, e.b])
    }
  }
  return []
}

export function mapText(block: NetworkMapBlock): string {
  const lines: string[] = []
  if (block.title) lines.push(`**${block.title}**`)
  if (block.summary) lines.push(block.summary)
  for (const ring of block.rings) {
    lines.push(`Ring ${ring.id} — ${ring.label}: ${ring.count}`)
    for (const key of ring.nodes) {
      const node = block.nodes.find((n) => n.key === key)
      if (!node) continue
      const place = node.rooms[0] ? `${node.rooms[0].server ? `${node.rooms[0].server} ` : ''}${node.rooms[0].name}` : 'no shared room yet'
      const fact = node.facts[0] ? ` · ${node.facts[0].text} (${day(node.facts[0].at)})` : ' · no lasting fact yet'
      const next = node.next ? ` · next: ${node.next.text} with ${node.next.tool}` : ''
      lines.push(`@${node.handle.replace(/^@/, '')} — ${place}${fact}${next}`)
    }
    if (ring.count > ring.nodes.length) lines.push(`+${ring.count - ring.nodes.length} more in ring ${ring.id}`)
  }
  if (block.path.length > 1) lines.push(`Route to @${block.target?.replace(/^@/, '') ?? block.path.at(-1)?.handle}: ${block.path.map((h) => `${h.handle}${h.room ? ` (${h.room}${h.at ? ` · ${day(h.at)}` : ''})` : ''}`).join(' → ')}`)
  if (block.nextCursor !== null) lines.push(`More people are available through the cursor.`)
  return lines.join('\n').slice(0, 3500)
}

export async function mapFrom(read: Ask, ask: MapAsk, throughSeq: number | null, handle: Database | null = null, now: number = Date.now()): Promise<MapAnswer> {
  const firsts = firstInteractions(handle)
  const evidence = await evidenceOf(read, null, firsts)
  const bots: BotKnowledge = botKnowledge(handle)
  const standings = standingGroups(evidence).filter((s) => !bots.keys.has(personKeyOf(s)))
  const context = { now }

  let pool = standings
  if (ask.platform && ask.platform !== 'all') pool = standings.filter((s) => s.lanes?.some((l) => l.platform === ask.platform) || s.evidence.platform === ask.platform)
  if (ask.quiet) pool = pool.filter((s) => s.evidence.lastAt !== null && now - s.evidence.lastAt > 14 * 86_400_000)
  const ranked = [...pool].map((s) => ({ s, score: matterOf(s, undefined, context.now) })).sort((a, b) => b.score - a.score || (b.s.evidence.lastAt ?? 0) - (a.s.evidence.lastAt ?? 0) || String(a.s.evidence.handle ?? a.s.evidence.key).localeCompare(String(b.s.evidence.handle ?? b.s.evidence.key))).map((x) => x.s)

  const cursor = Math.max(0, Math.floor(ask.cursor ?? 0))
  const limit = Math.max(1, Math.min(ask.limit ?? MAP_DEFAULT_LIMIT, MAP_LIMITS.nodes))
  const page = ranked.slice(cursor, cursor + limit)
  const nextCursor = cursor + page.length < ranked.length ? cursor + page.length : null

  const nodes: MapNode[] = []
  const ringMap = new Map<number, MapRing>()
  for (let ring = 1; ring <= 4; ring++) {
    const total = ranked.filter((s) => (TIER_RING[s.tier] ?? 4) === ring).length
    ringMap.set(ring, { id: ring, label: RING_LABELS[ring], tone: RING_TONES[ring], count: total, nodes: [] })
  }
  for (const s of page) {
    const key = personKeyOf(s)
    const ring = TIER_RING[s.tier] ?? 4
    const facts = factsOf(handle, [{ platform: s.evidence.platform, userId: key.slice(s.evidence.platform.length + 1), personId: s.evidence.personId }])
    const factRows = facts.get(key) ?? []
    const next = nextMoveOf(s)
    const nextNode = next ? { text: clip(next.event, MAP_LIMITS.text), tool: clip(next.tool ?? 'log', MAP_LIMITS.platform) } : undefined
    const rooms = await roomsFor(read, s, s.evidence.platform)
    const accounts = await accountsFor(read, s.evidence)
    const node: MapNode = {
      key,
      handle: String(s.evidence.handle ?? key),
      ...(s.evidence.name ? { name: clip(s.evidence.name, MAP_LIMITS.label) } : {}),
      initials: initialsOf(String(s.evidence.handle ?? key), s.evidence.name),
      avatar: avatarOf(handle, s.evidence.platform, key.slice(s.evidence.platform.length + 1)),
      platform: s.evidence.platform,
      platforms: [...new Set([s.evidence.platform, ...accounts.map((a) => a.platform)])],
      ring,
      tone: RING_TONES[ring],
      why: whyOf(s),
      rooms,
      facts: factRows.slice(0, MAP_LIMITS.facts).map((f) => ({ slot: f.slot, text: clip(f.text, MAP_LIMITS.text), quote: clip(f.quote, MAP_LIMITS.quote), at: day(f.validFrom) })),
      ...(nextNode ? { next: nextNode } : {}),
      lanes: (s.lanes ?? []).map((l) => ({ platform: l.platform, state: stageLabelOf(l.platform, l.stage) })).slice(0, MAP_LIMITS.lanes),
      quiet: s.evidence.lastAt !== null && now - s.evidence.lastAt > 14 * 86_400_000,
      talk: Boolean(nextNode && /intro|dm|reply|reach|message/i.test(nextNode.text)),
      at: s.evidence.lastAt,
      machine: safeMachine(personBlock(s, throughSeq, accounts)),
    }
    nodes.push(node)
    ringMap.get(ring)!.nodes.push(key)
  }

  const keys = [...new Set([...nodes.map((n) => n.key), ...nodes.flatMap((n) => n.lanes.length ? [] : [])])]
  const edges = await edgesFor(read, keys)
  const rooms: MapRoom[] = []
  const roomSeen = new Set<string>()
  for (const node of nodes) for (const room of node.rooms) if (!roomSeen.has(room.key)) {
    roomSeen.add(room.key)
    rooms.push(room)
  }
  for (const edge of edges) if (edge.room && edge.kind !== 'mention' && edge.kind !== 'reply' && edge.kind !== 'quote' && edge.kind !== 'reacted') {
    const k = `edge:${edge.room}`
    if (!roomSeen.has(k)) {
      roomSeen.add(k)
      rooms.push({ key: k, name: edge.room, server: null, kind: edge.kind, platform: 'all', meaning: edge.kind === 'direct' ? 'A direct chat' : 'A room you share', at: edge.at, members: [] })
    }
  }

  const roomKeys = rooms.map((r) => r.key).filter((k) => !k.startsWith('edge:'))
  if (roomKeys.length) for (const r of await rows(read, `MATCH (i:Identity)-[:MEMBER_OF|SAID]->(g:Room) WHERE g.key IN $keys RETURN g.key AS key, collect(DISTINCT coalesce(i.handle, i.name))[0..3] AS members`, { keys: roomKeys })) {
    const room = rooms.find((item) => item.key === String(r.key))
    if (room) room.members = ((r.members as string[] | null) ?? []).filter(Boolean).map((m) => String(m).replace(/^@/, ''))
  }

  const handles = new Map<string, string>([['owner', 'You'], ...nodes.map((n) => [n.key, `@${n.handle.replace(/^@/, '')}`] as [string, string])])
  const targetRaw = ask.to ?? ask.person
  const targetNode = targetRaw ? nodes.find((n) => n.handle.toLowerCase().includes(targetRaw.toLowerCase().replace(/^@/, '')) || n.key.toLowerCase().includes(targetRaw.toLowerCase())) : undefined
  const target = targetNode?.key ?? nodes[0]?.key ?? ''
  const path = bridgePath(edges, handles, target)

  const platform = ask.platform ?? 'all'
  const block: NetworkMapBlock = {
    type: 'networkMap',
    title: 'Your network, drawn',
    summary: `${ranked.length} people in the Relate graph · ${edges.length} real connections · shown ${nodes.length}`,
    view: 'overview',
    platform,
    cursor,
    nextCursor,
    total: ranked.length,
    rings: [...ringMap.values()],
    nodes,
    edges,
    rooms: rooms.slice(0, MAP_LIMITS.rooms),
    path,
    ...(targetNode ? { target: targetNode.key } : {}),
  }
  return { ok: true, block, text: mapText(block), throughSeq: throughSeq ?? 0 }
}
