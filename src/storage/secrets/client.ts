import type { Database } from 'bun:sqlite'
import { createHash, randomBytes } from 'node:crypto'
import { defaultDbPath, openDatabase } from '../schema/client'
import { ALG, OS_KEYSTORES, SCRYPT_PARAMS, keyAad, open, passphraseKey, seal } from './helpers/index'
import { SecretStoreError } from './types'
import type { Env, KeyMethod, Keystore, SealedRow, SecretHandoff, SecretKind, SecretStoreState } from './types'

interface KeyRow {
  keyId: string
  method: KeyMethod
  wrapped: Uint8Array | null
  salt: Uint8Array | null
  params: string
  createdAt: string
}

interface Unlocked {
  keyId: string
  key: Uint8Array
}

export const secretStoreDeps: { keystores: () => readonly Keystore[]; warn: (line: string) => void } = {
  keystores: () => OS_KEYSTORES,
  warn: (line) => process.stderr.write(`${line}\n`),
}

const unlocked = new Map<string, Unlocked>()
const warned = new Set<string>()
const answers = new Map<Keystore, boolean>()

export function secretStoreOn(env: Env = process.env): boolean {
  return !(env.NODE_ENV === 'test' && !env.LOG_STORE_KEYSTORE && !env.LOG_STORE_PASSPHRASE)
}

function passphraseOf(env: Env): string {
  return (env.LOG_STORE_PASSPHRASE ?? '').trim()
}

function keystoresOf(env: Env): Keystore[] {
  const named = (env.LOG_STORE_KEYSTORE ?? (env.NODE_ENV === 'test' ? 'none' : 'os')).trim().toLowerCase()
  if (named === 'none') return []
  return secretStoreDeps.keystores().filter((store) => {
    const known = answers.get(store)
    if (known !== undefined) return known
    let answer = false
    try {
      answer = store.available()
    } catch {}
    answers.set(store, answer)
    return answer
  })
}

function handleOf(env: Env): { handle: Database; path: string } {
  const path = defaultDbPath(env)
  return { handle: openDatabase(path), path }
}

function cacheKey(path: string, env: Env): string {
  const pass = passphraseOf(env)
  return `${path}\u0000${pass ? createHash('sha256').update(pass).digest('hex') : ''}\u0000${env.LOG_STORE_KEYSTORE ?? ''}`
}

function keyRows(handle: Database): KeyRow[] {
  return handle.prepare('SELECT keyId, method, wrapped, salt, params, createdAt FROM secretKeys ORDER BY createdAt DESC, keyId').all() as KeyRow[]
}

function recoverWith(row: KeyRow, env: Env, stores: Keystore[]): Uint8Array | null {
  try {
    if (row.method === 'passphrase') {
      const pass = passphraseOf(env)
      if (!pass || !row.salt || !row.wrapped) return null
      const params = JSON.parse(row.params) as { nonce?: string }
      if (!params.nonce) return null
      return open(passphraseKey(pass, row.salt), Buffer.from(params.nonce, 'hex'), row.wrapped, keyAad(row.keyId))
    }
    const store = stores.find((item) => item.method === row.method)
    const key = store?.recover(row.keyId, row.wrapped) ?? null
    return key && key.length === 32 ? key : null
  } catch {
    return null
  }
}

