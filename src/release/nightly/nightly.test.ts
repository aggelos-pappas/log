import { describe, expect, test } from 'bun:test'
import { compareVersions, isPrerelease, parseVersion } from '../version/index'
import { isReleaseCommit, nightlyVersion, shortSha, withVersion } from './index'

const at = new Date('2026-11-20T09:05:00Z')

describe('nightly versions', () => {
  test('the next patch, a UTC minute stamp and the short sha', () => {
    expect(nightlyVersion({ version: '0.3.0', at, sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678' })).toBe('0.3.1-nightly.202611200905.a1b2c3d')
  })

  test('is a semver prerelease that sorts above the release it follows and below the next one', () => {
    const v = nightlyVersion({ version: '0.3.0', at, sha: 'a1b2c3d' })
    expect(parseVersion(v)).not.toBeNull()
    expect(isPrerelease(v)).toBe(true)
    expect(compareVersions(v, '0.3.0')).toBe(1)
    expect(compareVersions(v, '0.3.1')).toBe(-1)
    expect(compareVersions(nightlyVersion({ version: '0.3.0', at: new Date('2026-11-20T10:00:00Z'), sha: '0000001' }), v)).toBe(1)
  })

  test('an all-digit sha gets a g so npm never sees a leading-zero number', () => {
    expect(shortSha('0123456789abcdef')).toBe('g0123456')
    expect(() => shortSha('nothex!')).toThrow()
  })

  test('a prerelease base keeps its numbers', () => {
    expect(nightlyVersion({ version: '0.4.0-rc.1', at, sha: 'abcdef0' })).toBe('0.4.0-nightly.202611200905.abcdef0')
  })

  test('release-please commits are not nightlies', () => {
    expect(isReleaseCommit('chore(main): release 0.3.0')).toBe(true)
    expect(isReleaseCommit('Merge pull request #212 from someOrg/release-please--branches--main--components--log\n\nchore(main): release 0.3.0')).toBe(true)
    expect(isReleaseCommit('Merge pull request #222 from someOrg/fix/ciHidden')).toBe(false)
  })

  test('withVersion rewrites only the version', () => {
    expect(JSON.parse(withVersion('{"name":"x","version":"0.3.0","bin":{"log":"bin/log.ts"}}', '0.3.1-nightly.1.a'))).toEqual({ name: 'x', version: '0.3.1-nightly.1.a', bin: { log: 'bin/log.ts' } })
  })
})
