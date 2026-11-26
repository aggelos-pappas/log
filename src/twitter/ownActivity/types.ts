export const LOG_WRITE_ACTIONS: readonly string[] = ['reply', 'quote', 'post', 'like', 'repost', 'follow']

export const OWN_FRESH_MS = 10 * 60_000

export const OWN_FILE = 'ownActivity.json'

export type OwnKind = 'reply' | 'quote' | 'post' | 'repost' | 'like' | 'follow'

export interface OwnItem {
  kind: OwnKind
  id: string
  tweetId: string | null
  userId: string
  handle: string | null
  text: string
  at: string | null
  url?: string
}

export interface LogWrite {
  action: string
  tweetId: string | null
  target: string | null
  userId: string | null
}

export interface LogWrites {
  tweets: Set<string>
  users: Set<string>
}

export interface OwnSeen {
  platform: string
  account: string
  item: OwnItem
  seenAt: string
  seq: number
}

export interface OwnRefresh {
  ok: boolean
  fresh: boolean
  added: number
  refused?: string
}
