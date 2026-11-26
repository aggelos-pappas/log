import { describe, expect, test } from 'bun:test'
import { hookAnswer, hookOutput } from './hook/index'
import { playReminder, sessionPlayOf } from './session/index'
import { serviceHookCommand, sharedEmbed } from './service/index'
import { correctTypos, editDistance, windowsOf } from '../useCases/router/helpers/index'
import { isPrompt, playMatchText } from '../useCases/router/index'
import { LOADS_EVERY_TOOL_MS } from '../../scripts/tests/timeouts.ts'

const use = (name: string, input: Record<string, unknown> = {}) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: `mcp__log__${name}`, input }] } })

describe('the router hears the owner the way he types', () => {
  test('a typo within one or two edits becomes the playbook word, a short word is left alone', () => {
    const vocabulary = new Set(['message', 'retweet', 'voice', 'note', 'group'])
    expect(correctTypos('retweeet the mesage to the grouo', vocabulary).text).toBe('retweet the message to the group')
    expect(editDistance('throguh', 'through', 2)).toBe(1)
    expect(correctTypos('vn', vocabulary).text).toBe('vn')
  })

  test('a long ramble is read as overlapping windows, a short ask as one', () => {
    expect(windowsOf('send a vn to them')).toEqual(['send a vn to them'])
    expect(windowsOf(Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ')).length).toBe(4)
  })

  test('task notifications, system text and summaries are never routed', () => {
    expect(isPrompt('<task-notification> agent finished')).toBe(false)
    expect(isPrompt('This session is being continued from a previous conversation that ran out of context.')).toBe(false)
    expect(isPrompt('check my x dms')).toBe(true)
  })

  test('a confident pick names getGuide; an unsure one asks the model to choose or say none; nothing says nothing', () => {
    const play = { id: 'twitter/dmInbox', title: 'Reading the DM inbox', score: 0.7, phrase: 'x' }
    expect(playMatchText([play])).toContain('getGuide({ useCase: "twitter/dmInbox" })')
    expect(playMatchText([], [play])).toContain('>>> MAYBE A PLAY')
    expect(playMatchText([], [])).toBe('')
  })
})

describe('the play comes back after compaction', () => {
  test("the session's own transcript gives its last loaded play and the last step it ran", () => {
    const transcript = [use('getGuide', { useCase: 'twitter/networkMaxing' }), use('twitterDms', { with: 'a' }), use('getGuide', { useCase: 'twitter/replyGuyFunnel' }), use('twitterReplyLive')].join('\n')
    expect(sessionPlayOf(transcript)).toEqual({ id: 'twitter/replyGuyFunnel', lastTool: 'twitterReplyLive' })
    expect(sessionPlayOf(use('twitterDms'))).toBeNull()
  })

  test('a play loaded with ask is restored from the getGuide answer, and a cleared play is not', () => {
    const ask = (id: string, text: string) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'mcp__log__getGuide', input: { ask: text } }] } })
    const answer = (id: string, text: string) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text }] }] } })
    const loaded = [ask('t1', 'reply to him on discord'), answer('t1', ">>> PLAY MATCH: x\n\n>>> PLAY discord/channelReply is now this session's play, under the handle play_x"), use('discordRead')].join('\n')
    expect(sessionPlayOf(loaded)).toEqual({ id: 'discord/channelReply', lastTool: 'discordRead' })
    const menu = [use('getGuide', { useCase: 'twitter/followUps' }), ask('t2', 'reply to her'), answer('t2', 'No single use case matches')].join('\n')
    expect(sessionPlayOf(menu)).toEqual({ id: 'twitter/followUps', lastTool: null })
    expect(sessionPlayOf([loaded, use('getGuide', { clearPlay: true })].join('\n'))).toBeNull()
  })

  test('the reminder lists the steps done and to do and says to load it again', () => {
    const page = '# Reply guy\n\n| # | Step | Tool | Done when |\n|---|---|---|---|\n| 1 | Read them | `twitterDms` | read |\n| 2 | Reply | `twitterReplyLive` | sent |\n| 3 | Forward | `twitterDmLive` | sent |\n'
    const text = playReminder({ id: 'twitter/replyGuyFunnel', lastTool: 'twitterReplyLive' }, page)
    expect(text).toContain('>>> ACTIVE PLAY')
    expect(text).toContain('done 2.')
    expect(text).toContain('todo 3.')
    expect(text).toContain('getGuide({ useCase: "twitter/replyGuyFunnel" })')
  })

  test('the hook answers a prompt from the router and falls back to the word router when the service is down', async () => {
    const route = async () => ({ play: { id: 'inbox/voiceNote', title: 'Sending a voice note', score: 0.8, phrase: 'send a vn' } })
    const hit = await hookAnswer({ hook_event_name: 'UserPromptSubmit', prompt: 'send a vn to the group' }, route)
    expect(hit.outcome).toBe('inbox/voiceNote')
    expect(JSON.parse(hookOutput(hit)).hookSpecificOutput.additionalContext).toContain('inbox/voiceNote')
    const useCases = () => [
      { id: 'twitter/notifications', title: 'X notifications', asks: '"check my x notifications"' },
      { id: 'discord/groupChatRead', title: 'Read a Discord group chat', asks: '"read the group chat on discord"' },
    ]
    const down = await hookAnswer({ hook_event_name: 'UserPromptSubmit', prompt: 'check my x notifications' }, async () => null, useCases)
    expect(down.outcome).toBe('wordsOnly twitter/notifications')
    expect(JSON.parse(hookOutput(down)).hookSpecificOutput.additionalContext).toContain('twitter/notifications')
    const nothing = await hookAnswer({ hook_event_name: 'UserPromptSubmit', prompt: 'refactor the parser' }, async () => null, useCases)
    expect(nothing.outcome).toBe('wordsOnly none')
    expect(hookOutput(nothing)).toBe('')
  }, LOADS_EVERY_TOOL_MS)

  test('a person the prompt names is resolved next to the play, even when no play matches', async () => {
    const names = (prompt: string) => (prompt.includes('grase') ? '"grase" is probably grace_ships: discord dm 1 on account discordAccount' : '')
    const named = await hookAnswer({ hook_event_name: 'UserPromptSubmit', prompt: 'summarise the convo with grase' }, async () => null, () => [], names)
    expect(named.outcome).toBe('wordsOnly none named')
    expect(JSON.parse(hookOutput(named)).hookSpecificOutput.additionalContext).toContain('is probably grace_ships')
  })

  test('the per-prompt hook is one curl to the service, with bun only as the fallback', () => {
    const command = serviceHookCommand('/hook', 'bun x.ts')
    expect(command.startsWith('curl -sf')).toBe(true)
    expect(command.endsWith('|| bun x.ts')).toBe(true)
  })
})

describe('the service embeds each prompt window once', () => {
  test('the play route and the meaning router asking for the same windows share one embed call, case folded for an uncased model', async () => {
    const asked: string[][] = []
    const embed = sharedEmbed(async (texts) => {
      asked.push(texts)
      await Bun.sleep(5)
      return texts.map((t) => Float32Array.from([t.length]))
    }, { uncased: true })
    const [a, b] = await Promise.all([embed(['Reply to Grace', 'about the demo']), embed(['reply to grace', 'about the demo', 'and the call'])])
    expect(asked).toEqual([['reply to grace', 'about the demo'], ['and the call']])
    expect(Array.from(a[0])).toEqual(Array.from(b[0]))
    await embed(['about the demo'])
    expect(asked).toHaveLength(2)
  })

  test('a failed embed is not kept, so the next prompt asks again', async () => {
    let calls = 0
    const embed = sharedEmbed(async (texts) => {
      calls += 1
      if (calls === 1) throw new Error('worker gone')
      return texts.map(() => Float32Array.from([1]))
    })
    await expect(embed(['hello there'])).rejects.toThrow('worker gone')
    expect(await embed(['hello there'])).toHaveLength(1)
    expect(calls).toBe(2)
  })
})
