import { identifyAccount, rememberProfiles } from '../../inbox/store/index'
import { sessionProfileOf } from '../../storage/platform/index'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platformStateRoot, writeLocalSession, writesPerDayOf } from '../../directApi/engine/index'
import { SOCIAL_ACCOUNTS, engineRoute, toFacebookAccount } from '../socialAccount/index'
import type { FacebookAccount, SocialAccountRow } from '../socialAccount/index'
import { TwentyError, accountStore } from '../../twenty/graphql/index'
import type { TwentyClient } from '../../twenty/graphql/index'
import { timedEngine, timedEngineSync, timedSync } from '../../observability/timing/index'
import { askReadHost, hostable, readHostOf, startReadHost } from '../readHost/index'
import { driverOrNull } from '../../browser/driver/index'
import type { EngineTrace } from '../../observability/timing/index'
import { ENGINE_CALL_MS, ENGINE_CATCH_UP_MS } from './types'
import type { PlatformAnswer, PlatformEngineRun, PlatformEngineSpec, PlatformGate, PlatformShape } from './types'
import { sessionHandoff } from '../../storage/secrets/index'

export type PlatformAccount = FacebookAccount

export async function findPlatformAccount(twenty: TwentyClient, shape: PlatformShape, ref: string): Promise<PlatformAccount> {
  const key = ref.trim().replace(/^@/, '')
  const anyPlatform = await twenty.list(SOCIAL_ACCOUNTS, { accountName: { eq: key } })
  const named = anyPlatform.filter((r) => String(r.platform) === shape.twentyPlatform)
  const rows = named.length ? named : (await twenty.list(SOCIAL_ACCOUNTS, { name: { eq: key } })).filter((r) => String(r.platform) === shape.twentyPlatform && !r.accountName?.trim())
  const foundOn = [...new Set(anyPlatform.map((r) => String(r.platform ?? '').toLowerCase()).filter(Boolean))]
  if (rows.length === 0 && foundOn.length) throw new TwentyError('accountPlatformMismatch', `"${key}" is not a ${shape.twentyPlatform.toLowerCase()} account: it is kept under ${foundOn.join(', ')}`)
  if (rows.length === 0) throw new TwentyError('accountNotFound', `no ${shape.twentyPlatform} socialAccount "${key}"`)
  if (rows.length > 1) throw new TwentyError('accountNotFound', `${rows.length} ${shape.twentyPlatform} socialAccounts are called "${key}"`)
  return toFacebookAccount(rows[0] as SocialAccountRow)
}

export function sessionCookiesOf(raw: unknown): Record<string, string> {
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        return sessionCookiesOf(JSON.parse(text))
      } catch {
        return {}
      }
    }
    return Object.fromEntries(text.split(/;\s*/).filter((p) => p.includes('=')).map((p) => [p.slice(0, p.indexOf('=')).trim(), p.slice(p.indexOf('=') + 1).trim()]))
  }
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const item of raw) if (item && typeof item === 'object' && 'name' in item) out[String((item as { name: unknown }).name)] = String((item as { value?: unknown }).value ?? '')
    return out
  }
  if (raw && typeof raw === 'object') return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v)]))
  return {}
}

export function sessionStorageOf(origins: unknown, wanted: PlatformShape['sessionStorage']): Record<string, string> {
  if (!wanted || !Array.isArray(origins)) return {}
  const origin = origins.find((o) => o && typeof o === 'object' && (o as { origin?: unknown }).origin === wanted.origin) as { localStorage?: unknown } | undefined
  const out: Record<string, string> = {}
  for (const item of Array.isArray(origin?.localStorage) ? origin!.localStorage : []) {
    const { name, value } = item as { name?: unknown; value?: unknown }
    if (typeof name !== 'string' || typeof value !== 'string' || !wanted.keys.includes(name)) continue
    let text = value
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'string') text = parsed
    } catch {}
    if (text) out[name] = text
  }
  return out
}

export function platformGate(account: PlatformAccount, shape: PlatformShape): PlatformGate {
  if (String(account.platform) !== shape.twentyPlatform) return { ok: false, code: 'accountNotOnPlatform', detail: `${account.accountName} is ${account.platform ?? 'no platform'}, not ${shape.twentyPlatform}` }
  if (account.status === 'deactivated') return { ok: false, code: 'accountDeactivated', detail: `${account.accountName} is deactivated` }
  const cookies = sessionCookiesOf(account.cookies)
  const missing = shape.sessionCookies.filter((name) => !cookies[name])
  if (shape.sessionStorage) {
    const stored = sessionStorageOf(account.storageOrigins, shape.sessionStorage)
    const absent = shape.sessionStorage.keys.filter((key) => !stored[key])
    if (missing.length || absent.length) return { ok: false, code: 'noPlatformSession', detail: `${account.accountName} has no saved ${[...missing, ...absent.map((k) => `${shape.sessionStorage!.origin} localStorage ${k}`)].join(' + ')} in Twenty` }
    return { ok: true }
  }
  if (missing.length || Object.keys(cookies).length === 0) return { ok: false, code: 'noPlatformSession', detail: `${account.accountName} has no saved ${missing.length ? missing.join(' + ') : 'cookies'} in Twenty` }
  return { ok: true }
}

