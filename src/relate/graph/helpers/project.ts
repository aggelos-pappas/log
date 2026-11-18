import type { Database } from 'bun:sqlite'
import { TOKEN_MIN } from '../types'
import type { AccountRow, EngagedRow, IdentityRow, MemberRow, PostRow, Projection, RoomRow, SaidRow } from '../types'

const identityKeyOf = (platform: string, userId: string): string => `${platform}:${userId}`

const accountKeyOf = (platform: string, account: string): string => `${platform}:${account}`

const isSelf = (userId: string): boolean => userId.startsWith('self:')

const usable = (userId: string | null | undefined): userId is string => Boolean(userId) && !String(userId).startsWith('unknown:')

function readOnce<T>(handle: Database, work: () => T): T {
  if (handle.inTransaction) return work()
  handle.exec('BEGIN')
  try {
    return work()
  } finally {
    handle.exec('COMMIT')
  }
}

export function projectionOf(handle: Database): Projection {
  return readOnce(handle, () => {
    const throughSeq = (handle.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM events').get() as { seq: number }).seq
    const schemaVersion = (handle.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
    const accountRows = handle.prepare('SELECT platform, account, userId FROM accounts').all() as { platform: string; account: string; userId: string }[]
    const chatRows = handle.prepare('SELECT chatId, platform, account, conversationId, kind, name, lastMessageAtMs FROM chats').all() as { chatId: string; platform: string; account: string; conversationId: string; kind: string; name: string | null; lastMessageAtMs: number | null }[]
    const identityRows = handle.prepare('SELECT platform, userId, handle, displayName FROM identities').all() as { platform: string; userId: string; handle: string | null; displayName: string | null }[]
    const aliasRows = handle.prepare('SELECT platform, handle, userId FROM handleAliases').all() as { platform: string; handle: string; userId: string }[]
    const linkRows = handle.prepare('SELECT l.platform, l.userId, l.personId, p.name FROM identityLinks l LEFT JOIN persons p ON p.personId = l.personId WHERE l.revokedAt IS NULL').all() as { platform: string; userId: string; personId: string; name: string | null }[]
    const memberRows = handle.prepare('SELECT platform, roomId, userId, firstSeenAt, lastSeenAt FROM memberships').all() as { platform: string; roomId: string; userId: string; firstSeenAt: string; lastSeenAt: string }[]
    const saidRows = handle.prepare('SELECT m.chatId, m.senderPlatform AS platform, m.senderUserId AS userId, m.fromOwner, c.account, COUNT(*) AS messages, MAX(m.sentAtMs) AS lastAtMs FROM messages m JOIN chats c ON c.chatId = m.chatId GROUP BY m.chatId, m.senderPlatform, m.senderUserId, m.fromOwner').all() as { chatId: string; platform: string; userId: string; fromOwner: number; account: string; messages: number; lastAtMs: number | null }[]
    const interactionRows = handle.prepare('SELECT platform, account, kind, actorUserId, targetRef, MAX(targetText) AS targetText, COUNT(*) AS times, MAX(atMs) AS lastAtMs FROM interactions GROUP BY platform, account, kind, actorUserId, targetRef').all() as { platform: string; account: string; kind: string; actorUserId: string | null; targetRef: string | null; targetText: string | null; times: number; lastAtMs: number | null }[]

    const ownerIds = new Set(accountRows.map((a) => identityKeyOf(a.platform, a.userId)))
    const accounts: AccountRow[] = []
    const accountKeys = new Set<string>()
    const addAccount = (platform: string, account: string, userId: string | null) => {
      const key = accountKeyOf(platform, account)
      if (accountKeys.has(key)) return
      accountKeys.add(key)
      accounts.push({ key, platform, account, userId })
    }
    for (const a of accountRows) addAccount(a.platform, a.account, a.userId)
    for (const c of chatRows) addAccount(c.platform, c.account, null)

    const identities = new Map<string, IdentityRow>()
    const aliasesOf = new Map<string, Set<string>>()
    for (const a of aliasRows) {
      const key = identityKeyOf(a.platform, a.userId)
      aliasesOf.set(key, (aliasesOf.get(key) ?? new Set()).add(a.handle.replace(/^@/, '').toLowerCase()))
    }
    const touch = (platform: string, userId: string): string => {
      const key = identityKeyOf(platform, userId)
      if (!identities.has(key)) identities.set(key, { key, platform, userId, handle: null, handleLower: null, name: null, aliases: [], owner: ownerIds.has(key) || isSelf(userId), personId: null, personNames: [] })
      return key
    }
    for (const i of identityRows) {
      const key = touch(i.platform, i.userId)
      const row = identities.get(key)!
      row.handle = i.handle ? i.handle.replace(/^@/, '') : null
      row.handleLower = row.handle ? row.handle.toLowerCase() : null
      row.name = i.displayName
    }
    for (const l of linkRows) {
      const row = identities.get(identityKeyOf(l.platform, l.userId))
      if (!row) continue
      row.personId = l.personId
      row.personNames = (l.name ?? '').toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter((w) => w.length >= TOKEN_MIN)
    }

    const rooms: RoomRow[] = chatRows.map((c) => ({ key: c.chatId, platform: c.platform, account: c.account, accountKey: accountKeyOf(c.platform, c.account), conversationId: c.conversationId, kind: c.kind, name: c.name, lastAtMs: c.lastMessageAtMs }))
    const roomKeys = new Set(rooms.map((r) => r.key))

    const members: MemberRow[] = memberRows.filter((m) => usable(m.userId) && roomKeys.has(m.roomId)).map((m) => ({ identity: touch(m.platform, m.userId), room: m.roomId, firstSeenAt: m.firstSeenAt, lastSeenAt: m.lastSeenAt }))

    const saidAll: SaidRow[] = saidRows.filter((s) => roomKeys.has(s.chatId) && (s.fromOwner === 1 || usable(s.userId))).map((s) => ({ identity: s.fromOwner === 1 ? '' : touch(s.platform, s.userId), room: s.chatId, messages: s.messages, lastAtMs: s.lastAtMs, fromOwner: s.fromOwner === 1, accountKey: accountKeyOf(s.platform, s.account) }))
    const ownerSaid = new Map<string, SaidRow>()
    for (const s of saidAll.filter((x) => x.fromOwner)) {
      const held = ownerSaid.get(s.room)
      if (!held) ownerSaid.set(s.room, { ...s })
      else {
        held.messages += s.messages
        held.lastAtMs = Math.max(held.lastAtMs ?? 0, s.lastAtMs ?? 0) || null
      }
    }
    const said: SaidRow[] = [...saidAll.filter((x) => !x.fromOwner), ...ownerSaid.values()]

    const posts = new Map<string, PostRow>()
    const engaged: EngagedRow[] = []
    for (const i of interactionRows) {
      if (!usable(i.actorUserId)) continue
      const accountKey = accountKeyOf(i.platform, i.account)
      addAccount(i.platform, i.account, null)
      const identity = touch(i.platform, i.actorUserId)
      let post: string | null = null
      if (i.targetRef) {
        post = `${i.platform}:${i.account}:${i.targetRef}`
        const held = posts.get(post)
        if (!held) posts.set(post, { key: post, platform: i.platform, account: i.account, accountKey, ref: i.targetRef, text: i.targetText })
        else if (!held.text && i.targetText) held.text = i.targetText
      }
      engaged.push({ identity, post, accountKey, kind: i.kind, times: i.times, lastAtMs: i.lastAtMs })
    }

    for (const [key, set] of aliasesOf) {
      const row = identities.get(key)
      if (row) row.aliases = [...set]
    }
    const ownerHandles = new Set(accounts.map((a) => `${a.platform}:${a.account.replace(/^@/, '').toLowerCase()}`))
    for (const row of identities.values()) if (row.handleLower && ownerHandles.has(`${row.platform}:${row.handleLower}`)) row.owner = true
    return { throughSeq, schemaVersion, accounts, identities: [...identities.values()], rooms, members, said, posts: [...posts.values()], engaged }
  })
}
