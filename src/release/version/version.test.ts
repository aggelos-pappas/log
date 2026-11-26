import { describe, expect, test } from 'bun:test'
import { compareVersions, installKindOf, isNewer, isPrerelease, parseVersion, repoOf } from './index'

describe('semver compare', () => {
  test('orders by major, minor and patch as numbers, not text', () => {
    expect(compareVersions('0.2.1', '0.2.0')).toBe(1)
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('v1.2.3', '1.2.4')).toBe(-1)
  })

  test('a prerelease sorts before its release and by its parts', () => {
    expect(compareVersions('1.0.0-beta.2', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0.0-beta.10', '1.0.0-beta.2')).toBe(1)
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1)
    expect(isPrerelease('1.0.0-rc.1')).toBe(true)
    expect(isPrerelease('1.0.0')).toBe(false)
  })

  test('isNewer is false for anything that is not a version', () => {
    expect(isNewer('0.2.2', '0.2.1')).toBe(true)
    expect(isNewer('0.2.1', '0.2.1')).toBe(false)
    expect(isNewer(null, '0.2.1')).toBe(false)
    expect(isNewer('latest', '0.2.1')).toBe(false)
    expect(parseVersion('1.2')).toBeNull()
  })
})

describe('install facts', () => {
  test('the repo comes from the package repository url', () => {
    expect(repoOf('git+https://github.com/someOrg/someTool.git')).toBe('someOrg/someTool')
    expect(repoOf('git@github.com:someOrg/someTool.git')).toBe('someOrg/someTool')
    expect(repoOf('https://example.com/x')).toBeNull()
  })

  test('a clone, a bun global install and anything else', () => {
    expect(installKindOf('/work/log', (p) => p.endsWith('.git'))).toBe('gitClone')
    expect(installKindOf('/home/someone/.bun/install/global/node_modules/@listeningkit/log', () => false)).toBe('bunGlobal')
    expect(installKindOf('C:\\Users\\someone\\.bun\\install\\global\\node_modules\\@listeningkit\\log', () => false)).toBe('bunGlobal')
    expect(installKindOf('/usr/lib/node_modules/@listeningkit/log', () => false)).toBe('other')
  })
})
