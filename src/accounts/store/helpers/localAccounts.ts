import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { logHome } from '../../../config/logHome/index'
import { dropSecretsExcept, readSecret, sealVerified, secretStoreReady, warnPlainOnce } from '../../../storage/secrets/index'

type Row = Record<string, unknown> & { id: string }

export const LOCAL_ID_PREFIX = 'local:'

export function localAccountsPath(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_LOCAL_ACCOUNTS || join(logHome(), 'localAccounts.json')
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
