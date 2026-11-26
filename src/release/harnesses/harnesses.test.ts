import { describe, expect, test } from 'bun:test'
import { gatewayStartsOf, harnessesText, hermesSetupNotes, refreshHarnesses } from './index'
import type { FileInstall, HarnessRefreshDeps, StepAnswer } from './index'

function fakes(present: string[], answers: Record<string, StepAnswer> = {}) {
  const calls: string[] = []
  const install = (name: string, changed: boolean, desktop = false) => (): FileInstall => (calls.push(name), { changed, configPath: `/x/${name}`, ...(desktop ? { desktopPlugin: { path: '/h/desktop-plugins/log/plugin.js', changed: true } } : {}) })
  const deps: HarnessRefreshDeps = {
    hermesHome: () => '/h',
    opencodeDir: () => '/o',
    exists: (path) => present.some((p) => path.replace(/\\/g, '/').endsWith(p)),
    installHermes: install('installHermes', true, true),
    installOpenCode: install('installOpenCode', false),
    run: (command, args) => (calls.push(`${command} ${args.join(' ')}`), answers[args[1]] ?? { ok: true }),
  }
  return { deps, calls }
}

describe('log update refreshes every harness log installs', () => {
  test('re-runs the installer of each harness that is here and reloads Hermes', () => {
    const { deps, calls } = fakes(['/h', '/o', '.claude/settings.json', '.codex/hooks.json'])
    const results = refreshHarnesses('/root', deps)
    expect(results.map((r) => [r.id, r.present])).toEqual([['claudeCode', true], ['codex', true], ['cursor', false], ['hermes', true], ['opencode', true], ['antigravity', false]])
    expect(calls).toEqual(['installHermes', 'hermes plugins disable log', 'hermes plugins enable log', 'installOpenCode'])
    const hermes = results.find((r) => r.id === 'hermes')!
    expect(hermes.refreshed).toBe('plugin rewritten, Desktop plugin copied')
    expect(hermes.reloaded).toContain('plugin reloaded')
    expect(results.find((r) => r.id === 'opencode')!.reloaded).toContain('nothing to reload')
    expect(results.find((r) => r.id === 'claudeCode')!.reloaded).toContain('reload proxy')
    expect(harnessesText(results)).toBe('Claude Code .claude/settings.json came with the new version, Codex .codex/hooks.json came with the new version, Hermes plugin rewritten, Desktop plugin copied, OpenCode plugin unchanged')
  })

  test('a harness that is not here is left alone, and a failed Hermes reload is said', () => {
    const { deps, calls } = fakes(['/h'], { enable: { ok: false, detail: 'gateway down' } })
    const results = refreshHarnesses('/root', deps)
    expect(calls).toEqual(['installHermes', 'hermes plugins disable log', 'hermes plugins enable log'])
    expect(results.find((r) => r.id === 'hermes')!.ok).toBe(false)
    expect(harnessesText(results)).toContain('Hermes needs a look')
    expect(harnessesText(refreshHarnesses('/root', fakes([]).deps))).toBe('no agent harness found')
  })

  test('no hermes command: the plugin is still refreshed and the reload is named', () => {
    const { deps } = fakes(['/h'], { disable: { ok: false, detail: 'notFound' } })
    const hermes = refreshHarnesses('/root', deps).find((r) => r.id === 'hermes')!
    expect(hermes.ok).toBe(true)
    expect(hermes.reloaded).toContain('no hermes command here')
  })
})

describe('the Hermes setup note: switch the Desktop half on, restart the gateway when its routes change', () => {
  test('a new Desktop plugin asks to switch log on; changed routes ask for a gateway restart', () => {
    const notes = hermesSetupNotes({ changed: true, configPath: '/x', desktopPlugin: { path: '/d', changed: true, created: true }, routesChanged: true }, null, null)
    expect(notes[0]).toContain('Settings > Plugins')
    expect(notes[1]).toContain('hermes gateway restart')
    expect(hermesSetupNotes({ changed: false, configPath: '/x', desktopPlugin: { path: '/d', changed: false, created: false }, routesChanged: false }, null, null)).toEqual([])
  })

  test('a running gateway older than the routes on disk is named, a newer one is not', () => {
    const got = { changed: false, configPath: '/x', routesChanged: false, routesPath: '/r' }
    const older = hermesSetupNotes(got, new Date('2026-11-20T08:00:00Z'), new Date('2026-11-20T09:00:00Z'))
    expect(older.join(' ')).toContain('started 2026-11-20T08:00:00.000Z, before its routes changed')
    expect(hermesSetupNotes(got, new Date('2026-11-20T10:00:00Z'), new Date('2026-11-20T09:00:00Z'))).toEqual([])
    expect(gatewayStartsOf(['2026-11-20T10:00:00.0000000Z', 'not a time', '2026-11-20T08:00:00Z'])?.toISOString()).toBe('2026-11-20T08:00:00.000Z')
  })

  test('the notes reach the harness line log update prints', () => {
    const { deps } = fakes(['/h'])
    deps.installHermes = () => ({ changed: true, configPath: '/x', desktopPlugin: { path: '/d', changed: true, created: true }, routesChanged: true, routesPath: '/r' })
    expect(harnessesText(refreshHarnesses('/root', deps))).toContain('switch log on in Hermes Settings > Plugins')
  })
})
