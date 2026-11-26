import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { agentNotice, checkDue, checkForUpdate, claimBackgroundCheck, cliNotice, consoleNotice, fetchLatest, readUpdateState, saveTrack, updateSettings, writeUpdateState } from './index'
import type { CheckDeps, FetchLike, UpdateSettings } from './index'

const dir = mkdtempSync(join(tmpdir(), 'logUpdateCheck'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
let n = 0
const scratch = () => join(dir, `update${n++}.json`)
const facts = { name: '@listeningkit/log', repo: 'someOrg/log' }
const ASK: UpdateSettings = { check: true, auto: 'ask', track: 'stable' }
const DAY = 24 * 3600 * 1000

function fakeRegistry(answers: Record<string, unknown>, calls: string[] = []): FetchLike {
  return async (url) => {
    calls.push(url)
    const hit = Object.keys(answers).find((key) => url.includes(key))
    if (!hit) throw new Error('offline')
    const body = answers[hit]
    return { ok: body !== null, status: body === null ? 404 : 200, json: async () => body }
  }
}

const deps = (fetch: FetchLike, now = Date.parse('2026-11-20T00:00:00Z')): CheckDeps => ({ fetch, now: () => now, timeoutMs: 2000 })

describe('settings', () => {
  test('defaults to checking, asking first and the stable track', () => {
    expect(updateSettings({}, join(dir, 'none.json'))).toEqual({ check: true, auto: 'ask', track: 'stable' })
  })

  test('saveTrack keeps the other settings and drops the old channel key', () => {
    const file = join(dir, 'saved.json')
    writeFileSync(file, JSON.stringify({ identity: { browser: 'chrome' }, update: { auto: 'notify', channel: 'beta' } }))
    expect(updateSettings({}, file).track).toBe('nightly')
    saveTrack('stable', file)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ identity: { browser: 'chrome' }, update: { auto: 'notify', track: 'stable' } })
    expect(updateSettings({ LOG_TRACK: 'nightly' }, file).track).toBe('nightly')
    saveTrack('nightly', join(dir, 'fresh', 'settings.json'))
    expect(updateSettings({}, join(dir, 'fresh', 'settings.json')).track).toBe('nightly')
  })

  test('reads update from settings.json and lets the environment win', () => {
    const file = join(dir, 'settings.json')
    writeFileSync(file, JSON.stringify({ update: { check: 'off', auto: 'notify', track: 'nightly' } }))
    expect(updateSettings({}, file)).toEqual({ check: false, auto: 'notify', track: 'nightly' })
    expect(updateSettings({ LOG_UPDATE_CHECK: 'on', LOG_UPDATE_AUTO: 'auto' }, file)).toEqual({ check: true, auto: 'auto', track: 'nightly' })
    expect(updateSettings({ LOG_TRACK: 'stable' }, file).track).toBe('stable')
    expect(updateSettings({ LOG_UPDATE_AUTO: 'sometimes' }, join(dir, 'none.json')).auto).toBe('ask')
  })
})

describe('the newest release', () => {
  test('GitHub Releases first, with its notes url', async () => {
    const found = await fetchLatest(facts, 'stable', deps(fakeRegistry({ 'releases/latest': { tag_name: 'v0.2.2', html_url: 'https://github.com/someOrg/log/releases/tag/v0.2.2' } })))
    expect(found).toEqual({ version: '0.2.2', notesUrl: 'https://github.com/someOrg/log/releases/tag/v0.2.2', source: 'github' })
  })

  test('npm latest when the repo has no release', async () => {
    const found = await fetchLatest(facts, 'stable', deps(fakeRegistry({ 'releases/latest': null, 'registry.npmjs.org': { latest: '0.2.0' } })))
    expect(found).toEqual({ version: '0.2.0', notesUrl: 'https://www.npmjs.com/package/@listeningkit/log/v/0.2.0', source: 'npm' })
  })

  test('the nightly track takes the newest release by semver, nightlies included', async () => {
    const list = [{ tag_name: 'v0.3.0', html_url: 'v' }, { tag_name: 'v0.3.1-nightly.202611201200.a1b2c3d', html_url: 'u', prerelease: true }, { tag_name: 'v0.2.2-nightly.202611190900.ffffff0', prerelease: true }]
    const found = await fetchLatest(facts, 'nightly', deps(fakeRegistry({ 'releases?per_page': list })))
    expect(found?.version).toBe('0.3.1-nightly.202611201200.a1b2c3d')
  })

  test('npm next on the nightly track, latest when it is newer; stable never takes a nightly', async () => {
    const npm = (tags: Record<string, string>) => deps(fakeRegistry({ 'releases': null, 'registry.npmjs.org': tags }))
    expect((await fetchLatest(facts, 'nightly', npm({ latest: '0.3.0', next: '0.3.1-nightly.202611201200.a1b2c3d' })))?.version).toBe('0.3.1-nightly.202611201200.a1b2c3d')
    expect((await fetchLatest(facts, 'nightly', npm({ latest: '0.3.1', next: '0.3.1-nightly.202611201200.a1b2c3d' })))?.version).toBe('0.3.1')
    expect((await fetchLatest(facts, 'stable', npm({ latest: '0.3.0', next: '0.3.1-nightly.202611201200.a1b2c3d' })))?.version).toBe('0.3.0')
  })

  test('offline is silent: nothing found, nothing thrown', async () => {
    expect(await fetchLatest(facts, 'stable', deps(fakeRegistry({})))).toBeNull()
  })
})

