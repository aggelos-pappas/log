import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { matchesFilter } from './memoryTwenty'
import type { LoginSecrets, TwentyClient, TwentyObject, TwentyObjects } from '../types'
import { logHome } from '../../../config/logHome/index'
import { dropSecretsExcept, readSecret, sealVerified, secretStoreReady, warnPlainOnce } from '../../../storage/secrets/index'

type Row = Record<string, unknown> & { id: string }

const ACCOUNTS = 'socialAccounts'
export const LOCAL_ID_PREFIX = 'local:'

export function localAccountsPath(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_LOCAL_ACCOUNTS || join(logHome(), 'localAccounts.json')
}

export function localOnly(env: Record<string, string | undefined> = process.env): boolean {
  return (env.LOG_ACCOUNTS ?? '').trim().toLowerCase() === 'local'
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX)
}

export const ACCOUNT_SECRET_FIELDS = ['cookies', 'storageOrigins', 'proxy', 'email', 'password', 'totpSecret', 'messengerPin'] as const
const SEALED_FIELD = 'sealedSecrets'

interface AccountsFile {
  socialAccounts: Row[]
  sealId?: string
}

function filled(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'object' && !Array.isArray(value)) return Object.keys(value as object).length > 0
  return !(Array.isArray(value) && !value.length)
}

export function plainSecretsOf(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(ACCOUNT_SECRET_FIELDS.filter((field) => filled(row[field])).map((field) => [field, row[field]]))
}

function readFile(path: string): AccountsFile | null {
  if (!existsSync(path)) return null
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { socialAccounts?: Row[]; sealId?: unknown }
  return { socialAccounts: Array.isArray(parsed.socialAccounts) ? parsed.socialAccounts : [], ...(typeof parsed.sealId === 'string' ? { sealId: parsed.sealId } : {}) }
}

function putFile(path: string, file: AccountsFile): void {
  mkdirSync(dirname(path), { recursive: true })
  const pending = `${path}.${process.pid}.pending`
  writeFileSync(pending, JSON.stringify(file, null, 2), { mode: 0o600 })
  renameSync(pending, path)
}

function openRow(row: Row): Row {
  const ref = row[SEALED_FIELD]
  if (typeof ref !== 'string' || !ref) return row
  const { [SEALED_FIELD]: _ref, ...rest } = row
  const text = readSecret(ref)
  const sealed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  return { ...sealed, ...rest, id: row.id } as Row
}

function strip(row: Row, ref: string): Row {
  const kept = Object.fromEntries(Object.entries(row).filter(([field]) => !(ACCOUNT_SECRET_FIELDS as readonly string[]).includes(field) && field !== SEALED_FIELD))
  return { ...kept, [SEALED_FIELD]: ref, id: row.id } as Row
}

function sealRows(rows: Row[], sealId: string): { stored: Row[]; refs: string[]; allSealed: boolean } {
  const refs: string[] = []
  let allSealed = true
  const stored = rows.map((row) => {
    const secrets = plainSecretsOf(row)
    if (!Object.keys(secrets).length) return row
    const ref = `account:${sealId}:${row.id}`
    if (!sealVerified(ref, 'account', JSON.stringify(secrets))) {
      allSealed = false
      return row
    }
    refs.push(ref)
    return strip(row, ref)
  })
  return { stored, refs, allSealed }
}

export function plainLocalAccounts(path = localAccountsPath()): { rows: number; sealed: number; plain: number; fields: string[] } {
  const file = readFile(path)
  const rows = file?.socialAccounts ?? []
  const plain = rows.filter((row) => Object.keys(plainSecretsOf(row)).length)
  const fields = [...new Set(plain.flatMap((row) => Object.keys(plainSecretsOf(row))))].sort()
  return { rows: rows.length, sealed: rows.filter((row) => typeof row[SEALED_FIELD] === 'string').length, plain: plain.length, fields }
}

export function readLocalAccounts(path = localAccountsPath()): Row[] {
  const file = readFile(path)
  if (!file) return []
  const rows = file.socialAccounts.map(openRow)
  if (!file.socialAccounts.some((row) => Object.keys(plainSecretsOf(row)).length)) return rows
  if (!secretStoreReady()) {
    warnPlainOnce(path)
    return rows
  }
  const sealId = file.sealId ?? randomBytes(6).toString('hex')
  const sealed = sealRows(rows, sealId)
  if (!sealed.refs.length) return rows
  putFile(path, { socialAccounts: sealed.stored, sealId })
  return rows
}

export function writeLocalAccounts(rows: Row[], path = localAccountsPath()): void {
  const plain = rows.some((row) => Object.keys(plainSecretsOf(row)).length)
  const held = readFile(path)
  if (!plain || !secretStoreReady()) {
    if (plain) warnPlainOnce(path)
    putFile(path, { socialAccounts: rows, ...(held?.sealId ? { sealId: held.sealId } : {}) })
    if (held?.sealId && secretStoreReady()) dropSecretsExcept(`account:${held.sealId}:`, [])
    return
  }
  const sealId = held?.sealId ?? randomBytes(6).toString('hex')
  const sealed = sealRows(rows, sealId)
  putFile(path, { socialAccounts: sealed.stored, sealId })
  dropSecretsExcept(`account:${sealId}:`, sealed.refs)
}

