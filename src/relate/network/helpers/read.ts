import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MAP_FILE, SCORES_FILE, TOP_THEMES } from '../types'
import type { NetworkCircleRow, NetworkCommunityRow, NetworkLeaderRow, NetworkData, NetworkMentionRow, NetworkPersonRow, NetworkRunRow } from '../types'

type Raw = Record<string, unknown>

export const RESEARCH_FIT_FIELD = 'goGetterScore'

const lower = (handle: unknown): string => String(handle ?? '').replace(/^@/, '').trim().toLowerCase()

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const json = (v: unknown): string | null => (v === undefined || v === null ? null : JSON.stringify(v))

const pairKey = (a: string, b: string): string => `${a} ${b}`

const atMs = (v: unknown): number | null => {
  const ms = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(ms) ? ms : null
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function missingFiles(dir: string): string[] {
  return [SCORES_FILE, MAP_FILE].filter((f) => !existsSync(join(dir, f)))
}

export function topThemesOf(themes: unknown, n: number = TOP_THEMES): string[] {
  if (!themes || typeof themes !== 'object') return []
  return Object.entries(themes as Record<string, unknown>).filter(([, v]) => typeof v === 'number').sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, n).map(([k]) => k)
}

function blankPerson(handle: string): NetworkPersonRow {
  return { handleLower: handle.toLowerCase(), handle, name: null, followers: null, degree: null, ring: null, band: null, bandProbabilities: null, fit: null, components: null, themes: null, topThemes: '[]', workflowStage: null, passesGates: null, followsOwner: 0, company: null, rank: null, role: null, bio: null, tieStrength: null, lastPostText: null, lastPostAtMs: null }
}

function personOf(row: Raw): NetworkPersonRow | null {
  const handle = text(row.handle)?.replace(/^@/, '')
  if (!handle) return null
  const signals = (row.signals ?? {}) as Raw
  return {
    ...blankPerson(handle),
    name: text(row.name),
    followers: num(row.followers),
    degree: num(row.degree),
    ring: num(signals.proximityTier),
    band: text(row.band),
    bandProbabilities: json(row.bandProbabilities),
    fit: num(row[RESEARCH_FIT_FIELD]),
    components: json(row.components),
    themes: json(row.themes),
    topThemes: JSON.stringify(topThemesOf(row.themes)),
    workflowStage: text(row.workflowStage),
    passesGates: typeof row.passesGates === 'boolean' ? Number(row.passesGates) : null,
    followsOwner: signals.followsMe === true ? 1 : 0,
    company: text(row.company),
    rank: num(row.rank),
  }
}

export function readNetworkDir(dir: string): NetworkData {
  const scores = readJson(join(dir, SCORES_FILE)) as Raw[]
  const map = readJson(join(dir, MAP_FILE)) as Raw
  const people = new Map<string, NetworkPersonRow>()
  const circleOf = new Map<string, string[]>()
  const circleCounts = new Map<string, number>()
  for (const row of Array.isArray(scores) ? scores : []) {
    const person = personOf(row)
    if (!person) continue
    people.set(person.handleLower, person)
    const listed = (((row.signals ?? {}) as Raw).circles as unknown[] | undefined) ?? []
    const circles = [...new Set(listed.map(lower).filter(Boolean))]
    circleOf.set(person.handleLower, circles)
    for (const c of circles) circleCounts.set(c, (circleCounts.get(c) ?? 0) + 1)
  }

  for (const p of (map.people as Raw[] | undefined) ?? []) {
    const handle = text(p.handle)?.replace(/^@/, '')
    if (!handle) continue
    const key = handle.toLowerCase()
    const row = people.get(key) ?? blankPerson(handle)
    const role = (((p.classification ?? {}) as Raw).role ?? {}) as Raw
    row.name ??= text(p.name)
    row.followers ??= num(p.followers)
    row.degree ??= num(p.degree)
    row.role = text(role.value)
    row.bio = text(p.bio)
    row.tieStrength = num(p.tieStrength)
    if (p.followsYou === true) row.followsOwner = 1
    people.set(key, row)
    const ties = ((p.ties as Raw[] | undefined) ?? []).map((t) => lower(t.creator)).filter(Boolean)
    if (ties.length) circleOf.set(key, [...new Set([...(circleOf.get(key) ?? []), ...ties])])
  }

  const communities = new Map<string, NetworkCommunityRow>()
  for (const c of (map.communities as Raw[] | undefined) ?? []) {
    const id = text(c.id)
    if (!id) continue
    const network = ((((c.classification ?? {}) as Raw).network ?? {}) as Raw).value
    communities.set(id, { communityId: id, name: text(c.name), url: text(c.url), platform: text(c.platform), topic: text(network) })
  }
  const idByName = new Map<string, string>()
  const leaders = new Map<string, NetworkLeaderRow>()
  const runs = new Map<string, NetworkRunRow>()
  for (const c of (map.creators as Raw[] | undefined) ?? []) {
    const x = (c.x ?? null) as Raw | null
    const handle = text(x?.handle)?.replace(/^@/, '')
    if (!handle) continue
    const key = handle.toLowerCase()
    if (!leaders.has(key)) leaders.set(key, { handleLower: key, handle, name: text(x?.name) ?? text(c.name), followers: num(x?.followers), world: text(c.world) ?? 'gtm' })
    let id = text(c.communityId)
    const name = text(c.communityName)
    if (id && !communities.has(id)) {
      const same = name ? idByName.get(name) : undefined
      if (same) id = same
      else {
        communities.set(id, { communityId: id, name, url: text(c.evidenceUrl), platform: null, topic: null })
        if (name) idByName.set(name, id)
      }
    }
    if (id) runs.set(pairKey(key, id), { leaderLower: key, communityId: id })
  }

  const circles: NetworkCircleRow[] = []
  for (const [person, list] of circleOf) for (const leader of list) if (leaders.has(leader) && leader !== person) circles.push({ personLower: person, leaderLower: leader })

  const mentions = new Map<string, NetworkMentionRow>()
  const posts = (((map.mentions ?? {}) as Raw).posts as Raw[] | undefined) ?? []
  for (const post of posts) {
    const from = lower(post.author)
    if (!from) continue
    const at = atMs(post.createdAt)
    const author = people.get(from)
    if (author && at !== null && (author.lastPostAtMs === null || at > author.lastPostAtMs)) {
      author.lastPostAtMs = at
      author.lastPostText = text(post.text)
    }
    for (const to of new Set(((post.mentions as unknown[] | undefined) ?? []).map(lower))) {
      if (!to || to === from) continue
      const key = pairKey(from, to)
      const held = mentions.get(key)
      if (!held) {
        mentions.set(key, { fromLower: from, toLower: to, times: 1, lastAtMs: at })
        continue
      }
      held.times += 1
      if (at !== null && (held.lastAtMs === null || at > held.lastAtMs)) held.lastAtMs = at
    }
  }

  return {
    mapVersion: text(map.schemaVersion),
    generatedAt: text(map.generatedAt),
    people: [...people.values()],
    leaders: [...leaders.values()],
    communities: [...communities.values()],
    runs: [...runs.values()],
    circles,
    mentions: [...mentions.values()],
    circleCounts,
  }
}
