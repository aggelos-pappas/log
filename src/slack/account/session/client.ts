import { join } from 'node:path'
import { findPlatformAccount, platformGate, recordPlatformSession, runPlatformEngine, runPlatformEngineLive } from '../../../platformKit/session/index'
import type { PlatformAccount, PlatformEngineRun, PlatformEngineSpec, PlatformGate, PlatformShape } from '../../../platformKit/session/index'
import type { AccountStore } from '../../../accounts/store/index'

export const SLACK_PLATFORM: PlatformShape = {
  platform: 'slack',
  accountPlatform: 'SLACK',
  label: 'Slack',
  engine: join(import.meta.dir, '..', '..', '..', '..', 'python', 'slackApi', 'engine.py'),
  sessionCookies: ['d']
}

export const SLACK_COOKIE_DOMAIN = '.slack.com'

export function findSlackAccount(store: AccountStore, ref: string): Promise<PlatformAccount> {
  return findPlatformAccount(store, SLACK_PLATFORM, ref)
}

export function slackGate(account: PlatformAccount): PlatformGate {
  return platformGate(account, SLACK_PLATFORM)
}

export function runSlackEngine(account: PlatformAccount, spec: PlatformEngineSpec): PlatformEngineRun {
  return runPlatformEngine(SLACK_PLATFORM, account, spec)
}

export function runSlackEngineLive(account: PlatformAccount, spec: PlatformEngineSpec, onLive: (event: Record<string, unknown>) => void): Promise<PlatformEngineRun> {
  return runPlatformEngineLive(SLACK_PLATFORM, account, spec, onLive)
}

export function recordSlackSession(store: AccountStore, account: PlatformAccount, run: PlatformEngineRun, now: Date): Promise<string[]> {
  return recordPlatformSession(store, SLACK_PLATFORM, account, run, now, SLACK_COOKIE_DOMAIN)
}
