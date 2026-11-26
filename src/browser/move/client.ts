import { AdsPowerError } from '../adsPower/types'
import type { AdsPowerClient, StartedBrowser } from '../adsPower/types'
import { driverOrNull } from '../driver/client'
import type { BrowserDriverName } from '../driver/types'
import { knownPlatformOfAccount, PLATFORM_SITES, PLATFORMS } from '../../cli/runner/helpers/platforms'
import type { Platform } from '../../cli/runner/helpers/platforms'
import { browserSessionGate, BROWSER_SESSION_NEEDS } from '../../platformKit/signIn/helpers/sessionShapes'
import { listBrowserAccounts, SOCIAL_ACCOUNTS } from '../../platformKit/socialAccount/index'
import type { FacebookAccount, PlaywrightCookie } from '../../platformKit/socialAccount/index'
import { SESSION_CHECK_PLATFORMS } from '../../platformKit/sessionCheck/types'
import type { AccountStore } from '../../accounts/store/index'
import { MOVE_NOT_CARRIED } from './types'
import type { MoveCheck, MoveDeps, MoveLedgerEntry, MoveOptions, MovePlan, MovePlanEntry, MoveResult, MoveSession, MoveSource, MoveTarget } from './types'

export class BrowserMoveError extends Error {
  constructor(
    readonly code: string,
    readonly detail: string
  ) {
    super(`${code}: ${detail}`)
    this.name = 'BrowserMoveError'
  }
}

export function moveOrigins(platform: Platform): string[] {
  const home = new URL(PLATFORM_SITES[platform].home).origin
  const stored = platform === 'facebook' ? undefined : BROWSER_SESSION_NEEDS[platform].sessionStorage?.origin
  return [...new Set([home, ...(stored ? [stored] : [])])]
}

