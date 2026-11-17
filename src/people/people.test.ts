import { describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../storage/schema/index'
import { derivedFingerprint, identityLearnedEvent, insertEventRow, rebuildDerived } from '../storage/platform/index'
import { cardFor, cardsNamedIn, linkIdentities, listPeople, markNotLinked, resolveWho, suggestLinks, unlinkIdentity } from './index'

const NOW = Date.parse('2026-11-17T12:00:00Z')
const at = (hoursAgo: number): string => new Date(NOW - hoursAgo * 3_600_000).toISOString()
let seq = 0

function freshDb(): Database {
  return openDatabase(join(mkdtempSync(join(tmpdir(), 'people-')), 'log.db'))
}

function identity(on: Database, platform: string, userId: string, handle: string | null, name: string | null = null): void {
  on.prepare('INSERT OR IGNORE INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?, ?)').run(platform, userId, handle, name, at(500), at(1))
}

function chat(on: Database, platform: string, account: string, conversationId: string, backfilled = true): string {
  const chatId = `${platform}:${account}:${conversationId}`
  on.prepare('INSERT OR IGNORE INTO chats (chatId, platform, account, conversationId, kind, backfilledAt) VALUES (?, ?, ?, ?, ?, ?)').run(chatId, platform, account, conversationId, 'dm', backfilled ? at(400) : null)
  return chatId
}

function say(on: Database, chatId: string, platform: string, userId: string, fromOwner: boolean, text: string, hoursAgo: number): void {
  seq++
  on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)").run(`test:${seq}`, chatId, platform, userId, fromOwner ? 1 : 0, at(hoursAgo), NOW - hoursAgo * 3_600_000, text, at(hoursAgo))
  if (!fromOwner) on.prepare('INSERT OR IGNORE INTO memberships (platform, roomId, userId, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, ?, ?)').run(platform, chatId, userId, at(hoursAgo), at(hoursAgo))
}

function world(): Database {
  const on = freshDb()
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('discord', 'discordAccount', '9000000001', at(900))
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('twitter', 'xAccount', '1000000001', at(900))
  on.prepare('INSERT INTO accounts (platform, account, userId, learnedAt) VALUES (?, ?, ?, ?)').run('twitter', 'quill_1', '1000000009', at(900))
  identity(on, 'discord', '9000000002', 'quill')
  identity(on, 'twitter', '1000000009', 'quill_1', 'Quill Writer')
  identity(on, 'discord', '9000000003', 'fan')
  identity(on, 'twitter', '1000000003', 'starmaker')
  identity(on, 'discord', '9000000004', 'helper bot')
  identity(on, 'discord', '9000000005', 'rivet')
  identity(on, 'twitter', '1000000005', 'rivet')
  for (let n = 0; n < 300; n++) {
    identity(on, 'discord', `91${String(n).padStart(8, '0')}`, `crowd${n}d`)
    identity(on, 'twitter', `11${String(n).padStart(8, '0')}`, `${n}xcrowd`)
  }
  const dm = chat(on, 'discord', 'discordAccount', 'dmQuill')
  for (let n = 0; n < 6; n++) say(on, dm, 'discord', '9000000002', false, `https://x.com/quill_1/status/10${n} please like and share`, 200 - n)
  say(on, dm, 'discord', '9000000002', false, 'want to pair on the graph demo?', 30)
  say(on, dm, 'discord', '9000001234', false, 'Watch Together started', 29)
  say(on, dm, 'discord', '9000000001', true, 'yes, friday', 20)
  const xDm = chat(on, 'twitter', 'xAccount', '1000000001-1000000009')
  say(on, xDm, 'twitter', '1000000009', false, 'saw your post', 50)
  say(on, xDm, 'twitter', '1000000009', false, 'saw your post', 50)
  say(on, xDm, 'twitter', '1000000001', true, '', 49)
  const theirOwn = chat(on, 'twitter', 'quill_1', '1000000009-1000000077')
  say(on, theirOwn, 'twitter', '1000000077', false, 'hi quill', 40)
  say(on, theirOwn, 'twitter', '1000000009', true, 'hi', 39)
  const fanDm = chat(on, 'discord', 'discordAccount', 'dmFan')
  say(on, fanDm, 'discord', '9000000003', false, 'check out his thread https://x.com/starmaker/status/1', 10)
  say(on, fanDm, 'discord', '9000000003', false, 'this dude https://x.com/starmaker/status/2', 9)
  const botDm = chat(on, 'discord', 'discordAccount', 'dmBot')
  for (let n = 0; n < 6; n++) say(on, botDm, 'discord', '9000000004', false, `https://x.com/starmaker/status/3${n} like`, 8)
  return on
}

