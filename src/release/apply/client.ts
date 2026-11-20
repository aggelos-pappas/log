import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { logHome } from '../../config/logHome/index'
import { modelsSummary } from '../../models/store/index'
import type { ModelFetch } from '../../models/store/index'
import { harnessesText } from '../harnesses/index'
import { isNewer } from '../version/index'
import { SETTLE_MS, SETTLE_TRIES } from './types'
import type { InstalledAt, ResumeRecord, ResumeStatus, RunningState, UpdateDeps, UpdateOptions, UpdateOutcome, UpdateTarget } from './types'

export function resumePath(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_UPDATE_RESUME?.trim() || join(logHome(env), 'resume.json')
}

export function writeResumeFile(record: ResumeRecord, path: string = resumePath()): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`)
}

export function readResume(path: string = resumePath()): ResumeRecord | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ResumeRecord
  } catch {
    return null
  }
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

export function runningParts(state: RunningState): string[] {
  return [...(state.service ? ['service'] : []), ...(state.watchers.length ? [plural(state.watchers.length, 'watcher')] : []), ...(state.browsers.length ? [plural(state.browsers.length, 'browser')] : [])]
}

export function resumedText(parts: readonly string[]): string {
  return parts.length ? parts.join(', ') : 'nothing was running'
}

export function planText(installed: InstalledAt, target: UpdateTarget | null, running: RunningState, busy: readonly string[]): string {
  if (!target || !isNewer(target.version, installed.version)) return `log ${installed.version} (${installed.kind}) is the newest known release${target ? ` (${target.version})` : ''}. Nothing to update.`
  return [
    `log update would take ${installed.version} -> ${target.version} (${installed.kind} at ${installed.root})${target.notesUrl ? `, notes ${target.notesUrl}` : ''}.`,
    `It stops and then restarts: ${resumedText(runningParts(running))}.`,
    busy.length ? `Busy now, so it would wait and then refuse: ${busy.join('; ')}.` : 'Nothing is mid-send or mid-job.',
    'Nothing was changed. With the owner\'s yes: log update --apply --approvedBy <who> (MCP updateLogLive).',
  ].join('\n')
}

export async function runUpdate(installed: InstalledAt, target: UpdateTarget, deps: UpdateDeps, options: UpdateOptions = {}): Promise<UpdateOutcome> {
  const from = installed.version
  const to = target.version
  if (!isNewer(to, from)) return { ok: true, from, to: from, resumed: 'nothing was stopped', harnesses: [], models: [], text: `log ${from} is the newest known release; nothing to update.` }
  const tries = options.settleTries ?? SETTLE_TRIES
  const wait = options.settleMs ?? SETTLE_MS
  let busy = deps.busy()
  for (let i = 0; i < tries && busy.length; i++) {
    deps.log(`waiting for ${busy.join('; ')} to settle`)
    await deps.sleep(wait)
    busy = deps.busy()
  }
  if (busy.length) return { ok: false, code: 'updateBusy', detail: busy.join('; '), rolledBack: false }
  const running = deps.running()
  const record: ResumeRecord = { from, to, kind: installed.kind, root: installed.root, commit: installed.commit, at: new Date(deps.now()).toISOString(), running, status: 'stopping', resumed: null, harnesses: null, models: null, error: null }
  const mark = (status: ResumeStatus, extra: Partial<ResumeRecord> = {}) => {
    Object.assign(record, { status, ...extra })
    deps.writeResume({ ...record })
  }
  mark('stopping')
  deps.log(`stopping: ${resumedText(runningParts(running))}`)
  const stopped = deps.stop(running, installed.root)
  if (!stopped.ok) {
    const resumed = resumedText(deps.start(running, installed.root))
    mark('failed', { resumed, error: `stop: ${stopped.detail ?? 'failed'}` })
    return { ok: false, code: 'updateFailed', detail: `could not stop what runs (${stopped.detail ?? 'failed'}); nothing was installed, resumed: ${resumed}`, rolledBack: false }
  }
  mark('installing')
  let failure: string | null = null
  let models: ModelFetch[] = []
  for (const [name, step] of [
    ['install', () => deps.install(installed.kind, to, installed.root)],
    ['after install', async () => {
      const after = await deps.afterInstall(installed.root)
      models = after.models ?? []
      return after
    }],
    ['verify', () => (mark('verifying'), deps.verify(to, installed.root))],
  ] as const) {
    deps.log(name)
    const result = await step()
    if (!result.ok) {
      failure = `${name}: ${result.detail ?? 'failed'}`
      break
    }
  }
  if (failure) {
    deps.log(`rolling back to ${from}: ${failure}`)
    const back = deps.rollback(installed)
    if (back.ok) await deps.afterInstall(installed.root)
    const resumed = resumedText(deps.start(running, installed.root))
    const harnesses = deps.refreshHarnesses(installed.root)
    mark(back.ok ? 'rolledBack' : 'failed', { resumed, harnesses, error: failure })
    return { ok: false, code: 'updateFailed', detail: back.ok ? `${failure}; rolled back to ${from}, resumed: ${resumed}` : `${failure}; the rollback to ${from} failed too (${back.detail ?? 'failed'}), resumed: ${resumed}`, rolledBack: back.ok }
  }
  const resumed = resumedText(deps.start(running, installed.root))
  const harnesses = deps.refreshHarnesses(installed.root)
  mark('resumed', { resumed, harnesses, models })
  deps.recordUpdated(from, to, resumed)
  return { ok: true, from, to, resumed, harnesses, models, text: `updated ${from} -> ${to}, resumed: ${resumed}; harnesses: ${harnessesText(harnesses)}; models: ${models.length ? modelsSummary(models) : 'none pinned in this release'}` }
}
