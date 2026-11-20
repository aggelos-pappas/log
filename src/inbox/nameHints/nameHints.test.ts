import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { closestNamed, nameHints, nameHintsText, nameScore, promptWords, storedNameHints } from './index'
import { commonWordNear, labelMatch, promptTokens, typoShare } from './helpers/index'
import type { NamedChat } from './index'

const chat = (name: string, over: Partial<NamedChat> = {}): NamedChat => ({ platform: 'discord', account: 'discordAccount', conversationId: '900000000000000001', kind: 'dm', name, messages: 40, lastMessageAt: '2026-11-19T13:33:51Z', ...over })
const chats = [chat('linus_k'), chat('grace_ships', { conversationId: '900000000000000002', messages: 12 }), chat('ada_builds', { platform: 'twitter', account: 'xAccount', conversationId: '1-2' }), chat('build crew', { kind: 'group', conversationId: '900000000000000003' })]

describe('names in a prompt become pointers to the stored chats, typos included', () => {
  test('a typo two edits away points at the real chat with the read tool, and nothing else', () => {
    const text = nameHintsText('summarise the discord convo with grase_shps, show opportunities and stats', chats)
    expect(text.split('\n')).toEqual([
      '>>> NAMED IN THE PROMPT (pointers into log.db; read the chat by its name, never list every chat):',
      '"grase_shps" → grace_ships · discord dm 900000000000000002 · 12 msgs · last 11-19 13:33 UTC → discordRead { account: "discordAccount", channel: "grace_ships" }',
    ])
  })

  test('a swapped-letter typo of a short name matches one token of the name', () => {
    expect(nameHints('what did lnius say', chats).map((h) => h.chat.name)).toEqual(['linus_k'])
  })

  test('an exact name scores highest, and each platform names its own read tool', () => {
    const [hint] = nameHints('open the dm with ada_builds', chats)
    expect(hint.score).toBe(1)
    expect(nameHintsText('open the dm with ada_builds', chats)).toContain('→ twitterDms { account: "xAccount", with: "ada_builds" }')
  })

  test('the full-text index fuses in: a chat that mentions the typed word wins a tie', () => {
    const twins = [chat('grace_ship', { conversationId: '7' }), chat('grace_shop', { conversationId: '8' })]
    const mentions = (_said: string, c: NamedChat) => (c.conversationId === '8' ? 3 : 0)
    expect(nameHints('ask grace_shxp', twins, undefined, mentions)[0].chat.conversationId).toBe('8')
    expect(nameScore(2, 0)).toBe(0.5)
    expect(nameScore(1, 2)).toBeCloseTo(0.85)
  })

  test('the section stays under its 600 character budget and keeps at most three pointers', () => {
    const many = Array.from({ length: 8 }, (_, i) => chat(`grace_ships${i}`, { conversationId: `90000000000000001${i}`, account: 'aVeryLongAccountNameForTheBudget' }))
    const text = nameHintsText('grace_ships0 grace_ships1 grace_ships2 grace_ships3 grace_ships4', many)
    expect(text.length).toBeLessThanOrEqual(600)
    expect(text.split('\n').length).toBeLessThanOrEqual(4)
  })

  test('common words, platform names and short words never become names, and no match says nothing', () => {
    expect(promptWords('summarise the discord convo, show opportunities and stats')).toEqual([])
    expect(promptWords('summarise the discord convo with joe')).toEqual(['joe'])
    expect(nameHintsText('show me the discord chats and stats', chats)).toBe('')
    expect(nameHintsText('refactor the parser', chats)).toBe('')
  })

  test('an everyday word that is only a later word of a chat name points nowhere, but the name\'s first word still does', () => {
    const named = [chat('Mika Live', { conversationId: '900000000000000004' }), chat('Orla Team', { conversationId: '900000000000000005' })]
    expect(nameHintsText('is it all live on that version, the whole team', named)).toBe('')
    expect(nameHints('what did mika say', named).map((h) => h.chat.name)).toEqual(['Mika Live'])
    expect(nameHints('ask orla', named).map((h) => h.chat.name)).toEqual(['Orla Team'])
  })

  test('a word people really write is not a typo of a name: only an exact name counts for it', () => {
    const named = [chat('mats_k', { conversationId: '900000000000000006' })]
    const uses = (said: string) => (said === 'meant' ? 120 : 0)
    expect(nameHints('is it meant to be there', named, undefined, undefined, uses)).toEqual([])
    expect(nameHints('ask mats_kk', named, undefined, undefined, uses).map((h) => h.chat.name)).toEqual(['mats_k'])
  })

  test('a typo of an everyday word is never read as a typo of a name', () => {
    const named = [chat('Nedra_L', { conversationId: '900000000000000007' })]
    expect(nameHints('we nened to fix it', named)).toEqual([])
    expect(nameHints('ask nedra_l', named).map((h) => h.chat.name)).toEqual(['Nedra_L'])
  })
})

