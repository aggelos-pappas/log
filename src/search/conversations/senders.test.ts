import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { sendersOf } from './index'

describe('who wrote a search hit', () => {
  test('gives each sender in the hit by name with their platform user id, leaving out the owner and unknown senders', () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'searchSenders-')), 'log.db'))
    const chatId = 'discord:builder:7200000000000000001'
    on.prepare("INSERT INTO chats (chatId, platform, account, conversationId, kind, name) VALUES (?, 'discord', 'builder', '7200000000000000001', 'channel', 'general')").run(chatId)
    on.prepare("INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES ('discord', '9000000002', 'grace', 'Grace', '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z')").run()
    const say = (key: string, id: string | null, userId: string, fromOwner: number, label: string | null) => on.prepare("INSERT INTO messages (messageKey, platformMessageId, chatId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, ?, 'discord', ?, ?, ?, '2026-11-01T00:00:00Z', 1, 'hi', 'live', '2026-11-01T00:00:00Z')").run(key, id, chatId, userId, label, fromOwner)
    say('k1', '501', '9000000002', 0, 'Grace')
    say('k2', '502', '9000000001', 1, null)
    say('k3', null, '9000000003', 0, 'Hendrvxx')
    say('k4', '504', 'unknown:x', 0, 'someone')
    say('k5', '505', '9000000002', 0, 'Grace')
    const senders = sendersOf(on, { platform: 'discord', account: 'builder', conversationId: '7200000000000000001', messageIds: ['501', '502', 'k3', '504', '505'] })
    expect(senders).toEqual([{ label: 'grace', userId: '9000000002' }, { label: 'Hendrvxx', userId: '9000000003' }])
    on.close()
  })
})
