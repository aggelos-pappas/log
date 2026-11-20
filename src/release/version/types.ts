export const INSTALL_KINDS = ['bunGlobal', 'gitClone', 'other'] as const

export type InstallKind = (typeof INSTALL_KINDS)[number]

export interface Semver {
  major: number
  minor: number
  patch: number
  pre: string[]
}

export interface PackageFacts {
  name: string
  version: string
  repo: string | null
}

export interface VersionInfo {
  name: string
  version: string
  commit: string | null
  kind: InstallKind
  root: string
  repo: string | null
  latest: string | null
  notesUrl: string | null
  checkedAt: string | null
  newer: boolean
}
