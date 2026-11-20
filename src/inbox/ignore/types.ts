export interface IgnoreEntry {
  platform: string
  server?: string
  chat?: string
  by: string
  at: string
}

export interface IgnoreList {
  entries: IgnoreEntry[]
}

export type ServerOf = (platform: string, account: string, conversationId: string) => string | null
