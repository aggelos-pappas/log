import { parseVersion } from '../version/index'
import { NIGHTLY_PREID, RELEASE_COMMIT } from './types'
import type { NightlyInput } from './types'

const two = (n: number) => String(n).padStart(2, '0')

export function nightlyStamp(at: Date): string {
  return `${at.getUTCFullYear()}${two(at.getUTCMonth() + 1)}${two(at.getUTCDate())}${two(at.getUTCHours())}${two(at.getUTCMinutes())}`
}

export function shortSha(sha: string): string {
  const short = sha.trim().toLowerCase().slice(0, 7)
  if (!/^[0-9a-f]{7}$/.test(short)) throw new Error(`not a commit sha: ${sha}`)
  return /^\d+$/.test(short) ? `g${short}` : short
}

export function nightlyVersion({ version, at, sha }: NightlyInput): string {
  const base = parseVersion(version)
  if (!base) throw new Error(`not a version: ${version}`)
  const next = base.pre.length ? `${base.major}.${base.minor}.${base.patch}` : `${base.major}.${base.minor}.${base.patch + 1}`
  return `${next}-${NIGHTLY_PREID}.${nightlyStamp(at)}.${shortSha(sha)}`
}

export function isReleaseCommit(message: string): boolean {
  return RELEASE_COMMIT.test(message)
}

export function withVersion(json: string, version: string): string {
  const body = JSON.parse(json) as Record<string, unknown>
  return `${JSON.stringify({ ...body, version }, null, 2)}\n`
}
