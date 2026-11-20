export interface ReleaseSection {
  version: string
  date: string
  link: string | null
  summary: string
  models: string[] | null
  pinned: boolean
}

export const MODELS_PREFIX = 'Models: '

export const NOT_PINNED = 'not pinned (fetched by name at run time)'

export const RELEASES_START = '<!-- releases:start: written by `bun run docs:releases` from CHANGELOG.md and src/models/manifest, not edited by hand -->'

export const RELEASES_END = '<!-- releases:end -->'
