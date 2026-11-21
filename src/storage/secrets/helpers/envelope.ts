import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

export const ALG = 'aes256gcm'
export const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 }

export function seal(key: Uint8Array, plaintext: Uint8Array, aad: string): { nonce: Uint8Array; ciphertext: Uint8Array } {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const body = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
  return { nonce: new Uint8Array(nonce), ciphertext: new Uint8Array(body) }
}

export function open(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, aad: string): Uint8Array {
  const body = Buffer.from(ciphertext)
  if (body.length < 16) throw new Error('ciphertext too short')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce))
  decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(body.subarray(body.length - 16))
  return new Uint8Array(Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]))
}

export function passphraseKey(passphrase: string, salt: Uint8Array): Uint8Array {
  return new Uint8Array(scryptSync(passphrase.normalize('NFKC'), salt, 32, { ...SCRYPT_PARAMS, maxmem: 64 * 1024 * 1024 }))
}

export function keyAad(keyId: string): string {
  return `logCli:storeKey:${keyId}`
}