export function platformCookies(platform: Platform, cookies: PlaywrightCookie[]): PlaywrightCookie[] {
  const hosts = PLATFORM_SITES[platform].hosts
  return cookies.filter((cookie) => {
    const domain = String(cookie.domain ?? '').replace(/^\./, '').toLowerCase()
    return hosts.some((host) => domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`))
  })
}

export function storedSessionOf(account: FacebookAccount): MoveSession {
  return { cookies: (account.cookies ?? []) as PlaywrightCookie[], origins: Array.isArray(account.storageOrigins) ? account.storageOrigins : [] }
}

export function hasStoredSession(account: FacebookAccount): boolean {
  const platform = knownPlatformOfAccount(account)
  return platform !== null && browserSessionGate(platform, storedSessionOf(account)).ok
}

function codeOf(error: unknown): { code: string; detail: string } {
  if (error instanceof AdsPowerError || error instanceof BrowserMoveError) return { code: error.code, detail: error.detail }
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') return { code: String((error as { code: string }).code), detail: String((error as { detail?: unknown }).detail ?? '') }
  return { code: 'browserMoveFailed', detail: error instanceof Error ? error.message : String(error) }
}

export async function adsPowerReach(adsPower: AdsPowerClient): Promise<{ up: boolean; code: string | null; detail: string | null }> {
  if (!(await adsPower.status())) return { up: false, code: 'adsPowerUnavailable', detail: "AdsPower's Local API doesn't answer: start the AdsPower app" }
  try {
    await adsPower.listProfiles()
    return { up: true, code: null, detail: null }
  } catch (error) {
    const { code, detail } = codeOf(error)
    return { up: false, code, detail }
  }
}

function entryOf(account: FacebookAccount, to: MoveTarget, env: Record<string, string | undefined>, reach: { up: boolean; code: string | null }): MovePlanEntry {
  const platform = knownPlatformOfAccount(account)
  const from = driverOrNull(account, env) as BrowserDriverName | null
  const base = { accountId: account.id, accountName: account.accountName, platform: platform ?? String(account.platform ?? 'unknown').toLowerCase(), from, to, profileId: account.adsPowerProfileId }
  const skip = (note: string): MovePlanEntry => ({ ...base, action: 'skip', carries: null, note })
  if (!platform) return skip("the account's platform is unknown")
  if (!PLATFORM_SITES[platform].browser) return skip(`${platform} has no browser in log: nothing to move`)
  if (from === to && !account.adsPowerProfileId) return skip(`already on ${to}`)
  if (account.status === 'deactivated') return skip('deactivated')
  if (!SESSION_CHECK_PLATFORMS.includes(platform)) return skip(`${platform} has no read-only session check, so a move can't be confirmed; it opens on ${from ?? to} and is checked in its browser`)
  const stored = hasStoredSession(account)
  if (account.adsPowerProfileId && reach.up) return { ...base, action: 'move', carries: 'adsPowerProfile', note: `start AdsPower profile ${account.adsPowerProfileId}, read its cookies and localStorage over CDP, stop it, save them, set the driver to ${to}, check with the platform` }
  if (!stored) return skip(`no saved session to carry${account.adsPowerProfileId ? ` and AdsPower can't be read (${reach.code})` : ''}: sign it in on ${to} instead`)
  const why = account.adsPowerProfileId ? `AdsPower can't be read (${reach.code}): the session already saved for the account carries` : 'the saved session carries as is'
  return { ...base, action: 'move', carries: 'storedSession', note: `${why}; set the driver to ${to}${account.adsPowerProfileId ? `, keep ${account.adsPowerProfileId} as the former profile` : ''}, check with the platform` }
}

const PLATFORM_ORDER = (platform: string) => {
  const index = (PLATFORMS as readonly string[]).indexOf(platform)
  return index < 0 ? PLATFORMS.length : index
}

export function orderMoves(entries: MovePlanEntry[]): MovePlanEntry[] {
  const rank = (e: MovePlanEntry) => (e.action === 'move' ? 0 : 1)
  return [...entries].sort((a, b) => rank(a) - rank(b) || PLATFORM_ORDER(a.platform) - PLATFORM_ORDER(b.platform) || a.accountName.localeCompare(b.accountName))
}

async function accountsOf(store: AccountStore): Promise<FacebookAccount[]> {
  return listBrowserAccounts(store, PLATFORMS.map((p) => PLATFORM_SITES[p].twenty))
}

export function pickAccount(accounts: FacebookAccount[], ref: string): FacebookAccount {
  const key = ref.trim().replace(/^@/, '').toLowerCase()
  const found = accounts.filter((a) => a.id === ref || a.accountName.toLowerCase() === key)
  if (!found.length) throw new BrowserMoveError('accountNotFound', `no account "${ref}"`)
  if (found.length > 1) throw new BrowserMoveError('platformAmbiguous', `${ref} is on ${found.map((a) => a.platform).join(' and ')}: use its record id`)
  return found[0]
}

export async function planMoves(deps: Pick<MoveDeps, 'accounts' | 'adsPower' | 'ledger' | 'env'>, options: MoveOptions): Promise<MovePlan & { reach: { up: boolean; code: string | null; detail: string | null } }> {
  const env = deps.env ?? process.env
  const accounts = await accountsOf(deps.accounts)
  const scope = options.account ? [pickAccount(accounts, options.account)] : accounts.filter((a) => driverOrNull(a, env) === 'adsPower' || Boolean(a.adsPowerProfileId))
  const reach = await adsPowerReach(deps.adsPower)
  const entries = orderMoves(scope.map((a) => entryOf(a, options.to, env, reach)))
  const releasable = deps.ledger.all().filter((e) => e.state === 'moved' && e.formerAdsPowerProfileId)
  return { to: options.to, adsPowerUp: reach.up, reach, entries, releasable }
}

async function readProfile(deps: MoveDeps, profileId: string, platform: Platform, log: (line: string) => void): Promise<MoveSession> {
  const already = await deps.adsPower.activeBrowser(profileId).catch(() => null)
  let started: StartedBrowser | null = already
  let ours = false
  if (!started) {
    try {
      started = await deps.adsPower.startBrowser(profileId, { headless: true })
      log(`AdsPower profile ${profileId}: started headless`)
    } catch (error) {
      const first = codeOf(error)
      if (first.code === 'adsPowerKeyMismatch' || first.code === 'adsPowerUnavailable') throw error
      log(`AdsPower profile ${profileId}: headless start refused (${first.detail}); starting it headed`)
      try {
        started = await deps.adsPower.startBrowser(profileId)
      } catch (again) {
        const second = codeOf(again)
        throw new BrowserMoveError('adsPowerProfileWontStart', `profile ${profileId} would not start: ${second.detail || second.code}`)
      }
    }
    ours = true
  }
  try {
    const state = await deps.readState(started!.cdpUrl, moveOrigins(platform))
    return { cookies: platformCookies(platform, state.cookies), origins: state.origins }
  } finally {
    if (ours) {
      await deps.adsPower.stopBrowser(profileId).then(() => log(`AdsPower profile ${profileId}: stopped`), (error) => log(`AdsPower profile ${profileId}: stop answered ${codeOf(error).code}`))
    }
  }
}

type Snapshot = Record<string, unknown>

function snapshotOf(account: FacebookAccount): Snapshot {
  return { browserDriver: account.browserDriver, adsPowerProfileId: account.adsPowerProfileId, formerAdsPowerProfileId: (account as unknown as Record<string, unknown>).formerAdsPowerProfileId ?? null, cookies: account.cookies, storageOrigins: account.storageOrigins, sessionState: account.sessionState, sessionCheckedAt: account.sessionCheckedAt }
}

export async function moveOne(deps: MoveDeps, entry: MovePlanEntry): Promise<MoveResult> {
  const log = deps.log ?? (() => {})
  const now = deps.now ?? (() => new Date())
  const done = (outcome: MoveResult['outcome'], code: string | null, detail: string, carried: MoveSource | null = null, check: MoveCheck | null = null): MoveResult => ({ ...entry, outcome, code, detail, carried, check })
  if (entry.action !== 'move') return done('skipped', null, entry.note)
  const account = pickAccount(await accountsOf(deps.accounts), entry.accountId)
  const platform = knownPlatformOfAccount(account)!
  let session: MoveSession
  let carried: MoveSource
  try {
    if (entry.carries === 'adsPowerProfile' && account.adsPowerProfileId) {
      session = await readProfile(deps, account.adsPowerProfileId, platform, log)
      const gate = browserSessionGate(platform, session)
      if (!gate.ok) return done('failed', 'noPlatformSession', `AdsPower profile ${account.adsPowerProfileId} holds no signed-in session (${gate.detail}); nothing was changed`)
      carried = 'adsPowerProfile'
    } else {
      session = storedSessionOf(account)
      carried = 'storedSession'
    }
  } catch (error) {
    const { code, detail } = codeOf(error)
    return done('failed', code, `${detail}; nothing was changed`)
  }
  const before = snapshotOf(account)
  const former = account.adsPowerProfileId
  const ledgerEntry = (state: MoveLedgerEntry['state']): MoveLedgerEntry => ({ accountId: account.id, accountName: account.accountName, platform, from: entry.from, to: entry.to, formerAdsPowerProfileId: former, state, at: now().toISOString() })
  const fields: Record<string, unknown> = { browserDriver: entry.to, adsPowerProfileId: null, ...(former ? { formerAdsPowerProfileId: former } : {}), ...(carried === 'adsPowerProfile' ? { cookies: session.cookies, storageOrigins: session.origins } : {}) }
  await deps.accounts.update(SOCIAL_ACCOUNTS, account.id, fields as never)
  deps.ledger.put(ledgerEntry('checking'))
  log(`${account.accountName}: driver set to ${entry.to} (${carried === 'adsPowerProfile' ? `${session.cookies.length} cookies, ${session.origins.length} origin(s) from AdsPower` : 'the saved session'}); checking with ${platform}`)
  let check: MoveCheck
  try {
    check = await deps.check({ ...account, ...fields } as FacebookAccount)
  } catch (error) {
    check = { verdict: 'unknown', code: codeOf(error).code, detail: codeOf(error).detail }
  }
  if (check.verdict === 'signedIn') {
    deps.ledger.put(ledgerEntry('moved'))
    return done('moved', null, `${platform} says signed in on ${entry.to}. ${MOVE_NOT_CARRIED}`, carried, check)
  }
  await deps.accounts.update(SOCIAL_ACCOUNTS, account.id, before as never)
  deps.ledger.put(ledgerEntry('rolledBack'))
  return done('rolledBack', 'browserMoveNotSignedIn', `${platform} did not say signed in (${check.verdict}${check.code ? `, ${check.code}` : ''}${check.detail ? `: ${check.detail}` : ''}); the driver, profile link and session were put back`, carried, check)
}

export async function moveAccounts(deps: MoveDeps, plan: MovePlan): Promise<MoveResult[]> {
  const results: MoveResult[] = []
  for (const entry of plan.entries) {
    const result = await moveOne(deps, entry)
    deps.log?.(`${entry.accountName}: ${result.outcome}${result.code ? ` (${result.code})` : ''}`)
    results.push(result)
  }
  return results
}

export async function releaseMoved(deps: Pick<MoveDeps, 'adsPower' | 'ledger' | 'now' | 'log'>, entries: MoveLedgerEntry[]): Promise<{ accountName: string; profileId: string; released: boolean; detail: string }[]> {
  const now = deps.now ?? (() => new Date())
  const out = []
  for (const entry of entries) {
    const profileId = entry.formerAdsPowerProfileId!
    try {
      await deps.adsPower.deleteProfiles([profileId])
      deps.ledger.put({ ...entry, state: 'released', at: now().toISOString() })
      out.push({ accountName: entry.accountName, profileId, released: true, detail: 'deleted in AdsPower' })
    } catch (error) {
      const { code, detail } = codeOf(error)
      out.push({ accountName: entry.accountName, profileId, released: false, detail: `${code}: ${detail}` })
    }
  }
  return out
}

export function movePlanText(plan: MovePlan & { reach: { up: boolean; code: string | null; detail: string | null } }, apply: boolean): string {
  const head = `Browser move to ${plan.to}${apply ? '' : ' (dry run: nothing changes; --apply moves)'}. AdsPower Local API: ${plan.reach.up ? 'up' : `${plan.reach.code}${plan.reach.detail ? ` (${plan.reach.detail})` : ''}`}.`
  const lines = plan.entries.map((e) => `  ${e.platform.padEnd(9)} ${e.accountName.padEnd(34)} ${String(e.from ?? 'unknown').padEnd(8)} ${e.profileId ?? '-'}  ${e.action === 'move' ? `MOVE: ${e.note}` : `skip: ${e.note}`}`)
  const moving = plan.entries.filter((e) => e.action === 'move').length
  const release = plan.releasable.length ? [`Moved and still holding an AdsPower profile (--release --apply deletes them, only once the owner says so): ${plan.releasable.map((e) => `${e.accountName} ${e.formerAdsPowerProfileId}`).join(', ')}`] : []
  return [head, ...lines, `${moving} to move, ${plan.entries.length - moving} skipped.`, `Not carried: ${MOVE_NOT_CARRIED}`, ...release].join('\n')
}

export function moveResultText(results: MoveResult[]): string {
  if (!results.length) return 'Nothing to move.'
  const counts = results.reduce<Record<string, number>>((n, r) => ({ ...n, [r.outcome]: (n[r.outcome] ?? 0) + 1 }), {})
  return [Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '), ...results.map((r) => `  ${r.platform} ${r.accountName}: ${r.outcome}${r.code ? ` (${r.code})` : ''}: ${r.detail}`)].join('\n')
}
