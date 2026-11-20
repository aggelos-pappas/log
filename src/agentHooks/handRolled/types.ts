export type HandRolledKind = 'readsData' | 'actsOnData'

export interface WrittenFile {
  path: string
  content: string
}

export interface NormalisedCall {
  tool: string
  effectiveCommands: string[]
  writtenFiles: WrittenFile[]
  code: string[]
  logTools: string[]
  skipped: string[]
}

export interface HandRolledHit {
  kind: HandRolledKind
  target: string
  why: string
}

export interface HandRolledVerdict {
  handRolled: boolean
  tool: string
  kinds: HandRolledKind[]
  target: string
  targets: string[]
  why: string
  hits: HandRolledHit[]
  sample: string
}

export interface HandRolledRecord {
  kinds: HandRolledKind[]
  target: string
  targets: string[]
  tools: string[]
  count: number
  firstAt: number
  lastAt: number
  why: string
  sample: string
}

export interface ClassifyOptions {
  readScript?: (path: string) => string | null
  env?: Record<string, string | undefined>
  home?: string
  cwd?: string
}

export const HAND_ROLLED_SCOPE = 'handRolled'

export const HAND_ROLLED_GUIDE = 'log/toolFromOneOff'

export const HAND_ROLLED_RULE = 163

export const SHELL_TOOLS: readonly string[] = ['Bash', 'PowerShell', 'Monitor', 'shell', 'terminal', 'run_command', 'local_shell']

export const WRITE_TOOLS: readonly string[] = ['Write', 'write_file', 'write_to_file', 'create_file']

export const PATCH_TOOLS: readonly string[] = ['apply_patch']

export const CODE_TOOLS: readonly string[] = ['execute_code']

export const BROWSER_TOOLS: readonly string[] = ['browser_exec']

export const WRAPPER_TOOLS: readonly string[] = ['tool_call']

export const OUT_OF_SCOPE_TOOLS: readonly string[] = ['delegate_task']

export const HAND_ROLLED_MATCHER = 'Bash|PowerShell|Monitor|Write|shell|apply_patch|run_command|write_to_file'
