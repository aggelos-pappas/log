import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { askReadHost, engineOf, hostable, PYTHON_ROOT, readHostOf } from './index'
import type { ReadHostInfo } from './index'

const scratch = mkdtempSync(join(tmpdir(), 'readHost-'))
const stateRoot = join(scratch, 'state')
const account = 'grace_ships'
let host: ReturnType<typeof Bun.spawn> | null = null

afterAll(async () => {
  host?.kill()
  await host?.exited
  rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

async function hostUp(): Promise<ReadHostInfo> {
  const fake = join(scratch, 'pkgs', 'fakeApi')
  mkdirSync(fake, { recursive: true })
  writeFileSync(join(fake, '__init__.py'), '')
  writeFileSync(join(fake, 'engine.py'), ['import os', 'WRITES = ("send",)', 'async def read(spec, cookies):', '    return {"ok": True, "pid": os.getpid(), "chat": spec.get("chat")}', 'async def send(spec, cookies):', '    return {"ok": True}', 'ACTIONS = {"read": read, "send": send}', ''].join('\n'))
  const script = ['import asyncio, os, sys', `sys.path.insert(0, ${JSON.stringify(PYTHON_ROOT)})`, `sys.path.insert(0, ${JSON.stringify(join(scratch, 'pkgs'))})`, 'from platformKit import host', 'asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy()) if os.name == "nt" else None', `asyncio.run(host.Host("fake", ${JSON.stringify(account)}, ${JSON.stringify(stateRoot)}).serve())`].join('\n')
  host = Bun.spawn([process.env.LOG_PYTHON || 'python', '-c', script], { stdout: 'ignore', stderr: 'ignore', windowsHide: true })
  for (let i = 0; i < 100; i++) {
    const info = readHostOf('fake', stateRoot, account)
    if (info) return info
    await Bun.sleep(100)
  }
  throw new Error('the read host did not start')
}

describe('one warm read host per account for the kit engines', () => {
  test('reads go to the host, a send, a watch, a live or streaming call, a stand-in engine and a test run never do', () => {
    const on = { LOG_KIT_HOST: 'on' }
    expect(hostable('discord', { action: 'read' }, engineOf('discord'), on)).toBe(true)
    expect(hostable('discord', { action: 'watch' }, engineOf('discord'), on)).toBe(false)
    expect(hostable('discord', { action: 'send', live: true }, engineOf('discord'), on)).toBe(false)
    expect(hostable('slack', { action: 'read', streamProgress: true }, engineOf('slack'), on)).toBe(false)
    expect(hostable('discord', { action: 'read' }, join(scratch, 'fakeEngine.py'), on)).toBe(false)
    expect(hostable('twitter', { action: 'read' }, engineOf('twitter'), on)).toBe(false)
    expect(hostable('discord', { action: 'read' }, engineOf('discord'), { NODE_ENV: 'test' })).toBe(false)
    expect(hostable('discord', { action: 'read' }, engineOf('discord'), { LOG_KIT_HOST: 'off' })).toBe(false)
  })

  test('the host answers reads from one process, passes a write back to its own process, and refuses a call without its token', async () => {
    const info = await hostUp()
    const dir = mkdtempSync(join(scratch, 'call-'))
    const cookiesPath = join(dir, 'cookies.json')
    writeFileSync(cookiesPath, '{}')
    const spec = { action: 'read', chat: 'grace_ships', account, platform: 'fake', route: { proxy: null }, stateRoot, cookiesPath }
    const first = askReadHost<{ ok: boolean; pid?: number; chat?: string; kitHost?: { calls: number } }>(info, spec)
    const second = askReadHost<{ ok: boolean; pid?: number; kitHost?: { calls: number } }>(info, spec)
    expect(first).toMatchObject({ ok: true, chat: 'grace_ships', pid: info.pid })
    expect(second?.pid).toBe(info.pid)
    expect(second?.kitHost?.calls).toBe(2)
    expect(askReadHost(info, { ...spec, action: 'send', live: true, approvedBy: 'the owner' })).toBeNull()
    expect(askReadHost({ ...info, token: 'wrong' }, spec)).toBeNull()
    expect(readHostOf('fake', stateRoot, account, () => false)).toBeNull()
    expect(readHostOf('discord', stateRoot, account)).toBeNull()
  }, 30000)
})
