#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isReleaseCommit, nightlyVersion, withVersion } from '../../src/release/nightly/index'

const root = join(import.meta.dir, '..', '..')
const args = process.argv.slice(2)
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 ? (args[at + 1] ?? '') : ''
}
const sha = flag('sha') || process.env.GITHUB_SHA || ''
const message = flag('message')
if (message && isReleaseCommit(message)) {
  console.log('skip')
  process.exit(0)
}
const files = ['package.json', 'hermesPlugin/dashboard/manifest.json']
const current = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version
const version = nightlyVersion({ version: current, at: new Date(), sha })
if (args.includes('--write')) for (const file of files) writeFileSync(join(root, file), withVersion(readFileSync(join(root, file), 'utf8'), version))
console.log(version)
