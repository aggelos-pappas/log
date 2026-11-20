#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { modelPins } from '../../src/models/manifest/index'
import { parseChangelog, recordModels, releaseProblems, renderReleases, withReleases } from '../../src/release/table/index'

const root = join(import.meta.dir, '..', '..')
const check = process.argv.includes('--check')
const read = (rel: string) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n') : '')
const released = (JSON.parse(read('.release-please-manifest.json') || '{}') as Record<string, string>)['.'] ?? ''
const changelog = read('CHANGELOG.md')
const recorded = recordModels(changelog, released, modelPins())
const readme = withReleases(read('README.md'), renderReleases(parseChangelog(recorded)))
const problems = releaseProblems(recorded, released)
if (check) {
  if (recorded !== changelog) problems.push(`CHANGELOG.md's ${released} has no Models line yet: run \`bun run docs:releases\``)
  if (readme !== read('README.md')) problems.push('the README Releases table is out of date: run `bun run docs:releases`')
} else {
  if (recorded !== changelog) writeFileSync(join(root, 'CHANGELOG.md'), recorded)
  if (readme !== read('README.md')) writeFileSync(join(root, 'README.md'), readme)
}
if (problems.length) {
  console.error(`releases:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  process.exit(1)
}
console.log(`releases: ${parseChangelog(recorded).length} releases in the README table, newest ${released}`)
