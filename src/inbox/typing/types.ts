export const TYPING_LASTS_MS = 10_000

export const TYPING_HOLD_MS = 20_000

export const TYPING_CHECK_MS = 1_000

export interface TypingRef {
  platform: string
  account: string
  conversationId: string
}

export type TypingWait = 'clear' | 'wrote' | 'stillTyping'
