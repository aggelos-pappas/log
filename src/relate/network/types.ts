export const NETWORK_FORMAT = 1

export const SCORES_FILE = 'final_scores.json'

export const MAP_FILE = 'nicheMap.json'

export const TOP_THEMES = 3

export const NETWORK_WRITE_BATCH = 2000

export const X_PLATFORM = 'twitter'

export interface NetworkPersonRow {
  handleLower: string
  handle: string
  name: string | null
  followers: number | null
  degree: number | null
  ring: number | null
  band: string | null
  bandProbabilities: string | null
  fit: number | null
  components: string | null
  themes: string | null
  topThemes: string
  workflowStage: string | null
  passesGates: number | null
  followsOwner: number
  company: string | null
  rank: number | null
  role: string | null
  bio: string | null
  tieStrength: number | null
  lastPostText: string | null
  lastPostAtMs: number | null
}

export interface NetworkLeaderRow {
  handleLower: string
  handle: string
  name: string | null
  followers: number | null
  world: string | null
}

export interface NetworkCommunityRow {
  communityId: string
  name: string | null
  url: string | null
  platform: string | null
  topic: string | null
}

export interface NetworkRunRow {
  leaderLower: string
  communityId: string
}

export interface NetworkCircleRow {
  personLower: string
  leaderLower: string
}

export interface NetworkMentionRow {
  fromLower: string
  toLower: string
  times: number
  lastAtMs: number | null
}

export interface NetworkData {
  mapVersion: string | null
  generatedAt: string | null
  people: NetworkPersonRow[]
  leaders: NetworkLeaderRow[]
  communities: NetworkCommunityRow[]
  runs: NetworkRunRow[]
  circles: NetworkCircleRow[]
  mentions: NetworkMentionRow[]
  circleCounts: Map<string, number>
}

export interface NetworkCounts {
  people: number
  leaders: number
  communities: number
  runs: number
  circles: number
  mentions: number
  follows: number
}

export interface NetworkImport {
  formatVersion: number
  mapVersion: string | null
  generatedAt: string | null
  source: string
  account: string | null
  counts: NetworkCounts
  ms: number
  importedAt: string
}

export type ImportOutcome = { ok: true; summary: NetworkImport } | { ok: false; problem: string }

export interface StoredNetworkPerson {
  handle: string
  name: string | null
  role: string | null
  degree: number | null
  ring: number | null
  followsOwner: boolean
  bio: string | null
  followers: number | null
  tieStrength: number | null
}

export const RINGS = { engaged: 1, talksTo: 2, follows: 3, known: 4 } as const

export const ENGAGE_KINDS: readonly string[] = ['like', 'reply', 'quote', 'mention', 'repost', 'retweet', 'reaction']

export const FOLLOW_KINDS: readonly string[] = ['follow']

export const TALKS_TO = 'talksTo'

export interface RingRow {
  platform: string
  userId: string
  ring: number
  reason: string
  sinceMs: number | null
  follows: number
  via: string | null
  seq: number
}

export interface RingState {
  throughSeq: number
  lastAtMs: number | null
  builtAt: string
  builtMs: number
}

export interface MessageFacts {
  platform: string
  userId: string
  atMs: number | null
  chatKind: string | null
  replyTo: { userId: string; fromOwner: boolean } | null
  text: string
}

export interface InteractionFacts {
  platform: string
  userId: string
  kind: string
  atMs: number | null
}

export type RingCounts = Record<'1' | '2' | '3' | '4', number>

export interface NetworkRings {
  counts: RingCounts
  live: RingCounts
  imported: number
  merged: number
  state: RingState | null
  latestSeq: number
}