export function mergeCookieShape(raw: unknown, refreshed: Record<string, string>, domain: string): unknown {
  if (Array.isArray(raw)) {
    const seen = new Set<string>()
    const merged = raw.map((item) => {
      const name = item && typeof item === 'object' ? String((item as { name?: unknown }).name ?? '') : ''
      if (name in refreshed) {
        seen.add(name)
        return { ...(item as object), value: refreshed[name] }
      }
      return item
    })
    for (const [name, value] of Object.entries(refreshed)) if (!seen.has(name)) merged.push({ name, value, domain, path: '/' })
    return merged
  }
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return { ...base, ...refreshed }
}

export function engineCallMs(request: PlatformEngineSpec): number | null {
  if (request.live === true || request.streamProgress) return null
  return request.catchUp === true ? ENGINE_CATCH_UP_MS : ENGINE_CALL_MS
}

export function runPlatformEngine(shape: PlatformShape, account: PlatformAccount, request: PlatformEngineSpec): PlatformEngineRun {
  return timedEngineSync(`engine ${shape.platform} ${String(request.action ?? '')}`.trim(), { account: account.accountName }, (trace) => spawnPlatformEngine(shape, account, request, trace), (run) => run.answer)
}

function spawnPlatformEngine(shape: PlatformShape, account: PlatformAccount, request: PlatformEngineSpec, trace: EngineTrace | null): PlatformEngineRun {
  const routed = engineRoute(account)
  if (!routed.ok) return { answer: { ok: false, code: routed.code, detail: routed.detail }, refreshed: null }
  const dir = mkdtempSync(join(tmpdir(), `${shape.platform}Api`))
  try {
    const refreshedPath = join(dir, 'refreshed.json')
    const handoff = sessionFiles(shape, account, dir)
    const spec = join(dir, 'spec.json')
    const base = { ...request, account: account.accountName, platform: shape.platform, route: routed.route, browserDriver: driverOrNull(account), stateRoot: platformStateRoot(shape.platform), writesPerDay: writesPerDayOf(shape.platform) }
    const body = { ...base, ...handoff.spec, refreshedPath, ...(trace ? { trace } : {}) }
    const hosted = hostedRun(shape, account, request, () => ({ ...base, ...handoff.files(), refreshedPath, ...(trace ? { trace } : {}) }), refreshedPath)
    if (hosted) return hosted
    writeFileSync(spec, JSON.stringify(body), { mode: 0o600 })
    const limit = engineCallMs(request)
    const run = spawnSync(process.env.LOG_PYTHON || 'python', [shape.engine, spec], { encoding: 'utf8', windowsHide: true, maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', request.streamProgress ? 'inherit' : 'pipe'], ...(limit ? { timeout: limit, killSignal: 'SIGKILL' as const } : {}) })
    const line = (run.stdout || '').trim().split('\n').filter(Boolean).pop() || ''
    let answer: PlatformAnswer
    if (limit && (run.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT') return { answer: { ok: false, code: 'engineTimedOut', detail: `${shape.platform}'s ${String(request.action ?? '')} didn't answer within ${Math.round(limit / 1000)} s, so its engine was stopped; nothing was retried, and the next check asks again`, loginState: 'unknown' }, refreshed: null }
    try {
      answer = JSON.parse(line) as PlatformAnswer
    } catch {
      answer = { ok: false, code: 'engineNoAnswer', detail: (run.stderr || 'no output').slice(-300) }
    }
    const refreshed = existsSync(refreshedPath) ? (JSON.parse(readFileSync(refreshedPath, 'utf8')) as Record<string, string>) : null
    return { answer, refreshed }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function sessionFiles(shape: PlatformShape, account: PlatformAccount, dir: string): { spec: Record<string, unknown>; files: () => Record<string, unknown> } {
  const cookies = account.cookies ?? {}
  const storage = shape.sessionStorage ? sessionStorageOf(account.storageOrigins, shape.sessionStorage) : null
  const files = () => {
    const cookiesPath = join(dir, 'cookies.json')
    writeFileSync(cookiesPath, JSON.stringify(cookies), { mode: 0o600 })
    const storagePath = storage ? join(dir, 'storage.json') : null
    if (storagePath) writeFileSync(storagePath, JSON.stringify(storage), { mode: 0o600 })
    return { cookiesPath, ...(storagePath ? { storagePath } : {}) }
  }
  const sealed = sessionHandoff(shape.platform, account.accountName, storage ? { cookies, storage } : { cookies })
  if (sealed) return { spec: { cookiesRef: sealed }, files }
  const written = files()
  return { spec: written, files: () => written }
}

function hostedRun(shape: PlatformShape, account: PlatformAccount, request: PlatformEngineSpec, bodyOf: () => Record<string, unknown>, refreshedPath: string): PlatformEngineRun | null {
  if (!hostable(shape.platform, request, shape.engine)) return null
  const stateRoot = platformStateRoot(shape.platform)
  const host = readHostOf(shape.platform, stateRoot, account.accountName)
  if (!host) {
    startReadHost(shape.platform, stateRoot, account.accountName)
    return null
  }
  const answer = timedSync('host.roundTrip', () => askReadHost<PlatformAnswer>(host, bodyOf()), { pid: host.pid })
  if (!answer) return null
  const refreshed = existsSync(refreshedPath) ? (JSON.parse(readFileSync(refreshedPath, 'utf8')) as Record<string, string>) : null
  return { answer, refreshed }
}

export function runPlatformEngineLive(shape: PlatformShape, account: PlatformAccount, request: PlatformEngineSpec, onLive: (event: Record<string, unknown>) => void): Promise<PlatformEngineRun> {
  return timedEngine(`engine ${shape.platform} ${String(request.action ?? '')}`.trim(), { account: account.accountName, live: true }, (trace) => spawnPlatformEngineLive(shape, account, request, onLive, trace), (run) => run.answer)
}

function spawnPlatformEngineLive(shape: PlatformShape, account: PlatformAccount, request: PlatformEngineSpec, onLive: (event: Record<string, unknown>) => void, trace: EngineTrace | null): Promise<PlatformEngineRun> {
  const routed = engineRoute(account)
  if (!routed.ok) return Promise.resolve({ answer: { ok: false, code: routed.code, detail: routed.detail }, refreshed: null })
  const dir = mkdtempSync(join(tmpdir(), `${shape.platform}Api`))
  const refreshedPath = join(dir, 'refreshed.json')
  const handoff = sessionFiles(shape, account, dir)
  const spec = join(dir, 'spec.json')
  writeFileSync(spec, JSON.stringify({ ...request, account: account.accountName, platform: shape.platform, route: routed.route, browserDriver: driverOrNull(account), stateRoot: platformStateRoot(shape.platform), writesPerDay: writesPerDayOf(shape.platform), ...handoff.spec, refreshedPath, ...(trace ? { trace } : {}) }), { mode: 0o600 })
  return new Promise((resolve) => {
    const child = spawn(process.env.LOG_PYTHON || 'python', ['-u', shape.engine, spec], { windowsHide: true })
    let buffer = ''
    let last = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let cut = buffer.indexOf('\n')
      while (cut >= 0) {
        const line = buffer.slice(0, cut).trim()
        buffer = buffer.slice(cut + 1)
        if (line) {
          try {
            const parsed = JSON.parse(line) as { liveEvent?: Record<string, unknown> }
            if (parsed.liveEvent) onLive(parsed.liveEvent)
            else last = line
          } catch {
            last = line
          }
        }
        cut = buffer.indexOf('\n')
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-2000)
    })
    child.on('close', () => {
      let answer: PlatformAnswer
      try {
        answer = JSON.parse(last || buffer.trim()) as PlatformAnswer
      } catch {
        answer = { ok: false, code: 'engineNoAnswer', detail: (stderr || 'no output').slice(-300) }
      }
      const refreshed = existsSync(refreshedPath) ? (JSON.parse(readFileSync(refreshedPath, 'utf8')) as Record<string, string>) : null
      rmSync(dir, { recursive: true, force: true })
      resolve({ answer, refreshed })
    })
  })
}

export async function recordPlatformSession(twenty: TwentyClient, shape: PlatformShape, account: PlatformAccount, run: PlatformEngineRun, now: Date, cookieDomain: string): Promise<string[]> {
  const state = run.answer.loginState
  if (!state) return []
  const update: Record<string, unknown> = { sessionState: state, sessionCheckedAt: now.toISOString() }
  const cookiesBack = run.answer.ok && state === 'loggedIn' && run.refreshed && Object.keys(run.refreshed).length > 0
  if (cookiesBack) update.cookies = mergeCookieShape(account.cookies, run.refreshed!, cookieDomain)
  await twenty.update(SOCIAL_ACCOUNTS, account.id, update as never)
  writeLocalSession(account.accountName, state, now, platformStateRoot(shape.platform))
  if (run.answer.ok && state === 'loggedIn' && run.answer.userId) identifyAccount(shape.platform, account.accountName, String(run.answer.userId), now)
  if (run.answer.ok && state === 'loggedIn') rememberProfiles(shape.platform, account.accountName, [sessionProfileOf(shape.platform, run.answer as unknown as Record<string, unknown>)], now)
  return [`${accountStore(account.id)}: ${account.accountName} sessionState ${state} (${shape.label}'s own answer)${cookiesBack ? ', its refreshed cookies merged back' : ''}.`]
}
