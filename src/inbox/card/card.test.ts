import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { migrate } from '../../storage/schema/client'
import { answerOwed, buildCard, cardFor, refreshWorkedCards, renderCard, scopedToThisChat } from './index'

const NOW = new Date('2026-11-15T22:00:00Z')
const ACCOUNT = 'xAccount'
const OWNER_ID = '1974596626342686720'
const FRIEND_ID = '873963418449051648'

function freshDb(): Database {
  const handle = new Database(':memory:')
  migrate(handle)
  return handle
}

let n = 0
function chat(on: Database, conversationId: string, kind = 'dm'): string {
  const chatId = `twitter:${ACCOUNT}:${conversationId}`
  on.prepare('INSERT OR IGNORE INTO chats (chatId, platform, account, conversationId, kind) VALUES (?, ?, ?, ?, ?)').run(chatId, 'twitter', ACCOUNT, conversationId, kind)
  return chatId
}

function say(on: Database, chatId: string, fromOwner: boolean, text: string, at: string): void {
  n += 1
  on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, senderLabel, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, 'twitter', ?, ?, ?, ?, ?, ?, 'live', ?)").run(`k${n}`, chatId, fromOwner ? OWNER_ID : FRIEND_ID, fromOwner ? null : 'vladFriend', fromOwner ? 1 : 0, at, Date.parse(at), text, at)
}

describe('a conversation card per chat', () => {
  test("an X dm stored under both of its ids is one card, and a group with the same person is its own", () => {
    const on = freshDb()
    const xchat = chat(on, `${FRIEND_ID}:${OWNER_ID}`)
    const oldDm = chat(on, `${FRIEND_ID}-${OWNER_ID}`)
    say(on, oldDm, false, 'what are you building', '2026-11-10T10:00:00Z')
    say(on, xchat, true, 'i like making outbound stuff', '2026-11-15T16:53:10Z')
    const card = cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!
    expect(card.conversationIds.sort()).toEqual([`${FRIEND_ID}-${OWNER_ID}`, `${FRIEND_ID}:${OWNER_ID}`])
    expect(card.messages).toBe(2)
    const group = chat(on, '1990000000000000001', 'group')
    say(on, group, false, 'yo all', '2026-11-15T10:00:00Z')
    expect(cardFor(on, 'twitter', ACCOUNT, { conversationId: '1990000000000000001' }, NOW)!.conversationIds).toEqual(['1990000000000000001'])
  })

  test('whose turn it is: the owner last means waiting on them, they last means the owner, and a reaction is not speaking', () => {
    const on = freshDb()
    const id = chat(on, `${FRIEND_ID}:${OWNER_ID}`)
    say(on, id, false, 'how much does it cost to run?', '2026-11-15T16:50:00Z')
    say(on, id, true, 'cost will be high doe', '2026-11-15T16:56:19Z')
    expect(buildCard(on, 'twitter', ACCOUNT, [{ chatId: id, conversationId: `${FRIEND_ID}:${OWNER_ID}`, kind: 'dm', name: null }], NOW).waitingOn).toBe('them')
    say(on, id, false, '(reacted 👍)', '2026-11-15T17:00:00Z')
    expect(cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!.waitingOn).toBe('them')
    say(on, id, false, 'whats the plan for the hermes one?', '2026-11-15T21:30:00Z')
    const card = cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!
    expect(card.waitingOn).toBe('owner')
    expect(card.theyAskedOpen.map((l) => l.text)).toEqual(['whats the plan for the hermes one?'])
  })

  test("the owner's open question is listed until they answer it", () => {
    const on = freshDb()
    const id = chat(on, `${FRIEND_ID}:${OWNER_ID}`)
    say(on, id, false, 'just shipped the plugin', '2026-11-14T10:00:00Z')
    say(on, id, true, 'what did you build it in', '2026-11-14T10:05:00Z')
    const asked = cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!
    expect(asked.ownerAskedOpen.map((l) => l.text)).toEqual(['what did you build it in'])
    say(on, id, false, 'typescript and bun', '2026-11-14T11:00:00Z')
    expect(cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!.ownerAskedOpen).toEqual([])
  })

  test('an answer is owed only when they wrote last within a day', () => {
    const line = (fromOwner: boolean, at: string) => ({ from: fromOwner ? 'the owner' : 'vladFriend', fromOwner, text: 'x', at })
    expect(answerOwed({ waitingOn: 'owner', last: [line(true, '2026-11-15T20:00:00Z'), line(false, '2026-11-15T21:30:00Z')] }, NOW)).toBe(true)
    expect(answerOwed({ waitingOn: 'owner', last: [line(false, '2026-11-12T09:05:00Z')] }, NOW)).toBe(false)
    expect(answerOwed({ waitingOn: 'them', last: [line(true, '2026-11-15T21:00:00Z')] }, NOW)).toBe(false)
  })

  test('a stored card is read back until a newer message lands, and a chat nobody worked or claimed costs nothing', () => {
    const on = freshDb()
    const id = chat(on, `${FRIEND_ID}:${OWNER_ID}`)
    say(on, id, false, 'yo', '2026-11-15T10:00:00Z')
    expect(refreshWorkedCards(on, 'twitter', ACCOUNT, `${FRIEND_ID}:${OWNER_ID}`, NOW)).toBe(0)
    const first = cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!
    expect(cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, new Date('2026-11-15T23:00:00Z'))!.builtAt).toBe(first.builtAt)
    say(on, id, true, 'whats up lad', '2026-11-15T11:00:00Z')
    expect(refreshWorkedCards(on, 'twitter', ACCOUNT, `${FRIEND_ID}:${OWNER_ID}`, NOW)).toBe(1)
    expect(cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!.ownerSaid.map((l) => l.text)).toEqual(['whats up lad'])
  })

  test("with five of the owner's messages the chat is judged on itself, and the card reads as short lines", () => {
    const on = freshDb()
    const id = chat(on, `${FRIEND_ID}:${OWNER_ID}`)
    for (const [i, text] of ['yo', 'whats up lad', 'outbound stuff', 'not bad idea', 'cost will be high doe'].entries()) say(on, id, true, text, `2026-11-15T16:5${i}:00Z`)
    const card = cardFor(on, 'twitter', ACCOUNT, { conversationId: `${FRIEND_ID}:${OWNER_ID}` }, NOW)!
    expect(scopedToThisChat(card)).toBe(true)
    const shown = renderCard(card)
    expect(shown).toContain('waiting on them')
    expect(shown.length).toBeLessThan(2500)
  })
})
