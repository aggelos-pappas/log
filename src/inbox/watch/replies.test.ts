import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { replyMode } from './client'
import { inboxContext } from './index'

const file = (body: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), 'replies-'))
  const path = join(dir, 'settings.json')
  writeFileSync(path, JSON.stringify(body))
  return path
}
const none = join(tmpdir(), 'no-such-settings.json')

describe('replies: ask unless the owner set auto', () => {
  test('nothing set means ask, on every platform', () => {
    for (const p of ['discord', 'slack', 'instagram', 'twitter']) expect(replyMode(p, {}, none)).toBe('ask')
  })

  test('the harness setting wins: one word for all, or per platform with a default', () => {
    expect(replyMode('discord', { LOG_REPLIES: 'auto' }, none)).toBe('auto')
    expect(replyMode('discord', { LOG_REPLIES: 'discord=auto,default=ask' }, none)).toBe('auto')
    expect(replyMode('slack', { LOG_REPLIES: 'discord=auto,default=ask' }, none)).toBe('ask')
    expect(replyMode('slack', { LOG_REPLIES: 'auto' }, file({ replies: 'ask' }))).toBe('auto')
  })

  test('~/.logCli/settings.json is read when the harness sets nothing; junk falls back to ask', () => {
    expect(replyMode('twitter', {}, file({ replies: { twitter: 'auto' } }))).toBe('auto')
    expect(replyMode('discord', {}, file({ replies: { twitter: 'auto' } }))).toBe('ask')
    expect(replyMode('discord', { LOG_REPLIES: 'yes please' }, file({ replies: 'sure' }))).toBe('ask')
  })

  test('in ask mode the pushed message tells the agent not to send; in auto it keeps rule 108', () => {
    const msg = { platform: 'discord', account: 'a', with: 'someone', box: 'dm', at: '2026-11-19T01:10:41Z', text: 'what u think of it', conversationId: '1' } as never
    const before = process.env.LOG_REPLIES
    try {
      process.env.LOG_REPLIES = 'ask'
      const ask = inboxContext([msg]) ?? ''
      expect(ask).toContain('Do NOT send it')
      expect(ask).not.toContain('full authority')
      process.env.LOG_REPLIES = 'auto'
      expect(inboxContext([msg]) ?? '').toContain('full authority to reply')
    } finally {
      if (before === undefined) delete process.env.LOG_REPLIES
      else process.env.LOG_REPLIES = before
    }
  })
})