describe('one person across platforms: the record', () => {
  test('linking writes events, and the person is found by handle on either platform or by name', () => {
    const on = world()
    const result = linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'the owner said yes', { name: 'Quill Writer', now: new Date(NOW) })
    expect(result.ok).toBe(true)
    expect(result.linked.map((i) => `${i.platform}:${i.userId}`).sort()).toEqual(['discord:9000000002', 'twitter:1000000009'])
    expect((on.prepare("SELECT COUNT(*) AS n FROM events WHERE type IN ('personNamed', 'identityLinked')").get() as { n: number }).n).toBe(3)
    for (const spec of ['discord:quill', 'twitter:@quill_1', 'quill_1', 'Quill Writer', result.personId!]) {
      const who = resolveWho(on, spec)
      expect(who.ok && who.identities.length).toBe(2)
    }
    expect(listPeople(on).map((p) => p.name)).toEqual(['Quill Writer'])
  })

  test('an identity already in one person is never silently moved into another', () => {
    const on = world()
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { now: new Date(NOW) })
    linkIdentities(on, ['discord:rivet', 'twitter:rivet'], 'yes', { now: new Date(NOW) })
    const clash = linkIdentities(on, ['discord:quill', 'twitter:rivet'], 'yes', { now: new Date(NOW) })
    expect(clash.ok).toBe(false)
    expect(clash.problem).toContain('2 different people')
  })

  test('an unlink is a new event: the identity leaves the person and the old link stays in the history', () => {
    const on = world()
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { now: new Date(NOW) })
    expect(unlinkIdentity(on, 'twitter:quill_1', 'the owner said no', new Date(NOW + 1000)).ok).toBe(true)
    expect((on.prepare('SELECT COUNT(*) AS n FROM identityLinks').get() as { n: number }).n).toBe(2)
    const who = resolveWho(on, 'discord:quill')
    expect(who.ok && who.identities.map((i) => i.platform)).toEqual(['discord'])
  })

  test('a rebuild from the events gives exactly the same people and links', () => {
    const on = freshDb()
    insertEventRow(on, identityLearnedEvent('discord', 'discordAccount', '9000000002', 'quill', null, at(10)), new Date(NOW))
    insertEventRow(on, identityLearnedEvent('twitter', 'xAccount', '1000000009', 'quill_1', 'Quill Writer', at(10)), new Date(NOW))
    insertEventRow(on, identityLearnedEvent('twitter', 'xAccount', '1000000005', 'rivet', null, at(10)), new Date(NOW))
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { name: 'Quill', now: new Date(NOW) })
    markNotLinked(on, 'discord:quill', 'twitter:rivet', 'no', new Date(NOW))
    unlinkIdentity(on, 'twitter:quill_1', 'no', new Date(NOW + 1000))
    const before = derivedFingerprint(on)
    rebuildDerived(on)
    const after = derivedFingerprint(on)
    for (const table of ['persons', 'identityLinks', 'identityNotLinked']) expect(after[table]).toEqual(before[table])
    expect(before.identityLinks.rows).toBe(2)
  })

  test('a link made while an identity is known only by handle follows it when its id is learned', () => {
    const on = freshDb()
    on.prepare('INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES (?, ?, ?, NULL, ?, ?)').run('twitter', '@quill_1', 'quill_1', at(10), at(10))
    insertEventRow(on, identityLearnedEvent('discord', 'discordAccount', '9000000002', 'quill', null, at(10)), new Date(NOW))
    linkIdentities(on, ['discord:quill', 'twitter:@quill_1'], 'yes', { now: new Date(NOW) })
    insertEventRow(on, identityLearnedEvent('twitter', 'xAccount', '1000000009', 'quill_1', null, at(1)), new Date(NOW + 1000))
    const links = on.prepare('SELECT platform, userId FROM identityLinks WHERE revokedAt IS NULL ORDER BY platform').all()
    expect(links).toEqual([{ platform: 'discord', userId: '9000000002' }, { platform: 'twitter', userId: '1000000009' }])
  })
})

