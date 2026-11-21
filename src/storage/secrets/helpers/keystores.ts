import { spawnSync } from 'node:child_process'
import type { Keystore } from '../types'

const SERVICE = 'logCli'
const TIMEOUT_MS = 10_000

function account(keyId: string): string {
  return `storeKey:${keyId}`
}

function run(command: string, args: string[], input?: string): { ok: boolean; stdout: string } {
  const out = spawnSync(command, args, { encoding: 'utf8', input, timeout: TIMEOUT_MS, killSignal: 'SIGKILL', windowsHide: true, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] })
  return { ok: !out.error && out.status === 0, stdout: (out.stdout || '').trim() }
}

function onPath(command: string): boolean {
  return run(process.platform === 'win32' ? 'where' : 'which', [command]).ok
}

function fromHex(text: string): Uint8Array | null {
  return /^[0-9a-f]{64}$/i.test(text) ? new Uint8Array(Buffer.from(text, 'hex')) : null
}

type DpapiCall = 'CryptProtectData' | 'CryptUnprotectData'

let dpapiLib: { call(name: DpapiCall, data: Uint8Array): Uint8Array | null } | null | undefined

function dpapi(): { call(name: DpapiCall, data: Uint8Array): Uint8Array | null } | null {
  if (dpapiLib !== undefined) return dpapiLib
  try {
    const ffi = require('bun:ffi') as typeof import('bun:ffi')
    const { FFIType, dlopen, ptr, toArrayBuffer } = ffi
    const shape = { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.ptr], returns: FFIType.i32 } as const
    const crypt = dlopen('crypt32.dll', { CryptProtectData: shape, CryptUnprotectData: shape })
    const kernel = dlopen('kernel32.dll', { LocalFree: { args: [FFIType.ptr], returns: FFIType.ptr } })
    dpapiLib = {
      call(name, data) {
        const held = new Uint8Array(data)
        const input = new Uint8Array(16)
        const view = new DataView(input.buffer)
        view.setUint32(0, held.length, true)
        view.setBigUint64(8, BigInt(ptr(held)), true)
        const output = new Uint8Array(16)
        if (!crypt.symbols[name](ptr(input), null, null, null, null, 1, ptr(output))) return null
        const read = new DataView(output.buffer)
        const size = read.getUint32(0, true)
        const at = Number(read.getBigUint64(8, true))
        const copy = new Uint8Array(toArrayBuffer(at as never, 0, size)).slice()
        kernel.symbols.LocalFree(at as never)
        return copy
      },
    }
  } catch {
    dpapiLib = null
  }
  return dpapiLib
}

export const dpapiKeystore: Keystore = {
  method: 'dpapi',
  available: () => process.platform === 'win32' && dpapi() !== null,
  protect: (_keyId, key) => dpapi()?.call('CryptProtectData', key) ?? null,
  recover: (_keyId, wrapped) => (wrapped ? dpapi()?.call('CryptUnprotectData', wrapped) ?? null : null),
}

export const keychainKeystore: Keystore = {
  method: 'keychain',
  available: () => process.platform === 'darwin' && onPath('security'),
  protect(keyId, key) {
    const stored = run('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', account(keyId), '-w', Buffer.from(key).toString('hex')])
    return stored.ok ? new Uint8Array(0) : null
  },
  recover(keyId) {
    const found = run('security', ['find-generic-password', '-s', SERVICE, '-a', account(keyId), '-w'])
    return found.ok ? fromHex(found.stdout) : null
  },
}

export const secretServiceKeystore: Keystore = {
  method: 'secretService',
  available: () => process.platform === 'linux' && Boolean(process.env.DBUS_SESSION_BUS_ADDRESS) && onPath('secret-tool'),
  protect(keyId, key) {
    const stored = run('secret-tool', ['store', '--label', 'log store key', 'service', SERVICE, 'account', account(keyId)], Buffer.from(key).toString('hex'))
    return stored.ok ? new Uint8Array(0) : null
  },
  recover(keyId) {
    const found = run('secret-tool', ['lookup', 'service', SERVICE, 'account', account(keyId)])
    return found.ok ? fromHex(found.stdout) : null
  },
}

export const OS_KEYSTORES: readonly Keystore[] = [dpapiKeystore, keychainKeystore, secretServiceKeystore]
