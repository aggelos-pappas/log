import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import type { BrowserDriver, BrowserEndpoint, GateResult } from '../driver/index'
import { BRAVE_INSTALL_PATHS, BRAVE_PATH_ENV } from './types'

type Env = Record<string, string | undefined>

export interface BraveDriverDeps {
  gate?: (accountId: string) => Promise<GateResult>
  open?: (accountId: string) => Promise<BrowserEndpoint>
  close?: (endpoint: BrowserEndpoint) => Promise<void>
}

const missing = (step: string) => ({ code: 'browserDriverFailed', detail: `the brave driver was given no "${step}" step` })

function expand(path: string, env: Env, home: string): string {
  return path.replace(/^~(?=\/)/, home).replace(/%([A-Z0-9_()]+)%/g, (whole, name: string) => env[name] ?? env[name.toLowerCase()] ?? whole)
}

export function bravePathCandidates(platform: string = process.platform, env: Env = process.env, home: string = homedir()): string[] {
  const own = env[BRAVE_PATH_ENV]?.trim()
  if (own) return [own]
  const listed = BRAVE_INSTALL_PATHS[platform as keyof typeof BRAVE_INSTALL_PATHS] ?? []
  return listed.map((path) => expand(path, env, home)).filter((path) => !/%[A-Z0-9_()]+%/.test(path))
}

export function bravePath(platform: string = process.platform, env: Env = process.env, home: string = homedir(), exists: (path: string) => boolean = existsSync): string | null {
  return bravePathCandidates(platform, env, home).find((path) => exists(path)) ?? null
}

export function braveDriver(deps: BraveDriverDeps = {}): BrowserDriver {
  return {
    name: 'brave',
    async prepare(input) {
      return input.accountName
    },
    async gate(input) {
      if (!deps.gate) throw missing('gate')
      return deps.gate(input.accountId)
    },
    async start(input) {
      if (!deps.open) throw missing('open')
      return deps.open(input.accountId)
    },
    async selfCheck() {
      return { ok: true, failure: null }
    },
    async stop(_input, endpoint) {
      if (deps.close) await deps.close(endpoint)
    }
  }
}