describe('the 24 h cache', () => {
  test('asks at most once a day and keeps what it found', async () => {
    const path = scratch()
    const calls: string[] = []
    const fetch = fakeRegistry({ 'releases/latest': { tag_name: 'v0.2.2', html_url: 'n' } }, calls)
    const t0 = Date.parse('2026-11-20T00:00:00Z')
    expect((await checkForUpdate({ path, settings: ASK, facts, deps: deps(fetch, t0) })).latest).toBe('0.2.2')
    await checkForUpdate({ path, settings: ASK, facts, deps: deps(fetch, t0 + DAY - 1) })
    expect(calls.length).toBe(1)
    await checkForUpdate({ path, settings: ASK, facts, deps: deps(fetch, t0 + DAY) })
    expect(calls.length).toBe(2)
    expect(readUpdateState(path).checkedAt).toBe(new Date(t0 + DAY).toISOString())
  })

  test('check off never asks unless forced; offline keeps the last answer', async () => {
    const path = scratch()
    const calls: string[] = []
    await checkForUpdate({ path, settings: { ...ASK, check: false }, facts, deps: deps(fakeRegistry({}, calls)) })
    expect(calls.length).toBe(0)
    writeUpdateState({ ...readUpdateState(path), latest: '0.2.2', notesUrl: 'n' }, path)
    const after = await checkForUpdate({ path, force: true, settings: ASK, facts, deps: deps(fakeRegistry({}, calls)) })
    expect(calls.length).toBeGreaterThan(0)
    expect(after.latest).toBe('0.2.2')
  })

  test('a background check is claimed once while it runs', () => {
    const path = scratch()
    const now = Date.parse('2026-11-20T00:00:00Z')
    expect(claimBackgroundCheck(path, ASK, now)).toBe(true)
    expect(claimBackgroundCheck(path, ASK, now + 1000)).toBe(false)
    expect(checkDue(readUpdateState(path), { ...ASK, track: 'nightly' }, now)).toBe(true)
  })
})

describe('notices', () => {
  const newer = (path: string) => writeUpdateState({ ...readUpdateState(path), latest: '0.2.2', notesUrl: 'https://example.com/notes', checkedAt: new Date().toISOString() }, path)

  test('the agent is told once per session, then never again in that session', () => {
    const path = scratch()
    newer(path)
    const first = agentNotice('sessionA', { path, settings: ASK, current: '0.2.1' })
    expect(first).toBe('log-cli update: log 0.2.2 is out (you have 0.2.1), notes https://example.com/notes. Ask the owner, then run `updateLog` to see the plan and, only after he says yes, `updateLogLive` { approvedBy: "the owner", confirmLive: true }.')
    expect(agentNotice('sessionA', { path, settings: ASK, current: '0.2.1' })).toBeNull()
    expect(agentNotice('sessionB', { path, settings: ASK, current: '0.2.1' })).toContain('0.2.2 is out')
  })

  test('a newer release is told again to a session that heard the last one', () => {
    const path = scratch()
    newer(path)
    agentNotice('sessionA', { path, settings: ASK, current: '0.2.1' })
    writeUpdateState({ ...readUpdateState(path), latest: '0.2.3' }, path)
    expect(agentNotice('sessionA', { path, settings: ASK, current: '0.2.1' })).toContain('0.2.3 is out')
  })

  test('notify and auto word it their way; up to date or check off says nothing', () => {
    const path = scratch()
    newer(path)
    expect(agentNotice('s1', { path, settings: { ...ASK, auto: 'notify' }, current: '0.2.1' })).toContain('he updates with `log update` when he wants')
    expect(agentNotice('s2', { path, settings: { ...ASK, auto: 'auto' }, current: '0.2.1' })).toContain('approvedBy: "update.auto"')
    expect(agentNotice('s3', { path, settings: ASK, current: '0.2.2' })).toBeNull()
    expect(agentNotice('s4', { path, settings: { ...ASK, check: false }, current: '0.2.1' })).toBeNull()
  })

  test('the updated line reaches the next prompt once', () => {
    const path = scratch()
    writeUpdateState({ ...readUpdateState(path), updated: { from: '0.2.1', to: '0.2.2', resumed: 'service, 3 watchers, 1 browser', at: '2026-11-20T00:00:00Z', told: false } }, path)
    expect(agentNotice('s1', { path, settings: ASK, current: '0.2.2' })).toBe('log-cli update: updated 0.2.1 -> 0.2.2, resumed: service, 3 watchers, 1 browser. Carry on with the task you were doing.')
    expect(agentNotice('s2', { path, settings: ASK, current: '0.2.2' })).toBeNull()
  })

  test('the CLI line and the console line', () => {
    const path = scratch()
    newer(path)
    expect(cliNotice('0.2.1', readUpdateState(path))).toBe('log 0.2.2 is out (you have 0.2.1): log update')
    expect(cliNotice('0.2.2', readUpdateState(path))).toBeNull()
    expect(consoleNotice({ path, settings: ASK, current: '0.2.1' })).toBe('log 0.2.2 is out (you have 0.2.1), notes https://example.com/notes: log update')
  })
})
