import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const python = join(import.meta.dir, '..', '..', '..', 'python')

describe('python/identity/accountRoute.py: what leaves an engine goes through the account route (issue 47)', () => {
  test('its own tests pass: the route is armed from the spec, enforced on every curl_cffi call and socket, and media links go through it', () => {
    const run = spawnSync(process.env.LOG_PYTHON || 'python', ['-m', 'unittest', 'identity.test_accountRoute'], { cwd: python, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
    expect(run.stderr).toMatch(/Ran 1\d tests[\s\S]*\nOK/)
    expect(run.status).toBe(0)
  }, 130_000)
})
