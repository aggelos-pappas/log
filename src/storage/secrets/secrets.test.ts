import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../schema/client'
import { dpapiKeystore } from './helpers/index'
import { forgetUnlockedKeys, putSecret, readSecret, sealedSecrets, secretStoreDeps, secretStoreReady, sessionHandoff } from './index'
import type { Keystore } from './types'
import { plainLocalAccounts, readLocalAccounts, writeLocalAccounts } from '../../twenty/graphql/index'
import { loadUserEnv, parseEnvFile } from '../../config/userEnv/index'
import { saveProviderCredentials, savedCredential } from '../../auth/credentials/client'
import { secretStatus } from '../../cli/storage/index'

const NAMES = ['LOG_DB', 'LOG_STORE_PASSPHRASE', 'LOG_STORE_KEYSTORE', 'LOG_LOCAL_ACCOUNTS', 'LOG_USER_ENV'] as const
const saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]))
const root = mkdtempSync(join(tmpdir(), 'secretStore'))
const dbs: string[] = []
const realKeystores = secretStoreDeps.keystores
const realWarn = secretStoreDeps.warn
let warnings: string[] = []
let n = 0
let dir = ''

const COOKIE = 'authTokenValueForTests0123456789abcdef'

function fresh(): void {
  n += 1
  dir = join(root, `case${n}`)
  process.env.LOG_DB = join(dir, 'log.db')
  dbs.push(process.env.LOG_DB)
  process.env.LOG_LOCAL_ACCOUNTS = join(dir, 'localAccounts.json')
  process.env.LOG_USER_ENV = join(dir, '.env')
  process.env.LOG_STORE_KEYSTORE = 'none'
  process.env.LOG_STORE_PASSPHRASE = 'correct horse battery staple'
  forgetUnlockedKeys()
}

function plainFile(): void {
  openDatabase(process.env.LOG_DB!)
  writeFileSync(process.env.LOG_LOCAL_ACCOUNTS!, JSON.stringify({ socialAccounts: [{ id: 'local:twitter:xAccount', platform: 'TWITTER', accountName: 'xAccount', cookies: { auth_token: COOKIE, ct0: 'fakeCt' }, password: 'hunter2hunter2', sessionState: 'loggedIn' }] }), { mode: 0o600 })
}

beforeEach(() => {
  warnings = []
  secretStoreDeps.warn = (line) => warnings.push(line)
  fresh()
})

