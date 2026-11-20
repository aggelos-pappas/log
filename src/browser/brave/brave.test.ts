import { describe, expect, test } from 'bun:test'
import { waitFor } from 'xstate'
import { BROWSER_CAPABILITIES, BROWSER_DRIVERS, BrowserDriverError, DEFAULT_BROWSER_DRIVER, browserFor, createBrowserSession, driverNameOf } from '../driver/index'
import type { BrowserCapabilities } from '../driver/index'
import { BRAVE_INSTALL_PATHS, braveCapabilities, braveDriver, bravePath, bravePathCandidates } from './index'

const input = { driver: 'brave' as const, accountId: 'a1', accountName: 'galwayOne' }
const python = (script: string) => {
  const run = Bun.spawnSync([process.env.LOG_PYTHON || 'python', '-c', script], { cwd: `${import.meta.dir}/../../../python` })
  if (run.exitCode !== 0) throw new Error(run.stderr.toString())
  return JSON.parse(run.stdout.toString())
}

describe('the Brave driver', () => {
  test('refused at a failed gate, opened after a passed one, closed with its reason', async () => {
    const opened: string[] = []
    const refused = braveDriver({ gate: async () => ({ ok: false, exitIp: null, exitCountry: null, failure: { code: 'noProxy', detail: '' } }), open: async (id) => (opened.push(id), { cdpUrl: null, handle: id }) })
    expect((await waitFor(createBrowserSession(refused, input).start(), (s) => s.status === 'done')).output).toMatchObject({ state: 'refused', failure: { code: 'noProxy' } })
    expect(opened).toEqual([])
    const closed: string[] = []
    const driver = braveDriver({ gate: async () => ({ ok: true, exitIp: '1.2.3.4', exitCountry: 'IE', failure: null }), open: async (id) => ({ cdpUrl: null, handle: id }), close: async (e) => void closed.push(e.handle) })
    const actor = createBrowserSession(driver, input).start()
    await waitFor(actor, (s) => s.matches('open'))
    actor.send({ type: 'CLOSE', reason: 'done' })
    expect((await waitFor(actor, (s) => s.status === 'done')).output).toMatchObject({ state: 'closed', closeReason: 'done' })
    expect(closed).toEqual(['a1'])
  })
})

describe('one way to pick the browser', () => {
  test('Camoufox when nothing is set, the account first, then a linked AdsPower profile, then LOG_BROWSER_DRIVER', () => {
    expect(DEFAULT_BROWSER_DRIVER).toBe('camoufox')
    expect(driverNameOf({ browserDriver: null }, {})).toBe('camoufox')
    expect(driverNameOf({ browserDriver: 'brave' }, {})).toBe('brave')
    expect(driverNameOf({ browserDriver: ' brave ' }, { LOG_BROWSER_DRIVER: 'camoufox' })).toBe('brave')
    expect(driverNameOf({ browserDriver: null }, { LOG_BROWSER_DRIVER: 'brave' })).toBe('brave')
    expect(driverNameOf({ browserDriver: null, adsPowerProfileId: 'k1' }, { LOG_BROWSER_DRIVER: 'brave' })).toBe('brave')
    expect(driverNameOf({ browserDriver: 'camoufox', adsPowerProfileId: 'k1' }, { LOG_BROWSER_DRIVER: 'brave' })).toBe('camoufox')
    expect(browserFor({ browserDriver: 'brave', adsPowerProfileId: null }, {})).toEqual({ driver: 'brave', profileId: null })
  })

  test('a name log does not drive is refused, from the account or from the env', () => {
    expect(() => driverNameOf({ browserDriver: 'netscape' }, {})).toThrow(BrowserDriverError)
    expect(() => driverNameOf({ browserDriver: null }, { LOG_BROWSER_DRIVER: 'netscape' })).toThrow(/browserDriverUnknown/)
    expect(() => driverNameOf({ browserDriver: 'Brave' }, {})).toThrow(/browserDriverUnknown/)
  })

  test('Python picks the same browser from the config TS sends, and refuses an unknown one with the same code', () => {
    const out = python(['import json', 'from browser import browserDriver, proxyGate', 'try:', '    browserDriver.driver_of({"browser": {"driver": "netscape"}})', '    refused = None', 'except proxyGate.GateError as e:', '    refused = e.code', 'print(json.dumps({"brave": browserDriver.driver_of({"browser": {"driver": "brave"}}), "refused": refused, "opener": browserDriver.OPENERS["brave"].__name__}))'].join('\n'))
    expect(out).toEqual({ brave: ['brave', null], refused: 'browserDriverUnknown', opener: 'open_brave' })
  })
})

