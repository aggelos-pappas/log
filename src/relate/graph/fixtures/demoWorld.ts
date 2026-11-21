import type { Database } from 'bun:sqlite'

export const DEMO_NOW = Date.parse('2026-11-17T12:00:00Z')

const hoursAgo = (h: number): number => DEMO_NOW - h * 3_600_000

const iso = (ms: number): string => new Date(ms).toISOString()

interface DemoPerson {
  platform: string
  userId: string
  handle: string
  name: string
}

export const DEMO_OWNER = { xAccount: 'builderOwner', xUserId: '1000000001', discordAccount: 'builderOwner', discordUserId: '9000000001' }

export const DEMO_PEOPLE: readonly DemoPerson[] = [
  { platform: 'twitter', userId: '2000000001', handle: 'ada_codes', name: 'Ada' },
  { platform: 'twitter', userId: '2000000002', handle: 'grace_ships', name: 'Grace' },
  { platform: 'twitter', userId: '2000000003', handle: 'linus_k', name: 'Linus' },
  { platform: 'twitter', userId: '@linus_k', handle: 'linus_k', name: 'Linus' },
  { platform: 'twitter', userId: '2000000004', handle: 'tom_builds', name: 'Tom' },
  { platform: 'twitter', userId: '2000000005', handle: 'maya_ml', name: 'Maya' },
  { platform: 'discord', userId: '9000000002', handle: 'grace_ships', name: 'Grace' },
  { platform: 'discord', userId: '9000000003', handle: 'linus_k', name: 'Linus' },
  { platform: 'discord', userId: '9000000004', handle: 'sam_rust', name: 'Sam' },
]

let messageNo = 0

function chat(on: Database, platform: string, account: string, conversationId: string, kind: string, name: string | null, lastAtMs: number): string {
  const chatId = `${platform}:${account}:${conversationId}`
  on.prepare('INSERT INTO chats (chatId, platform, account, conversationId, kind, name, lastMessageAt, lastMessageAtMs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(chatId, platform, account, conversationId, kind, name, iso(lastAtMs), lastAtMs)
  return chatId
}

function member(on: Database, platform: string, chatId: string, userId: string, atMs: number): void {
  on.prepare('INSERT OR IGNORE INTO memberships (platform, roomId, userId, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)').run(platform, chatId, userId, iso(atMs), iso(atMs))
}

function say(on: Database, platform: string, chatId: string, userId: string, fromOwner: boolean, text: string, atMs: number): void {
  messageNo += 1
  on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)").run(`demo:${messageNo}`, chatId, platform, userId, fromOwner ? 1 : 0, iso(atMs), atMs, text, iso(atMs))
  if (!fromOwner) member(on, platform, chatId, userId, atMs)
}

function engage(on: Database, account: string, kind: string, actorUserId: string, targetRef: string | null, targetText: string | null, atMs: number): void {
  messageNo += 1
  on.prepare("INSERT INTO interactions (interactionKey, platform, account, kind, actorUserId, targetRef, targetText, at, atMs) VALUES (?, 'twitter', ?, ?, ?, ?, ?, ?, ?)").run(`demo:i${messageNo}`, account, kind, actorUserId, targetRef, targetText, iso(atMs), atMs)
}

