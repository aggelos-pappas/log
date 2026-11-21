import type { Database } from 'bun:sqlite'
import { writeEngineStore } from '../../../storage/engineStore/index'

export const CONNECTED_NOW = Date.parse('2026-11-20T12:00:00Z')

const minutesAgo = (m: number): number => CONNECTED_NOW - m * 60_000

const iso = (ms: number): string => new Date(ms).toISOString()

export const CONNECTED_OWNER = { account: 'builderOwner', discordUserId: '9000000001', xUserId: '1000000001' }

export const MAKER_SERVER = { id: '7000000001', name: 'Maker Guild' }

export const BUILD_WEEK = 'chanBuildWeek'

const people = [
  { platform: 'discord', userId: '9100000001', handle: 'quill_maker', name: 'Quill Maker' },
  { platform: 'discord', userId: '9100000002', handle: 'oak_bench', name: 'Oak Bench' },
  { platform: 'discord', userId: '9100000003', handle: 'pine_cart', name: 'Pine Cart' },
  { platform: 'twitter', userId: '2100000001', handle: 'quillmaker', name: 'Quill M' },
]

let n = 0

function chat(on: Database, conversationId: string, kind: string, name: string | null, serverId: string | null, lastAtMs: number): string {
  const chatId = `discord:${CONNECTED_OWNER.account}:${conversationId}`
  on.prepare('INSERT INTO chats (chatId, platform, account, conversationId, kind, name, serverId, lastMessageAt, lastMessageAtMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(chatId, 'discord', CONNECTED_OWNER.account, conversationId, kind, name, serverId, iso(lastAtMs), lastAtMs)
  return chatId
}

function say(on: Database, chatId: string, userId: string, label: string | null, text: string, atMs: number, replyTo: string | null = null): string {
  n += 1
  const key = `connected:${n}`
  const owner = userId === CONNECTED_OWNER.discordUserId
  on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, sentAtMs, text, replyToKey, source, receivedAt) VALUES (?, ?, 'discord', ?, ?, ?, ?, ?, ?, ?, 'live', ?)").run(key, chatId, userId, label, owner ? 1 : 0, iso(atMs), atMs, text, replyTo, iso(atMs))
  if (!owner) on.prepare('INSERT OR IGNORE INTO memberships (platform, roomId, userId, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)').run('discord', chatId, userId, iso(atMs), iso(atMs))
  return key
}

export function seedConnectedWorld(on: Database): void {
  const now = iso(CONNECTED_NOW)
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('discord', CONNECTED_OWNER.account, CONNECTED_OWNER.discordUserId, now)
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('twitter', CONNECTED_OWNER.account, CONNECTED_OWNER.xUserId, now)
  for (const p of people) on.prepare('INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?, ?)').run(p.platform, p.userId, p.handle, p.name, now, now)
  on.prepare('INSERT INTO persons (personId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run('personQuill', 'Quill Maker', now, now)
  for (const [platform, userId] of [['discord', '9100000001'], ['twitter', '2100000001']]) on.prepare("INSERT INTO identityLinks (personId, platform, userId, evidence, linkedBy, linkedAt, linkedEventId) VALUES ('personQuill', ?, ?, 'same name and avatar', 'owner', ?, ?)").run(platform, userId, now, `link:${userId}`)
  writeEngineStore('discordServers', CONNECTED_OWNER.account, { savedAt: CONNECTED_NOW / 1000, from: 'gateway', channels: [
    { id: BUILD_WEEK, kind: 'channel', name: `${MAKER_SERVER.name} #buildWeek`, members: [], server: MAKER_SERVER.name, serverId: MAKER_SERVER.id },
    { id: 'chanGeneral', kind: 'channel', name: `${MAKER_SERVER.name} #general`, members: [], server: MAKER_SERVER.name, serverId: MAKER_SERVER.id },
  ] }, on, CONNECTED_NOW)

  const buildWeek = chat(on, BUILD_WEEK, 'dm', 'Oak Bench', MAKER_SERVER.id, minutesAgo(5))
  const general = chat(on, 'chanGeneral', 'channel', null, MAKER_SERVER.id, minutesAgo(50))
  const unlisted = chat(on, 'chanUnlisted', 'dm', 'Pine Cart', '7000000002', minutesAgo(70))
  const oakDm = chat(on, 'dmOak', 'dm', 'Oak Bench', null, minutesAgo(30))

  const ask = say(on, buildWeek, CONNECTED_OWNER.discordUserId, null, 'who is shipping a tool this week?', minutesAgo(60))
  say(on, buildWeek, '9100000001', 'Quill Maker', 'me, a graph of who knows whom', minutesAgo(55), ask)
  const oak = say(on, buildWeek, '9100000002', 'Oak Bench', '<@9000000001> nice question, I am on the bench', minutesAgo(40))
  say(on, buildWeek, '9100000001', 'Quill Maker', 'same here oak', minutesAgo(20), oak)
  say(on, buildWeek, '9100000003', 'Pine Cart', '@quill_maker send me the repo', minutesAgo(5))
  say(on, general, '9100000002', 'Oak Bench', 'morning all', minutesAgo(50))
  say(on, unlisted, '9100000003', 'Pine Cart', 'anyone here?', minutesAgo(70))
  say(on, oakDm, '9100000002', 'Oak Bench', 'saw you in build week', minutesAgo(31))
  say(on, oakDm, CONNECTED_OWNER.discordUserId, null, 'yes, come say hi', minutesAgo(30))

  on.prepare("INSERT INTO events (eventId, platform, account, conversationId, type, receivedAt, appendedAt, typedAt) VALUES ('connected:last', 'discord', ?, ?, 'message', ?, ?, ?)").run(CONNECTED_OWNER.account, BUILD_WEEK, iso(minutesAgo(5)), iso(minutesAgo(5)), minutesAgo(5))
}