export function updateLocalAccount(platform: string, accountName: string, fields: Record<string, unknown>, path = localAccountsPath()): Row | null {
  const rows = readLocalAccounts(path)
  const same = (value: unknown, want: string) => String(value ?? '').toLowerCase() === want.toLowerCase()
  const held = rows.find((r) => same(r.platform, platform) && (same(r.accountName, accountName) || same(r.name, accountName)))
  if (!held) return null
  const row: Row = { ...held, ...fields, id: held.id }
  writeLocalAccounts(rows.map((r) => (r === held ? row : r)), path)
  return row
}

export function upsertLocalAccount(fields: Record<string, unknown> & { accountName: string }, path = localAccountsPath()): Row {
  const rows = readLocalAccounts(path)
  const id = `${LOCAL_ID_PREFIX}${String(fields.platform ?? 'account').toLowerCase()}:${fields.accountName}`
  const held = rows.find((r) => r.id === id)
  const row: Row = { ...(held ?? { createdAt: new Date().toISOString() }), name: fields.accountName, ...fields, id }
  writeLocalAccounts([...rows.filter((r) => r.id !== id), row], path)
  return row
}

export function accountStore(id: string, env: Record<string, string | undefined> = process.env): string {
  return isLocalId(id) || readLocalAccounts(localAccountsPath(env)).some((r) => r.id === id) ? 'Local accounts' : 'Twenty'
}

export async function pullLocalAccounts(remote: TwentyClient, options: { platform?: string; refresh?: boolean } = {}, path = localAccountsPath()): Promise<{ added: Row[]; refreshed: Row[]; kept: Row[] }> {
  const filter = options.platform ? { platform: { eq: options.platform } } : undefined
  const theirs = (await remote.list(ACCOUNTS, filter as TwentyObjects[typeof ACCOUNTS]['filter'])) as unknown as Row[]
  const rows = readLocalAccounts(path)
  const out = { added: [] as Row[], refreshed: [] as Row[], kept: [] as Row[] }
  for (const row of theirs) {
    const accountName = String(row.accountName || row.name || '')
    if (!accountName) continue
    const held = rows.find((r) => r.id === row.id || (r.platform === row.platform && r.accountName === accountName))
    if (held && !options.refresh) {
      out.kept.push(held)
      continue
    }
    const secrets = (await remote.loginSecrets(row.id)) ?? {}
    const filled = Object.fromEntries(Object.entries(secrets).filter(([, value]) => value))
    const pulled: Row = { ...row, ...filled, accountName, name: accountName, twentyId: row.id, pulledAt: new Date().toISOString() }
    const index = held ? rows.indexOf(held) : -1
    if (index >= 0) rows[index] = { ...held, ...pulled, id: held!.id }
    else rows.push(pulled)
    ;(held ? out.refreshed : out.added).push(pulled)
  }
  writeLocalAccounts(rows, path)
  return out
}

export function withLocalAccounts(remote: TwentyClient, env: Record<string, string | undefined> = process.env): TwentyClient {
  const path = localAccountsPath(env)
  const only = localOnly(env)
  const local = (filter?: unknown) => readLocalAccounts(path).filter((row) => matchesFilter(row, filter as Record<string, unknown> | undefined))
  return {
    async list<K extends TwentyObject>(object: K, filter?: TwentyObjects[K]['filter']) {
      if (object !== ACCOUNTS) return remote.list(object, filter)
      const mine = local(filter)
      if (only) return mine as unknown as TwentyObjects[K]['row'][]
      const names = new Set(mine.map((r) => `${r.platform}:${r.accountName}`))
      const theirs = (await remote.list(object, filter)) as unknown as Row[]
      return [...mine, ...theirs.filter((r) => !names.has(`${r.platform}:${r.accountName}`))] as unknown as TwentyObjects[K]['row'][]
    },
    async get<K extends TwentyObject>(object: K, id: string) {
      if (object !== ACCOUNTS) return remote.get(object, id)
      const row = readLocalAccounts(path).find((r) => r.id === id)
      if (row || only || isLocalId(id)) return (row ?? null) as unknown as TwentyObjects[K]['row'] | null
      return remote.get(object, id)
    },
    async create<K extends TwentyObject>(object: K, data: TwentyObjects[K]['create']) {
      if (object !== ACCOUNTS || !only) return remote.create(object, data)
      const fields = data as Record<string, unknown>
      return upsertLocalAccount({ ...fields, accountName: String(fields.accountName ?? fields.name ?? '') }, path) as unknown as TwentyObjects[K]['row']
    },
    async update<K extends TwentyObject>(object: K, id: string, data: TwentyObjects[K]['update']) {
      if (object !== ACCOUNTS) return remote.update(object, id, data)
      const rows = readLocalAccounts(path)
      const row = rows.find((r) => r.id === id)
      if (!row && !isLocalId(id) && !only) return remote.update(object, id, data)
      if (!row) throw new Error(`localAccounts: no socialAccount ${id} in ${path}`)
      Object.assign(row, data, { updatedAt: new Date().toISOString() })
      writeLocalAccounts(rows, path)
      return { ...row } as unknown as TwentyObjects[K]['row']
    },
    async loginSecrets(accountId: string): Promise<LoginSecrets | null> {
      const row = readLocalAccounts(path).find((r) => r.id === accountId)
      if (!row) return isLocalId(accountId) || only ? null : remote.loginSecrets(accountId)
      const text = (value: unknown) => (typeof value === 'string' && value ? value : null)
      return { email: text(row.email), password: text(row.password), totpSecret: text(row.totpSecret), messengerPin: text(row.messengerPin) }
    }
  }
}
