export const DEBRIEF_TOP = 10

export const DEBRIEF_TOP_MAX = 25

export const SUBQ_TOP = 10

export const DEBRIEF_MAX_CHARS = 24_000

export const LINES_PER_THREAD = 3

export const LINE_CHARS = 160

export const NOTABLE_MAX = 8

export const MONEY_DAYS = 30

export const SAME_LINE_MS = 5_000

export const DEFAULT_SINCE = '24h'

export const LAST_FALLBACK = '10h'

export const DEFAULT_GOALS = 'paid partnerships with a monthly base, clients, warm leads'

export const AMOUNT = /\$\s?\d[\d,.]*\s?k?\b|\b\d+(?:\.\d+)?\s?k\s?(?:\/\s?mo(?:nth)?\b|per month|a month|monthly|usd|dollars)|\b\d[\d,]*\s?(?:usd|dollars|eur|gbp)\b/i

export const MONEY_WORDS = /\b(?:retainer|invoice[sd]?|paid|pay you|pay me|pay for|payment|pricing|price|budget|per month|a month|monthly|base (?:pay|fee|rate)|rev ?share|commission|sponsor(?:ship)?|term sheet)\b|is it free|how much (?:is it|does it cost|do you charge|would you charge|for)\b/i

export const ASKED = /\?\s*$|\b(?:would you|could you|can you|are you|do you|interested in|want to|wanna|hop on a call|jump on a call|quick call)\b/i

export const LABEL_POINTS: Readonly<Record<string, number>> = { client: 25, friend: 10, readyToAsk: 10, askedWaiting: 10, warming: 0, cold: -10, skip: -40 }

export const SUBQ_LEVELS = ['nothing to gain', 'a courtesy reply', 'worth a reply today', 'a warm lead', 'money on the table']

export const SUBQ_WHY: Readonly<Record<string, string>> = {
  money: 'they talk about paying or being paid',
  client: 'a client or a deal already in progress',
  lead: 'a warm lead who could become a client or partner',
  partner: 'a partnership or collaboration',
  friend: 'a friend or someone worth keeping warm',
  none: 'no opportunity, a courtesy at most',
}

export type RankBy = 'rules' | 'subq'

export interface DebriefSettings {
  goals: string
  scoresFile: string | null
}

export interface ScoredPerson {
  handle?: string
  name?: string
  band?: string
  score?: number
}

export interface LabelMark {
  platform: string
  account: string
  person: string
  label: string
}

export interface DebriefLine {
  at: string
  who: 'you' | 'them'
  text: string
}

export interface DebriefThread {
  platform: string
  account: string
  with: string
  kind: 'dm' | 'group'
  conversationIds: string[]
  lastAt: string
  waiting: boolean
  followUp: boolean
  newCount: number
  score: number
  reason: string
  why?: string
  read: string
  lines: DebriefLine[]
}

export interface XNotable {
  at: string
  kind: string
  handle: string
  followers: number | null
  text: string
}

export interface ServerItem {
  at: string
  account: string
  box: string
  from: string
  channel: string
  text: string
}

export interface AccountHealth {
  platform: string
  account: string
  session: string | null
  checkedAt: string | null
  requestsToday: number
  writesToday: number
  behindFrom: string | null
  behindReason: string | null
}

export interface Debrief {
  since: string
  until: string
  sinceFrom: 'flag' | 'last' | 'lastMissing' | 'default'
  inbound: { total: number; byPlatform: Record<string, number>; byAccount: Record<string, number> }
  waiting: { waiting: number; followUps: number; byPlatform: Record<string, number> }
  threads: DebriefThread[]
  x: { byKind: Record<string, number>; notable: XNotable[] }
  servers: { byBox: Record<string, number>; items: ServerItem[] }
  health: AccountHealth[]
  rank: { by: RankBy; note: string }
}

export interface DebriefQuery {
  since?: string
  platform?: string
  account?: string
  top?: number
  rank?: RankBy
}
