export const BROWSER_WINDOWS = ['hidden', 'visible'] as const
export type BrowserWindow = (typeof BROWSER_WINDOWS)[number]
export const BROWSER_WINDOW_ENV = 'LOG_BROWSER_WINDOW'

export function streamedWindow(env: Record<string, string | undefined> = process.env): BrowserWindow {
  return env[BROWSER_WINDOW_ENV]?.trim() === 'visible' ? 'visible' : 'hidden'
}

export function windowOf(value: unknown): BrowserWindow {
  return value === 'hidden' ? 'hidden' : 'visible'
}
