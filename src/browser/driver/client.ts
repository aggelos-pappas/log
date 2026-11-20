import { createActor, fromPromise } from 'xstate'
import { browserSessionMachine } from './machine'
import { BROWSER_DRIVER_ENV, BROWSER_DRIVERS, BrowserDriverError, DEFAULT_BROWSER_DRIVER } from './types'
import type { BrowserDriver, BrowserDriverName, BrowserSessionInput } from './types'

type Env = Record<string, string | undefined>

export function isBrowserDriver(name: unknown): name is BrowserDriverName {
  return typeof name === 'string' && (BROWSER_DRIVERS as readonly string[]).includes(name)
}

function known(name: string, where: string): BrowserDriverName {
  if (isBrowserDriver(name)) return name
  throw new BrowserDriverError('browserDriverUnknown', `${where} names "${name}", which is not a browser log drives (${BROWSER_DRIVERS.join(', ')})`)
}

export function driverNameOf(account: { browserDriver: string | null; adsPowerProfileId?: string | null }, env: Env = process.env): BrowserDriverName {
  const name = account.browserDriver?.trim() ?? ''
  if (name) return known(name, "the account's browserDriver")
  if (account.adsPowerProfileId) return 'adsPower'
  const fallback = env[BROWSER_DRIVER_ENV]?.trim() ?? ''
  return fallback ? known(fallback, BROWSER_DRIVER_ENV) : DEFAULT_BROWSER_DRIVER
}

export function driverOrNull(account: { browserDriver: string | null; adsPowerProfileId?: string | null }, env: Env = process.env): BrowserDriverName | null {
  try {
    return driverNameOf(account, env)
  } catch {
    return null
  }
}

export function sessionMachineFor(driver: BrowserDriver) {
  return browserSessionMachine.provide({
    actors: {
      prepare: fromPromise(({ input }) => driver.prepare(input)),
      gate: fromPromise(({ input }) => driver.gate(input.input, input.handle)),
      start: fromPromise(({ input }) => driver.start(input.input, input.handle, input.gate)),
      selfCheck: fromPromise(({ input }) => driver.selfCheck(input.input, input.endpoint, input.gate)),
      stop: fromPromise(({ input }) => driver.stop(input.input, input.endpoint))
    }
  })
}

export function createBrowserSession(driver: BrowserDriver, input: BrowserSessionInput) {
  if (driver.name !== input.driver) throw new Error(`driver ${driver.name} given for a ${input.driver} session`)
  return createActor(sessionMachineFor(driver), { input })
}

export function browserFor(account: { browserDriver?: string | null; adsPowerProfileId?: string | null }, env: Env = process.env): { driver: BrowserDriverName; profileId: string | null } {
  return { driver: driverNameOf({ browserDriver: account.browserDriver ?? null, adsPowerProfileId: account.adsPowerProfileId ?? null }, env), profileId: account.adsPowerProfileId ?? null }
}
