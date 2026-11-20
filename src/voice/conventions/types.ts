export type CorpusSide = 'owner' | 'ai'

export interface CorpusRow {
  id: string
  side: CorpusSide
  family: string
  model: string | null
  source: string
  chatKey: string
  momentKey: string | null
  text: string
  at: string | null
}

export type BandName = 'short' | 'medium' | 'long'

export interface Band {
  name: BandName
  min: number
  max: number
}

export const BANDS: readonly Band[] = [
  { name: 'short', min: 1, max: 5 },
  { name: 'medium', min: 6, max: 15 },
  { name: 'long', min: 16, max: Number.POSITIVE_INFINITY },
]

export type HabitName = 'emDash' | 'curlyQuotes' | 'markdown' | 'endsWithFullStop' | 'capitalStart' | 'apostrophes' | 'connectives' | 'hedges' | 'evenSentences' | 'semicolon' | 'exclamation' | 'openerRepeat'

export const HABIT_WORDS: Readonly<Record<HabitName, string>> = {
  emDash: 'an em dash',
  curlyQuotes: 'curly quotes',
  markdown: 'markdown (bold, bullets, headers or code)',
  endsWithFullStop: 'a full stop at the end',
  capitalStart: 'a capital letter to open',
  apostrophes: "textbook apostrophes (I'm, don't)",
  connectives: 'essay connectives (however, additionally, that said)',
  hedges: 'hedges (honestly, definitely, happy to, feel free)',
  evenSentences: 'sentences all the same length',
  semicolon: 'a semicolon',
  exclamation: 'an exclamation mark',
  openerRepeat: 'the same opener as another option',
}

export interface OverusedGram {
  gram: string
  ratio: number
  ai: number
  owner: number
  his: string | null
}

export interface HabitStat {
  habit: HabitName
  ai: number
  owner: number
  ratio: number
  flags: boolean
  byBand?: Partial<Record<BandName, { ai: number; owner: number; flags: boolean }>>
}

export interface ConventionsProfile {
  grams: OverusedGram[]
  habits: HabitStat[]
  openers: string[]
}

export interface BandCalibration {
  band: BandName
  threshold: number
  gramRatio: number
  mutedRules?: string[]
  ownerP50: number
  abstain: boolean
  ownerHeldOut: number
  ownerFlagged: number
  aiHeldOut: number
  aiCaught: number
  auc: number
}

export interface FamilyCatch {
  family: string
  drafts: number
  caught: number
  byBand: Record<BandName, { drafts: number; caught: number }>
}

export interface TrainReport {
  builtAt: string
  owner: number
  ai: number
  chats: number
  folds: number
  bands: BandCalibration[]
  families: FamilyCatch[]
  overall: { ownerFlagged: number; ownerHeldOut: number; aiCaught: number; aiHeldOut: number; abstained: number }
  latency: { options: number; p50: number; p95: number }
  classifierOnly: { aiCaught: number; ownerFlagged: number }
  sources: Record<string, number>
}

export interface ConventionsModel {
  builtAt: string
  embedModel: string
  ngram: [number, number]
  vocab: string[]
  idf: number[]
  gramWeights: number[]
  embedWeights: number[]
  embedScale: number
  bias: number
  bands: BandCalibration[]
  profile: ConventionsProfile
  mutedRules: string[]
  ownersPhrases: string[]
  report: TrainReport
}

export interface ConventionFlag {
  kind: 'gram' | 'habit' | 'rule'
  what: string
  why: string
  his: string | null
}

export interface ConventionsReading {
  band: BandName | null
  words: number
  probability: number | null
  threshold: number | null
  abstain: boolean
  flagged: boolean
  flags: ConventionFlag[]
  hits: { rule: string; match: string; message: string }[]
  value: number | null
  ms: number
}

export interface TrainerInput {
  texts: string[]
  labels: number[]
  groups: number[]
  weights: number[]
  embeddings: number[][]
  params: { ngramMin: number; ngramMax: number; maxFeatures: number; minDf: number; c: number; embedScale: number; folds: number; probe?: number }
}

