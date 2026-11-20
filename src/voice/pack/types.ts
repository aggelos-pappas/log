import type { VoiceProfile } from '../pairs/types'
import type { StyleCompare } from '../converge/types'

export interface PackPair {
  said: string
  reply: string
  chat: string
  tier: string
  at: string | null
  saidBy?: string | null
}

export interface NotHimLine {
  text: string
  why: string
}

export interface PackInput {
  chat: string
  near: readonly PackPair[]
  chatReplies: readonly string[]
  profile: VoiceProfile | null
  aiPhrases: readonly string[]
  theirLines: readonly string[]
  style?: StyleCompare | null
  facts?: readonly string[]
}

export interface GroundingPack {
  chat: string
  thisChat: PackPair[]
  allChats: PackPair[]
  features: string
  notHim: NotHimLine[]
  talk: string[]
  facts: string[]
  ask: string
}

export const PACK_PER_TIER = 5
export const PACK_WORD_PAIRS = 10
export const PACK_AI_LINES = 2
export const USES_SHARE = 0.15
export const NEVER_SHARE = 0.03
export const AI_PHRASE_MAX_WORDS = 10
export const STOCK_NOT_HIM: readonly string[] = [
  'Absolutely, that makes total sense!',
  "I'd love to hear more about what you're building.",
  'Great question, happy to help with that.',
]
export const PACK_ASK = 'Write 3-5 short options from these, in his words and the way he talks to this person (never theirs), each answering what they said and using only facts he has said, then grade them all in one call: voice { to, with, context, options: [..] }. Send the top passing one.'
