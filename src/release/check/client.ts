import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { logHome } from '../../config/logHome/index'
import { settingsPath } from '../../browser/identity/index'
import { isNewer, isPrerelease, LOG_ROOT, packageFacts, parseVersion } from '../version/index'
import type { PackageFacts } from '../version/index'
import { CHECK_EVERY_MS, CHECK_TIMEOUT_MS, CHECKING_GRACE_MS, DEFAULT_UPDATE_SETTINGS, EMPTY_UPDATE_STATE, TOLD_SESSIONS_KEPT, UPDATE_CHANNELS, UPDATE_MODES } from './types'
import type { CheckDeps, FetchLike, LatestRelease, UpdateChannel, UpdateMode, UpdateSettings, UpdateState } from './types'

export function updateStatePath(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_UPDATE_STATE?.trim() || join(logHome(env), 'update.json')
}

export function readUpdateState(path: string = updateStatePath()): UpdateState {
  if (!existsSync(path)) return { ...EMPTY_UPDATE_STATE, toldSessions: [] }
  try {
    const body = JSON.parse(readFileSync(path, 'utf8')) as Partial<UpdateState>
    return { ...EMPTY_UPDATE_STATE, ...body, toldSessions: Array.isArray(body.toldSessions) ? body.toldSessions.map(String) : [] }
  } catch {
    return { ...EMPTY_UPDATE_STATE, toldSessions: [] }
  }
}

export function writeUpdateState(state: UpdateState, path: string = updateStatePath()): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify({ ...state, toldSessions: state.toldSessions.slice(-TOLD_SESSIONS_KEPT) }, null, 2)}\n`)
}

const pick = <T extends string>(values: readonly T[], value: unknown): T | null => (typeof value === 'string' && (values as readonly string[]).includes(value.trim()) ? (value.trim() as T) : null)

function onOff(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  if (['on', 'true', '1', 'yes'].includes(text)) return true
  if (['off', 'false', '0', 'no'].includes(text)) return false
  return null
}

export function updateSettings(env: Record<string, string | undefined> = process.env, file: string = settingsPath(env as NodeJS.ProcessEnv)): UpdateSettings {
  let saved: Record<string, unknown> = {}
  if (existsSync(file)) {
    try {
      const update = (JSON.parse(readFileSync(file, 'utf8')) as { update?: unknown }).update
      if (update && typeof update === 'object') saved = update as Record<string, unknown>
    } catch {}
  }
  return {
    check: onOff(env.LOG_UPDATE_CHECK) ?? onOff(saved.check) ?? DEFAULT_UPDATE_SETTINGS.check,
    auto: pick<UpdateMode>(UPDATE_MODES, env.LOG_UPDATE_AUTO) ?? pick<UpdateMode>(UPDATE_MODES, saved.auto) ?? DEFAULT_UPDATE_SETTINGS.auto,
    channel: pick<UpdateChannel>(UPDATE_CHANNELS, env.LOG_UPDATE_CHANNEL) ?? pick<UpdateChannel>(UPDATE_CHANNELS, saved.channel) ?? DEFAULT_UPDATE_SETTINGS.channel,
  }
}

export const defaultCheckDeps: CheckDeps = {
  fetch: (url, init) => fetch(url, init),
  now: Date.now,
  timeoutMs: CHECK_TIMEOUT_MS,
}

async function getJson(fetcher: FetchLike, url: string, timeoutMs: number): Promise<unknown> {
  const answer = await fetcher(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
  if (!answer.ok) return null
  return answer.json()
}

interface GithubRelease {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
}

function fromGithub(release: GithubRelease | null | undefined): LatestRelease | null {
  const version = String(release?.tag_name ?? '').replace(/^v/, '')
  return release && !release.draft && parseVersion(version) ? { version, notesUrl: release.html_url ?? null, source: 'github' } : null
}

export async function fetchLatest(facts: Pick<PackageFacts, 'name' | 'repo'>, channel: UpdateChannel, deps: CheckDeps = defaultCheckDeps): Promise<LatestRelease | null> {
  if (facts.repo) {
    try {
      if (channel === 'stable') {
        const found = fromGithub((await getJson(deps.fetch, `https://api.github.com/repos/${facts.repo}/releases/latest`, deps.timeoutMs)) as GithubRelease | null)
        if (found) return found
      } else {
        const list = (await getJson(deps.fetch, `https://api.github.com/repos/${facts.repo}/releases?per_page=10`, deps.timeoutMs)) as GithubRelease[] | null
        const found = Array.isArray(list) ? list.map(fromGithub).find(Boolean) : null
        if (found) return found
      }
    } catch {}
  }
  if (!facts.name) return null
  try {
    const tags = ((await getJson(deps.fetch, `https://registry.npmjs.org/-/package/${facts.name.replace('/', '%2f')}/dist-tags`, deps.timeoutMs)) ?? {}) as Record<string, string>
    const version = (channel === 'beta' ? tags.beta ?? tags.next : null) ?? tags.latest
    if (!version || !parseVersion(version)) return null
    if (channel === 'stable' && isPrerelease(version)) return null
    return { version, notesUrl: `https://www.npmjs.com/package/${facts.name}/v/${version}`, source: 'npm' }
  } catch {
    return null
  }
}

export function checkDue(state: UpdateState, settings: UpdateSettings, now: number): boolean {
  if (!settings.check) return false
  if (state.channel !== settings.channel) return true
  const at = state.checkedAt ? Date.parse(state.checkedAt) : NaN
  return !Number.isFinite(at) || now - at >= CHECK_EVERY_MS
}

