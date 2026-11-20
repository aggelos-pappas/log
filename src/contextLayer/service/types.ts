export const SERVICE_TIMEOUT_MS = 600

export const SERVICE_START_GRACE_MS = 30_000

export const SOURCE_CHECK_MS = 30_000
export const CODE_CHECK_MS = 30_000

export const EMBED_KEEP = 512

export const UNCASED_MODELS: ReadonlySet<string> = new Set(['Xenova/all-MiniLM-L6-v2'])

export const HOST = '127.0.0.1'

export const CONTEXT_PORT = Number(process.env.LOG_CONTEXT_PORT || 47317)

export const CURL_CONNECT_SECONDS = 0.2

export const CURL_MAX_SECONDS = 0.8

export interface ServiceInfo {
  pid: number
  port: number
  startedAt: string
  model: string
  utterances: number
  sourceStamp: number
}

export interface TimingLine {
  at: string
  event: string
  provider: string
  ms: number
  chars: number
  outcome: string
  attrs?: Record<string, unknown>
  stages?: TimingStage[]
}

export interface TimingStage {
  name: string
  startedAt: number
  ms: number
  ok?: boolean
}
