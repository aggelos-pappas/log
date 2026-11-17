import { describe, expect, test } from 'bun:test'
import type { DecisionRequest } from '../../../subq/decisions/index'
import { alreadyTalkedIn, neverSaysIn, nothingWaiting, readVoice } from './index'

const answering = (voice: number, inContext = 0.95, friendLike = 0.95, openerOnly = 0.95) => {
  const asked: DecisionRequest[] = []
  const decide = async (request: DecisionRequest) => {
    asked.push(request)
    return { model: 'subq-snap-1.1', answers: { voice: { type: 'noul' as const, noul: voice }, inContext: { type: 'noul' as const, noul: inContext }, friendLike: { type: 'noul' as const, noul: friendLike }, openerOnly: { type: 'noul' as const, noul: openerOnly } }, usage: { input_tokens: 1, output_tokens: 1 } }
  }
  return { asked, decide }
}

describe('the voice gate', () => {
  test('a draft in the owner\'s voice that answers them passes, and SubQ is given his guide, his own dms and what they said', async () => {
    const { asked, decide } = answering(0.97)
    const reading = await readVoice({ to: 'handle_l1', text: 'yeah lets chop it up lad', context: 'we should chop it up some time' }, 'GUIDE', decide)
    expect(reading.pass).toBe(true)
    const state = asked[0].state as Record<string, unknown>
    expect(state.howOwnerWrites).toBe('GUIDE')
    expect(state.whatTheySaid).toBe('we should chop it up some time')
    expect((state.dmsOwnerWroteHimself as string[]).length).toBeGreaterThan(0)
  })

  test('a voice note is graded as spoken, never on length, and must build on the conversation instead of repeating it (rule 149)', async () => {
    const asked: DecisionRequest[] = []
    const decideWith = (buildsOn: number) => async (request: DecisionRequest) => {
      asked.push(request)
      return { model: 'subq-snap-1.1', answers: { voice: { type: 'noul' as const, noul: 0.9 }, inContext: { type: 'noul' as const, noul: 0.9 }, friendLike: { type: 'noul' as const, noul: 0.9 }, openerOnly: { type: 'noul' as const, noul: 1 }, buildsOn: { type: 'noul' as const, noul: buildsOn } }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    const said = 'ye the trending niches bit is a good shout and it ties into what you said about the api'
    const builds = await readVoice({ to: 'bea', text: said, context: 'it auto posts in trending niches', spoken: true, howOwnerTalks: ['I think so, to be honest, mate'] }, 'GUIDE', decideWith(0.9))
    expect((asked[0].state as Record<string, unknown>).howOwnerTalksInHisOwnVoiceNotes).toEqual(['I think so, to be honest, mate'])
    expect(builds.pass).toBe(true)
    expect(builds.buildsOn).toBe(0.9)
    const questions = asked[0].questions as Record<string, { instructions: string }>
    expect(questions.voice.instructions).toContain('howOwnerTalksInHisOwnVoiceNotes')
    expect(questions.voice.instructions).toContain('never count against it')
    expect(questions.buildsOn.instructions).toContain('rather than repeating')
    const repeats = await readVoice({ to: 'bea', text: said, context: 'it auto posts in trending niches', spoken: true }, 'GUIDE', decideWith(0.3))
    expect(repeats.pass).toBe(false)
    const typed = await readVoice({ to: 'bea', text: said, context: 'x' }, 'GUIDE', decideWith(0.1))
    expect(typed.buildsOn).toBe(null)
    expect((asked[2].questions as Record<string, unknown>).buildsOn).toBeUndefined()
  })

  test('a first message that goes in with an ask fails, however good the opener', async () => {
    const { asked, decide } = answering(0.95, 0.95, 0.95, 0.2)
    const reading = await readVoice({ to: 'someone', text: 'saw this the cascade pattern makes so much sense\nyou using treg yet', context: 'the owner and they follow each other, never chatted' }, 'GUIDE', decide)
    expect(reading.pass).toBe(false)
    expect(Object.keys(asked[0].questions)).toContain('openerOnly')
  })

  test('a reply in a chat the owner already talks in is never judged as a first message', async () => {
    const asked: DecisionRequest[] = []
    const decide = async (request: DecisionRequest) => {
      asked.push(request)
      return { model: 'subq-snap-1.1', answers: { voice: { type: 'noul' as const, noul: 0.95 }, inContext: { type: 'noul' as const, noul: 0.95 }, friendLike: { type: 'noul' as const, noul: 0.95 }, openerOnly: { type: 'noul' as const, noul: 0.4 }, toThem: { type: 'noul' as const, noul: 0.95 } }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    const evidence = { chat: 'lina', profile: 'short lowercase', replies: [], recent: [{ said: 'lets do it the owner', reply: 'let goo' }] }
    const reading = await readVoice({ to: 'lina', text: 'whats the plan with it', context: 'do you have some reddit knowledge', evidence } as never, 'GUIDE', decide)
    expect(reading.openerOnly).toBe(1)
    expect(reading.pass).toBe(true)
    expect((asked[0].state as Record<string, unknown>).alreadyTalkedInThisChat).toBe(true)
    expect(reading.firstContact).toBe(false)
    expect((asked[0].state as Record<string, unknown>).neverMessagedBefore).toBeUndefined()
  })

  test('a person the owner has never messaged is told to the gate, and a failed first message names the cold way', async () => {
    const asked: DecisionRequest[] = []
    const decide = async (request: DecisionRequest) => {
      asked.push(request)
      return { model: 'subq-snap-1.1', answers: { voice: { type: 'noul' as const, noul: 0.5 }, inContext: { type: 'noul' as const, noul: 0.95 }, friendLike: { type: 'noul' as const, noul: 0.95 }, openerOnly: { type: 'noul' as const, noul: 0.95 } }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    const reading = await readVoice({ to: 'stranger', text: 'cheers for the like' }, 'GUIDE', decide)
    expect(reading.firstContact).toBe(true)
    expect(String((asked[0].state as Record<string, unknown>).neverMessagedBefore)).toContain('first message')
    const { failedParts } = await import('../../../cli/twitter/helpers/voice')
    expect(failedParts({ ...reading, notHere: [], scrambler: { ran: false, suspicious: 0, hits: [] }, ranked: [] } as never)[0]).toContain('twitterPosts { user: "stranger" }')
  })

  test('a draft that sounds like ai fails on voice', async () => {
    const { decide } = answering(0.6)
    expect((await readVoice({ to: 'x', text: 'love this take' }, 'GUIDE', decide)).pass).toBe(false)
  })

  test('a phrase the owner never says fails it whatever SubQ thinks', async () => {
    const { decide } = answering(0.99)
    const reading = await readVoice({ to: 'x', text: 'the no crew bit hit home lad' }, 'GUIDE', decide)
    expect(reading.neverSays).toEqual(['hit home'])
    expect(reading.pass).toBe(false)
  })

  test('the never-says list is matched without case', () => {
    expect(neverSaysIn('That is SPOT ON and a Big Swing')).toEqual(['big swing', 'spot on'])
  })

  test('a draft written on several lines is read as the messages it will go out as, never as one block (the owner, 2026-11-12)', async () => {
    const { asked, decide } = answering(0.97)
    const draft = 'send the folder over and ill take a run at it\nwhats the live recordings thing about'
    const reading = await readVoice({ to: 'invoker', text: draft, context: 'okay let me know what you need' }, 'GUIDE', decide)
    expect(reading.pass).toBe(true)
    const state = asked[0].state as Record<string, unknown>
    expect(state.dmAsItWillBeSent).toEqual(['send the folder over and ill take a run at it', 'whats the live recordings thing about'])
    expect(state.wordsInEachMessageAsSent).toEqual([11, 6])
    const questions = asked[0].questions as Record<string, { instructions: string }>
    expect(questions.voice.instructions).toContain('dmAsItWillBeSent')
    expect(questions.voice.instructions).toContain('never as one block')
    expect(questions.voice.instructions).toContain('A subject he has never written about never counts against him')
  })

  test('every gate reads the owner across all his conversations, beside the chat and the guide', async () => {
    const { asked, decide } = answering(0.97)
    const everywhere = { chat: 'all', profile: { replies: 9 }, replies: [{ said: 'nice', reply: 'cheers lad', chat: 'x', tier: 'anywhere' }], wording: [] }
    const chat = { chat: 'them', profile: { replies: 2 }, replies: [{ said: 'yo', reply: 'yo lad', chat: 'them', tier: 'sameChat' }], recent: [] }
    await readVoice({ to: 'a', text: 'cheers lad', everywhere }, 'GUIDE', decide)
    await readVoice({ to: 'b', text: 'yo lad', evidence: chat, everywhere }, 'GUIDE', decide)
    for (const request of asked) {
      const state = request.state as Record<string, unknown>
      expect(state.howOwnerWrites).toBe('GUIDE')
      expect(state.ownersRealRepliesEverywhere).toEqual(everywhere.replies)
    }
    expect((asked[1].state as Record<string, unknown>).ownersRealRepliesHere).toEqual(chat.replies)
  })
})


describe("the opener rule only reads a first message (rule 98)", () => {
  test("a chat with the owner's own messages in it, or his replies from that chat or person, is already talking", () => {
    expect(alreadyTalkedIn({ conversation: [{ from: "1663390258099101696", text: "i cannot even mention to you who they are", at: "2026-11-03T15:51:49Z" }, { from: "the owner", text: "fair enough", at: "2026-11-03T15:40:00Z" }] })).toBe(true);
    expect(alreadyTalkedIn({ evidence: { chat: "sage_gtm (twitter dm)", profile: null, replies: [{ said: "x", reply: "y", chat: "sage_gtm", tier: "samePerson" }], recent: [] } as never })).toBe(true);
  });

  test("someone the owner has never talked with is still a first message", () => {
    expect(alreadyTalkedIn({ conversation: [{ from: "123", text: "hey", at: "2026-11-04T00:00:00Z" }], evidence: { chat: "anywhere", profile: null, replies: [{ said: "x", reply: "y", chat: "other", tier: "anywhere" }], recent: [] } as never })).toBe(false);
    expect(alreadyTalkedIn({})).toBe(false);
  });
});

describe('a message to someone the owner already talks to, with nothing of theirs waiting, answers nothing', () => {
  const now = Date.parse('2026-11-15T22:00:00Z')
  const said = (from: string, at: string) => ({ from, text: 'x', at })

  test('the owner spoke last, or what they said is over a day old: nothing is waiting, so the post share is not held for not answering', () => {
    expect(nothingWaiting({ conversation: [said('vladFriend', '2026-11-15T16:50:00Z'), said('the owner', '2026-11-15T16:56:19Z')] }, now)).toBe(true)
    expect(nothingWaiting({ conversation: [said('the owner', '2026-11-12T09:00:00Z'), said('vladFriend', '2026-11-12T09:05:00Z')] }, now)).toBe(true)
  })

  test('they wrote last today, or the owner has never talked with them: an answer is still owed', () => {
    expect(nothingWaiting({ conversation: [said('the owner', '2026-11-15T20:00:00Z'), said('vladFriend', '2026-11-15T21:30:00Z')] }, now)).toBe(false)
    expect(nothingWaiting({ conversation: [said('vladFriend', '2026-11-10T09:05:00Z')] }, now)).toBe(false)
  })
})

describe('the conversation card in the gate', () => {
  test('the card goes to SubQ first, and decides whether an answer is owed', async () => {
    const { asked, decide } = answering(0.95, 0.2)
    const share = { to: 'vladFriend', text: 'bro dropped the new one', context: 'how much does it cost', card: 'this conversation: vladFriend (twitter dm); the owner wrote last, so it is waiting on them' }
    const nothingOwed = await readVoice({ ...share, cardAnswerOwed: false }, 'GUIDE', decide)
    expect(nothingOwed.pass).toBe(true)
    expect(nothingOwed.answerRequired).toBe(false)
    expect((asked[0].state as Record<string, unknown>).thisConversation).toBe(share.card)
    const owed = await readVoice({ ...share, cardAnswerOwed: true }, 'GUIDE', decide)
    expect(owed.pass).toBe(false)
    expect(owed.answerRequired).toBe(true)
  })
})

describe('a send the owner already made is never made twice', () => {
  test('the owner spoke last within the window: refused, with what went out', async () => {
    const { alreadyAnswered } = await import('../../../cli/twitter/helpers/voice')
    const now = Date.parse('2026-11-17T16:40:00Z')
    const chat = [{ fromMe: false, time: '2026-11-17T16:23:00Z', text: 'leads_25.tsv' }, { fromMe: true, time: '2026-11-17T16:30:00Z', text: 'finish these 5 first' }]
    expect(alreadyAnswered(chat, now)).toEqual({ at: '2026-11-17T16:30:00Z', text: 'finish these 5 first' })
  })

  test('they wrote after the owner, or the owner last spoke hours ago: allowed', async () => {
    const { alreadyAnswered } = await import('../../../cli/twitter/helpers/voice')
    const now = Date.parse('2026-11-17T16:40:00Z')
    expect(alreadyAnswered([{ fromMe: true, time: '2026-11-17T16:30:00Z', text: 'x' }, { fromMe: false, time: '2026-11-17T16:35:00Z', text: 'y' }], now)).toBeNull()
    expect(alreadyAnswered([{ fromMe: true, time: '2026-11-15T10:00:00Z', text: 'old nudge' }], now)).toBeNull()
    expect(alreadyAnswered([], now)).toBeNull()
  })
})