describe('suggestions: Fellegi-Sunter record linkage, no AI', () => {
  test('someone who keeps sharing one X account\'s posts with a matching handle is a strong suggestion, with the evidence', () => {
    const on = world()
    const list = suggestLinks(on)
    const quill = list.find((s) => [s.a.handle, s.b.handle].includes('quill'))!
    expect(quill.band).toBe('strong')
    const shares = quill.comparisons.find((c) => c.comparison === 'sharesOwnPosts')!
    expect(shares.level).toBe('fivePlus')
    expect(shares.count).toBe(6)
    expect(shares.asks).toBe(6)
    expect(shares.sources!.length).toBe(3)
    expect(quill.matchWeight).toBeCloseTo(quill.prior + quill.comparisons.reduce((n, c) => n + Math.log2(c.bayesFactor), 0))
  })

  test('recommending someone else, a bot, and a pair the owner said are different never become suggestions', () => {
    const on = world()
    const names = (list: ReturnType<typeof suggestLinks>) => list.map((s) => `${s.a.handle}~${s.b.handle}`)
    expect(names(suggestLinks(on)).some((n) => n.includes('starmaker'))).toBe(false)
    expect(names(suggestLinks(on))).toContain('rivet~rivet')
    markNotLinked(on, 'discord:rivet', 'twitter:rivet', 'the owner said they are different', new Date(NOW))
    expect(names(suggestLinks(on))).not.toContain('rivet~rivet')
  })

  test('the same handle alone is only worth a review, never strong', () => {
    const rivet = suggestLinks(world()).find((s) => s.a.handle === 'rivet')!
    expect(rivet.band).toBe('review')
  })

  test('a linked pair is not suggested again', () => {
    const on = world()
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { now: new Date(NOW) })
    expect(suggestLinks(on).some((s) => s.a.handle === 'quill' || s.b.handle === 'quill')).toBe(false)
  })
})

describe('the person card', () => {
  test('one card across platforms: one-to-one by who wrote it, their own account left out, duplicates and attachments handled', () => {
    const on = world()
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { name: 'Quill Writer', now: new Date(NOW) })
    const found = cardFor(on, 'quill', NOW)
    expect(found.ok).toBe(true)
    const card = found.ok ? found.card : null
    expect(card!.perPlatform.map((p) => p.platform).sort()).toEqual(['discord', 'twitter'])
    expect(card!.chats.find((c) => c.platform === 'discord')!.oneToOne).toBe(true)
    expect(card!.onTheirAccounts).toBe(1)
    expect(card!.chats.some((c) => c.account === 'quill_1')).toBe(false)
    expect(card!.last.filter((l) => l.text === 'saw your post').length).toBe(1)
    expect(card!.last.some((l) => l.text === '[attachment]')).toBe(true)
    expect(card!.waitingOn).toBe('them')
    expect(card!.text).toContain('>>> PERSON: Quill Writer')
    expect(card!.text).toContain('[twitter]')
    expect(card!.text).toContain('[discord]')
  })

  test('a prompt naming the person by handle on either platform, or by name, brings their card', () => {
    const on = world()
    linkIdentities(on, ['discord:quill', 'twitter:quill_1'], 'yes', { name: 'Quill Writer', now: new Date(NOW) })
    expect(cardsNamedIn(on, 'reply to @quill_1 about friday', NOW).length).toBe(1)
    expect(cardsNamedIn(on, 'how is my relationship with quill', NOW).length).toBe(1)
    expect(cardsNamedIn(on, 'what did writer say', NOW).length).toBe(1)
    expect(cardsNamedIn(on, 'fix the failing build', NOW).length).toBe(0)
  })
})
