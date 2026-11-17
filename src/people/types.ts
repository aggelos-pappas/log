export const PERSON_ID_PREFIX = 'p_'

export const PRIOR_MATCH_SHARE = 0.04

export const STRONG_BITS = 4

export const REVIEW_BITS = 0

export const SUGGESTED = 50

export const SOURCES_KEPT = 3

export const ONE_TO_ONE_SHARE = 0.95

export const CARD_CHATS = 8

export const CARD_LINES = 8

export const CARD_CHARS = 2000

export const PEOPLE_IN_PROMPT = 2

export const HANDLE_MIN = 4

export const M_PROBABILITIES = {
  handle: { same: 0.3, sameLoose: 0.1, different: 0.6 },
  displayName: { same: 0.3, different: 0.7 },
  sharesOwnPosts: { fivePlus: 0.05, twoToFour: 0.1, once: 0.15, never: 0.7 },
} as const

export const BOT_NAMES: readonly string[] = ['mee6', 'dyno', 'carl bot', 'vibe bot', 'vibebot', 'rythm', 'trebel music', 'watch together', 'probot', 'arcane', 'tatsu']

export const ASKS = /\b(like|rt|retweet|repost|share|support|boost|check (?:out )?my|my (?:post|tweet|thread|video|account|profile|twitter|x|insta|ig|channel))\b/i

export const RECOMMENDS = /\b(this (?:dude|guy|girl|person)|check out (?:his|her|their)|follow (?:him|her|them)|shout ?out to|credit to)\b/i

export interface IdentityRef {
  platform: string
  userId: string
}

export interface IdentityInfo extends IdentityRef {
  handle: string | null
  name: string | null
  personId: string | null
  runByLogAs: string | null
}

export type Band = 'strong' | 'review' | 'hidden'

export interface MessageSource {
  messageKey: string
  chatId: string
  at: string | null
  text: string
}

export interface Comparison {
  comparison: 'sharesOwnPosts' | 'handle' | 'displayName'
  level: string
  values: string[]
  m: number
  u: number
  bayesFactor: number
  matchWeight: number
  count?: number
  asks?: number
  sources?: MessageSource[]
}

export interface Suggestion {
  suggestionId: string
  a: IdentityInfo
  b: IdentityInfo
  prior: number
  comparisons: Comparison[]
  matchWeight: number
  probability: number
  band: Band
  throughSeq: number
}

export interface PersonRow {
  personId: string
  name: string | null
  identities: IdentityInfo[]
}

export interface CardChat {
  chatId: string
  platform: string
  account: string
  name: string | null
  oneToOne: boolean
  others: number
  theirs: number
  ours: number
  lastAtMs: number | null
  lastFrom: 'owner' | 'them' | 'someone else' | null
  backfilled: boolean
}

export interface CardLine {
  platform: string
  account: string
  fromOwner: boolean
  at: string | null
  text: string
  messageKey: string
}

export interface PersonCard {
  personId: string | null
  name: string | null
  identities: IdentityInfo[]
  arrived: { platform: string; kind: string; atMs: number; text: string | null } | null
  waitingOn: 'owner' | 'them' | null
  perPlatform: { platform: string; oneToOne: number; theirs: number; ours: number; groups: number; theirsInGroups: number; firstAtMs: number | null; lastAtMs: number | null; engaged: { account: string; kind: string; times: number }[] }[]
  chats: CardChat[]
  onTheirAccounts: number
  last: CardLine[]
  throughSeq: number
  text: string
}