function wrapInto(handle: Database, keyId: string, key: Uint8Array, env: Env, stores: Keystore[], have: Set<KeyMethod>): void {
  const now = new Date().toISOString()
  const insert = handle.prepare('INSERT OR IGNORE INTO secretKeys (keyId, method, wrapped, salt, params, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
  for (const store of stores) {
    if (have.has(store.method)) continue
    const wrapped = store.protect(keyId, key)
    if (wrapped) insert.run(keyId, store.method, wrapped, null, '{}', now)
  }
  const pass = passphraseOf(env)
  if (pass && !have.has('passphrase')) {
    const salt = new Uint8Array(randomBytes(16))
    const sealed = seal(passphraseKey(pass, salt), key, keyAad(keyId))
    insert.run(keyId, 'passphrase', sealed.ciphertext, salt, JSON.stringify({ kdf: 'scrypt', ...SCRYPT_PARAMS, nonce: Buffer.from(sealed.nonce).toString('hex') }), now)
  }
}

function unlock(env: Env, create: boolean): Unlocked | null {
  if (!secretStoreOn(env)) return null
  const { handle, path } = handleOf(env)
  const cached = unlocked.get(cacheKey(path, env))
  if (cached && !create) return cached
  const stores = keystoresOf(env)
  if (cached) {
    const have = new Set(keyRows(handle).filter((row) => row.keyId === cached.keyId).map((row) => row.method))
    if (!have.size) unlocked.delete(cacheKey(path, env))
    else {
      if (stores.some((store) => !have.has(store.method)) || (passphraseOf(env) && !have.has('passphrase'))) wrapInto(handle, cached.keyId, cached.key, env, stores, have)
      return cached
    }
  }
  const found = (): Unlocked | null => {
    const rows = keyRows(handle)
    if (!rows.length) return null
    const keyId = rows[0].keyId
    const mine = rows.filter((row) => row.keyId === keyId)
    for (const row of mine) {
      const key = recoverWith(row, env, stores)
      if (key) return { keyId, key }
    }
    throw new SecretStoreError('secretStoreLocked', `log.db holds sealed secrets under key ${keyId}, but none of its holders (${mine.map((row) => row.method).join(', ')}) opened it here`)
  }
  const held = found()
  if (held) {
    if (create) {
      const have = new Set(keyRows(handle).filter((row) => row.keyId === held.keyId).map((row) => row.method))
      if (stores.some((store) => !have.has(store.method)) || (passphraseOf(env) && !have.has('passphrase'))) wrapInto(handle, held.keyId, held.key, env, stores, have)
    }
    unlocked.set(cacheKey(path, env), held)
    return held
  }
  if (!create || (!stores.length && !passphraseOf(env))) return null
  handle.exec('BEGIN IMMEDIATE')
  try {
    const raced = found()
    if (raced) {
      handle.exec('COMMIT')
      unlocked.set(cacheKey(path, env), raced)
      return raced
    }
    const made = { keyId: randomBytes(8).toString('hex'), key: new Uint8Array(randomBytes(32)) }
    wrapInto(handle, made.keyId, made.key, env, stores, new Set())
    if (!keyRows(handle).some((row) => row.keyId === made.keyId)) {
      handle.exec('ROLLBACK')
      return null
    }
    handle.exec('COMMIT')
    unlocked.set(cacheKey(path, env), made)
    return made
  } catch (error) {
    if (handle.inTransaction) handle.exec('ROLLBACK')
    throw error
  }
}

export function secretStoreReady(env: Env = process.env): boolean {
  if (!secretStoreOn(env)) return false
  try {
    const { handle } = handleOf(env)
    if (keyRows(handle).length) return unlock(env, false) !== null
    return keystoresOf(env).length > 0 || Boolean(passphraseOf(env))
  } catch {
    return false
  }
}

export function secretStoreState(env: Env = process.env): SecretStoreState {
  const on = secretStoreOn(env)
  const methods: KeyMethod[] = [...keystoresOf(env).map((store) => store.method), ...(passphraseOf(env) ? (['passphrase'] as const) : [])]
  if (!on) return { on, ready: false, methods, keyMethods: [], unlocks: false, reason: 'the store is off in tests unless LOG_STORE_KEYSTORE or LOG_STORE_PASSPHRASE is set' }
  const { handle } = handleOf(env)
  const rows = keyRows(handle)
  const keyMethods = rows.filter((row) => row.keyId === rows[0]?.keyId).map((row) => row.method)
  let unlocks = false
  let reason: string | null = null
  try {
    unlocks = rows.length ? unlock(env, false) !== null : false
  } catch (error) {
    reason = (error as Error).message
  }
  const ready = rows.length ? unlocks : methods.length > 0
  if (!ready && !reason) reason = 'no OS keystore was found and LOG_STORE_PASSPHRASE is not set, so secrets stay in plain files'
  return { on, ready, methods, keyMethods, unlocks, reason }
}

export function putSecret(ref: string, kind: SecretKind, value: string, env: Env = process.env): boolean {
  const key = unlock(env, true)
  if (!key) return false
  const sealed = seal(key.key, Buffer.from(value, 'utf8'), ref)
  handleOf(env).handle.prepare('INSERT INTO secrets (ref, kind, keyId, alg, nonce, ciphertext, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ref) DO UPDATE SET kind = excluded.kind, keyId = excluded.keyId, alg = excluded.alg, nonce = excluded.nonce, ciphertext = excluded.ciphertext, updatedAt = excluded.updatedAt').run(ref, kind, key.keyId, ALG, sealed.nonce, sealed.ciphertext, new Date().toISOString())
  return true
}

export function readSecret(ref: string, env: Env = process.env): string | null {
  if (!secretStoreOn(env)) return null
  const row = handleOf(env).handle.prepare('SELECT keyId, alg, nonce, ciphertext FROM secrets WHERE ref = ?').get(ref) as { keyId: string; alg: string; nonce: Uint8Array; ciphertext: Uint8Array } | null
  if (!row) return null
  const key = unlock(env, false)
  if (!key) throw new SecretStoreError('secretStoreLocked', `${ref} is sealed in log.db, but no key holder opened the store here`)
  if (key.keyId !== row.keyId || row.alg !== ALG) throw new SecretStoreError('secretStoreLocked', `${ref} was sealed under key ${row.keyId}, not the store's key ${key.keyId}`)
  try {
    return Buffer.from(open(key.key, row.nonce, row.ciphertext, ref)).toString('utf8')
  } catch {
    throw new SecretStoreError('secretTampered', `${ref} did not pass its authentication check, so it was not used`)
  }
}

export function sealVerified(ref: string, kind: SecretKind, value: string, env: Env = process.env): boolean {
  try {
    return putSecret(ref, kind, value, env) && readSecret(ref, env) === value
  } catch {
    return false
  }
}

export function dropSecret(ref: string, env: Env = process.env): void {
  if (!secretStoreOn(env)) return
  handleOf(env).handle.prepare('DELETE FROM secrets WHERE ref = ?').run(ref)
}

export function dropSecretsExcept(prefix: string, keep: readonly string[], env: Env = process.env): number {
  if (!secretStoreOn(env)) return 0
  const { handle } = handleOf(env)
  const held = handle.prepare("SELECT ref FROM secrets WHERE substr(ref, 1, length(?)) = ?").all(prefix, prefix) as { ref: string }[]
  const kept = new Set(keep)
  const gone = held.filter((row) => !kept.has(row.ref))
  const remove = handle.prepare('DELETE FROM secrets WHERE ref = ?')
  for (const row of gone) remove.run(row.ref)
  return gone.length
}

export function sealedSecrets(env: Env = process.env): SealedRow[] {
  if (!secretStoreOn(env)) return []
  return handleOf(env).handle.prepare('SELECT ref, kind, updatedAt FROM secrets ORDER BY ref').all() as SealedRow[]
}

export function warnPlainOnce(where: string, env: Env = process.env): void {
  if (!secretStoreOn(env) || warned.has(where)) return
  warned.add(where)
  let reason = 'no OS keystore was found and LOG_STORE_PASSPHRASE is not set'
  try {
    reason = secretStoreState(env).reason ?? reason
  } catch {}
  secretStoreDeps.warn(`log: ${where} still holds secrets in plain text: ${reason}. They are kept as they are, so nothing loses access; set LOG_STORE_PASSPHRASE or run where an OS keystore answers, and they are encrypted on their next use. \`log storage status\` shows what is sealed.`)
}

export function sessionHandoff(platform: string, account: string, value: unknown, env: Env = process.env): SecretHandoff | null {
  if (!secretStoreReady(env)) return null
  const ref = `session:${platform}:${account}`
  const text = JSON.stringify(value ?? {})
  try {
    if (readSecret(ref, env) === text) return { db: defaultDbPath(env), ref }
  } catch {}
  return sealVerified(ref, 'session', text, env) ? { db: defaultDbPath(env), ref } : null
}

export function forgetUnlockedKeys(): void {
  unlocked.clear()
  warned.clear()
  answers.clear()
}
