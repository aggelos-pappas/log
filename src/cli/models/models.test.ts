import { afterEach, describe, expect, test } from 'bun:test'
import { runCli } from '../runner/index.ts'
import type { LocalModel } from '../../models/manifest/index.ts'
import type { ModelsDeps } from '../../models/store/index.ts'
import { modelsCommandDeps } from './index.ts'

const saved = { ...modelsCommandDeps }
afterEach(() => Object.assign(modelsCommandDeps, saved))

const PIP: LocalModel = { key: 'mouse', id: 'demoPlanner', purpose: 'a demo', source: 'pip', loader: 'pip', revision: '5.0.0', process: 'browsers', files: [], bytes: 0 }

function fake(calls: string[], installed: string | null, installs = true): void {
  let version = installed
  modelsCommandDeps.models = () => [PIP]
  modelsCommandDeps.effects = () =>
    ({
      place: () => null,
      legacy: () => [],
      size: () => null,
      hash: async () => null,
      download: async () => (calls.push('download'), { ok: false }),
      move: () => false,
      remove: () => {},
      pipVersion: () => version,
      pipInstall: (spec) => {
        calls.push(`pip ${spec}`)
        if (!installs) return { ok: false, detail: 'no network' }
        version = spec.split('==')[1]
        return { ok: true }
      },
      log: () => {},
    }) satisfies ModelsDeps
}

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = []
  const err: string[] = []
  const code = await runCli(argv, { out: (l) => out.push(l), err: (l) => err.push(l) })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

describe('log models', () => {
  test('lists each model with its pinned revision and state, and changes nothing', async () => {
    const calls: string[] = []
    fake(calls, '4.2.0')
    const said = await run(['models'])
    expect(said.code).toBe(0)
    expect(said.out).toContain('mouse: demoPlanner@5.0.0, a pip package, browsers: another version installed (demoPlanner 4.2.0 is installed, not 5.0.0)')
    expect(said.out).toContain('0/1 on the pinned revision; not yet: mouse. log models --fetch --approvedBy <who> fetches them.')
    expect(calls).toEqual([])
  })

  test('--json gives the same checks as data', async () => {
    fake([], '5.0.0')
    const said = await run(['models', '--json'])
    const parsed = JSON.parse(said.out) as { models: { key: string; revision: string; ready: boolean }[]; summary: string }
    expect(parsed.models.map((m) => [m.key, m.revision, m.ready])).toEqual([['mouse', '5.0.0', true]])
    expect(parsed.summary).toBe('all 1 on the pinned revision')
  })

  test('--fetch needs --approvedBy', async () => {
    const calls: string[] = []
    fake(calls, null)
    const said = await run(['models', '--fetch'])
    expect(said.code).toBe(1)
    expect(said.err).toContain('notApproved')
    expect(calls).toEqual([])
  })

  test('--fetch installs what is not on its pin and says so', async () => {
    const calls: string[] = []
    fake(calls, '4.2.0')
    const said = await run(['models', '--fetch', '--approvedBy', 'the owner'])
    expect(said.code).toBe(0)
    expect(calls).toEqual(['pip demoPlanner==5.0.0'])
    expect(said.out).toContain('mouse: demoPlanner@5.0.0, a pip package, browsers: installed (installed demoPlanner==5.0.0)')
  })

  test('a failed fetch refuses with modelFetchFailed', async () => {
    fake([], null, false)
    const said = await run(['models', '--fetch', '--approvedBy', 'the owner'])
    expect(said.code).toBe(1)
    expect(said.err).toContain('modelFetchFailed')
    expect(said.err).toContain('pip: no network')
  })
})
