import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema'
import { buildOwnIndex, charOverlap, ownersSentMatches, ownKey, ownLineSummary, ownMatchIn } from './index'

const scratch = mkdtempSync(join(tmpdir(), 'voiceOwned'))

afterAll(() => {
  Bun.gc(true)
  rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

const HIS = ['sick man ill be keen to see it land', 'fml man the glazing with no offers is the worst part', 'ill send anything i see your way', 'yo lad filmed it today']

describe("the owner's own sent words are his, never a model's", () => {
  test('an exact line, in any case or with apostrophes, is his', () => {
    const index = buildOwnIndex(HIS)
    expect(ownKey("I'll send anything I see your way!")).toBe('ill send anything i see your way')
    expect(ownMatchIn(index, "I'll send anything I see your way")!.lines[0].overlap).toBe(1)
  })

  test('a two-line draft is his only when every line is', () => {
    const index = buildOwnIndex(HIS)
    const both = ownMatchIn(index, 'fml man the glazing with no offers is the worst part\nill send anything i see your way')!
    expect(both.lines.map((l) => l.his)).toEqual([HIS[1], HIS[2]])
    expect(ownLineSummary(both)).toContain(HIS[2])
    expect(ownMatchIn(index, 'fml man the glazing with no offers is the worst part. ill send anything i see your way')!.lines).toHaveLength(2)
    expect(ownMatchIn(index, 'ill send anything i see your way\nhappy to help you draft a patch whenever you are ready')).toBeNull()
  })

  test('a near copy with high character overlap is his; a different line on the same words is not', () => {
    const index = buildOwnIndex(HIS)
    const near = ownMatchIn(index, 'sick man ill be keen to see it landing')!
    expect(near.lines[0].his).toBe(HIS[0])
    expect(near.lines[0].overlap).toBeGreaterThanOrEqual(0.8)
    expect(charOverlap('ill send it over now', HIS[2])).toBeLessThan(0.8)
    expect(ownMatchIn(index, 'ill send it over now')).toBeNull()
  })

  test("a model-written paragraph matches nothing of his", () => {
    const index = buildOwnIndex(HIS)
    expect(ownMatchIn(index, 'I completely understand how frustrating that must be. Getting a fix merged upstream can take time, but I would be happy to help.')).toBeNull()
  })

  test("log.db's sent messages are read, and a held-out reply is left out of them", () => {
    const handle = openDatabase(join(scratch, 'log.db'))
    const insert = handle.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, fromOwner, sentAt, text, source, receivedAt) VALUES (?, 'twitter:xAccount:1-2', 'twitter', ?, ?, '2026-11-21T08:00:00Z', ?, 'live', '2026-11-21T08:00:00Z')")
    insert.run('k1', 'me', 1, HIS[2])
    insert.run('k2', 'linus_k', 0, 'sick man ill be keen to see it land')
    const [mine, theirs] = ownersSentMatches(handle, ['ill send anything i see your way', 'sick man ill be keen to see it land'])
    expect(mine!.lines[0].his).toBe(HIS[2])
    expect(theirs).toBeNull()
    expect(ownersSentMatches(handle, ['ill send anything i see your way'], HIS[2])[0]).toBeNull()
    handle.close()
  })
})
