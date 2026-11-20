import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { harnessOf, HOOK_HOSTS } from '../../agentHooks/harness/index'
import type { HookHost } from '../../agentHooks/harness/index'
import { hermesHome, installHermes } from '../../agentHooks/hermes/index'
import { installOpenCode, opencodeConfigDir } from '../../agentHooks/opencode/index'
import { PROXY_RELOAD } from './types'
import type { HarnessRefresh, HarnessRefreshDeps, StepAnswer } from './types'

function runCommand(command: string, args: string[]): StepAnswer {
  const done = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  if (done.error) return { ok: false, detail: (done.error as NodeJS.ErrnoException).code === 'ENOENT' ? 'notFound' : done.error.message }
  return done.status === 0 ? { ok: true } : { ok: false, detail: (done.stderr || done.stdout || '').trim().split('\n').slice(-2).join(' | ') }
}

export const liveHarnessDeps: HarnessRefreshDeps = {
  hermesHome: () => hermesHome(),
  opencodeDir: () => opencodeConfigDir(),
  exists: existsSync,
  installHermes: (home, root) => installHermes(home, root),
  installOpenCode: (dir, root) => installOpenCode(dir, root),
  run: runCommand,
}

function reloadHermes(deps: HarnessRefreshDeps): { ok: boolean; text: string } {
  const off = deps.run('hermes', ['plugins', 'disable', 'log'])
  if (!off.ok && off.detail === 'notFound') return { ok: true, text: 'no hermes command here: reload it with hermes plugins disable log, then enable log' }
  const on = off.ok ? deps.run('hermes', ['plugins', 'enable', 'log']) : off
  return on.ok ? { ok: true, text: 'plugin reloaded (hermes plugins disable log, enable log)' } : { ok: false, text: `plugin reload failed: ${on.detail ?? 'failed'}` }
}

function refreshOne(host: HookHost, root: string, deps: HarnessRefreshDeps): HarnessRefresh {
  const harness = harnessOf(host)
  const base = { id: host, label: harness.label }
  try {
    if (host === 'hermes') {
      const home = deps.hermesHome()
      if (!deps.exists(home)) return { ...base, present: false, ok: true, refreshed: 'not on this machine', reloaded: '' }
      const got = deps.installHermes(home, root)
      const reload = reloadHermes(deps)
      const desktop = got.desktopPlugin ? `, Desktop plugin ${got.desktopPlugin.changed ? 'copied' : 'unchanged'}` : ''
      return { ...base, present: true, ok: reload.ok, refreshed: `${got.changed ? 'plugin rewritten' : 'plugin unchanged'}${desktop}`, reloaded: `${reload.text}; ${PROXY_RELOAD}` }
    }
    if (host === 'opencode') {
      const dir = deps.opencodeDir()
      if (!deps.exists(dir)) return { ...base, present: false, ok: true, refreshed: 'not on this machine', reloaded: '' }
      const got = deps.installOpenCode(dir, root)
      return { ...base, present: true, ok: true, refreshed: got.changed ? 'plugin and config rewritten' : 'plugin unchanged', reloaded: `${got.changed ? 'OpenCode loads plugins at start: restart OpenCode' : 'nothing to reload'}; ${PROXY_RELOAD}` }
    }
    const file = harness.hookFile ? join(root, harness.hookFile) : ''
    if (!file || !deps.exists(file)) return { ...base, present: false, ok: true, refreshed: 'no hook file in this install', reloaded: '' }
    return { ...base, present: true, ok: true, refreshed: `${harness.hookFile} came with the new version`, reloaded: `its hooks run log's scripts on each event; ${PROXY_RELOAD}` }
  } catch (error) {
    return { ...base, present: true, ok: false, refreshed: `failed: ${String(error).slice(0, 200)}`, reloaded: '' }
  }
}

export function refreshHarnesses(root: string, deps: HarnessRefreshDeps = liveHarnessDeps): HarnessRefresh[] {
  return HOOK_HOSTS.map((host) => refreshOne(host, root, deps))
}

export function harnessesText(results: readonly HarnessRefresh[]): string {
  const present = results.filter((r) => r.present)
  if (!present.length) return 'no agent harness found'
  return present.map((r) => `${r.label} ${r.ok ? r.refreshed : `needs a look (${r.refreshed}; ${r.reloaded})`}`).join(', ')
}
