import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { openInspects } from '../../../browser/inspect/index'
import { forgetService, readService, startService } from '../../../contextLayer/service/index'
import { killTree, processAlive } from '../../../inbox/watch/index'
import { listJobs, statusOf } from '../../../mcp/jobs/index'
import { watcherRows } from '../../../platformKit/watcher/index'
import { heldQueueLocks, queueLabel } from '../../../twitter/queue/store/index'
import { readUpdateState, updateStatePath, writeUpdateState } from '../../check/index'
import { packageFacts } from '../../version/index'
import type { HarnessRefresh } from '../../harnesses/index'
import type { InstallKind } from '../../version/index'
import { writeResumeFile } from '../client'
import { livePostInstallDeps, parsePostInstall, runPostInstall, runStep } from '../../postInstall/index'
import type { AfterInstall, InstalledAt, RunningState, StepResult, UpdateDeps } from '../types'

const run = runStep

const bun = () => process.execPath

const logCli = (root: string, args: string[], timeout = 120_000) => run(bun(), [join(root, 'bin', 'log.ts'), ...args], root, timeout)

function all(results: StepResult[]): StepResult {
  const failed = results.filter((r) => !r.ok)
  return failed.length ? { ok: false, detail: failed.map((r) => r.detail).join('; ') } : { ok: true }
}

export const JOB_STALE_MS = 12 * 3600 * 1000

export function busyNow(now: number = Date.now()): string[] {
  const fresh = (startedAt: string) => now - Date.parse(startedAt) < JOB_STALE_MS
  const jobs = listJobs().filter((job) => job.pid !== process.pid && fresh(job.startedAt) && statusOf(job) === 'running').map((job) => `job ${job.tool} (${job.id})`)
  let queues: string[] = []
  try {
    queues = heldQueueLocks(processAlive).filter((lock) => lock.pid !== process.pid).map((lock) => `queue ${queueLabel(lock.name)} sending (pid ${lock.pid})`)
  } catch {}
  return [...jobs, ...queues]
}

export function runningNow(): RunningState {
  let watchers: RunningState['watchers'] = []
  try {
    watchers = watcherRows().filter((row) => row.pid !== null).map((row) => ({ platform: row.platform, account: row.account }))
  } catch {}
  let browsers: string[] = []
  try {
    browsers = openInspects().map((session) => session.account)
  } catch {}
  return { service: readService() !== null, watchers, browsers }
}

function stopAll(state: RunningState, root: string): StepResult {
  const results: StepResult[] = []
  for (const account of state.browsers) results.push(logCli(root, ['inspect', 'do', 'stop', '--account', account]))
  for (const w of state.watchers) results.push(logCli(root, ['watchers', 'stop', '--platform', w.platform, '--account', w.account]))
  const service = readService()
  if (service) {
    killTree(service.pid)
    forgetService()
  }
  return all(results)
}

function startAll(state: RunningState, root: string): string[] {
  const parts: string[] = []
  if (state.service && startService(root) !== null) parts.push('service')
  const watchers = state.watchers.filter((w) => logCli(root, ['watchers', 'start', '--platform', w.platform, '--account', w.account]).ok).length
  if (watchers) parts.push(`${watchers} watcher${watchers === 1 ? '' : 's'}`)
  const browsers = state.browsers.filter((account) => logCli(root, ['inspect', 'start', '--account', account, '--detach'], 300_000).ok).length
  if (browsers) parts.push(`${browsers} browser${browsers === 1 ? '' : 's'}`)
  return parts
}

function installVersion(kind: InstallKind, version: string, root: string): StepResult {
  if (kind === 'bunGlobal') return run(bun(), ['add', '-g', `${packageFacts(root).name}@${version}`])
  if (kind === 'gitClone') {
    const fetched = run('git', ['-C', root, 'fetch', '--tags', 'origin'])
    if (!fetched.ok) return fetched
    const moved = run('git', ['-C', root, 'merge', '--ff-only', `v${version}`])
    return moved.ok ? run(bun(), ['install', '--frozen-lockfile'], root) : moved
  }
  return { ok: false, detail: 'this install is neither a bun global install nor a git clone, so log update cannot replace it; reinstall with the install script' }
}

function rollbackTo(previous: InstalledAt): StepResult {
  if (previous.kind === 'gitClone') {
    if (!previous.commit) return { ok: false, detail: 'no commit was recorded to go back to' }
    const back = run('git', ['-C', previous.root, 'reset', '--keep', previous.commit])
    return back.ok ? run(bun(), ['install', '--frozen-lockfile'], previous.root) : back
  }
  return installVersion(previous.kind, previous.version, previous.root)
}

export const NEW_CODE_STEPS = ['vendors', 'migrations', 'skills', 'models'] as const

async function afterInstall(root: string): Promise<AfterInstall> {
  const script = join(root, 'scripts', 'update', 'postInstall.ts')
  if (!existsSync(script)) {
    const report = await runPostInstall(root, ['vendors', 'migrations', 'skills'], livePostInstallDeps())
    return { ok: report.ok, detail: report.steps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.detail}`).join('; '), models: [] }
  }
  const done = run(bun(), [script, '--skip', 'harnesses', '--json'], root, 45 * 60 * 1000)
  const report = parsePostInstall(done.detail ?? '')
  if (!report) return { ok: false, detail: done.ok ? 'the after-install step said nothing readable' : done.detail }
  return { ok: report.ok, detail: report.steps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.detail}`).join('; '), models: report.models }
}

function verifyVersion(version: string, root: string): StepResult {
  const said = logCli(root, ['version', '--json'])
  if (!said.ok) return said
  let reported = ''
  try {
    reported = String((JSON.parse(said.detail ?? '{}') as { version?: string }).version ?? '')
  } catch {}
  if (reported !== version) return { ok: false, detail: `log version says ${reported || 'nothing'}, not ${version}` }
  const smoke = logCli(root, ['runs', 'space'])
  return smoke.ok ? { ok: true } : { ok: false, detail: `smoke: ${smoke.detail}` }
}

function refreshWithNewCode(root: string): HarnessRefresh[] {
  const done = run(bun(), [join(root, 'scripts', 'update', 'harnesses.ts')], root, 300_000)
  try {
    return done.ok ? (JSON.parse(done.detail ?? '[]') as HarnessRefresh[]) : []
  } catch {
    return []
  }
}

function recordUpdated(from: string, to: string, resumed: string): void {
  const path = updateStatePath()
  writeUpdateState({ ...readUpdateState(path), updated: { from, to, resumed, at: new Date().toISOString(), told: false } }, path)
}

export function liveUpdateDeps(log: (line: string) => void): UpdateDeps {
  return {
    busy: () => busyNow(),
    running: runningNow,
    writeResume: (record) => writeResumeFile(record),
    stop: stopAll,
    install: installVersion,
    afterInstall,
    verify: verifyVersion,
    rollback: rollbackTo,
    start: startAll,
    refreshHarnesses: refreshWithNewCode,
    recordUpdated,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: Date.now,
    log,
  }
}