export interface TrainerOutput {
  vocab: string[]
  idf: number[]
  gramWeights: number[]
  embedWeights: number[]
  bias: number
  oof: number[]
  folds: number[]
  fitted?: number[]
}

export interface FreshModel {
  family: string
  model: string
  inPerMillion: number
  outPerMillion: number
}

export const CONVENTIONS_KEY = 'owner'
export const ABSTAIN_BELOW_WORDS = 3
export const OWNER_PASS = 0.95
export const OWNER_SAMPLE = 6000
export const OWNER_PROFILE_SAMPLE = 30000
export const OWNER_RECENT_DAYS = 120
export const OWNER_MIN_FOR_TRAINING = 500
export const AI_MIN_FOR_TRAINING = 50
export const MAX_TEXT_CHARS = 1200
export const SEND_WINDOW_MS = 30000
export const SENT_SOURCES: readonly string[] = ['agentSession', 'gate']
export const NGRAM_MIN_AI = 4
export const NGRAM_MIN_CHATS = 3
export const NGRAM_MIN_AI_SHARE = 0.01
export const NGRAM_MIN_RATIO = 8
export const NGRAM_KEPT = 400
export const HABIT_MIN_RATIO = 4
export const HABIT_MAX_OWNER_SHARE = 0.003
export const GRAM_MAX_OWNER_SHARE = 0.001
export const RULE_MUTE_SHARE = 0.005
export const GRAM_BUDGET = 0.02
export const RULE_BUDGET = 0.01
export const OWNER_OPENER_SHARE = 0.002
export const FLAG_COST = 0.25
export const RULE_COST = 0.5
export const BAND_MIN_AUC = 0.6
export const TRAIN_FOLDS = 5
export const TRAIN_PARAMS: TrainerInput['params'] = { ngramMin: 2, ngramMax: 4, maxFeatures: 20000, minDf: 3, c: 1, embedScale: 1, folds: TRAIN_FOLDS }
export const LATENCY_SAMPLE = 200
export const BUILD_GRACE_MS = 20 * 60 * 1000
export const SPEND_CAP_USD = 3
export const FRESH_OPTIONS = 3
export const FRESH_AT_ONCE = 4
export const FRESH_NEAR = 10
export const FRESH_MODELS: readonly FreshModel[] = [
  { family: 'claude', model: 'claude-haiku-5-5', inPerMillion: 1, outPerMillion: 5 },
  { family: 'gpt', model: 'gpt-5.6-luna', inPerMillion: 1.25, outPerMillion: 10 },
  { family: 'gemini', model: 'gemini-4-argon', inPerMillion: 1.25, outPerMillion: 10 },
  { family: 'grok', model: 'grok-4.7', inPerMillion: 3, outPerMillion: 15 },
  { family: 'deepseek', model: 'deepseek-v4.1-flash', inPerMillion: 0.3, outPerMillion: 1.2 },
]
export const FAMILY_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['claude', /claude|anthropic|opus|sonnet|haiku/i],
  ['gpt', /gpt|openai|\bo\d/i],
  ['gemini', /gemini|google/i],
  ['grok', /grok|xai/i],
  ['deepseek', /deepseek/i],
  ['kimi', /kimi|moonshot/i],
  ['qwen', /qwen/i],
  ['glm', /glm|zhipu/i],
]
export const SEND_TOOLS = /SendLive|DmLive|QueueRunLive|VoiceLive|^cli (twitter dm|twitter queue run|discord send|slack send|instagram send)/
export const CONNECTIVES = /\b(however|additionally|moreover|furthermore|that said|in addition|ultimately|overall|indeed|consequently|nevertheless)\b/i
export const HEDGES = /\b(honestly|genuinely|definitely|absolutely|totally get|happy to|feel free|no worries at all|let me know if|i appreciate|i'd love|would love to|really appreciate)\b/i
