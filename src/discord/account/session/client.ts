import { join } from 'node:path'
import { findPlatformAccount, platformGate, recordPlatformSession, runPlatformEngine, runPlatformEngineLive } from '../../../platformKit/session/index'
import type { PlatformAccount, PlatformEngineRun, PlatformEngineSpec, PlatformGate, PlatformShape } from '../../../platformKit/session/index'
import type { AccountStore } from '../../../accounts/store/index'

export const DISCORD_PLATFORM: PlatformShape = {
  platform: 'discord',
  accountPlatform: 'DISCORD',
  label: 'Discord',
  engine: join(import.meta.dir, '..', '..', '..', '..', 'python', 'discordApi', 'engine.py'),
  sessionCookies: [],
  sessionStorage: { origin: 'https://discord.com', keys: ['token'] }
}

export const DISCORD_COOKIE_DOMAIN = '.discord.com'

export function findDiscordAccount(store: AccountStore, ref: string): Promise<PlatformAccount> {
  return findPlatformAccount(store, DISCORD_PLATFORM, ref)
}

export function discordGate(account: PlatformAccount): PlatformGate {
  return platformGate(account, DISCORD_PLATFORM)
}

export function runDiscordEngine(account: PlatformAccount, spec: PlatformEngineSpec): PlatformEngineRun {
  return runPlatformEngine(DISCORD_PLATFORM, account, spec)
}

export function runDiscordEngineLive(account: PlatformAccount, spec: PlatformEngineSpec, onLive: (event: Record<string, unknown>) => void): Promise<PlatformEngineRun> {
  return runPlatformEngineLive(DISCORD_PLATFORM, account, spec, onLive)
}

export function recordDiscordSession(store: AccountStore, account: PlatformAccount, run: PlatformEngineRun, now: Date): Promise<string[]> {
  return recordPlatformSession(store, DISCORD_PLATFORM, account, run, now, DISCORD_COOKIE_DOMAIN)
}