export interface CheckOptions {
  force?: boolean
  path?: string
  settings?: UpdateSettings
  facts?: Pick<PackageFacts, 'name' | 'repo'>
  deps?: CheckDeps
}

export async function checkForUpdate(options: CheckOptions = {}): Promise<UpdateState> {
  const path = options.path ?? updateStatePath()
  const settings = options.settings ?? updateSettings()
  const deps = options.deps ?? defaultCheckDeps
  const state = readUpdateState(path)
  if (!options.force && !checkDue(state, settings, deps.now())) return state
  const found = await fetchLatest(options.facts ?? packageFacts(), settings.channel, deps)
  const next: UpdateState = { ...readUpdateState(path), checkedAt: new Date(deps.now()).toISOString(), checkingAt: null, channel: settings.channel }
  if (found) {
    next.latest = found.version
    next.notesUrl = found.notesUrl
    next.source = found.source
  }
  writeUpdateState(next, path)
  return next
}

export function claimBackgroundCheck(path: string, settings: UpdateSettings, now: number): boolean {
  const state = readUpdateState(path)
  if (!checkDue(state, settings, now)) return false
  const checking = state.checkingAt ? Date.parse(state.checkingAt) : NaN
  if (Number.isFinite(checking) && now - checking < CHECKING_GRACE_MS) return false
  writeUpdateState({ ...state, checkingAt: new Date(now).toISOString() }, path)
  return true
}

export interface BackgroundDeps {
  launch: (command: string, args: string[]) => void
  now: () => number
  env: Record<string, string | undefined>
}

export const defaultBackgroundDeps: BackgroundDeps = {
  launch: (command, args) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true, env: process.env })
    child.on('error', () => {})
    child.unref()
  },
  now: Date.now,
  env: process.env,
}

export function refreshInBackground(root: string = LOG_ROOT, deps: BackgroundDeps = defaultBackgroundDeps): boolean {
  if (deps.env.CI) return false
  try {
    const settings = updateSettings(deps.env)
    const path = updateStatePath(deps.env)
    if (!claimBackgroundCheck(path, settings, deps.now())) return false
    deps.launch(process.execPath, [join(root, 'scripts', 'update', 'check.ts')])
    return true
  } catch {
    return false
  }
}

export function cliNotice(current: string, state: UpdateState): string | null {
  return isNewer(state.latest, current) ? `log ${state.latest} is out (you have ${current}): log update` : null
}

function newerLine(current: string, state: UpdateState, mode: UpdateMode): string {
  const head = `log-cli update: log ${state.latest} is out (you have ${current})${state.notesUrl ? `, notes ${state.notesUrl}` : ''}.`
  if (mode === 'notify') return `${head} Tell the owner once; he updates with \`log update\` when he wants.`
  if (mode === 'auto') return `${head} update.auto is auto: when nothing is running, run \`updateLogLive\` { approvedBy: "update.auto", confirmLive: true }.`
  return `${head} Ask the owner, then run \`updateLog\` to see the plan and, only after he says yes, \`updateLogLive\` { approvedBy: "the owner", confirmLive: true }.`
}

export interface NoticeOptions {
  path?: string
  settings?: UpdateSettings
  current?: string
}

export function agentNotice(session: string, options: NoticeOptions = {}): string | null {
  const path = options.path ?? updateStatePath()
  const settings = options.settings ?? updateSettings()
  const current = options.current ?? packageFacts().version
  const state = readUpdateState(path)
  const lines: string[] = []
  let changed = false
  if (state.updated && !state.updated.told) {
    lines.push(`log-cli update: updated ${state.updated.from} -> ${state.updated.to}, resumed: ${state.updated.resumed}. Carry on with the task you were doing.`)
    state.updated = { ...state.updated, told: true }
    changed = true
  }
  if (settings.check && isNewer(state.latest, current)) {
    if (state.toldVersion !== state.latest) {
      state.toldVersion = state.latest
      state.toldSessions = []
      changed = true
    }
    if (!state.toldSessions.includes(session)) {
      lines.push(newerLine(current, state, settings.auto))
      state.toldSessions = [...state.toldSessions, session]
      changed = true
    }
  }
  if (changed) writeUpdateState(state, path)
  return lines.length ? lines.join('\n') : null
}

export function consoleNotice(options: NoticeOptions = {}): string | null {
  const settings = options.settings ?? updateSettings()
  if (!settings.check) return null
  const current = options.current ?? packageFacts().version
  const state = readUpdateState(options.path ?? updateStatePath())
  return isNewer(state.latest, current) ? `log ${state.latest} is out (you have ${current})${state.notesUrl ? `, notes ${state.notesUrl}` : ''}: log update` : null
}

export const QUIET_AFTER = new Set(['version', '--version', 'update'])

export function afterCommand(command: string | undefined, write: (line: string) => void, tty: boolean, env: Record<string, string | undefined> = process.env, root: string = LOG_ROOT): void {
  try {
    if (!updateSettings(env).check || env.CI) return
    refreshInBackground(root, { ...defaultBackgroundDeps, env })
    if (!tty || QUIET_AFTER.has(command ?? '')) return
    const line = cliNotice(packageFacts(root).version, readUpdateState(updateStatePath(env)))
    if (line) write(line)
  } catch {}
}
