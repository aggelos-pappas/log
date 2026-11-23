import type { MachinePlatform, StateMachineBlock, Tier } from "../machine/types.ts"

export const MAP_BLOCK = 'networkMap'

export const MAP_VIEWS = ['overview', 'person'] as const
export type MapView = (typeof MAP_VIEWS)[number]

export const MAP_FORMS = ['view', 'genui'] as const
export type MapForm = (typeof MAP_FORMS)[number]

export const MAP_TONES = ['orange', 'teal', 'blue', 'gray'] as const
export type MapTone = (typeof MAP_TONES)[number]

export const MAP_PLATFORMS = ['all', 'twitter', 'discord', 'instagram', 'slack', 'reddit', 'facebook', 'linkedin'] as const
export type MapPlatform = (typeof MAP_PLATFORMS)[number]

export const MAP_LIMITS = {
  nodes: 32, edges: 96, rooms: 64, perRing: 6, facts: 3, lanes: 4,
  id: 60, label: 80, text: 260, quote: 140, why: 400, at: 40, platform: 20,
} as const

export const MAP_PAGE = 6
export const MAP_DEFAULT_LIMIT = 24
export const MAP_READ_MS = 60_000

export const MAP_REFUSALS = ['relateMapNoGraph', 'relateMapNobody', 'graphUnreadable'] as const
export type MapRefusal = (typeof MAP_REFUSALS)[number]

export const RING_LABELS: Record<number, string> = {
  1: 'engaged with you',
  2: 'talks to your people',
  3: 'follows you',
  4: 'known',
}
export const RING_TONES: Record<number, MapTone> = { 1: 'orange', 2: 'teal', 3: 'blue', 4: 'gray' }

export const TIER_RING: Record<Tier, number> = {
  engaged: 1, reachedOut: 1, inConversation: 1,
  nearYou: 2, followsYou: 3, new: 4,
}

export interface MapRoom {
  key: string
  name: string
  server: string | null
  kind: string
  platform: string
  meaning: string
  at: string | null
  members: string[]
}

export interface MapFact {
  slot: string
  text: string
  quote: string
  at: string
}

export interface MapLane {
  platform: string
  state: string
}

export interface MapNext {
  text: string
  tool: string
}

export interface MapNode {
  key: string
  handle: string
  name?: string
  initials: string
  platform: string
  platforms: string[]
  ring: number
  tone: MapTone
  why: string
  rooms: MapRoom[]
  facts: MapFact[]
  next?: MapNext
  lanes: MapLane[]
  quiet: boolean
  talk: boolean
  at: number | null
  machine: StateMachineBlock
}

export type MapEdgeKind = 'direct' | 'shared' | 'mention' | 'reply' | 'quote' | 'reacted'

export interface MapEdge {
  a: string
  b: string
  kind: MapEdgeKind
  room: string
  at: string | null
}

export interface MapRing {
  id: number
  label: string
  tone: MapTone
  count: number
  nodes: string[]
}

export interface MapHop {
  key: string
  handle: string
  room?: string
  at?: string | null
}

export interface NetworkMapBlock {
  type: typeof MAP_BLOCK
  title?: string
  summary?: string
  view?: MapView
  platform?: MapPlatform
  cursor: number
  nextCursor: number | null
  total: number
  rings: MapRing[]
  nodes: MapNode[]
  edges: MapEdge[]
  rooms: MapRoom[]
  path: MapHop[]
  target?: string
}

export interface MapAsk {
  person?: string
  to?: string
  platform?: MapPlatform
  cursor?: number
  limit?: number
  quiet?: boolean
  form?: 'genui' | 'view'
}

export type MapAnswer =
  | { ok: true; block: NetworkMapBlock; text: string; throughSeq: number }
  | { ok: false; code: MapRefusal; problem: string }
