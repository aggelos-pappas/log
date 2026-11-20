import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parsePostInstall, postInstallText, PYTHON_VENDORS, runPostInstall, stepsWithout, vendorArgs } from './index'
import type { PostInstallDeps } from './index'
import type { ModelFetch } from '../../models/store/index'

const root = join(import.meta.dir, '..', '..', '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const MODEL: ModelFetch = { key: 'embed', id: 'demoOrg/demoModel', revision: 'a'.repeat(40), source: 'huggingFace', process: 'the demo worker', bytes: 10, place: '/models', status: 'ready', ready: true, installed: 'a'.repeat(40), problems: [], action: 'downloaded', detail: '1 downloaded, verified' }

function fakeDeps(calls: string[], options: { vendors?: boolean; modelReady?: boolean } = {}): PostInstallDeps {
  return {
    vendors: () => (calls.push('vendors'), options.vendors === false ? { ok: false, detail: 'uv exited 2' } : { ok: true }),
    migrations: () => (calls.push('migrations'), { ok: true }),
    skills: () => (calls.push('skills'), { ok: true }),
    models: async () => (calls.push('models'), [{ ...MODEL, ready: options.modelReady !== false, action: options.modelReady === false ? 'failed' : 'downloaded' }]),
    harnesses: () => (calls.push('harnesses'), [{ id: 'hermes', label: 'Hermes', present: true, ok: true, refreshed: 'plugin rewritten', reloaded: 'plugin reloaded' }]),
    log: () => {},
  }
}

describe('the after-install routine install and update share', () => {
  test('runs vendors, migrations, skills, models and harnesses in that order', async () => {
    const calls: string[] = []
    const report = await runPostInstall('/fake/log', stepsWithout([]), fakeDeps(calls), '0.2.2')
    expect(calls).toEqual(['vendors', 'migrations', 'skills', 'models', 'harnesses'])
    expect(report.ok).toBe(true)
    expect(report.models.map((m) => m.action)).toEqual(['downloaded'])
    expect(postInstallText(report)).toBe(['log 0.2.2: after-install done', '  vendors: ok, done', '  migrations: ok, done', '  skills: ok, done', '  models: ok, all 1 on the pinned revision', '  harnesses: ok, Hermes plugin rewritten'].join('\n'))
  })

  test('log update skips the harnesses here, since it refreshes them after restarting what ran', async () => {
    const calls: string[] = []
    await runPostInstall('/fake/log', stepsWithout(['harnesses']), fakeDeps(calls), '0.2.2')
    expect(calls).toEqual(['vendors', 'migrations', 'skills', 'models'])
  })

  test('a failed vendor step fails the routine; a model that could not be fetched is reported, not fatal', async () => {
    const vendors = await runPostInstall('/fake/log', stepsWithout([]), fakeDeps([], { vendors: false }), '0.2.2')
    expect(vendors.ok).toBe(false)
    const models = await runPostInstall('/fake/log', stepsWithout([]), fakeDeps([], { modelReady: false }), '0.2.2')
    expect(models.ok).toBe(true)
    expect(models.steps.find((s) => s.step === 'models')).toEqual({ step: 'models', ok: false, detail: '0/1 on the pinned revision; not yet: embed' })
  })

  test('the report survives the trip through the script output', async () => {
    const report = await runPostInstall('/fake/log', stepsWithout(['harnesses']), fakeDeps([]), '0.2.2')
    expect(parsePostInstall(`some progress\n${JSON.stringify(report)}\n`)).toEqual(report)
    expect(parsePostInstall('not json')).toBeNull()
  })

  test('the vendor install line carries the pinned pip models and the Windows wheel only on Windows', () => {
    expect(PYTHON_VENDORS).toContain('myuri==5.0.0')
    expect(vendorArgs('/py', root, 'linux').slice(0, 4)).toEqual(['pip', 'install', '--python', '/py'])
    expect(vendorArgs('/py', root, 'linux').some((a) => a.endsWith('.whl'))).toBe(false)
    expect(vendorArgs('/py', root, 'win32').some((a) => a.endsWith('win_amd64.whl'))).toBe(true)
  })

  test('both install scripts pin a release, run this same routine and say the installed version', () => {
    for (const rel of ['site/apps/web/public/install.sh', 'site/apps/web/public/install.ps1']) {
      const text = read(rel)
      expect(text).toContain('LOG_VERSION')
      expect(text).toContain('releases/latest')
      expect(text).toContain('registry.npmjs.org')
      expect(text).toMatch(/scripts[\\/]update[\\/]postInstall\.ts/)
      expect(text).not.toContain('uv pip install')
      expect(text).toMatch(/[Ss]ay "installed log \$[A-Za-z]+"\n$/)
    }
  })
})
