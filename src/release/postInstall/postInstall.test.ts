import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { heldFileOf, installVendors, parsePostInstall, postInstallText, PYTHON_VENDORS, runPostInstall, stepsWithout, vendorArgs, vendorHash } from './index'
import type { VendorDeps } from './index'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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

describe('the vendor step', () => {
  const HELD = "uv pip install exited 2: error: failed to remove file `C:\\py\\Lib\\site-packages\\orjson\\orjson.cp312-win_amd64.pyd`: Access is denied. (os error 5)"
  function vendorDeps(calls: string[], answer: { ok: boolean; detail?: string }, saved: string | null = null): VendorDeps & { stored: string[] } {
    const stored: string[] = []
    return { python: 'C:/py/python.exe', run: () => (calls.push('uv'), answer), hash: () => 'h1', saved: () => saved, save: (hash) => void stored.push(hash), holders: () => ['4242 C:/py/python.exe engine.py', '5151 C:/py/python.exe host.py'], stored }
  }

  test('skips uv when vendor/ and the requirements are unchanged since the last good install, and records the hash after one', () => {
    const calls: string[] = []
    expect(installVendors(root, vendorDeps(calls, { ok: true }, 'h1'))).toEqual({ ok: true, detail: 'vendor/ and the requirements are unchanged since the last install: skipped' })
    expect(calls).toEqual([])
    const fresh = vendorDeps(calls, { ok: true, detail: 'installed' }, 'h0')
    expect(installVendors(root, fresh).ok).toBe(true)
    expect(calls).toEqual(['uv'])
    expect(fresh.stored).toEqual(['h1'])
  })

  test('a package file Windows will not replace names the Python processes holding it instead of failing the update', () => {
    const calls: string[] = []
    const deps = vendorDeps(calls, { ok: false, detail: HELD })
    const result = installVendors(root, deps)
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('orjson.cp312-win_amd64.pyd')
    expect(result.detail).toContain('4242 C:/py/python.exe engine.py')
    expect(deps.stored).toEqual([])
    expect(heldFileOf(HELD)).toBe('C:\\py\\Lib\\site-packages\\orjson\\orjson.cp312-win_amd64.pyd')
    expect(installVendors(root, vendorDeps(calls, { ok: false, detail: 'uv exited 2: No solution found' }))).toEqual({ ok: false, detail: 'uv exited 2: No solution found' })
  })

  test('the hash moves when a vendored file changes, not when a build folder does', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vendorHash'))
    mkdirSync(join(dir, 'vendor', 'fbk', 'build'), { recursive: true })
    writeFileSync(join(dir, 'vendor', 'fbk', 'setup.py'), 'a')
    const args = ['pip', 'install', './vendor/fbk']
    const first = vendorHash(dir, args)
    writeFileSync(join(dir, 'vendor', 'fbk', 'build', 'x.py'), 'b')
    expect(vendorHash(dir, args)).toBe(first)
    writeFileSync(join(dir, 'vendor', 'fbk', 'setup.py'), 'c')
    expect(vendorHash(dir, args)).not.toBe(first)
    expect(vendorHash(dir, [...args, 'pycurl'])).not.toBe(vendorHash(dir, args))
    rmSync(dir, { recursive: true, force: true })
  })
})
