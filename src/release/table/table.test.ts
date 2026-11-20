import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanBullet, modelsCell, parseChangelog, recordModels, releaseProblems, renderReleases, withReleases } from './index'
import { modelPins } from '../../models/manifest/index'

const root = join(import.meta.dir, '..', '..', '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)

const CHANGELOG = `# Changelog

## [0.3.0](https://github.com/demoOrg/demo/compare/v0.2.10...v0.3.0) (2026-12-01)

### Features

* **models:** pin every local model ([#300](https://github.com/demoOrg/demo/issues/300)) ([abc1234](https://github.com/demoOrg/demo/commit/abc1234))
* a second change

## [0.2.10](https://github.com/demoOrg/demo/compare/v0.2.9...v0.2.10) (2026-11-25)

Models: demoOrg/embedder@${A}, demoPlanner@5.0.0

### Bug Fixes

* one fix

## [0.2.9](https://github.com/demoOrg/demo/pull/9) (2026-11-20)

Models: not pinned (fetched by name at run time)

* the first notes
`

describe('the releases table', () => {
  test('reads each release, newest first by version, not by file order', () => {
    const sections = parseChangelog(CHANGELOG.replace('## [0.2.9]', '## [0.2.9]'))
    expect(sections.map((s) => [s.version, s.date])).toEqual([['0.3.0', '2026-12-01'], ['0.2.10', '2026-11-25'], ['0.2.9', '2026-11-20']])
    expect(sections[0].summary).toBe('pin every local model (+1 more)')
    expect(sections[0].models).toBeNull()
    expect(sections[2].pinned).toBe(false)
  })

  test('a release-please bullet loses its scope, issue and commit links', () => {
    expect(cleanBullet('* **inbox:** keep labels | tags ([#12](https://x.test/12)) ([abc1234](https://x.test/c))')).toBe('keep labels / tags')
  })

  test('the release PR gets the Models line once, from the manifest', () => {
    const once = recordModels(CHANGELOG, '0.3.0', [`demoOrg/embedder@${B}`, 'demoPlanner@5.0.0', 'demoOrg/vision@' + A])
    expect(once).toContain(`## [0.3.0](https://github.com/demoOrg/demo/compare/v0.2.10...v0.3.0) (2026-12-01)\n\nModels: demoOrg/embedder@${B}, demoPlanner@5.0.0, demoOrg/vision@${A}\n`)
    expect(recordModels(once, '0.3.0', ['other@1.0.0'])).toBe(once)
    expect(recordModels(CHANGELOG, '9.9.9', ['other@1.0.0'])).toBe(CHANGELOG)
  })

  test('the Models column says first pinned, same, changed, added or removed', () => {
    const sections = parseChangelog(recordModels(CHANGELOG, '0.3.0', [`demoOrg/embedder@${B}`, 'demoPlanner@5.0.0', `demoOrg/vision@${A}`]))
    expect(modelsCell(sections[2], undefined)).toBe('not pinned (newest by name)')
    expect(modelsCell(sections[1], sections[2])).toBe('first pinned: embedder@aaaaaaa, demoPlanner@5.0.0')
    expect(modelsCell(sections[0], sections[1])).toBe('changed: embedder aaaaaaa → bbbbbbb; added: vision@aaaaaaa')
    expect(modelsCell({ ...sections[1], version: '0.2.11' }, sections[1])).toBe('same as 0.2.10')
    expect(modelsCell({ ...sections[1], models: [`demoOrg/embedder@${A}`] }, sections[1])).toBe('removed: demoPlanner')
  })

  test('renders the table between the README markers', () => {
    const table = renderReleases(parseChangelog(recordModels(CHANGELOG, '0.3.0', [`demoOrg/embedder@${A}`, 'demoPlanner@5.0.0'])))
    expect(table.split('\n').slice(0, 3)).toEqual(['| Version | Date | What\'s in it | Models |', '| --- | --- | --- | --- |', '| [0.3.0](https://github.com/demoOrg/demo/compare/v0.2.10...v0.3.0) | 2026-12-01 | pin every local model (+1 more) | same as 0.2.10 |'])
    const readme = withReleases('# Demo\n\n## Releases\n\n<!-- releases:start -->\nold\n<!-- releases:end -->\n\n## Next\n', table)
    expect(readme).toContain(`${table}\n<!-- releases:end -->\n\n## Next\n`)
    expect(withReleases(readme, table)).toBe(readme)
  })

  test('flags a CHANGELOG behind the release manifest or a release without its Models line', () => {
    expect(releaseProblems(CHANGELOG, '0.3.0')).toEqual(['CHANGELOG.md\'s 0.3.0 has no "Models:" line: run `bun run docs:releases`'])
    expect(releaseProblems(recordModels(CHANGELOG, '0.3.0', ['x@1.0.0']), '0.3.1')[0]).toBe('CHANGELOG.md\'s newest release is 0.3.0, but .release-please-manifest.json says 0.3.1')
  })

  test('the repo CHANGELOG, release manifest and README agree, seeded with 0.2.0 and 0.2.1', () => {
    const released = (JSON.parse(read('.release-please-manifest.json')) as Record<string, string>)['.']
    const changelog = read('CHANGELOG.md')
    expect(releaseProblems(changelog, released)).toEqual([])
    const sections = parseChangelog(changelog)
    expect(sections.slice(-2).map((s) => [s.version, s.date, s.link])).toEqual([
      ['0.2.1', '2026-11-20', 'https://github.com/matthewdonsemail-lab/log/pull/179'],
      ['0.2.0', '2026-11-15', 'https://github.com/matthewdonsemail-lab/log/pull/166'],
    ])
    expect(read('README.md')).toContain(renderReleases(sections))
    expect(modelPins().length).toBeGreaterThan(0)
  })

  test('the release workflow writes the table on the release PR and package.json ships it with the plugin', () => {
    const workflow = read('.github/workflows/release.yml')
    expect(workflow).toContain('bun scripts/docs/releasesTable.ts')
    expect(workflow).toContain('fromJSON(steps.release.outputs.pr).headBranchName')
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string>; files: string[] }
    expect(pkg.scripts['check:docs']).toContain('releasesTable.ts --check')
    expect(pkg.scripts['docs:build']).toContain('releasesTable.ts')
    expect(pkg.files).toContain('hermesPlugin')
  })
})
