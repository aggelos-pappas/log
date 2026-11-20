import type { HookHost } from '../../agentHooks/harness/index'

export interface HarnessRefresh {
  id: HookHost
  label: string
  present: boolean
  ok: boolean
  refreshed: string
  reloaded: string
  notes?: string[]
}

export interface StepAnswer {
  ok: boolean
  detail?: string
}

export interface FileInstall {
  changed: boolean
  configPath: string
  desktopPlugin?: { path: string; changed: boolean; created?: boolean }
  routesChanged?: boolean
  routesPath?: string
}

export interface HarnessRefreshDeps {
  hermesHome: () => string
  opencodeDir: () => string
  exists: (path: string) => boolean
  installHermes: (home: string, root: string) => FileInstall
  installOpenCode: (dir: string, root: string) => FileInstall
  run: (command: string, args: string[]) => StepAnswer
  gatewayStartedAt?: () => Date | null
  modifiedAt?: (path: string) => Date | null
}

export const PROXY_RELOAD = 'logMcp\'s reload proxy swaps in the new code with the client connected'
