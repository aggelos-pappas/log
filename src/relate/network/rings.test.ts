import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from 'bun:sqlite'
import { insertEventRow } from '../../storage/platform/index'
import type { EventInsert } from '../../storage/platform/index'
import { openDatabase } from '../../storage/schema/index'
import { networkCommand } from '../../cli/network/index'
import { ensureRings, networkRings, rebuildRings } from './index'

const root = mkdtempSync(join(tmpdir(), 'networkRings-'))
const dbPath = join(root, 'log.db')
const savedDb = process.env.LOG_DB

afterEach(() => {
  if (savedDb === undefined) delete process.env.LOG_DB
  else process.env.LOG_DB = savedDb
})

afterAll(() => {
  openDatabase(dbPath).close()
  Bun.gc(true)
  rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

let minute = 0
const at = (): string => new Date(Date.parse('2026-11-20T10:00:00Z') + 60_000 * minute++).toISOString()

function notify(handle: Database, userId: string, name: string, kind: string): void {
  const when = at()
  insertEventRow(handle, { platform: 'twitter', account: 'xAccount', conversationId: '', type: 'notification', with: name, text: `${name} ${kind}`, box: '', payload: { userId, handle: name, kind, key: `${kind}${userId}${minute}`, postId: kind === 'follow' ? null : 'postOne', at: when }, sourceAt: when, receivedAt: when, source: 'live' })
}

function say(handle: Database, conversationId: string, box: string, senderId: string, name: string, id: string, text: string, replyTo: string | null = null): void {
  const when = at()
  const event: EventInsert = { platform: 'discord', account: 'discordAccount', conversationId, type: 'message', with: name, text, box, payload: { id, senderId, ...(replyTo ? { replyTo } : {}) }, sourceAt: when, receivedAt: when, source: 'live' }
  insertEventRow(handle, event)
}

const ringOf = (handle: Database, platform: string, userId: string) => handle.prepare('SELECT ring, reason, follows, via FROM networkRings WHERE platform = ? AND userId = ?').get(platform, userId)

describe('live rings from the events the watchers store, with no imported network', () => {
  const handle = openDatabase(dbPath)
  handle.prepare("INSERT INTO accounts (platform, account, userId, learnedAt) VALUES ('twitter', 'xAccount', '100', '2026-11-20T00:00:00Z'), ('discord', 'discordAccount', '9000000001', '2026-11-20T00:00:00Z')").run()
  ensureRings(handle)

  test('a new follower is ring 3, and their reply later moves them to ring 1 and keeps that they follow', () => {
    notify(handle, '201', 'grace_ships', 'follow')
    expect(ringOf(handle, 'twitter', '201')).toEqual({ ring: 3, reason: 'follow', follows: 1, via: null })
    notify(handle, '202', 'ada_codes', 'like')
    expect(ringOf(handle, 'twitter', '202')).toEqual({ ring: 1, reason: 'like', follows: 0, via: null })
    notify(handle, '201', 'grace_ships', 'reply')
    expect(ringOf(handle, 'twitter', '201')).toEqual({ ring: 1, reason: 'reply', follows: 1, via: null })
  })

  test('a DM from someone is ring 1, and replying to them in a group puts the replier in ring 2', () => {
    say(handle, 'dmSam', 'dm', '901', 'sam_rust', 'd1', 'saw your demo')
    expect(ringOf(handle, 'discord', '901')).toEqual({ ring: 1, reason: 'dm', follows: 0, via: null })
    say(handle, 'groupOne', 'group', '901', 'sam_rust', 'g1', 'shipping friday')
    say(handle, 'groupOne', 'group', '905', 'maya_ml', 'g2', 'nice one', 'g1')
    expect(ringOf(handle, 'discord', '905')).toEqual({ ring: 2, reason: 'talksTo', follows: 0, via: '901' })
  })

  test('someone who talked to a person before that person engaged the owner moves to ring 2 when they do', () => {
    say(handle, 'groupOne', 'group', '903', 'linus_k', 'g3', 'graph engines are fun')
    say(handle, 'groupOne', 'group', '904', 'tom_builds', 'g4', 'agreed', 'g3')
    expect(ringOf(handle, 'discord', '904')).toBeNull()
    say(handle, 'dmLinus', 'dm', '903', 'linus_k', 'd2', 'hey, quick question')
    expect(ringOf(handle, 'discord', '903')).toEqual({ ring: 1, reason: 'dm', follows: 0, via: null })
    expect(ringOf(handle, 'discord', '904')).toEqual({ ring: 2, reason: 'talksTo', follows: 0, via: '903' })
  })

  test('naming the owner is ring 1, and someone only seen in a group stays ring 4', () => {
    say(handle, 'groupOne', 'group', '906', 'kai_new', 'g5', '<@9000000001> this is for you')
    expect(ringOf(handle, 'discord', '906')).toEqual({ ring: 1, reason: 'mention', follows: 0, via: null })
    say(handle, 'groupOne', 'group', '907', 'rio_far', 'g6', 'hello all')
    expect(ringOf(handle, 'discord', '907')).toBeNull()
    const rings = networkRings(handle)
    expect(rings.counts).toEqual({ '1': 5, '2': 2, '3': 0, '4': 1 })
    expect(rings.imported).toBe(0)
    expect(rings.state?.throughSeq).toBe(rings.latestSeq)
  })

  test('applying each event as it lands gives the same rings as computing them again from log.db', () => {
    const all = (): unknown[] => handle.prepare('SELECT platform, userId, ring, reason, follows, via FROM networkRings ORDER BY platform, userId').all()
    const live = all()
    rebuildRings(handle)
    expect(all()).toEqual(live)
  })

  test('log network status shows the rings and the last event applied', async () => {
    process.env.LOG_DB = dbPath
    const result = await networkCommand.run({ err: () => {} } as never, ['status'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('ring 1: 5')
    expect(result.stdout).toContain('ring 2: 2')
    expect(result.stdout).toContain(`through event ${networkRings(handle).latestSeq}`)
    expect(result.stdout).toContain('nothing imported')
  })
})
