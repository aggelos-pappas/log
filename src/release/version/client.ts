import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { InstallKind, PackageFacts, Semver } from './types'

export const LOG_ROOT = join(import.meta.dir, '..', '..', '..')

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseVersion(text: string | null | undefined): Semver | null {
  const found = SEMVER.exec(String(text ?? '').trim())
  if (!found) return null
  return { major: Number(found[1]), minor: Number(found[2]), patch: Number(found[3]), pre: found[4] ? found[4].split('.') : [] }
}

function comparePre(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0
  if (!a.length) return 1
  if (!b.length) return -1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1
    if (b[i] === undefined) return 1
    const an = /^\d+$/.test(a[i]) ? Number(a[i]) : null
    const bn = /^\d+$/.test(b[i]) ? Number(b[i]) : null
    if (an !== null && bn !== null && an !== bn) return an < bn ? -1 : 1
    if (an !== null && bn === null) return -1
    if (an === null && bn !== null) return 1
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return 0
  for (const key of ['major', 'minor', 'patch'] as const) if (x[key] !== y[key]) return x[key] < y[key] ? -1 : 1
  return comparePre(x.pre, y.pre)
}

export function isNewer(candidate: string | null | undefined, current: string): boolean {
  return Boolean(candidate && parseVersion(candidate) && parseVersion(current) && compareVersions(candidate, current) > 0)
}

export function isPrerelease(version: string): boolean {
  return Boolean(parseVersion(version)?.pre.length)
}

export function repoOf(url: string | null | undefined): string | null {
  const found = /github\.com[/:]([^/]+)\/([^/#.]+)(?:\.git)?/.exec(String(url ?? ''))
  return found ? `${found[1]}/${found[2]}` : null
}

export function packageFacts(root: string = LOG_ROOT): PackageFacts {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name?: string; version?: string; repository?: string | { url?: string } }
  const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  return { name: String(pkg.name ?? ''), version: String(pkg.version ?? '0.0.0'), repo: repoOf(url) }
}

export function installKindOf(root: string, exists: (path: string) => boolean = existsSync): InstallKind {
  if (exists(join(root, '.git'))) return 'gitClone'
  const parts = root.split(/[\\/]+/).map((p) => p.toLowerCase())
  const bunGlobal = parts.some((p, i) => p === 'global' && parts[i - 1] === 'install' && parts[i - 2] === '.bun')
  return parts.includes('node_modules') && bunGlobal ? 'bunGlobal' : 'other'
}

export function gitCommit(root: string = LOG_ROOT): string | null {
  if (!existsSync(join(root, '.git'))) return null
  const run = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
  const sha = run.status === 0 ? run.stdout.trim() : ''
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null
}
