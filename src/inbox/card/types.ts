export const CARD_STARTED_WITH = 3
export const CARD_OWNER_SAID = 5
export const CARD_LAST = 8
export const CARD_LINE_CHARS = 280
export const CARD_WINDOW = 400
export const OWN_CHAT_MESSAGES = 5
export const ANSWER_OWED_MS = 24 * 60 * 60 * 1000

export interface CardWho {
  conversationId?: string | null
  userId?: string | null
  handle?: string | null
}

export interface CardLine {
  from: string
  fromOwner: boolean
  text: string
  at: string
}

export interface ConversationCard {
  key: string
  platform: string
  account: string
  kind: string
  with: string
  conversationIds: string[]
  messages: number
  fromOwner: number
  firstAt: string | null
  lastAt: string | null
  waitingOn: 'owner' | 'them' | null
  startedWith: CardLine[]
  theyAskedOpen: CardLine[]
  ownerAskedOpen: CardLine[]
  ownerSaid: CardLine[]
  last: CardLine[]
  throughSeq: number
  builtAt: string
}
