export const LABELS = ['warming', 'readyToAsk', 'askedWaiting', 'friend', 'client', 'cold', 'skip'] as const

export type Label = (typeof LABELS)[number]

export const LABEL_MEANS: Record<Label, string> = {
  warming: 'talking, no ask yet',
  readyToAsk: 'warm enough to ask now',
  askedWaiting: 'asked, waiting on them',
  friend: 'friend or collab, never pitch',
  client: 'client or money, the owner answers',
  cold: 'gone quiet',
  skip: 'never answered, or not worth it',
}

export const OWNER_ONLY: readonly Label[] = ['friend', 'client']

export const COLD_DAYS = 21

export const ACTIVE_DAYS = 14

export const READY_TURNS = 6

export const ASK = /(treg\.to|\bref=|calendly|cal\.com|\$\s?\d|per month|a month\b|hop on a call|jump on a call|quick call|would you be (up|down|interested|keen)|interested in|want to (try|work|collab)|wanna (try|work|collab)|lets collab|collab on|work together|pay you|pay for)/i

export interface LabelEntry {
  platform: string
  account: string
  person: string
  label?: Label
  who?: string
  where?: string | null
  confidence?: number
  candidates?: string[]
  by: string
  at: string
}

export interface LabelFields {
  label?: Label
  who?: string
  where?: string | null
  confidence?: number
  candidates?: string[]
}

export interface LabelList {
  entries: LabelEntry[]
}

export interface Labelled {
  platform: string
  account: string
  with: string
  person: string
  conversationIds: string[]
  label: Label
  who: string | null
  where: string | null
  confidence: number | null
  labelledBy: string
  emotions: { label: string; score: number }[] | null
  set: boolean
  why: string
  lastAt: string
  lastFromMe: boolean
  turns: number
}

export interface LabelQuery {
  platform?: string
  account?: string
  label?: Label
  who?: string
  where?: string
}

export const OLD_LABEL_FIELDS: Readonly<Record<Label, { who: string | null; where: string | null }>> = {
  warming: { who: 'lead', where: 'warming' },
  readyToAsk: { who: 'lead', where: 'warming' },
  askedWaiting: { who: 'lead', where: 'offered' },
  friend: { who: 'friend', where: null },
  client: { who: 'client', where: null },
  cold: { who: null, where: 'goneQuiet' },
  skip: { who: null, where: null },
}
