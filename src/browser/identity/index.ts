import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getProfiles } from 'wreq-js'

export const DEFAULT_BROWSER = 'chrome152'
export const DEFAULT_OS = 'windows'
export const DEFAULT_CLIENT = 'curl_cffi'
const OSES = ['windows', 'macos', 'linux'] as const
const CLIENTS = ['curl_cffi', 'httpcloak'] as const

export type IdentityOs = (typeof OSES)[number]

export interface BrowserIdentity {
  platform: string | null
  browser: string
  family: 'chrome' | 'firefox'
  version: number
  os: IdentityOs
  client: (typeof CLIENTS)[number]
  curl: string
  httpcloak: string
  wreq: string
  userAgent: string
}

const UA_PLATFORM = {
  chrome: { windows: 'Windows NT 10.0; Win64; x64', macos: 'Macintosh; Intel Mac OS X 10_15_7', linux: 'X11; Linux x86_64' },
  firefox: { windows: 'Windows NT 10.0; Win64; x64', macos: 'Macintosh; Intel Mac OS X 10.15', linux: 'X11; Linux x86_64' },
} as const

export function settingsPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.LOG_SETTINGS?.trim() || join(homedir(), '.logCli', 'settings.json')
}

function stored(file: string): Record<string, unknown> {
  if (!existsSync(file)) return {}
  try {
    const identity = (JSON.parse(readFileSync(file, 'utf8')) as { identity?: unknown }).identity
    return identity && typeof identity === 'object' ? (identity as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function perPlatform(value: unknown, platform: string | null): string | null {
  if (value && typeof value === 'object') {
    const named = value as Record<string, unknown>
    const picked = (platform ? named[platform] : null) ?? named.default
    return typeof picked === 'string' && picked.trim() ? picked.trim() : null
  }
  if (typeof value !== 'string' || !value.trim()) return null
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 1 && !parts[0].includes('=')) return parts[0]
  const named = Object.fromEntries(parts.filter((p) => p.includes('=')).map((p) => p.split('=', 2).map((x) => x.trim())))
  return (platform ? named[platform] : null) ?? named.default ?? null
}

export function resolveIdentity(platform: string | null = null, env: NodeJS.ProcessEnv = process.env, file: string = settingsPath(env)): BrowserIdentity {
  const saved = stored(file)
  const browser = (perPlatform(env.LOG_BROWSER, platform) ?? perPlatform(saved.browser, platform) ?? DEFAULT_BROWSER).toLowerCase()
  const os = (perPlatform(env.LOG_BROWSER_OS, platform) ?? perPlatform(saved.os, platform) ?? DEFAULT_OS).toLowerCase() as IdentityOs
  const client = (perPlatform(env.LOG_HTTP_CLIENT, platform) ?? perPlatform(saved.client, platform) ?? DEFAULT_CLIENT).toLowerCase() as BrowserIdentity['client']
  const found = /^(chrome|firefox)(\d{2,3})$/.exec(browser)
  if (!found) throw new Error(`LOG_BROWSER must be a pinned browser like chrome152 or firefox155, not ${JSON.stringify(browser)}`)
  if (!OSES.includes(os)) throw new Error(`LOG_BROWSER_OS must be one of ${OSES.join(', ')}, not ${JSON.stringify(os)}`)
  if (!CLIENTS.includes(client)) throw new Error(`LOG_HTTP_CLIENT must be one of ${CLIENTS.join(', ')}, not ${JSON.stringify(client)}`)
  const family = found[1] as 'chrome' | 'firefox'
  const version = Number(found[2])
  const userAgent = family === 'chrome'
    ? `Mozilla/5.0 (${UA_PLATFORM.chrome[os]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`
    : `Mozilla/5.0 (${UA_PLATFORM.firefox[os]}; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`
  return {
    platform,
    browser: `${family}${version}`,
    family,
    version,
    os,
    client,
    curl: os === 'macos' && family === 'chrome' && version >= 151 ? `${family}${version}_macos` : `${family}${version}`,
    httpcloak: `${family}-${version}-${os}`,
    wreq: `${family}_${version}`,
    userAgent,
  }
}

export function wreqBrowser(platform: string, env: NodeJS.ProcessEnv = process.env): { browser: string; os: IdentityOs; exact: boolean } {
  const identity = resolveIdentity(platform, env)
  const { profile, exact } = wreqProfile(identity, getProfiles().map(String))
  return { browser: profile, os: identity.os, exact }
}

export function wreqProfile(identity: BrowserIdentity, available: readonly string[]): { profile: string; exact: boolean } {
  if (available.includes(identity.wreq)) return { profile: identity.wreq, exact: true }
  const lower = available
    .map((p) => /^(chrome|firefox)_(\d+)$/.exec(p))
    .filter((m): m is RegExpExecArray => !!m && m[1] === identity.family && Number(m[2]) <= identity.version)
    .sort((a, b) => Number(a[2]) - Number(b[2]))
  const best = lower.at(-1)
  if (!best) throw new Error(`wreq-js has no ${identity.family} profile at or below ${identity.version}`)
  return { profile: best[0], exact: false }
}
