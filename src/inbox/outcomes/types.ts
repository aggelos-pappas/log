export const HOUR_MS = 3_600_000

export const DAY_MS = 86_400_000

export const REPLY_WINDOWS = { day: DAY_MS, week: 7 * DAY_MS } as const

export type ReplyWindow = keyof typeof REPLY_WINDOWS

export const STAGE_LADDER = ['new', 'warming', 'needFound', 'offered', 'callBooked', 'won'] as const

export const MOVE_WINDOW_MS = 7 * DAY_MS

export const SPAN_SLACK_MS = 30_000

export const AGENT_CALL_REACH_MS = 15 * 60_000

export const QUEUE_REACH_MS = DAY_MS

export const ONE_TO_ONE_SHARE = 0.95

export const BOOTSTRAP_REPS = 1000

export const BOOTSTRAP_SEED = 20261121

export const Z95 = 1.959964

export const POSITIVE_AT = 0.5

export const FEELING_CHARS = 160

export const PLAY_TOOL = /(^|_)getGuide$/

export const PLAY_SKILL = /^log:log-([a-z0-9]+)-([a-z0-9-]+)$/

export const SEND_TOOL = /(SendLive|DmLive|ReplyLive|QueueRunLive|VoiceLive)$|^cli [a-z]+ (dm|send|queue run|reply)\b/

export const QUEUE_TOOL = /QueueRunLive$|queue run/

export type SentBy = 'log' | 'hand'

export type FoundBy = 'sendRecord' | 'queue' | 'sendSpan' | 'none'

export interface Send {
  platform: string
  account: string
  person: string
  with: string
  who: string | null
  stage: string
  by: SentBy
  foundBy: FoundBy
  play: string | null
  firstMs: number
  lastMs: number
  firstSeq: number
  lastSeq: number
  lines: number
  text: string
  replyMs: number | null
  stageAfter: string
  positivity: number | null
}

export interface Rate {
  n: number
  yes: number
  rate: number | null
  low: number | null
  high: number | null
}

export interface SideStats {
  sends: number
  day: Rate
  week: Rate
  medianReplyMinutes: number | null
  replied: number
  movedForward: Rate
}

export interface Comparison {
  group: string
  log: SideStats
  hand: SideStats
}

export interface MatchedWindow {
  strata: number
  people: number
  logSends: number
  handSends: number
  log: number | null
  hand: number | null
  difference: number | null
  low: number | null
  high: number | null
}

export interface Matched {
  day: MatchedWindow
  week: MatchedWindow
  movedForward: MatchedWindow
  medianReplyMinutes: { log: number | null; hand: number | null; logReplies: number; handReplies: number }
}

export interface PlayRow {
  play: string
  sends: number
  day: Rate
  week: Rate
  medianReplyMinutes: number | null
  movedForward: Rate
  matchedDay: MatchedWindow
  matchedWeek: MatchedWindow
}

export interface Positivity {
  scored: number
  positive: Rate
  notPositive: Rate
  oddsRatio: number | null
  low: number | null
  high: number | null
  matchedOddsRatio: number | null
  matchedLow: number | null
  matchedHigh: number | null
  window: ReplyWindow
}

export interface FoundCounts {
  sendRecord: number
  queue: number
  sendSpan: number
}

export interface OutcomeReport {
  generatedAt: string
  since: Record<string, string>
  sends: { log: number; hand: number; lines: { log: number; hand: number } }
  foundBy: FoundCounts
  raw: Comparison[]
  matched: Matched
  byWho: Comparison[]
  byStage: Comparison[]
  moves: { from: string; to: string; log: number; hand: number }[]
  plays: PlayRow[]
  positivity: { all: Positivity; log: Positivity; hand: Positivity } | null
  notes: string[]
}

export interface AgentSend {
  ms: number
  platform: string
  with: string
  play: string | null
}

export interface QueueSent {
  platform: string
  account: string
  person: string
  play: string
  ms: number
  lines: string[]
}

export type FeelingReader = (texts: string[]) => Promise<{ label: string; score: number }[][]>