export function seedDemoWorld(on: Database): void {
  const now = iso(DEMO_NOW)
  const x = DEMO_OWNER.xAccount
  const d = DEMO_OWNER.discordAccount
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('twitter', x, DEMO_OWNER.xUserId, now)
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('discord', d, DEMO_OWNER.discordUserId, now)
  for (const p of DEMO_PEOPLE) on.prepare('INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?, ?)').run(p.platform, p.userId, p.handle, p.name, now, now)
  on.prepare('INSERT INTO handleAliases (platform, handle, userId, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)').run('twitter', 'linus_k', '2000000003', now, now)

  const adaDm = chat(on, 'twitter', x, `${DEMO_OWNER.xUserId}-2000000001`, 'dm', null, hoursAgo(5))
  say(on, 'twitter', adaDm, '2000000001', false, 'loved the launch, how does the inbox stay current?', hoursAgo(30))
  say(on, 'twitter', adaDm, DEMO_OWNER.xUserId, true, 'every account has one owner process feeding log.db', hoursAgo(29))
  say(on, 'twitter', adaDm, '2000000001', false, 'can you intro me to linus? he did the graph engine talk', hoursAgo(5))

  const graceDm = chat(on, 'twitter', x, `${DEMO_OWNER.xUserId}-2000000002`, 'dm', null, hoursAgo(50))
  say(on, 'twitter', graceDm, '2000000002', false, 'want to pair on the relate hackathon?', hoursAgo(52))
  say(on, 'twitter', graceDm, DEMO_OWNER.xUserId, true, 'yes, next week works', hoursAgo(50))

  const tomDm = chat(on, 'twitter', x, `${DEMO_OWNER.xUserId}-2000000004`, 'dm', null, hoursAgo(200))
  say(on, 'twitter', tomDm, '2000000004', false, 'is there a hosted version?', hoursAgo(200))

  const builders = chat(on, 'twitter', x, 'groupAgentBuilders', 'group', 'Agent Builders', hoursAgo(3))
  say(on, 'twitter', builders, '2000000002', false, 'shipping the graph demo friday', hoursAgo(4))
  say(on, 'twitter', builders, '2000000003', false, 'relate opens in under a millisecond here', hoursAgo(3))
  say(on, 'twitter', builders, '2000000001', false, 'nice', hoursAgo(3))
  say(on, 'twitter', builders, DEMO_OWNER.xUserId, true, 'the hook injects it before every prompt', hoursAgo(3))

  const rustGraphs = chat(on, 'discord', d, 'channelRustGraphs', 'channel', 'Graph Club #rust-graphs', hoursAgo(10))
  say(on, 'discord', rustGraphs, '9000000002', false, 'cypher 25 quantified paths are great', hoursAgo(12))
  say(on, 'discord', rustGraphs, '9000000003', false, 'quantified paths landed in relate 1.0', hoursAgo(11))
  say(on, 'discord', rustGraphs, '9000000004', false, 'benchmarks soon', hoursAgo(10))
  const samDm = chat(on, 'discord', d, 'dmSam', 'dm', null, hoursAgo(20))
  say(on, 'discord', samDm, '9000000004', false, 'saw your log demo', hoursAgo(21))
  say(on, 'discord', samDm, DEMO_OWNER.discordUserId, true, 'thanks! graph build is next', hoursAgo(20))
  const graceDiscordDm = chat(on, 'discord', d, 'dmGrace', 'dm', null, hoursAgo(48))
  say(on, 'discord', graceDiscordDm, '9000000002', false, 'pinging here too', hoursAgo(48))

  const launch = 'introducing log: your agent reads every inbox from one local database'
  const graphs = 'graphs beat vectors for who-knows-whom questions'
  engage(on, x, 'like', '2000000001', 'postLaunch', launch, hoursAgo(70))
  engage(on, x, 'reply', '2000000001', 'postLaunch', launch, hoursAgo(69))
  engage(on, x, 'like', '2000000003', 'postLaunch', launch, hoursAgo(60))
  engage(on, x, 'like', '@linus_k', 'postGraphs', graphs, hoursAgo(9))
  engage(on, x, 'follow', '2000000003', null, null, hoursAgo(8))
  engage(on, x, 'repost', '2000000005', 'postLaunch', launch, hoursAgo(65))
  engage(on, x, 'like', '2000000005', 'postGraphs', graphs, hoursAgo(9))
  engage(on, x, 'like', '2000000004', 'postGraphs', graphs, hoursAgo(7))

  on.prepare("INSERT INTO events (eventId, platform, account, conversationId, type, receivedAt, appendedAt, typedAt) VALUES ('demo:last', 'twitter', ?, ?, 'message', ?, ?, ?)").run(x, `${DEMO_OWNER.xUserId}-2000000001`, iso(hoursAgo(5)), iso(hoursAgo(5)), hoursAgo(5))
}
