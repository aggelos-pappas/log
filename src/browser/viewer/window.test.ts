import { describe, expect, test } from 'bun:test'
import { streamedWindow, windowOf } from './index'

const python = (lines: string[]) => {
  const run = Bun.spawnSync([process.env.LOG_PYTHON || 'python', '-c', lines.join('\n')], { cwd: `${import.meta.dir}/../../../python` })
  if (run.exitCode !== 0) throw new Error(run.stderr.toString())
  return JSON.parse(run.stdout.toString())
}

describe('a streamed browser keeps no window (the owner changed rule 11 on 2026-11-20)', () => {
  test('streamed opens are hidden unless LOG_BROWSER_WINDOW says visible; a plain inspect session stays visible', () => {
    expect(streamedWindow({})).toBe('hidden')
    expect(streamedWindow({ LOG_BROWSER_WINDOW: 'visible' })).toBe('visible')
    expect(streamedWindow({ LOG_BROWSER_WINDOW: 'nonsense' })).toBe('hidden')
    expect(windowOf(undefined)).toBe('visible')
    expect(windowOf('hidden')).toBe('hidden')
  })

  test('the keeper hides every shown top-level window of the session’s own browser processes, and nothing of other processes', () => {
    const out = python([
      'import json',
      'from browser import browserWindow',
      'class Fake:',
      '    def __init__(self):',
      '        self.hidden = []',
      '    def parents(self):',
      '        return {10: 1, 11: 10, 12: 11, 20: 2, 21: 20}',
      '    def shown_windows(self, pids):',
      '        return [pid * 100 for pid in sorted(pids) if pid in (11, 12, 21)]',
      '    def hide(self, hwnd):',
      '        self.hidden.append(hwnd)',
      'fake = Fake()',
      'keeper = browserWindow.WindowKeeper(lambda line: None, system=fake, root=1)',
      'first = keeper.sweep()',
      'lines = []',
      'none = browserWindow.keep_hidden("visible", lines.append, "win32")',
      'other = browserWindow.keep_hidden("hidden", lines.append, "linux")',
      'print(json.dumps({"first": first, "hidden": fake.hidden, "modes": [browserWindow.window_mode({}), browserWindow.window_mode({"window": "hidden"}), browserWindow.window_mode({"window": "x"})], "args": browserWindow.chromium_args("hidden"), "visibleArgs": browserWindow.chromium_args("visible"), "none": none is None and other is None, "lines": lines}))',
    ])
    expect(out.first).toBe(2)
    expect(out.hidden).toEqual([1100, 1200])
    expect(out.modes).toEqual(['visible', 'hidden', 'visible'])
    expect(out.args).toContain('--window-position=-32000,-32000')
    expect(out.visibleArgs).toEqual([])
    expect(out.none).toBe(true)
    expect(out.lines[0]).toContain('not built on linux')
  })
})
