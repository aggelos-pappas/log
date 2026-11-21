export type KeyMethod = 'dpapi' | 'keychain' | 'secretService' | 'passphrase' | 'recovery'

export type SecretKind = 'account' | 'session' | 'apiKey'

export type SecretStoreCode = 'secretStoreLocked' | 'secretTampered'

export type Env = Record<string, string | undefined>

export interface Keystore {
  method: Exclude<KeyMethod, 'passphrase' | 'recovery'>
  available(): boolean
  protect(keyId: string, key: Uint8Array): Uint8Array | null
  recover(keyId: string, wrapped: Uint8Array | null): Uint8Array | null
}

export interface SecretStoreState {
  on: boolean
  ready: boolean
  methods: KeyMethod[]
  keyMethods: KeyMethod[]
  unlocks: boolean
  recovery: boolean
  reason: string | null
}

export interface SealedRow {
  ref: string
  kind: SecretKind
  updatedAt: string
}

export interface SecretHandoff {
  db: string
  ref: string
}

export class SecretStoreError extends Error {
  readonly code: SecretStoreCode

  constructor(code: SecretStoreCode, message: string) {
    super(message)
    this.name = 'SecretStoreError'
    this.code = code
  }
}
