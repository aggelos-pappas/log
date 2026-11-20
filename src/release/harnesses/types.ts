import type { HookHost } from '../../agentHooks/harness/index'

export interface HarnessRefresh {
  id: HookHost
  label: string
  present: boolean
  ok: boolean
  refreshed: string
  reloaded: string
}

export interface StepAnswer {
  ok: boolean
  detail?: string
}

export interface FileInstall {
  changed: boolean
  configPath: string
  desktopPlugin?: { path: string; changed: boolean }
}

export interface HarnessRefreshDeps {
  hermesHome: () => string
  opencodeDir: () => string
  exists: (path: string) => boolean
  installHermes: (home: string, root: string) => FileInstall
  installOpenCode: (dir: string, root: string) => FileInstall
  run: (command: string, args: string[]) => StepAnswer
}

export const PROXY_RELOAD = 'logMcp\'s reload proxy swaps in the new code with the client connected'