describe("Brave launches only through the gate", () => {
  test("chromium_launch builds headed options with the proxy and locale, and the guard refuses anything else", () => {
    const out = python([
      'import json',
      'from browser import proxyGate',
      'proxyGate._armed.update({"locale": "de-DE", "languages": ["de-DE", "de"], "timezone": "Europe/Berlin", "captureDir": None})',
      'proxyGate.gate_attached = lambda: {"proxy": {"server": "http://p.example:1", "username": "u", "password": "pw", "country": "DE"}, "latitude": 52.5, "longitude": 13.4}',
      'proxyGate.install_guards = lambda: None',
      'options = proxyGate.chromium_launch("X:/brave.exe")',
      'context = {"locale": "en-US", "timezoneId": "UTC", "recordHarPath": "x.har"}',
      'proxyGate._force_context(context)',
      'same = {"env": None, "proxy": options["proxy"], "headless": False, "executablePath": "X:/brave.exe"}',
      'proxyGate._require_gate((), same)',
      'refused = []',
      'for bad in ({**same, "headless": True}, {**same, "proxy": None}, {**same, "executablePath": "X:/other.exe"}):',
      '    try:',
      '        proxyGate._require_gate((), bad)',
      '    except proxyGate.GateError as e:',
      '        refused.append(e.code)',
      'print(json.dumps({"options": options, "languages": proxyGate._armed["languages"], "context": context, "refused": refused}))',
    ].join('\n'))
    expect(out.options).toEqual({ executable_path: 'X:/brave.exe', headless: false, args: ['--lang=de-DE', '--accept-lang=de-DE'], proxy: { server: 'http://p.example:1', username: 'u', password: 'pw' } })
    expect(out.languages).toEqual(['de-DE'])
    expect(out.context).toMatchObject({ locale: 'de-DE', timezoneId: 'Europe/Berlin', geolocation: { latitude: 52.5, longitude: 13.4, accuracy: 100 }, permissions: ['geolocation'], recordHarPath: 'x.har' })
    expect(out.refused).toEqual(['unguardedLaunch', 'unguardedLaunch', 'unguardedLaunch'])
  })
})

describe("finding Brave", () => {
  test('LOG_BRAVE_PATH wins, else the standard install places of each OS, first one present', () => {
    expect(bravePathCandidates('win32', { LOG_BRAVE_PATH: 'D:/apps/brave.exe' }, 'C:/home')).toEqual(['D:/apps/brave.exe'])
    expect(bravePathCandidates('win32', { PROGRAMFILES: 'C:/PF', LOCALAPPDATA: 'D:/local' }, 'C:/home')).toEqual(['C:/PF/BraveSoftware/Brave-Browser/Application/brave.exe', 'D:/local/BraveSoftware/Brave-Browser/Application/brave.exe'])
    expect(bravePathCandidates('darwin', {}, '/Users/someone')[1]).toBe('/Users/someone/Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
    expect(bravePath('linux', {}, '/home/someone', (p) => p === '/opt/brave.com/brave/brave')).toBe('/opt/brave.com/brave/brave')
    expect(bravePath('linux', {}, '/home/someone', () => false)).toBeNull()
    expect(bravePathCandidates('sunos', {}, '/home')).toEqual([])
  })

  test("Python looks in the same places, and says braveNotFound when there is none", () => {
    const out = python(['import json', 'from browser import browserDriver, proxyGate', 'try:', '    browserDriver.brave_path("linux", {}, "/home/someone", lambda p: False)', '    missing = None', 'except proxyGate.GateError as e:', '    missing = e.code', 'print(json.dumps({"paths": {k: list(v) for k, v in browserDriver.BRAVE_INSTALL_PATHS.items()}, "found": browserDriver.brave_path("linux", {}, "/h", lambda p: p == "/snap/bin/brave"), "own": browserDriver.brave_path_candidates("win32", {"LOG_BRAVE_PATH": "D:/b.exe"}), "missing": missing}))'].join('\n'))
    expect(out.paths).toEqual(BRAVE_INSTALL_PATHS)
    expect(out.found).toBe('/snap/bin/brave')
    expect(out.own).toEqual(['D:/b.exe'])
    expect(out.missing).toBe('braveNotFound')
  })
})

describe('every capability has a row for every browser', () => {
  test('each driver in BROWSER_DRIVERS fills every capability, liveView included', async () => {
    for (const name of BROWSER_DRIVERS) {
      const row = (await import(`../${name}/index.ts`))[`${name}Capabilities`] as BrowserCapabilities
      expect(row).toBeDefined()
      expect(Object.keys(row).sort()).toEqual(Object.keys(BROWSER_CAPABILITIES).sort())
      for (const cell of Object.values(row)) {
        expect(['built', 'notBuilt', 'notApplicable']).toContain(cell.status)
        expect(cell.how.length).toBeGreaterThan(10)
      }
    }
    expect(braveCapabilities.liveView.status).toBe('built')
    expect(braveCapabilities.devicePinned.status).toBe('notBuilt')
  })
})
