import type { Database } from 'bun:sqlite'
import { RINGS, X_PLATFORM } from '../types'
import type { NetworkAccount, NetworkPersonView, PlatformRings, RingCounts } from '../types'

export const blankCounts = (): RingCounts => ({ '1': 0, '2': 0, '3': 0, '4': 0 })

export const bump = (counts: RingCounts, ring: number): void => {
  const key = String(Math.min(Math.max(ring, RINGS.engaged), RINGS.known)) as keyof RingCounts
  counts[key] += 1
}

export interface IdentityRing extends NetworkAccount {
  key: string
  live: number
}

export interface NetworkMap {
  identities: Map<string, IdentityRing>
  personOf: Map<string, string>
  names: Map<string, string | null>
  imported: number
  merged: number
}

const closer = (a: Pick<NetworkAccount, 'ring'>, b: Pick<NetworkAccount, 'ring'>): boolean => a.ring < b.ring

export function networkMapOf(handle: Database): NetworkMap {
  const accounts = handle.query('SELECT platform, account, userId FROM accounts').all() as { platform: string; account: string; userId: string }[]
  const ownerIds = new Set(accounts.map((a) => `${a.platform}:${a.userId}`))
  const ownerHandles = new Set(accounts.map((a) => `${a.platform}:${a.account.replace(/^@/, '').toLowerCase()}`))
  const identities = new Map<string, IdentityRing>()
  const byHandle = new Map<string, string>()
  const usable = (userId: string) => !userId.startsWith('unknown:') && !userId.startsWith('self:')
  for (const i of handle.query('SELECT platform, userId, handle, displayName FROM identities').all() as { platform: string; userId: string; handle: string | null; displayName: string | null }[]) {
    const key = `${i.platform}:${i.userId}`
    const lower = i.handle?.replace(/^@/, '').toLowerCase() ?? null
    if (!usable(i.userId) || ownerIds.has(key) || (lower && ownerHandles.has(`${i.platform}:${lower}`))) continue
    identities.set(key, { key, platform: i.platform, userId: i.userId, handle: i.handle?.replace(/^@/, '') ?? i.displayName, ring: RINGS.known, live: RINGS.known, reason: 'known', via: null })
    if (i.platform === X_PLATFORM && lower && !byHandle.has(lower)) byHandle.set(lower, key)
  }
  for (const a of handle.query('SELECT handle, userId FROM handleAliases WHERE platform = ?').all(X_PLATFORM) as { handle: string; userId: string }[]) {
    const key = `${X_PLATFORM}:${a.userId}`
    if (identities.has(key) && !byHandle.has(a.handle)) byHandle.set(a.handle, key)
  }
  for (const r of handle.query('SELECT platform, userId, ring, reason, via FROM networkRings').all() as { platform: string; userId: string; ring: number; reason: string; via: string | null }[]) {
    const key = `${r.platform}:${r.userId}`
    if (ownerIds.has(key)) continue
    const held = identities.get(key) ?? { key, platform: r.platform, userId: r.userId, handle: null, ring: RINGS.known, live: RINGS.known, reason: 'known', via: null }
    if (r.ring <= held.ring) Object.assign(held, { ring: r.ring, live: r.ring, reason: r.reason, via: r.via })
    identities.set(key, held)
  }
  let imported = 0
  let merged = 0
  for (const p of handle.query('SELECT handleLower, handle, ring FROM networkPeople').all() as { handleLower: string; handle: string; ring: number | null }[]) {
    const ring = p.ring ?? RINGS.known
    const key = byHandle.get(p.handleLower)
    if (key) {
      merged += 1
      const held = identities.get(key)!
      if (ring < held.ring) Object.assign(held, { ring, reason: 'imported', via: null })
    } else {
      imported += 1
      const placeholder = `${X_PLATFORM}:@${p.handleLower}`
      identities.set(placeholder, { key: placeholder, platform: X_PLATFORM, userId: `@${p.handleLower}`, handle: p.handle, ring, live: RINGS.known, reason: 'imported', via: null, imported: true })
    }
  }
  const personOf = new Map<string, string>()
  for (const l of handle.query('SELECT platform, userId, personId FROM identityLinks WHERE revokedAt IS NULL').all() as { platform: string; userId: string; personId: string }[]) {
    const key = `${l.platform}:${l.userId}`
    if (identities.has(key)) personOf.set(key, l.personId)
  }
  const names = new Map((handle.query('SELECT personId, name FROM persons').all() as { personId: string; name: string | null }[]).map((p) => [p.personId, p.name]))
  return { identities, personOf, names, imported, merged }
}

const account = (i: IdentityRing): NetworkAccount => ({ platform: i.platform, userId: i.userId, handle: i.handle, ring: i.ring, reason: i.reason, via: i.via, ...(i.imported ? { imported: true } : {}) })

export function peopleOf(map: NetworkMap, platform: string | null = null): NetworkPersonView[] {
  const groups = new Map<string, IdentityRing[]>()
  for (const i of map.identities.values()) {
    const group = map.personOf.get(i.key) ?? i.key
    groups.set(group, [...(groups.get(group) ?? []), i])
  }
  const out: NetworkPersonView[] = []
  for (const [group, members] of groups) {
    if (platform && !members.some((m) => m.platform === platform)) continue
    const best = members.filter((m) => !platform || m.platform === platform).reduce((a, b) => (closer(b, a) ? b : a))
    const personId = map.personOf.get(members[0]!.key) ?? null
    out.push({ personId, name: personId ? (map.names.get(personId) ?? null) : null, key: group, ring: best.ring, live: best.live, reason: best.reason, platform: best.platform, platforms: [...new Set(members.map((m) => m.platform))].sort(), accounts: members.map(account).sort((a, b) => a.ring - b.ring || a.platform.localeCompare(b.platform)) })
  }
  return out
}

export function countsOf(people: readonly NetworkPersonView[], live = false): RingCounts {
  const counts = blankCounts()
  for (const p of people) if (!live || p.accounts.some((a) => !a.imported)) bump(counts, live ? p.live : p.ring)
  return counts
}

export function platformRingsOf(map: NetworkMap): PlatformRings[] {
  const out = new Map<string, PlatformRings>()
  for (const i of map.identities.values()) {
    const held = out.get(i.platform) ?? { platform: i.platform, counts: blankCounts(), identities: 0, linked: 0 }
    bump(held.counts, i.ring)
    held.identities += 1
    if (map.personOf.has(i.key)) held.linked += 1
    out.set(i.platform, held)
  }
  return [...out.values()].sort((a, b) => b.identities - a.identities)
}