describe('the stored chats come from log.db, dms and groups only, counted only when they match', () => {
  test('reads dm and group chats, counts the matched chat\'s messages and boosts it from searchIndex', () => {
    const database = new Database(':memory:')
    database.exec(`CREATE TABLE chats (chatId TEXT PRIMARY KEY, platform TEXT, account TEXT, conversationId TEXT, kind TEXT, name TEXT, serverId TEXT, lastMessageAt TEXT, backfilledAt TEXT)`)
    database.exec(`CREATE TABLE messages (seq INTEGER PRIMARY KEY, chatId TEXT, sentAt TEXT)`)
    database.exec(`CREATE VIRTUAL TABLE searchIndex USING fts5(source, ref, platform, account, conversationId, text)`)
    database.prepare(`INSERT INTO chats VALUES (?, 'discord', 'discordAccount', ?, ?, ?, NULL, '2026-11-19T10:00:00Z', NULL)`).run('discord:discordAccount:1', '1', 'dm', 'grace_ships')
    database.prepare(`INSERT INTO chats VALUES (?, 'discord', 'discordAccount', ?, ?, ?, NULL, '2026-11-19T10:00:00Z', NULL)`).run('discord:discordAccount:2', '2', 'channel', 'grace_ships')
    for (let i = 0; i < 3; i++) database.prepare(`INSERT INTO messages (chatId, sentAt) VALUES ('discord:discordAccount:1', '2026-11-19')`).run()
    database.prepare(`INSERT INTO searchIndex VALUES ('message', 'r1', 'discord', 'discordAccount', '1', 'graceships here')`).run()
    const text = storedNameHints('read graceships', database)
    expect(text).toContain('discord dm 1 · 3 msgs')
    expect(text.split('\n')).toHaveLength(2)
    database.close()
  })
})

describe('a list narrowed to the names closest to what was typed', () => {
  test('a typo keeps only the closest chats, an exact part of a name wins over a near miss', () => {
    const list = [{ name: 'joavo' }, { name: 'java club' }, { name: 'grace_ships' }]
    expect(closestNamed(list, 'jaovo', (c) => [c.name]).map((c) => c.name)).toEqual(['joavo'])
    expect(closestNamed(list, 'grace', (c) => [c.name]).map((c) => c.name)).toEqual(['grace_ships'])
    expect(closestNamed(list, 'zzzzzz', (c) => [c.name])).toEqual([])
  })
})

describe('a typo of a common word is never a name; a real mention still is', () => {
  const named = [
    chat('Mose', { conversationId: '900000000000000011' }),
    chat('Utils Hub', { kind: 'group', conversationId: '900000000000000012' }),
    chat('Coffee_and_Code', { kind: 'group', conversationId: '900000000000000013' }),
    chat('Jet', { conversationId: '900000000000000014' }),
    chat('QX', { conversationId: '900000000000000015' }),
    chat('Qin', { conversationId: '900000000000000016' }),
    chat('grace_ships', { conversationId: '900000000000000017' }),
    chat('linus_k', { conversationId: '900000000000000018' }),
  ]
  const names = (prompt: string) => nameHints(prompt, named).map((h) => h.chat.name)

  test('a fast, garbled prompt full of typos of everyday words points at nobody', () => {
    expect(names("so we need to mvoe on, im not tawre how to coemd asand it units train qiyzn")).toEqual([])
    expect(names('i want mose of it and the jet fuel is fine')).toEqual([])
  })

  test('a capital, an @, a handle shape or a word like with/ask/tell before it makes it a name', () => {
    expect(names('what did Jet say')).toEqual(['Jet'])
    expect(names('ask QX about it')).toEqual(['QX'])
    expect(names('@grace_ships replied?')).toEqual(['grace_ships'])
    expect(names('did linus_k answer')).toEqual(['linus_k'])
    expect(names('message mose about the call')).toEqual(['Mose'])
  })

  test('a short word only matches a name exactly, and a long typo never matches a short name', () => {
    expect(names('ask qinn')).toEqual([])
    expect(names('what did Qin say')).toEqual(['Qin'])
  })

  test('a later common word of a chat name is not a token of it', () => {
    expect(names('this and that')).toEqual([])
  })

  test('a fuzzy match to a chat quiet for months loses to the threshold; an exact one does not', () => {
    const old = [chat('grace_ships', { lastMessageAt: '2025-01-01T00:00:00Z' }), chat('linus_k', { conversationId: '9', lastMessageAt: '2026-11-19T00:00:00Z' })]
    expect(nameHints('summarise grase_shps', old)).toEqual([])
    expect(nameHints('summarise grace_ships', old).map((h) => h.chat.name)).toEqual(['grace_ships'])
  })
})

describe('the bench labels each pointer from the prompt alone', () => {
  test('common words and their typos are found, names are not', () => {
    expect(commonWordNear('mvoe')).not.toBeNull()
    expect(commonWordNear('coemd')).not.toBeNull()
    expect(commonWordNear('units')).toBe('units')
    expect(commonWordNear('grace_ships')).toBeNull()
  })

  test('a typo with no name context is wrong, a cued or exact uncommon name is right', () => {
    expect(labelMatch('we are mose of the way', 'mose', 'Mose').label).toBe('wrong')
    expect(labelMatch('ask mose', 'mose', 'Mose').label).toBe('right')
    expect(labelMatch('read grace_ships', 'grace_ships', 'grace_ships').label).toBe('right')
    expect(promptTokens('Hi. Jet said').map((t) => t.strong)).toEqual([false, true, false])
  })

  test('the share of unknown words is high for a garbled prompt and low for a clean one', () => {
    expect(typoShare('so how much lnoger tliek hwe ahve teh')).toBeGreaterThan(0.4)
    expect(typoShare('so how much longer will it take')).toBe(0)
  })
})
