export const TREG_TIMEOUT_MS = 180_000
export const TREG_BALANCE_TIMEOUT_MS = 30_000
export const TREG_MAX_OUTPUT = 200_000
export const TREG_HEDGE_DEFAULT_MS = 10_000
export const TREG_HEDGE_MIN_MS = 2_000
export const TREG_HEDGE_SAMPLE = 200
export const TREG_HEDGE_REFRESH_MS = 10 * 60_000
export const TREG_PRICE_KEEP_MS = 30 * 60_000

export interface TregRun {
  ok: boolean
  code: number
  stdout: string
  stderr: string
}

export type TregRunner = (args: string[], timeoutMs: number, signal?: AbortSignal) => Promise<TregRun>

export interface TregEndpoint {
  id: string
  summary: string | null
  price: string | null
  free: boolean
  call: string | null
  text: string
}

export interface TregCallInput {
  id: string
  path?: string
  params: [string, string][]
  data?: string
  method?: string
  wait?: boolean
}

export interface TregClient {
  search: (query: string, limit: number) => Promise<TregRun>
  get: (id: string) => Promise<TregRun>
  call: (input: TregCallInput) => Promise<TregRun>
  keptGet?: (id: string) => TregRun | null
  balance?: () => Promise<TregRun>
}

export interface TregTrim {
  fields: string[]
  maxItems?: number
  where: [string, string][]
  raw: boolean
}
