import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPlatformEngine } from '../session/index'
import type { PlatformShape } from '../session/index'
import { runTwitterEngine } from '../../twitter/account/session/index'
import { checkRunnable, engineProxyUrl, engineRoute, toFacebookAccount } from './index'

const dir = mkdtempSync(join(tmpdir(), 'engineRoute'))
afterAll(() => rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }))

const account = (over: Record<string, unknown>) => toFacebookAccount({ id: 'acct1', accountName: 'grace_ships', platform: 'DISCORD', status: 'active', cookies: [], proxy: null, ...over } as never)

describe('engineRoute: every engine call carries the account route (issue 47)', () => {
  test('a Facebook account never calls out without its proxy', () => {
    expect(engineRoute(account({ platform: 'FACEBOOK' }))).toMatchObject({ ok: false, code: 'noProxy' })
  })

  test('an account with no proxy on a direct platform goes direct', () => {
    expect(engineRoute(account({}))).toEqual({ ok: true, route: { proxy: null } })
  })

  test("an account's own proxy goes with every call, whatever form it is kept in", () => {
    expect(engineRoute(account({ proxy: 'gate.example:7000:user-a:fake@pw' }))).toEqual({ ok: true, route: { proxy: 'http://user-a:fake%40pw@gate.example:7000' } })
    expect(engineProxyUrl('socks5://gate.example:1080')).toBe('socks5://gate.example:1080')
  })

  test('a proxy that cannot be read refuses the call instead of going direct', () => {
    expect(engineRoute(account({ proxy: 'not a proxy' }))).toMatchObject({ ok: false, code: 'proxyMalformed' })
  })
})

describe("checkRunnable: a direct platform's account that has a proxy opens its browser through it", () => {
  test('no proxy: direct', () => {
    expect(checkRunnable(account({}), 'check')).toMatchObject({ ok: true, proxy: { direct: true } })
  })

  test('its own proxy and home country: through the proxy', () => {
    expect(checkRunnable(account({ proxy: 'http://user:pw@gate.example:8080', homeCountry: 'IE' }), 'check')).toEqual({ ok: true, proxy: { server: 'http://gate.example:8080', username: 'user', password: 'pw', country: 'IE' } })
  })

  test('a proxy with no home country is refused, not dropped', () => {
    expect(checkRunnable(account({ proxy: 'http://gate.example:8080' }), 'check')).toMatchObject({ ok: false, code: 'noHomeCountry' })
  })
})

describe('the engines get the route in their spec, and a refused route starts nothing', () => {
  const marker = join(dir, 'started.txt')
  const engine = join(dir, 'engine.py')
  writeFileSync(engine, ['import json, sys', 'spec = json.load(open(sys.argv[1], encoding="utf-8"))', `open(${JSON.stringify(marker)}, "w").write("x")`, 'print(json.dumps({"ok": True, "route": spec.get("route")}))', ''].join('\n'))
  const shape: PlatformShape = { platform: 'fake', accountPlatform: 'DISCORD', label: 'Fake', engine, sessionCookies: [] }

  test('the kit engine is spawned with the account route', () => {
    const run = runPlatformEngine(shape, account({ proxy: 'http://user:pw@gate.example:8080' }), { action: 'read' })
    expect(run.answer).toMatchObject({ ok: true, route: { proxy: 'http://user:pw@gate.example:8080' } })
  })

  test('the kit engine is never spawned when the route is refused', () => {
    rmSync(marker, { force: true })
    const run = runPlatformEngine(shape, account({ proxy: 'not a proxy' }), { action: 'read' })
    expect(run.answer).toMatchObject({ ok: false, code: 'proxyMalformed' })
    expect(existsSync(marker)).toBe(false)
  })

  test('the X engine refuses an unreadable proxy before Python starts', async () => {
    const run = await runTwitterEngine(account({ platform: 'TWITTER', proxy: 'not a proxy' }), { action: 'ping' })
    expect(run.answer).toMatchObject({ ok: false, code: 'proxyMalformed' })
  })
})
