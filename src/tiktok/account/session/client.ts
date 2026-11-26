import { join } from 'node:path'
import { findPlatformAccount, platformGate, recordPlatformSession, runPlatformEngine } from '../../../platformKit/session/index'
import type { PlatformAccount, PlatformEngineRun, PlatformEngineSpec, PlatformGate, PlatformShape } from '../../../platformKit/session/index'
import type { AccountStore } from '../../../accounts/store/index'

export const TIKTOK_PLATFORM: PlatformShape = {
  platform: 'tiktok',
  twentyPlatform: 'TIKTOK',
  label: 'TikTok',
  engine: join(import.meta.dir, '..', '..', '..', '..', 'python', 'tiktokApi', 'engine.py'),
  sessionCookies: ['sessionid', 'sid_tt']
}

export const TIKTOK_COOKIE_DOMAIN = '.tiktok.com'

export function findTiktokAccount(store: AccountStore, ref: string): Promise<PlatformAccount> {
  return findPlatformAccount(store, TIKTOK_PLATFORM, ref)
}

export function tiktokGate(account: PlatformAccount): PlatformGate {
  return platformGate(account, TIKTOK_PLATFORM)
}

export function runTiktokEngine(account: PlatformAccount, spec: PlatformEngineSpec): PlatformEngineRun {
  return runPlatformEngine(TIKTOK_PLATFORM, account, spec)
}

export function recordTiktokSession(store: AccountStore, account: PlatformAccount, run: PlatformEngineRun, now: Date): Promise<string[]> {
  return recordPlatformSession(store, TIKTOK_PLATFORM, account, run, now, TIKTOK_COOKIE_DOMAIN)
}
