export const HOSTED_PLATFORMS: readonly string[] = ['discord', 'slack', 'reddit']

export const NOT_HOSTED_ACTIONS: readonly string[] = ['watch']

export const HOST_PASSED_CODES: readonly string[] = ['kitHostPassed', 'kitHostRefused', 'kitHostError']

export const HOST_CALL_SECONDS = 180

export const HOST_START_GRACE_MS = 20_000

export interface ReadHostInfo {
  pid: number
  port: number
  token: string
  platform: string
  root: string
  calls?: number
}
