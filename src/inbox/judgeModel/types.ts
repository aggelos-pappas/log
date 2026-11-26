export type ModelChannel = 'user_message' | 'email' | 'web_page' | 'tool_response'

export type ModelScorer = (texts: readonly string[]) => number[] | null

export interface ModelAsk {
  ok: boolean
  scores?: number[]
  down?: boolean
  error?: string
}

export const MODEL_NAME = 'patronus-studio/wolf-defender-prompt-injection-small'
export const MODEL_CHANNEL: ModelChannel = 'tool_response'
export const MODEL_FLAG = 0.9
export const MODEL_MIN_CHARS = 12
export const ASK_TIMEOUT_MS = 6000
export const START_GRACE_MS = 90_000
