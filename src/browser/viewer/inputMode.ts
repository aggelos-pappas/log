export const BROWSER_INPUT_MODES = ['owner', 'signInOnly'] as const
export type BrowserInputMode = (typeof BROWSER_INPUT_MODES)[number]
export const BROWSER_INPUT_ENV = 'LOG_BROWSER_INPUT'

export function browserInputMode(env: Record<string, string | undefined> = process.env): BrowserInputMode {
  return env[BROWSER_INPUT_ENV]?.trim() === 'signInOnly' ? 'signInOnly' : 'owner'
}

export function ownerDrivenOf(opened: unknown, env: Record<string, string | undefined> = process.env): boolean {
  return opened === true && browserInputMode(env) === 'owner'
}
