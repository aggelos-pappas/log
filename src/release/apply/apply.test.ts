import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planText, readResume, runUpdate, writeResumeFile } from './index'
import type { InstalledAt, ResumeRecord, RunningState, StepResult, UpdateDeps } from './index'

const dir = mkdtempSync(join(tmpdir(), 'logUpdateApply'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const installed: InstalledAt = { version: '0.2.1', kind: 'bunGlobal', root: '/fake/log', commit: null }
const target = { version: '0.2.2', notesUrl: 'https://example.com/notes' }
const RUNNING: RunningState = { service: true, watchers: [{ platform: 'twitter', account: 'xAccount' }, { platform: 'discord', account: 'discordAccount' }, { platform: 'slack', account: 'slackAccount' }], browsers: ['galwayOne'] }

interface Fake {
  deps: UpdateDeps
  calls: string[]
  resumes: ResumeRecord[]
  updated: string[]
}

function fakeDeps(options: { busy?: string[][]; verify?: StepResult; install?: StepResult; stop?: StepResult; rollback?: StepResult } = {}): Fake {
  const calls: string[] = []
  const resumes: ResumeRecord[] = []
  const updated: string[] = []
  const busy = [...(options.busy ?? [[]])]
  let installedVersion = installed.version
  const deps: UpdateDeps = {
    busy: () => (busy.length > 1 ? busy.shift()! : busy[0]),
    running: () => RUNNING,
    writeResume: (record) => {
      resumes.push(record)
      writeResumeFile(record, join(dir, 'resume.json'))
    },
    stop: () => (calls.push('stop'), options.stop ?? { ok: true }),
    install: (_kind, version) => {
      calls.push(`install ${version}`)
      if (options.install && !options.install.ok) return options.install
      installedVersion = version
      return { ok: true }
    },
    afterInstall: () => (calls.push('afterInstall'), { ok: true }),
    verify: (version) => (calls.push(`verify ${version}`), options.verify ?? (installedVersion === version ? { ok: true } : { ok: false, detail: 'wrong version' })),
    rollback: (previous) => {
      calls.push(`rollback ${previous.version}`)
      if (options.rollback) return options.rollback
      installedVersion = previous.version
      return { ok: true }
    },
    start: (state) => {
      calls.push('start')
      return [...(state.service ? ['service'] : []), `${state.watchers.length} watchers`, `${state.browsers.length} browser`]
    },
    reloadPlugin: () => (calls.push('reloadPlugin'), { ok: true }),
    recordUpdated: (from, to, resumed) => updated.push(`${from} -> ${to}: ${resumed}`),
    sleep: async () => {
      calls.push('sleep')
    },
    now: () => Date.parse('2026-11-20T00:00:00Z'),
    log: () => {},
  }
  return { deps, calls, resumes, updated }
}

describe('log update', () => {
  test('happy path: records what runs, stops it, installs, verifies, restarts it and reloads the plugin', async () => {
    const fake = fakeDeps()
    const outcome = await runUpdate(installed, target, fake.deps)
    expect(outcome).toEqual({ ok: true, from: '0.2.1', to: '0.2.2', resumed: 'service, 3 watchers, 1 browser', text: 'updated 0.2.1 -> 0.2.2, resumed: service, 3 watchers, 1 browser' })
    expect(fake.calls).toEqual(['stop', 'install 0.2.2', 'afterInstall', 'verify 0.2.2', 'start', 'reloadPlugin'])
    expect(fake.updated).toEqual(['0.2.1 -> 0.2.2: service, 3 watchers, 1 browser'])
    expect(fake.resumes.map((r) => r.status)).toEqual(['stopping', 'installing', 'verifying', 'resumed'])
  })

  test('the resume record lists what ran before anything is stopped', async () => {
    const fake = fakeDeps()
    await runUpdate(installed, target, fake.deps)
    expect(fake.resumes[0]).toEqual({ from: '0.2.1', to: '0.2.2', kind: 'bunGlobal', root: '/fake/log', commit: null, at: '2026-11-20T00:00:00.000Z', running: RUNNING, status: 'stopping', resumed: null, error: null })
    const kept = readResume(join(dir, 'resume.json'))
    expect(kept?.status).toBe('resumed')
    expect(kept?.running.watchers.length).toBe(3)
  })

  test('waits for a send to settle, then goes on', async () => {
    const fake = fakeDeps({ busy: [['queue replies sending (pid 4242)'], []] })
    const outcome = await runUpdate(installed, target, fake.deps, { settleTries: 3, settleMs: 1 })
    expect(outcome.ok).toBe(true)
    expect(fake.calls[0]).toBe('sleep')
  })

  test('refuses while a send or job is still in flight, and stops nothing', async () => {
    const fake = fakeDeps({ busy: [['job twitterQueueRunLive (job1)']] })
    const outcome = await runUpdate(installed, target, fake.deps, { settleTries: 2, settleMs: 1 })
    expect(outcome).toEqual({ ok: false, code: 'updateBusy', detail: 'job twitterQueueRunLive (job1)', rolledBack: false })
    expect(fake.calls).toEqual(['sleep', 'sleep'])
    expect(fake.resumes).toEqual([])
  })

  test('a failed verify rolls back to the version that ran and restarts what ran', async () => {
    const fake = fakeDeps({ verify: { ok: false, detail: 'log version says 0.2.1, not 0.2.2' } })
    const outcome = await runUpdate(installed, target, fake.deps)
    expect(outcome).toEqual({ ok: false, code: 'updateFailed', detail: 'verify: log version says 0.2.1, not 0.2.2; rolled back to 0.2.1, resumed: service, 3 watchers, 1 browser', rolledBack: true })
    expect(fake.calls).toEqual(['stop', 'install 0.2.2', 'afterInstall', 'verify 0.2.2', 'rollback 0.2.1', 'afterInstall', 'start', 'reloadPlugin'])
    expect(fake.resumes.at(-1)?.status).toBe('rolledBack')
    expect(fake.updated).toEqual([])
  })

  test('a failed install rolls back too, and a failed rollback says so', async () => {
    const fake = fakeDeps({ install: { ok: false, detail: 'network' }, rollback: { ok: false, detail: 'disk full' } })
    const outcome = await runUpdate(installed, target, fake.deps)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.detail).toBe('install: network; the rollback to 0.2.1 failed too (disk full), resumed: service, 3 watchers, 1 browser')
    expect(fake.resumes.at(-1)?.status).toBe('failed')
  })

  test('a failed stop installs nothing and restarts what ran', async () => {
    const fake = fakeDeps({ stop: { ok: false, detail: 'watcher would not stop' } })
    const outcome = await runUpdate(installed, target, fake.deps)
    expect(outcome.ok).toBe(false)
    expect(fake.calls).toEqual(['stop', 'start'])
  })

  test('nothing newer: nothing is stopped', async () => {
    const fake = fakeDeps()
    const outcome = await runUpdate(installed, { version: '0.2.1', notesUrl: null }, fake.deps)
    expect(outcome.ok).toBe(true)
    expect(fake.calls).toEqual([])
  })

  test('the plan says what would stop and what is busy, and changes nothing', () => {
    const text = planText(installed, target, RUNNING, ['job hostStartLive (job2)'])
    expect(text).toContain('0.2.1 -> 0.2.2')
    expect(text).toContain('service, 3 watchers, 1 browser')
    expect(text).toContain('job hostStartLive (job2)')
    expect(planText(installed, null, RUNNING, [])).toContain('Nothing to update')
  })
})
