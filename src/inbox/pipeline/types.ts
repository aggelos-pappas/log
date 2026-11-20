export const PIPELINE_SETTING = 'pipelineLabels'

export const EMOTION_MODEL = 'SamLowe/roberta-base-go_emotions-onnx'

export const TEACHER_BY = 'subq'

export const WHO_LABELS: Readonly<Record<string, string>> = {
  lead: 'might buy from the owner or hire him; the talk can turn to work or money',
  client: 'pays the owner or has agreed to work with him',
  partner: 'works on the same side as the owner: a cofounder, teammate or collaborator',
  friend: 'personal: a friend or family, talk is about life, not business',
  community: 'someone from a shared group, server or scene who talks about the space, no deal',
  bot: 'an automated account: a bot, an app or a system notice, no human writes it',
}

export const WHERE_LABELS: Readonly<Record<string, string>> = {
  new: 'the first messages, nothing known yet',
  warming: 'talking back and forth, no need found yet',
  needFound: 'they said what they need, what hurts or what they want built',
  offered: 'the owner offered something, sent a link or named a price',
  callBooked: 'a call or a meeting is set',
  won: 'they said yes, signed or paid',
  lost: 'they said no or chose someone else',
  goneQuiet: 'nothing either way for weeks',
}

export const SEED_PHRASES: Readonly<Record<string, readonly string[]>> = {
  lead: ['how much would you charge for this', 'we are looking for someone to build our outreach', 'can you help us get more customers'],
  client: ['sent the invoice, paid it this morning', 'the deliverables for this week are ready', 'thanks for the work, lets keep the retainer going'],
  partner: ['lets ship the release together tonight', 'i pushed the fix to our repo, can you review', 'we should split the work on our product'],
  friend: ['haha miss you man, how is the family', 'lets grab food this weekend', 'happy birthday bro'],
  community: ['anyone in the server tried the new model', 'nice post, saw it in the group', 'thanks for sharing that in the channel'],
  bot: ['you have reached level 5', 'your verification code is 123456', 'this is an automated message, do not reply'],
  new: ['hey, saw your post', 'thanks for connecting', 'hi there'],
  warming: ['haha true, what are you working on these days', 'nice, how long have you been doing that', 'that makes sense'],
  needFound: ['we need more leads every month', 'our biggest problem is getting replies', 'i want someone to automate this for us'],
  offered: ['i can set this up for you for 500 a month', 'here is the link to try it', 'would you be interested in working together'],
  callBooked: ['booked a call for thursday', 'see you on the call tomorrow', 'sent the calendar invite'],
  won: ['deal, lets do it', 'paid, excited to start', 'signed the contract'],
  lost: ['we went with someone else', 'not interested, thanks', 'no budget for this right now'],
  goneQuiet: ['hey, just checking in again', 'any thoughts on this', 'bumping this'],
}

export const SALES_WHO: readonly string[] = ['lead', 'client']

export const NEVER_STAGED: readonly string[] = ['bot', 'friend', 'partner', 'community']

export const WINDOW_MESSAGES = 20

export const WINDOW_LINE_CHARS = 280

export const WINDOW_CHARS = 1000

export const EMOTION_CHARS = 160

export const SLIDE_LINES = 3

export const EMBED_BATCH = 64

export const QUEUE_SIZE = 35

export const HEAD_MIN_ROWS = 20

export const HEAD_MIN_KINDS = 3

export const PROTOTYPE_TEMPERATURE = 0.05

export const BOT_THRESHOLD = 0.7

export const FAST_REPLY_MS = 3000

export const FAST_REPLIES = 5

export const LONG_REPLY_CHARS = 60

export const QUIET_DAYS = 21

export const NEW_TURNS = 2

export const EMOTIONS_KEPT = 3

export const TEACHER_MIN_CONFIDENCE = 0.8

export const TEACHER_STATE_CHARS = 6000

export const SUBQ_USD_PER_MILLION_INPUT = 0.04

export const CHARS_PER_TOKEN = 4

export const FEATURE_NAMES = ['turns', 'daysQuiet', 'openAsk', 'lastFromMe', 'theirShare', 'botScore', 'neverWroteBack', 'feelsGood', 'feelsBad', 'feelsCurious'] as const

export const EMOTION_GROUPS: Readonly<Record<'feelsGood' | 'feelsBad' | 'feelsCurious', readonly string[]>> = {
  feelsGood: ['admiration', 'amusement', 'approval', 'caring', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief'],
  feelsBad: ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'fear', 'grief', 'nervousness', 'remorse', 'sadness'],
  feelsCurious: ['curiosity', 'confusion', 'realization', 'surprise', 'desire'],
}

export type FeatureName = (typeof FEATURE_NAMES)[number]

export type Features = Record<FeatureName, number>

export interface PipelineLabels {
  who: Record<string, string>
  where: Record<string, string>
}

export interface WindowLine {
  fromOwner: boolean
  text: string
  ms: number
  seq: number
  sender: string
}

export interface BotSignal {
  score: number
  why: string[]
}

export interface Prototypes {
  model: string
  who: { label: string; vector: Float32Array }[]
  where: { label: string; vector: Float32Array }[]
}

export interface HeadLayer {
  labels: string[]
  weights: number[][]
  bias: number[]
}

export interface PipelineHead {
  model: string
  features: string[]
  featureScale: number[]
  who: HeadLayer
  where: HeadLayer
  trainedAt: string
  counts: Record<string, number>
  trainer: string
}

export interface Emotion {
  label: string
  score: number
}

export interface Guess {
  who: string
  where: string | null
  confidence: number
  margin: number
  whoScores: Record<string, number>
  whereScores: Record<string, number>
  source: 'prototype' | 'head' | 'bot' | 'owner' | 'teacher' | 'group'
  why: string
}

export interface PipelineRow {
  platform: string
  account: string
  person: string
  lastSeq: number
  who: string
  where: string | null
  confidence: number
  margin: number
  movedBySeq: number | null
  movedById: string | null
  source: string
  scores: { who: Record<string, number>; where: Record<string, number> }
  features: Features
  emotions: Emotion[] | null
  vector: Float32Array | null
  labelledAt: string
}

export interface TeacherLabel {
  platform: string
  account: string
  person: string
  who: string
  where: string | null
  confidence: number
}

export type EmotionReader = (texts: string[]) => Promise<Emotion[][]>

export interface QueueRow {
  platform: string
  account: string
  person: string
  with: string
  who: string
  where: string | null
  confidence: number
  margin: number
  uncertainty: number
  chat: string
}
