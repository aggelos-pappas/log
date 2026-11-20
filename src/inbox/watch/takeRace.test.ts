import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'takeRace'))
afterAll(() => rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }))

const CHILD = `
const { existsSync } = await import('node:fs')
const { takePending } = await import(${JSON.stringify(join(import.meta.dir, 'index.ts'))})
takePending('warmUp')
console.error('ready')
while (!existsSync(process.argv[2])) await Bun.sleep(1)
let got = 0
for (let i = 0; i < 20; i++) {
  got += takePending('raceReader').length
  await Bun.sleep(5)
}
console.log(got)
`

describe('taking pending messages', () => {
  test('several push loops for one reader woken by the same message deliver it once between them', async () => {
    const env = { ...process.env, LOG_DB: join(dir, 'log.db'), LOG_INBOX_STATE: join(dir, 'inbox'), LOG_HOME: dir, LOG_CONTEXT_SERVICE: 'off', LOG_INBOX_POLL: 'off' }
    const child = join(dir, 'child.ts')
    writeFileSync(child, CHILD)
    const setup = Bun.spawnSync(['bun', '-e', `const w = await import(${JSON.stringify(join(import.meta.dir, 'index.ts'))}); w.takePending('raceReader')`], { env, stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    expect(setup.exitCode).toBe(0)
    const go = join(dir, 'go')
    const kids = Array.from({ length: 4 }, () => Bun.spawn(['bun', child, go], { env, stdout: 'pipe', stderr: 'pipe', windowsHide: true }))
    await Promise.all(kids.map(async (kid) => {
      const reader = kid.stderr.getReader()
      let seen = ''
      while (!seen.includes('ready')) {
        const part = await reader.read()
        if (part.done) break
        seen += new TextDecoder().decode(part.value)
      }
      reader.releaseLock()
    }))
    const store = `const s = await import(${JSON.stringify(join(import.meta.dir, '..', 'store', 'index.ts'))}); for (let i = 0; i < 3; i++) s.appendEvent({ platform: 'discord', account: 'raceAccount', conversationId: 'c1', type: 'message', with: 'grace_ships', text: 'hello ' + i, payload: { id: 'race' + i }, sourceAt: new Date().toISOString() })`
    expect(Bun.spawnSync(['bun', '-e', store], { env, windowsHide: true }).exitCode).toBe(0)
    writeFileSync(go, '1')
    const got = await Promise.all(kids.map(async (kid) => Number((await new Response(kid.stdout).text()).trim())))
    expect(existsSync(go)).toBe(true)
    expect(got.reduce((a, b) => a + b, 0)).toBe(3)
  }, 60_000)
})