afterEach(() => {
  secretStoreDeps.keystores = realKeystores
  secretStoreDeps.warn = realWarn
  for (const name of NAMES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
  forgetUnlockedKeys()
})

afterAll(() => {
  for (const path of dbs) if (existsSync(path)) openDatabase(path).close()
  Bun.gc(true)
  rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

describe('the encrypted secret store', () => {
  test('a sealed secret reads back, and its plaintext is nowhere in log.db', () => {
    expect(putSecret('env:SOME_API_KEY', 'apiKey', 'plaintextNeverOnDisk')).toBe(true)
    expect(readSecret('env:SOME_API_KEY')).toBe('plaintextNeverOnDisk')
    openDatabase(process.env.LOG_DB!).exec('PRAGMA wal_checkpoint(TRUNCATE)')
    expect(readFileSync(process.env.LOG_DB!).includes(Buffer.from('plaintextNeverOnDisk'))).toBe(false)
    expect(readSecret('env:MISSING')).toBeNull()
  })

  test('a changed ciphertext or a row moved to another ref fails its check and is not used', () => {
    putSecret('session:twitter:xAccount', 'session', '{"cookies":{}}')
    const handle = openDatabase(process.env.LOG_DB!)
    handle.exec("INSERT INTO secrets (ref, kind, keyId, alg, nonce, ciphertext, updatedAt) SELECT 'session:twitter:other', kind, keyId, alg, nonce, ciphertext, updatedAt FROM secrets WHERE ref = 'session:twitter:xAccount'")
    expect(() => readSecret('session:twitter:other')).toThrow(expect.objectContaining({ code: 'secretTampered' }))
    const row = handle.prepare("SELECT ciphertext FROM secrets WHERE ref = 'session:twitter:xAccount'").get() as { ciphertext: Uint8Array }
    const flipped = new Uint8Array(row.ciphertext)
    flipped[0] ^= 1
    handle.prepare("UPDATE secrets SET ciphertext = ? WHERE ref = 'session:twitter:xAccount'").run(flipped)
    expect(() => readSecret('session:twitter:xAccount')).toThrow(expect.objectContaining({ code: 'secretTampered' }))
  })

  test('the wrong passphrase leaves the store locked with a coded error, never an empty read', () => {
    putSecret('env:SOME_API_KEY', 'apiKey', 'value')
    forgetUnlockedKeys()
    process.env.LOG_STORE_PASSPHRASE = 'not the passphrase'
    expect(secretStoreReady()).toBe(false)
    expect(() => readSecret('env:SOME_API_KEY')).toThrow(expect.objectContaining({ code: 'secretStoreLocked' }))
  })

  test('an OS keystore holds the key with no passphrase set', () => {
    delete process.env.LOG_STORE_PASSPHRASE
    process.env.LOG_STORE_KEYSTORE = 'os'
    const vault = new Map<string, Uint8Array>()
    const fake: Keystore = { method: 'keychain', available: () => true, protect: (keyId, key) => (vault.set(keyId, key), new Uint8Array(0)), recover: (keyId) => vault.get(keyId) ?? null }
    secretStoreDeps.keystores = () => [fake]
    expect(putSecret('env:SOME_API_KEY', 'apiKey', 'held by the os')).toBe(true)
    forgetUnlockedKeys()
    secretStoreDeps.keystores = () => [fake]
    expect(readSecret('env:SOME_API_KEY')).toBe('held by the os')
    const methods = openDatabase(process.env.LOG_DB!).prepare('SELECT method FROM secretKeys').all() as { method: string }[]
    expect(methods.map((row) => row.method)).toEqual(['keychain'])
  })

  test.skipIf(process.platform !== 'win32')('DPAPI wraps and unwraps a key for this Windows user', () => {
    const key = crypto.getRandomValues(new Uint8Array(32))
    const wrapped = dpapiKeystore.protect('k', key)
    expect(wrapped && wrapped.length > 32).toBe(true)
    expect(Buffer.from(dpapiKeystore.recover('k', wrapped)!).equals(Buffer.from(key))).toBe(true)
  })
})

describe('account secrets are sealed on access', () => {
  test('a plain localAccounts file is sealed on read, and the plain copy goes only after the read-back matched', () => {
    plainFile()
    const rows = readLocalAccounts()
    expect((rows[0].cookies as Record<string, string>).auth_token).toBe(COOKIE)
    expect(rows[0].password).toBe('hunter2hunter2')
    const disk = readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')
    expect(disk).not.toContain(COOKIE)
    expect(disk).not.toContain('hunter2hunter2')
    expect(disk).toContain('loggedIn')
    expect(sealedSecrets().map((row) => row.kind)).toEqual(['account'])
    expect(readLocalAccounts()[0].cookies).toEqual(rows[0].cookies)
    expect(plainLocalAccounts()).toEqual({ rows: 1, sealed: 1, plain: 0, fields: [] })
  })

  test('when the sealed copy does not read back the same, the plain file is kept as it was', () => {
    plainFile()
    openDatabase(process.env.LOG_DB!).exec("CREATE TRIGGER spoilSeal AFTER INSERT ON secrets BEGIN UPDATE secrets SET ciphertext = zeroblob(length(NEW.ciphertext)) WHERE ref = NEW.ref; END")
    const before = readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')
    const rows = readLocalAccounts()
    expect((rows[0].cookies as Record<string, string>).auth_token).toBe(COOKIE)
    expect(readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')).toBe(before)
  })

  test('with no OS keystore and no passphrase the plain file is kept and the gap is named once', () => {
    delete process.env.LOG_STORE_PASSPHRASE
    plainFile()
    const before = readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')
    expect((readLocalAccounts()[0].cookies as Record<string, string>).auth_token).toBe(COOKIE)
    readLocalAccounts()
    expect(readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')).toBe(before)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('LOG_STORE_PASSPHRASE')
    expect(warnings[0]).toContain('plain text')
    expect(secretStatus().plain[0]).toMatchObject({ what: 'accounts', count: 1, fields: ['cookies', 'password'] })
  })

  test('a write goes straight to the store, and a removed account takes its sealed row with it', () => {
    openDatabase(process.env.LOG_DB!)
    writeLocalAccounts([{ id: 'local:slack:slackAccount', platform: 'SLACK', accountName: 'slackAccount', cookies: { d: 'slackSessionSealedOnWrite' } }, { id: 'local:discord:discordAccount', platform: 'DISCORD', accountName: 'discordAccount', storageOrigins: { token: 'discordTokenSealed0123456789' } }])
    const disk = readFileSync(process.env.LOG_LOCAL_ACCOUNTS!, 'utf8')
    expect(disk).not.toContain('slackSessionSealedOnWrite')
    expect(disk).not.toContain('discordTokenSealed')
    expect(sealedSecrets().length).toBe(2)
    const rows = readLocalAccounts()
    expect(rows.find((row) => row.accountName === 'discordAccount')!.storageOrigins).toEqual({ token: 'discordTokenSealed0123456789' })
    writeLocalAccounts(rows.filter((row) => row.accountName === 'slackAccount'))
    expect(sealedSecrets().length).toBe(1)
  })
})

describe('provider keys are sealed on access', () => {
  test('a plain key in .env is sealed on load, still reaches the process, and leaves the file', () => {
    openDatabase(process.env.LOG_DB!)
    writeFileSync(process.env.LOG_USER_ENV!, 'LOG_OUTBOX="outboxFolder"\nPARALLEL_API_KEY="plainOnDiskValue"\n')
    const env: Record<string, string | undefined> = { ...process.env, NODE_ENV: 'test' }
    delete env.PARALLEL_API_KEY
    loadUserEnv(env)
    expect(env.PARALLEL_API_KEY as string | undefined).toBe('plainOnDiskValue')
    const values = parseEnvFile(readFileSync(process.env.LOG_USER_ENV!, 'utf8'))
    expect(values.PARALLEL_API_KEY).toBeUndefined()
    expect(values.LOG_OUTBOX).toBe("outboxFolder")
    expect(values.LOG_SEALED_KEYS).toBe('PARALLEL_API_KEY')
    const next: Record<string, string | undefined> = { ...process.env, NODE_ENV: 'test' }
    delete next.PARALLEL_API_KEY
    loadUserEnv(next)
    expect(next.PARALLEL_API_KEY as string | undefined).toBe('plainOnDiskValue')
  })

  test('credentials save seals the secret field and keeps the public one in .env', () => {
    openDatabase(process.env.LOG_DB!)
    const env: Record<string, string | undefined> = { ...process.env }
    expect(saveProviderCredentials('adsPower', { ADSPOWER_HOST: 'http://127.0.0.1:50325', ADSPOWER_API_KEY: 'adsKeySealed0123' }, env)).toEqual({ saved: true, changed: true })
    const text = readFileSync(process.env.LOG_USER_ENV!, 'utf8')
    expect(text).not.toContain('adsKeySealed0123')
    expect(text).toContain('ADSPOWER_HOST="http://127.0.0.1:50325"')
    expect(savedCredential('ADSPOWER_API_KEY', env)).toBe('adsKeySealed0123')
    expect(saveProviderCredentials('adsPower', { ADSPOWER_API_KEY: 'adsKeySealed0123' }, env)).toEqual({ saved: true, changed: false })
  })
})

describe('Python opens what Bun sealed', () => {
  test.skipIf(!process.env.LOG_PYTHON)('load_session reads a sealed session handoff and put_secret writes one Bun reads', () => {
    openDatabase(process.env.LOG_DB!)
    const handoff = sessionHandoff('twitter', 'xAccount', { cookies: { auth_token: COOKIE } })
    expect(handoff).not.toBeNull()
    const python = join(import.meta.dir, '..', '..', '..', 'python')
    const script = [
      'import json, sys',
      `sys.path.insert(0, ${JSON.stringify(python)})`,
      'import secretStore',
      'cookies, storage = secretStore.load_session({"cookiesRef": json.loads(sys.argv[1])})',
      'secretStore.put_secret("session:twitter:back", "session", json.dumps({"seen": cookies["auth_token"]}))',
      'try:',
      '    secretStore.open_secret("session:twitter:missing") is None or sys.exit(3)',
      'except secretStore.SecretStoreError:',
      '    sys.exit(4)',
      'print(cookies["auth_token"])',
    ].join('\n')
    const run = spawnSync(process.env.LOG_PYTHON!, ['-c', script, JSON.stringify(handoff)], { encoding: 'utf8', env: { ...process.env }, windowsHide: true })
    expect(run.stderr).toBe('')
    expect(run.stdout.trim()).toBe(COOKIE)
    expect(JSON.parse(readSecret('session:twitter:back')!)).toEqual({ seen: COOKIE })
  })
})
