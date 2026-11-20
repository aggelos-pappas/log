import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, createReadStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { LocalModel } from '../../manifest/index'
import { hfCacheDir, placeOf } from '../client'
import type { HashKind, ModelsDeps, StepAnswer } from '../types'

const DOWNLOAD_MS = 30 * 60 * 1000

function sizeOf(path: string): number | null {
  try {
    const stat = statSync(path)
    return stat.isFile() ? stat.size : null
  } catch {
    return null
  }
}

function hashOf(path: string, kind: HashKind): Promise<string | null> {
  return new Promise((resolve) => {
    const size = sizeOf(path)
    if (size === null) return resolve(null)
    const hash = createHash(kind === 'sha256' ? 'sha256' : 'sha1')
    if (kind === 'gitSha1') hash.update(`blob ${size}\0`)
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', () => resolve(null))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function downloadTo(url: string, dest: string): Promise<StepAnswer> {
  const part = `${dest}.part`
  try {
    mkdirSync(dirname(dest), { recursive: true })
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_MS) })
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status} for ${url}` }
    await Bun.write(part, response)
    renameSync(part, dest)
    return { ok: true }
  } catch (error) {
    rmSync(part, { force: true })
    return { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

function moveFile(from: string, to: string): boolean {
  try {
    mkdirSync(dirname(to), { recursive: true })
    try {
      renameSync(from, to)
    } catch {
      copyFileSync(from, to)
      rmSync(from, { force: true })
    }
    return true
  } catch {
    return false
  }
}

export function transformersCacheDir(): string | null {
  try {
    return join(dirname(Bun.resolveSync('@huggingface/transformers/package.json', import.meta.dir)), '.cache')
  } catch {
    return null
  }
}

function legacyOf(model: LocalModel): string[] {
  if (model.loader !== 'transformersJs') return []
  const old = transformersCacheDir()
  return [...(old ? [join(old, model.id)] : []), join(hfCacheDir(), model.id)].filter((dir) => existsSync(dir))
}

const python = () => process.env.LOG_PYTHON?.trim() || 'python'

function pipVersionOf(name: string): string | null {
  const done = spawnSync(python(), ['-c', `import importlib.metadata as m; print(m.version(${JSON.stringify(name)}))`], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
  const said = done.status === 0 ? done.stdout.trim() : ''
  return said || null
}

function pipInstallOf(spec: string): StepAnswer {
  const uv = spawnSync('uv', ['pip', 'install', '--python', python(), spec], { encoding: 'utf8', windowsHide: true, timeout: 10 * 60 * 1000 })
  if (!uv.error && uv.status === 0) return { ok: true }
  const pip = spawnSync(python(), ['-m', 'pip', 'install', spec], { encoding: 'utf8', windowsHide: true, timeout: 10 * 60 * 1000 })
  if (!pip.error && pip.status === 0) return { ok: true }
  return { ok: false, detail: (pip.stderr || uv.stderr || String(pip.error ?? uv.error ?? '')).trim().split('\n').slice(-2).join(' | ') }
}

export function liveModelsDeps(log: (line: string) => void = () => {}): ModelsDeps {
  return {
    place: (model) => placeOf(model),
    legacy: legacyOf,
    size: sizeOf,
    hash: hashOf,
    download: downloadTo,
    move: moveFile,
    remove: (path) => rmSync(path, { force: true }),
    pipVersion: pipVersionOf,
    pipInstall: pipInstallOf,
    log,
  }
}
