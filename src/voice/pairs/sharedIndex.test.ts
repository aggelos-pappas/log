import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashEmbedder } from '../../search/conversations/index'
import type { Conversation } from '../../search/conversations/index'
import { buildVoiceIndex, closeSharedVoiceIndex, nearestPairs, openSharedVoiceIndex, voiceIndexStamp } from './index'

const msg = (id: string, fromMe: boolean, text: string) => ({ id, at: `2026-10-28T08:${id.padStart(2, '0')}:00Z`, from: fromMe ? 'the owner' : 'grace_ships', fromMe, text })

const GRACE: Conversation = {
  platform: 'discord',
  account: 'discordAccount',
  conversationId: '1000000000000000007',
  box: 'dm',
  with: ['grace_ships'],
  messages: [msg('1', false, 'are you around for a call this week'), msg('2', true, 'yeah thursday works lad'), msg('3', false, 'sound, send the link'), msg('4', true, 'will do')],
}

const dir = mkdtempSync(join(tmpdir(), 'voiceShared'))
afterAll(async () => {
  await closeSharedVoiceIndex()
  rmSync(dir, { recursive: true, force: true })
})

describe('a gate opens the voice index once, not once per lookup', () => {
  test('the same index answers every lookup until its files change, and a closed copy leaves it open for the next', async () => {
    await buildVoiceIndex([GRACE], hashEmbedder(), dir)
    const embedder = hashEmbedder()
    const first = await openSharedVoiceIndex(embedder, dir)
    await first.close()
    const second = await openSharedVoiceIndex(embedder, dir)
    expect(second.vectors).toBe(first.vectors)
    expect((await nearestPairs(second, 'call this week', { with: ['grace_ships'] })).length).toBeGreaterThan(0)
    const stamp = voiceIndexStamp(dir)
    const later = new Date(Date.now() + 5000)
    utimesSync(join(dir, 'pairs.json'), later, later)
    expect(voiceIndexStamp(dir)).not.toBe(stamp)
    const third = await openSharedVoiceIndex(embedder, dir)
    expect(third.vectors).not.toBe(first.vectors)
    expect((await nearestPairs(third, 'call this week', { with: ['grace_ships'] })).length).toBeGreaterThan(0)
  })
})
