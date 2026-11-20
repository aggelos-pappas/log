import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { LOCAL_MODELS, pipSpecs } from '../../../models/manifest/index'
import { fetchModels, liveModelsDeps } from '../../../models/store/index'
import { refreshHarnesses } from '../../harnesses/index'
import type { PostInstallDeps, StepResult } from '../types'

export const PYTHON_VENDORS = ['-r', 'vendor/twikit/requirements.txt', './vendor/fbk', './vendor/endcord', './vendor/openLinkedinApi', './vendor/instagrapi', 'brotli', 'pycurl', ...pipSpecs()]

const STEP_MS = 10 * 60 * 1000

export function runStep(command: string, args: string[], cwd?: string, timeout = STEP_MS): StepResult {
  const done = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, timeout, env: process.env })
  if (done.error) return { ok: false, detail: `${command} ${args[0] ?? ''}: ${done.error.message}` }
  if (done.status !== 0) return { ok: false, detail: `${command} ${args.join(' ')} exited ${done.status}: ${(done.stderr || done.stdout || '').trim().split('\n').slice(-3).join(' | ')}` }
  return { ok: true, detail: done.stdout }
}

export function platformWheels(root: string, platform: string = process.platform): string[] {
  const dir = join(root, 'vendor', 'chatXdk', 'wheels')
  if (platform !== 'win32' || !existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('win_amd64.whl')).slice(0, 1).map((f) => join(dir, f))
}

export function vendorArgs(python: string, root: string, platform: string = process.platform): string[] {
  return ['pip', 'install', '--python', python, ...PYTHON_VENDORS, ...platformWheels(root, platform)]
}

function vendors(root: string): StepResult {
  const python = process.env.LOG_PYTHON?.trim()
  if (!python) return { ok: true, detail: 'no LOG_PYTHON set, so the engines were left alone' }
  if (!existsSync(join(root, 'vendor'))) return { ok: true, detail: 'no vendor folder in this install' }
  return runStep('uv', vendorArgs(python, root), root)
}

function migrations(root: string): StepResult {
  return runStep(process.execPath, ['-e', "const { openDatabase } = await import('./src/storage/schema/index.ts'); openDatabase().close()"], root, 120_000)
}

function skills(root: string): StepResult {
  const script = join(root, 'scripts', 'docs', 'syncSiteSkills.mjs')
  if (!existsSync(script)) return { ok: true, detail: 'no skills build in this install' }
  const done = runStep('node', [script], root, 120_000)
  return done.ok || /ENOENT/.test(done.detail ?? '') ? { ok: true, detail: done.ok ? 'done' : 'node is not on PATH, skills left as shipped' } : done
}

export function livePostInstallDeps(log: (line: string) => void = () => {}): PostInstallDeps {
  return {
    vendors,
    migrations,
    skills,
    models: () => fetchModels(LOCAL_MODELS, liveModelsDeps(log)),
    harnesses: (root) => refreshHarnesses(root),
    log,
  }
}
