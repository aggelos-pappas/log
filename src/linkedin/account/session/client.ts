import { join } from 'node:path'
import { findPlatformAccount, platformGate, recordPlatformSession, runPlatformEngine } from '../../../platformKit/session/index'
import type { PlatformAccount, PlatformEngineRun, PlatformEngineSpec, PlatformGate, PlatformShape } from '../../../platformKit/session/index'
import type { AccountStore } from '../../../accounts/store/index'

export const LINKEDIN_PLATFORM: PlatformShape = {
  platform: 'linkedin',
  twentyPlatform: 'LINKEDIN',
  label: 'LinkedIn',
  engine: join(import.meta.dir, '..', '..', '..', '..', 'python', 'linkedinApi', 'engine.py'),
  sessionCookies: ['li_at', 'JSESSIONID']
}

export const LINKEDIN_COOKIE_DOMAIN = '.linkedin.com'

export function findLinkedinAccount(store: AccountStore, ref: string): Promise<PlatformAccount> {
  return findPlatformAccount(store, LINKEDIN_PLATFORM, ref)
}

export function linkedinGate(account: PlatformAccount): PlatformGate {
  return platformGate(account, LINKEDIN_PLATFORM)
}

export function runLinkedinEngine(account: PlatformAccount, spec: PlatformEngineSpec): PlatformEngineRun {
  return runPlatformEngine(LINKEDIN_PLATFORM, account, spec)
}

export function recordLinkedinSession(store: AccountStore, account: PlatformAccount, run: PlatformEngineRun, now: Date): Promise<string[]> {
  return recordPlatformSession(store, LINKEDIN_PLATFORM, account, run, now, LINKEDIN_COOKIE_DOMAIN)
}
