export const PROJECTOR_VERSION = 1

export const GRAPH_FILE_PREFIX = 'graph-'

export const GRAPH_FILE_SUFFIX = '.rl'

export const KEPT_SNAPSHOTS = 3

export const WRITE_BATCH = 1000

export const BUILD_GRACE_MS = 120_000

export const REFRESH_AFTER_MS = 60_000

export const QUERY_ROWS = 100

export const CONTEXT_CHARS = 2000

export const MENTIONED_PEOPLE = 3

export const LISTED = 5

export const TOKEN_MIN = 4

export const KEYED_LABELS: readonly string[] = ['Account', 'Identity', 'Room', 'Post', 'Snapshot']

export interface GraphPointer {
  file: string
  throughSeq: number
  projectorVersion: number
  schemaVersion: number
  workspace: string
  builtAt: string
  ms: number
  counts: GraphCounts
}

export interface GraphCounts {
  accounts: number
  identities: number
  rooms: number
  posts: number
  memberOf: number
  said: number
  engaged: number
}

export interface AccountRow {
  key: string
  platform: string
  account: string
  userId: string | null
}

export interface IdentityRow {
  key: string
  platform: string
  userId: string
  handle: string | null
  handleLower: string | null
  name: string | null
  aliases: string[]
  owner: boolean
}

export interface RoomRow {
  key: string
  platform: string
  account: string
  accountKey: string
  conversationId: string
  kind: string
  name: string | null
  lastAtMs: number | null
}

export interface MemberRow {
  identity: string
  room: string
  firstSeenAt: string
  lastSeenAt: string
}

export interface SaidRow {
  identity: string
  room: string
  messages: number
  lastAtMs: number | null
  fromOwner: boolean
  accountKey: string
}

export interface PostRow {
  key: string
  platform: string
  account: string
  accountKey: string
  ref: string
  text: string | null
}

export interface EngagedRow {
  identity: string
  post: string | null
  accountKey: string
  kind: string
  times: number
  lastAtMs: number | null
}

export interface Projection {
  throughSeq: number
  schemaVersion: number
  accounts: AccountRow[]
  identities: IdentityRow[]
  rooms: RoomRow[]
  members: MemberRow[]
  said: SaidRow[]
  posts: PostRow[]
  engaged: EngagedRow[]
}

export interface PersonFound {
  key: string
  keys: string[]
  platform: string
  handle: string | null
  name: string | null
}

export interface ConnectedContext {
  person: PersonFound
  talks: { account: string; kind: string; threads: number; theirs: number; ours: number; lastAtMs: number | null }[]
  engaged: { account: string; kind: string; times: number; post: string | null; lastAtMs: number | null }[]
  sharedRooms: { account: string; room: string; members: number }[]
  introducers: { handle: string; rooms: number; lastDmAtMs: number | null }[]
  sameOrbit: { handle: string; posts: number }[]
  otherAccounts: string[]
}

export interface GraphVerify {
  ok: boolean
  pointer: GraphPointer | null
  expected: GraphCounts
  found: GraphCounts
  differs: string[]
  behind: number
}

export const PRIOR_KAPPA = 0.5

export const PRIOR_FLOOR = 0.1

export const PRIOR_WEIGHT_SPOKE = 3

export const PRIOR_WEIGHT_NEAR = 1
