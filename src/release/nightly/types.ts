export const NIGHTLY_PREID = 'nightly'

export const RELEASE_COMMIT = /^chore\(main\): release |release-please--branches--/m

export interface NightlyInput {
  version: string
  at: Date
  sha: string
}
