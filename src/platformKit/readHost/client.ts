import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { HOST_CALL_SECONDS, HOST_PASSED_CODES, HOST_START_GRACE_MS, HOSTED_PLATFORMS, NOT_HOSTED_ACTIONS } from './types'
import type { ReadHostInfo } from './types'

export const PYTHON_ROOT = resolve(join(import.meta.dir, '..', '..', '..', 'python'))

const HOST_SCRIPT = join(PYTHON_ROOT, 'platformKit', 'host.py')

const starting = new Map<string, number>()

export function readHostOff(env: Record<string, string | undefined> = process.env): boolean {
  if (env.LOG_KIT_HOST === 'on') return false
  return env.LOG_KIT_HOST === 'off' || env.LOG_KIT_HOST === 'inline' || env.NODE_ENV === 'test'
}

export function engineOf(platform: string): string {
  return join(PYTHON_ROOT, `${platform}Api`, 'engine.py')
}

export function hostable(platform: string, request: { action?: unknown; live?: unknown; streamProgress?: unknown }, engine: string = engineOf(platform), env: Record<string, string | undefined> = process.env): boolean {
  return !readHostOff(env) && HOSTED_PLATFORMS.includes(platform) && resolve(engine).toLowerCase() === engineOf(platform).toLowerCase() && !NOT_HOSTED_ACTIONS.includes(String(request.action ?? '')) && request.live !== true && !request.streamProgress
}

export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function readHostOf(platform: string, stateRoot: string, account: string, alive: (pid: number) => boolean = pidAlive): ReadHostInfo | null {
  const path = join(stateRoot, account, 'host.json')
  if (!existsSync(path)) return null
  try {
    const info = JSON.parse(readFileSync(path, 'utf8')) as ReadHostInfo
    const sameCode = resolve(info.root).toLowerCase() === PYTHON_ROOT.toLowerCase()
    return info.port && info.token && info.platform === platform && sameCode && alive(info.pid) ? info : null
  } catch {
    return null
  }
}

export function startReadHost(platform: string, stateRoot: string, account: string, now: number = Date.now()): boolean {
  const key = `${platform}:${account}`
  if (now - (starting.get(key) ?? 0) < HOST_START_GRACE_MS) return false
  starting.set(key, now)
  try {
    const log = openSync(join(stateRoot, account, 'host.log'), 'a')
    try {
      const child = spawn(process.env.LOG_PYTHON || 'python', [HOST_SCRIPT, platform, account, stateRoot], { cwd: PYTHON_ROOT, detached: true, stdio: ['ignore', log, log], windowsHide: true, env: process.env })
      child.unref()
    } finally {
      closeSync(log)
    }
    return true
  } catch {
    return false
  }
}

export function askReadHost<T extends { ok: boolean; code?: string }>(host: ReadHostInfo, spec: Record<string, unknown>): T | null {
  const run = spawnSync('curl', ['-s', '--connect-timeout', '1', '-m', String(HOST_CALL_SECONDS), '-H', 'content-type: application/json', '--data-binary', '@-', `http://127.0.0.1:${host.port}/`], { input: JSON.stringify({ token: host.token, spec }), encoding: 'utf8', windowsHide: true, maxBuffer: 512 * 1024 * 1024 })
  if (run.status !== 0 || !run.stdout.trim()) return null
  try {
    const answer = JSON.parse(run.stdout.trim()) as T
    return answer.code && HOST_PASSED_CODES.includes(answer.code) ? null : answer
  } catch {
    return null
  }
}
