import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { inboxCommand, outcomeDeps } from '../../cli/inbox/index'
import { agentSendsIn, lineKey, mantelHaenszel, matchedRates, matchedWindow, movedForward, oneToOne, outcomeBlocks, outcomesOf, outcomeText, playOfQueue, reportOf, sendsOf, stageAt, wilson } from './index'
import type { Send } from './index'

const dir = mkdtempSync(join(tmpdir(), 'outcomes'))
const dbPath = join(dir, 'log.db')
const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = Date.parse('2026-11-20T12:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()

afterAll(() => {
  openDatabase(dbPath).close()
  Bun.gc(true)
  rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

let built = false

function world() {
  const on = openDatabase(dbPath)
  if (built) return on
  built = true
  let seq = 0
  const chat = (platform: string, account: string, id: string) => on.prepare("INSERT OR IGNORE INTO chats (chatId, platform, account, conversationId, kind, name) VALUES (?, ?, ?, ?, 'dm', NULL)").run(`${platform}:${account}:${id}`, platform, account, id)
  const say = (platform: string, account: string, id: string, who: string, text: string, ms: number, fromOwner: boolean, messageId: string | null = null) =>
    on.prepare("INSERT INTO messages (messageKey, chatId, platformMessageId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)").run(`k${++seq}`, `${platform}:${account}:${id}`, messageId, platform, fromOwner ? 'owner' : who, fromOwner ? 'xAccount' : who, fromOwner ? 1 : 0, iso(ms), ms, text, iso(ms))
  chat('twitter', 'xAccount', '100-200')
  const start = NOW - 20 * DAY
  say('twitter', 'xAccount', '100-200', 'g', 'saw your post about the queue', start, false)
  say('twitter', 'xAccount', '100-200', 'g', 'hey thanks for the follow', start + HOUR, true)
  say('twitter', 'xAccount', '100-200', 'g', 'haha no worries, what are you building', start + 2 * HOUR, false)
  say('twitter', 'xAccount', '100-200', 'g', 'a dm tool, made a video https://x.com/xAccount/status/123456', start + 10 * DAY, true, 'mQueue')
  say('twitter', 'xAccount', '100-200', 'g', 'nice one', start + 10 * DAY + 3 * HOUR, false)
  say('twitter', 'xAccount', '100-200', 'g', 'want to try it this week', start + 11 * DAY, true, 'mRecord')
  say('twitter', 'xAccount', '100-200', 'g', 'yes please', start + 11 * DAY + 30 * 60_000, false)
  say('twitter', 'xAccount', '100-200', 'g', 'sent the link', start + 12 * DAY, true)
  say('twitter', 'xAccount', '100-200', 'g', 'got it', start + 12 * DAY + 10 * 60_000, false)
  say('twitter', 'xAccount', '100-200', 'g', 'how did it go', start + 13 * DAY, true)
  on.prepare("INSERT INTO actions (at, kind, platform, account, conversationId, holder, detail) VALUES (?, 'partSent', 'twitter', 'xAccount', '100-200', 1, ?)").run(iso(start + 11 * DAY), JSON.stringify({ op: 'o', part: 0, messageId: 'mRecord' }))
  const body = { items: [{ action: 'dm', status: 'sent', sentId: '200-100', text: 'a dm tool, made a video\nhttps://x.com/i/status/123456', attemptedAt: iso(start + 10 * DAY - 60_000) }] }
  on.prepare("INSERT OR REPLACE INTO queues (name, account, body, version, path, updatedAt) VALUES (?, 'xAccount', ?, 1, '', ?)").run('C:/q/likersThanks_20261107', JSON.stringify(body), iso(start))
  on.prepare("INSERT OR REPLACE INTO spans (spanId, traceId, callId, parentId, tool, name, source, pid, startedAt, ms, ok, attrs) VALUES ('s1', 't', 'c', NULL, 'twitterDmLive', 'x', 'mcp', 1, ?, 2000, 1, '{}')").run(start + 13 * DAY - 1000)
  return on
}

const send = (over: Partial<Send>): Send => ({ platform: 'discord', account: 'discordAccount', person: 'grace', with: 'grace_ships', who: 'lead', stage: 'warming', by: 'hand', foundBy: 'none', play: null, firstMs: NOW - 10 * DAY, lastMs: NOW - 10 * DAY, firstSeq: 1, lastSeq: 1, lines: 1, text: 'hey', replyMs: HOUR, stageAfter: 'warming', positivity: null, ...over })

describe('log inbox outcomes: do people answer what log sent', () => {
  test('rates carry a Wilson interval, and an empty side has none', () => {
    expect(wilson(0, 0)).toEqual({ n: 0, yes: 0, rate: null, low: null, high: null })
    const r = wilson(5, 10)
    expect(r.rate).toBe(0.5)
    expect(r.low!).toBeGreaterThan(0.2)
    expect(r.high!).toBeLessThan(0.8)
  })

  test('matching weighs only person-stage pairs with both kinds of send, so a warmer audience for log does not count', () => {
    const units = [
      ...Array.from({ length: 4 }, (_, i) => ({ stratum: 'warm', cluster: 'a', log: true, outcome: i < 3 })),
      ...Array.from({ length: 4 }, (_, i) => ({ stratum: 'warm', cluster: 'a', log: false, outcome: i < 3 })),
      ...Array.from({ length: 6 }, () => ({ stratum: 'cold', cluster: 'b', log: false, outcome: false })),
    ]
    const m = matchedRates(units)
    expect(m).toMatchObject({ log: 0.75, hand: 0.75, difference: 0, strata: 1, logSends: 4, handSends: 4 })
    const w = matchedWindow(units, 50)
    expect(w.people).toBe(1)
    expect(w.low).toBeNull()
  })

  test('the Mantel-Haenszel odds ratio pools strata', () => {
    const units = [
      { stratum: 's', cluster: 'a', exposed: true, outcome: true },
      { stratum: 's', cluster: 'a', exposed: true, outcome: false },
      { stratum: 's', cluster: 'a', exposed: false, outcome: false },
      { stratum: 's', cluster: 'a', exposed: false, outcome: false },
      { stratum: 's', cluster: 'a', exposed: false, outcome: true },
    ]
    expect(mantelHaenszel(units)).toBeCloseTo(2, 5)
  })

  test('stage at a send comes from the labelled stage once it was reached, else from the history', () => {
    expect(stageAt([], NOW, null)).toBe('new')
    const talk = [{ fromOwner: false, ms: NOW - 3 * DAY }, { fromOwner: true, ms: NOW - 2 * DAY }, { fromOwner: false, ms: NOW - DAY }]
    expect(stageAt(talk, NOW, null)).toBe('warming')
    expect(stageAt(talk, NOW + 30 * DAY, null)).toBe('goneQuiet')
    expect(stageAt(talk, NOW, { who: 'lead', where: 'offered', movedMs: NOW - DAY })).toBe('offered')
    expect(stageAt(talk, NOW, { who: 'lead', where: 'offered', movedMs: NOW + DAY })).toBe('warming')
    expect(movedForward('warming', 'needFound')).toBe(true)
    expect(movedForward('offered', 'lost')).toBe(false)
    expect(movedForward('goneQuiet', 'warming')).toBe(true)
  })

  test('a queue name becomes its play, and links read the same however the platform stored them', () => {
    expect(playOfQueue('C:/q/likersThanks_20261107', 'xAccount')).toBe('likersThanks')
    expect(playOfQueue('C:/q/xAccount20261101b', 'xAccount')).toBe('queue')
    expect(playOfQueue('devReplies.queue', 'xAccount')).toBe('devReplies')
    expect(lineKey('https://x.com/i/status/123456')).toBe(lineKey('https://x.com/xAccount/status/123456?s=20'))
    expect(oneToOne([{ fromOwner: true, senderUserId: 'o' }, { fromOwner: false, senderUserId: 'g' }])).toBe(true)
    expect(oneToOne([{ fromOwner: false, senderUserId: 'g' }, { fromOwner: false, senderUserId: 'l' }])).toBe(false)
  })

  test('the play of an agent send is the last guide or log skill loaded in its session', () => {
    const calls = (name: string, args: Record<string, unknown>) => JSON.stringify([{ function: { name, arguments: JSON.stringify(args) } }])
    const sends = agentSendsIn([
      { session: 'a', ms: 1, calls: calls('mcp_log_getGuide', { useCase: 'twitter/dmInbox' }) },
      { session: 'a', ms: 2, calls: calls('mcp_log_twitterDmLive', { with: '@grace_ships', text: 'hey' }) },
      { session: 'b', ms: 3, calls: calls('skill_view', { name: ['log:log', 'discord', 'channel', 'reply'].join('-') }) },
      { session: 'b', ms: 4, calls: calls('mcp_log_discordSendLive', { channel: 'c', text: 'yo' }) },
      { session: 'c', ms: 5, calls: calls('mcp_log_twitterQueueRunLive', { queue: 'q' }) },
    ])
    expect(sends).toEqual([
      { ms: 2, platform: 'twitter', with: 'grace_ships', play: 'twitter/dmInbox' },
      { ms: 4, platform: 'discord', with: 'c', play: 'discord/channelReply' },
      { ms: 5, platform: 'twitter', with: '', play: null },
    ])
  })

  test('a send is log\'s when a send record, a sent queue item or a log send call covers it, and the owner\'s otherwise', () => {
    const sends = sendsOf({}, world(), { agentSends: [{ ms: NOW - 9 * DAY - 60_000, platform: 'twitter', with: 'g', play: 'twitter/dmInbox' }] })
    expect(sends.map((s) => [s.by, s.foundBy, s.play, s.stage])).toEqual([
      ['hand', 'none', null, 'new'],
      ['log', 'queue', 'likersThanks', 'warming'],
      ['log', 'sendRecord', 'twitter/dmInbox', 'warming'],
      ['hand', 'none', null, 'warming'],
      ['log', 'sendSpan', 'unknown', 'warming'],
    ])
    expect(sends[1].replyMs).toBe(3 * HOUR)
    expect(sends[4].replyMs).toBeNull()
  })

  test('the report counts only the weeks since log first sent, raw and matched, with a card view', () => {
    const sends = [
      send({ by: 'hand', firstMs: NOW - 40 * DAY, lastMs: NOW - 40 * DAY, replyMs: null }),
      send({ by: 'log', foundBy: 'sendRecord', play: 'twitter/dmInbox', replyMs: 2 * HOUR }),
      send({ by: 'hand', firstMs: NOW - 9 * DAY, lastMs: NOW - 9 * DAY, replyMs: 10 * 60_000 }),
      send({ by: 'hand', person: 'linus', firstMs: NOW - 9 * DAY, lastMs: NOW - 9 * DAY, replyMs: null }),
      send({ by: 'log', foundBy: 'queue', play: 'likersThanks', person: 'linus', firstMs: NOW - HOUR, lastMs: NOW - HOUR, replyMs: null }),
    ]
    const r = reportOf(sends, { now: NOW, reps: 50 })
    expect(r.sends).toMatchObject({ log: 2, hand: 2 })
    expect(r.raw[0].log.day).toMatchObject({ n: 1, yes: 1 })
    expect(r.raw[0].hand.week).toMatchObject({ n: 2, yes: 1 })
    expect(r.matched.week).toMatchObject({ strata: 1, people: 1, log: 1, hand: 1, difference: 0 })
    expect(r.plays.map((p) => p.play)).toEqual(['twitter/dmInbox', 'likersThanks'])
    expect(outcomeText(r)).toContain('Matched, same person at the same stage')
    const view = outcomeBlocks(r)
    expect(view.blocks.length).toBeGreaterThan(4)
    expect(view.blocks.every((b) => b.type !== 'table' || b.columns.length <= 8)).toBe(true)
  })

  test('warmth from the emotion model is compared with a reply when asked for', async () => {
    const read = async (texts: string[]) => texts.map((t) => (t.includes('want to try') ? [{ label: 'gratitude', score: 0.9 }] : [{ label: 'neutral', score: 0.9 }]))
    const r = await outcomesOf({}, world(), { now: NOW, agentSends: [], feelings: read, reps: 20 })
    expect(r.positivity?.all.scored).toBeGreaterThan(0)
    expect(r.positivity?.all.positive.n).toBe(1)
  })

  test('the command reads only, answers JSON with the report and its view, and the bare form works', async () => {
    const before = { agentSends: outcomeDeps.agentSends, feelings: outcomeDeps.feelings }
    const old = process.env.LOG_DB
    process.env.LOG_DB = dbPath
    outcomeDeps.agentSends = () => []
    try {
      const out = await inboxCommand.run({} as never, ['outcomes', '--json'])
      expect(out.code).toBe(0)
      const parsed = JSON.parse(String(out.stdout)) as { report: { sends: { log: number } }; view: { title: string } }
      expect(parsed.report.sends.log).toBeGreaterThan(0)
      expect(parsed.view.title).toContain('log')
      const text = await inboxCommand.run({} as never, ['outcomes'])
      expect(String(text.stdout)).toStartWith('log inbox outcomes:')
    } finally {
      outcomeDeps.agentSends = before.agentSends
      outcomeDeps.feelings = before.feelings
      if (old === undefined) delete process.env.LOG_DB
      else process.env.LOG_DB = old
    }
  })
})
