export interface TurnStart {
  at: number
  host: string
}

export interface TurnRow {
  session: string
  host: string
  startedAt: number
  ms: number
  tools: number
  toolMs: number
  agentMs: number
  hostTools: number | null
}

export interface TurnStats {
  n: number
  p50: number
  p95: number
  p99: number
  turns: TurnRow[]
}

export const TURN_TOOL_PREFIX = 'turn:'

export const TURN_MAX_MS = 6 * 3600_000
