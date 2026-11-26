import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { hashEmbedder } from '../../search/conversations/index'
import type { Embedder } from '../../search/conversations/index'
import { inboxCommand } from './index'

const dir = mkdtempSync(join(tmpdir(), 'labelEngine'))
const dbPath = join(dir, 'log.db')
const NOW = Date.parse('2026-11-20T12:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()
let before: string | undefined

beforeAll(() => {
  before = process.env.LOG_DB
  process.env.LOG_DB = dbPath
  const on = openDatabase(dbPath)
  on.prepare("INSERT INTO chats (chatId, platform, account, conversationId, kind, name) VALUES (?, 'twitter', 'xAccount', '100-200', 'dm', NULL)").run('twitter:xAccount:100-200')
  const say = (n: number, text: string, fromOwner: boolean) =>
    on.prepare("INSERT INTO messages (messageKey, chatId, platformMessageId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, 'twitter:xAccount:100-200', NULL, 'twitter', ?, ?, ?, ?, ?, ?, 'live', ?)").run(`k${n}`, fromOwner ? 'owner' : 'g', fromOwner ? 'xAccount' : 'grace', fromOwner ? 1 : 0, iso(NOW + n), NOW + n, text, iso(NOW + n))
  say(1, 'saw your post about the queue', false)
  say(2, 'thanks, what are you building', true)
  say(3, 'a dm tool for my agency', false)
})

afterAll(() => {
  if (before === undefined) delete process.env.LOG_DB
  else process.env.LOG_DB = before
  openDatabase(dbPath).close()
  Bun.gc(true)
  rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

const throwing = (): Embedder => {
  throw Object.assign(new Error('stubbed'), { code: 'stubEngine' })
}

const neverReady: Embedder = { model: 'neverReady', dimensions: 4, embed: () => Promise.reject(new Error('the embedding model neverReady stopped')) }

describe('the label tools take their embedder from the context and refuse with a code when it cannot run', () => {
  for (const argv of [['labels', '--json'], ['label', 'queue', '--json'], ['label', 'train', '--json']]) {
    test(`${argv.slice(0, -1).join(' ')} refuses embedderUnavailable when the context's embedder throws`, async () => {
      const result = await inboxCommand.run({ embedder: throwing } as never, argv)
      expect(result.code).toBe(1)
      expect(result.error).toBe('embedderUnavailable')
      expect(String(result.stderr)).toContain('stubbed')
    })

    test(`${argv.slice(0, -1).join(' ')} refuses embedderUnavailable when the embedder's worker stops`, async () => {
      const result = await inboxCommand.run({ embedder: () => neverReady } as never, argv)
      expect(result.code).toBe(1)
      expect(result.error).toBe('embedderUnavailable')
      expect(String(result.stderr)).toContain('neverReady stopped')
    })
  }

  test("labels runs on the context's embedder and lists the person", async () => {
    const result = await inboxCommand.run({ embedder: () => hashEmbedder(64) } as never, ['labels', '--json'])
    expect(result.code).toBe(0)
    const parsed = JSON.parse(String(result.stdout)) as { people: { platform: string }[] }
    expect(parsed.people.map((p) => p.platform)).toEqual(['twitter'])
  })
})
