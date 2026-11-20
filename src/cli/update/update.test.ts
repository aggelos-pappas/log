import { afterEach, describe, expect, test } from 'bun:test'
import { runCli } from '../runner/index.ts'
import type { UpdateDeps } from '../../release/apply/index.ts'
import { updateCommandDeps } from './index.ts'

const saved = { ...updateCommandDeps }
afterEach(() => Object.assign(updateCommandDeps, saved))

function fake(calls: string[]): void {
  updateCommandDeps.installed = () => ({ version: '0.2.1', kind: 'bunGlobal', root: '/fake/log', commit: null })
  updateCommandDeps.target = async () => ({ version: '0.2.2', notesUrl: null })
  updateCommandDeps.settings = () => ({ check: true, auto: 'ask', channel: 'stable' })
  updateCommandDeps.effects = () =>
    ({
      busy: () => [],
      running: () => ({ service: false, watchers: [], browsers: [] }),
      writeResume: () => calls.push('writeResume'),
      stop: () => ({ ok: true }),
      install: () => (calls.push('install'), { ok: true }),
      afterInstall: () => ({ ok: true }),
      verify: () => ({ ok: true }),
      rollback: () => ({ ok: true }),
      start: () => [],
      reloadPlugin: () => ({ ok: true }),
      recordUpdated: () => {},
      sleep: async () => {},
      now: () => 0,
      log: () => {},
    }) satisfies UpdateDeps
}

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = []
  const err: string[] = []
  const code = await runCli(argv, { out: (l) => out.push(l), err: (l) => err.push(l) })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

describe('log update', () => {
  test('without --apply it only plans', async () => {
    const calls: string[] = []
    fake(calls)
    const result = await run(['update'])
    expect(result.code).toBe(0)
    expect(result.out).toContain('0.2.1 -> 0.2.2')
    expect(calls).toEqual([])
  })

  test('--apply without the owner\'s approval is refused', async () => {
    const calls: string[] = []
    fake(calls)
    const result = await run(['update', '--apply'])
    expect(result.code).toBe(1)
    expect(result.err).toContain('notApproved')
    expect(calls).toEqual([])
  })

  test('update.auto as the approver is refused while update.auto is ask', async () => {
    const calls: string[] = []
    fake(calls)
    const result = await run(['update', 'log', '--apply', '--approvedBy', 'update.auto'])
    expect(result.err).toContain('update.auto is ask')
    expect(calls).toEqual([])
  })

  test('with the owner\'s approval it updates and answers what it resumed', async () => {
    const calls: string[] = []
    fake(calls)
    const result = await run(['update', '--apply', '--approvedBy', 'the owner'])
    expect(result.code).toBe(0)
    expect(result.out).toBe('updated 0.2.1 -> 0.2.2, resumed: nothing was running')
    expect(calls).toEqual(['writeResume', 'writeResume', 'install', 'writeResume', 'writeResume'])
  })
})
