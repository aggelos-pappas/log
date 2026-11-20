import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DecisionRequest, DecisionsClient } from '../../../subq/decisions/index'
import { ANSWER_WINDOW_MS, CONTEXT_PASS, OWNER_DMS, NEVER_SAYS, VOICE_MODEL, VOICE_PASS } from './types'
import type { OptionDraft, VoiceDraft, VoiceReading } from './types'
import { watermarkReadingOf } from '../watermark/index'

export function guidePath(env: Record<string, string | undefined> = process.env): string {
  if (env.LOG_VOICE_GUIDE) return env.LOG_VOICE_GUIDE
  const repo = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
  return join(repo, '..', '..', 'GUIDES', 'OWNER_WRITING_STYLE.md')
}

export function readGuide(path = guidePath()): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

export function neverSaysIn(text: string): string[] {
  const lower = text.toLowerCase()
  return NEVER_SAYS.filter((p) => lower.includes(p))
}

export function messagesOf(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

export function burstOf(text: string): { messages: string[]; words: number[] } {
  const messages = messagesOf(text)
  return { messages, words: messages.map((m) => (m.match(/[\p{L}\p{N}']+/gu) ?? []).length) }
}

export function outsideXVoice(draft: Pick<VoiceDraft, 'evidence'>): { where: string } | null {
  const platform = draft.evidence?.platform
  if (!platform || platform === 'twitter') return null
  return { where: `${platform} ${draft.evidence?.kind ?? 'chat'}` }
}

export function alreadyTalkedIn(draft: Pick<VoiceDraft, 'evidence' | 'conversation' | 'ownerWroteHere'>): boolean {
  if ((draft.ownerWroteHere ?? 0) > 0) return true
  if ((draft.evidence?.recent?.length ?? 0) > 0) return true
  if ((draft.conversation ?? []).some((m) => m.from === 'the owner')) return true
  return (draft.evidence?.replies ?? []).some((r) => r.tier === 'sameChat' || r.tier === 'samePerson')
}

export function nothingWaiting(draft: Pick<VoiceDraft, 'evidence' | 'conversation' | 'context' | 'ownerWroteHere'>, now = Date.now()): boolean {
  if (!alreadyTalkedIn(draft)) return false
  const moments = [...(draft.conversation ?? [])].sort((a, b) => a.at.localeCompare(b.at))
  const last = moments.at(-1)
  if (!last) return !draft.context
  if (last.from === 'the owner') return true
  return now - Date.parse(last.at) > ANSWER_WINDOW_MS
}

export function nobodyToAnswer(draft: Pick<VoiceDraft, 'room'>): boolean {
  return !!draft.room?.nobodyElseLately && draft.room.kind !== 'dm'
}

export function voiceRequestOf(draft: VoiceDraft, guide: string): DecisionRequest {
  const publicReply = draft.publicReply === true
  const alreadyTalked = alreadyTalkedIn(draft)
  const coldDm = !alreadyTalked && !publicReply
  const burst = burstOf(draft.text)
  const outside = outsideXVoice(draft)
  const notX = outside ? ` howOwnerWrites is how he writes on X only, his public posts and replies; this is ${outside.where}, where he writes in bursts of shorter lines and does ask questions, so read howOwnerWritesInThisChat (its burst median, messageWords and medianWords) and ownersRealRepliesHere first, and use howOwnerWrites only for his vocabulary and his spelling.` : ''
  return {
    model: VOICE_MODEL,
    state: {
      howOwnerWrites: guide,
      dmsOwnerWroteHimself: OWNER_DMS,
      ...(publicReply ? { thisIsAPublicReply: 'This is not a dm. It is a public reply on X, posted under a comment or post and read by everyone, sent as one post however many lines it has. Judge it against howOwnerWrites, his public posts and replies on X, not against how he writes dms: short, lowercase, about what they said. A link in it is normal for him there.' } : {}),
      ...(!publicReply && burst.messages.length > 1 ? { dmAsItWillBeSent: burst.messages, wordsInEachMessageAsSent: burst.words } : {}),
      ...(outside ? { howOwnerWritesIsOnlyHisX: true, thisChatIsNotX: outside.where } : {}),
      ...(draft.everywhere ? { howOwnerWritesEverywhere: draft.everywhere.profile, ownersRealRepliesEverywhere: draft.everywhere.replies, ownersClosestWordingEverywhere: draft.everywhere.wording ?? [] } : {}),
      ...(draft.evidence ? { thisChat: draft.evidence.chat, howOwnerWritesInThisChat: draft.evidence.profile, ownersRealRepliesHere: draft.evidence.replies, ownersClosestRealWording: draft.evidence.wording ?? [], ownersLatestMessagesHere: draft.evidence.recent ?? [] } : {}),
      phrasesOwnerNeverSays: NEVER_SAYS,
      ...(draft.phrasesNewToOwner ? { wordPairsOwnerHasNeverWritten: draft.phrasesNewToOwner } : {}),
      ...(draft.scrambler ? { watermarkScramblerLayerA: draft.scrambler } : {}),
      recipient: draft.to,
      alreadyTalkedInThisChat: alreadyTalked,
      ...(coldDm ? { neverMessagedBefore: `The owner has never messaged ${draft.to} before: this is his first message to them, so there is no chat of theirs to match. Judge it as his cold opener to a stranger (short, lowercase, about their post or what they did), not against how he banters in chats he already has.` } : {}),
      whatTheySaid: draft.context ?? null,
      ...(draft.card ? { thisConversation: draft.card } : {}),
      ...(draft.conversation ? { thisConversationRankedForThisMoment: draft.conversation } : {}),
      ...(draft.room ? { theRoom: draft.room } : {}),
      ...(draft.spoken && draft.howOwnerTalks?.length ? { howOwnerTalksInHisOwnVoiceNotes: draft.howOwnerTalks } : {}),
      dm: draft.text,
    },
    questions: {
      voice: draft.spoken ? { type: 'noul', instructions: 'This is a voice note the owner sends, said out loud in his own voice, not a typed message, so it runs longer than his texts and its length, capitals and punctuation never count against it. Going first by how the owner actually talks in his own voice notes (howOwnerTalksInHisOwnVoiceNotes, transcribed from his real recordings: his fillers, his slang, how he strings things together), then by the owner\'s own messages across all his conversations (ownersRealRepliesEverywhere, ownersClosestWordingEverywhere, howOwnerWritesEverywhere), and in this chat when there is one (ownersRealRepliesHere, ownersClosestRealWording, ownersLatestMessagesHere), with howOwnerWrites and dmsOwnerWroteHimself behind them, would someone who knows him believe the owner said this himself: his words and phrasing, his slang, the way he talks, nothing he never says, nothing that reads polished or written for him?', criteria: { true: 'It sounds like the owner saying it', false: 'It sounds like ai or a copywriter wrote it for him' } } : { type: 'noul', instructions: 'Going by the owner\'s own messages across all his conversations (ownersRealRepliesEverywhere, ownersClosestWordingEverywhere, howOwnerWritesEverywhere), and in this chat when there is one (ownersRealRepliesHere, ownersClosestRealWording, ownersLatestMessagesHere), with howOwnerWrites and dmsOwnerWroteHimself behind them, would someone who knows him believe the owner typed this himself: his words and phrasing, his slang, his length, nothing he never writes, nothing that reads polished or written for him? A draft written on several lines goes out as one message per line, so read it as the messages it will be sent as (dmAsItWillBeSent, with wordsInEachMessageAsSent) and as the burst of them, never as one block: his length is each message against howOwnerWritesInThisChat burst messageWords and medianWords, and how many he sends in a row against its burst median. A subject he has never written about never counts against him: words for a new subject are new vocabulary, not a voice problem, so judge the phrasing, the shape and the register, never the topic.' + notX, criteria: { true: 'It sounds like the owner typed it', false: 'It sounds like ai or a copywriter wrote it for him' } },
      inContext: { type: 'noul', instructions: 'Does the dm answer what they actually said or asked (whatTheySaid), read in this conversation (thisConversation, its card: what they said that is still open and what the owner already asked and said there; and thisConversationRankedForThisMoment, the moments of this chat that matter most to what is being answered, media described in brackets), including anything they sent that it should have answered? With nothing given, does it pick up on something specific about them?', criteria: { true: 'It answers them specifically', false: 'It is generic and could go to anyone' } },
      openerOnly: { type: 'noul', instructions: 'If the owner has never talked with them (alreadyTalkedInThisChat is false and nothing of theirs is in whatTheySaid, or it says they have never chatted), is this first dm only an opener about something relevant to them (their post, their work, how they are connected to the owner), with no ask: no pitch, no question about a tool, product or service of the owner\'s (treg, log, his consulting), no call, no link to his own stuff? If they have already talked, answer true.', criteria: { true: 'It is only a relevant opener, or they have already talked', false: 'A first message that goes in with an ask or a pitch' } },
      friendLike: { type: 'noul', instructions: 'Does this dm read like the owner messaging someone he is friendly with: casual, natural and human, not a sales template or a bot?', criteria: { true: 'It reads like a mate texting', false: 'It reads like a template, a pitch or a bot' } },
      ...(draft.room ? { fitsTheRoom: { type: 'noul', instructions: 'Read theRoom: what kind of chat this is, who has spoken in it lately and who the message must be addressed to (addressTo). Does the draft speak to that audience as it really is? A message to a channel or group where nobody else has spoken lately must talk to the room as a whole, and must not address one person as if they were mid-conversation with the owner, answer something they did not just say, or bring up what they said long ago as if it were now. In a direct message where the owner sent the latest messages and they have not answered yet, a follow-up that carries on from what the owner just sent them (a question about their own post he just shared) is addressed to them as the chat really is: it fails only when it acts as if they had replied, or answers something they never said.', criteria: { true: 'It is addressed to the room as it really is', false: 'It talks to someone who is not there, or as if a conversation were live when it is not' } } } : {}),
      ...(draft.spoken ? { buildsOn: { type: 'noul', instructions: 'Read the whole conversation (thisChat, ownersLatestMessagesHere, thisConversationRankedForThisMoment and whatTheySaid). Does this voice note build on what they are talking about, taking their points further and adding something new to them, rather than repeating or re-explaining what the owner has already told them in this chat?', criteria: { true: 'It builds on what they said and adds to it', false: 'It repeats what the owner already said or ignores what they are talking about' } } } : {}),
      ...(draft.evidence ? { toThem: draft.spoken ? { type: 'noul', instructions: 'Going by ownersRealRepliesHere and howOwnerWritesInThisChat, does this voice note sound like the owner talking to them in this chat: his words, slang and register here? It is spoken, so its length and punctuation never count against it.', criteria: { true: 'It sounds like him talking to them here', false: 'It sounds like how he talks somewhere else, or like nobody' } } : { type: 'noul', instructions: 'Going by ownersRealRepliesHere (what they said and how the owner really replied, the same chat first) and howOwnerWritesInThisChat (counted from his own messages there), does this dm read like the owner writing to them in this chat: the same length, case, punctuation, words and register he uses here?', criteria: { true: 'It reads like his real replies here', false: 'It reads like how he writes somewhere else, or like nobody' } } } : {}),
    },
  }
}

export function voiceReadingOf(draft: VoiceDraft, raw: Record<string, unknown>, model: string | null, suffix = ''): VoiceReading {
  const answers = raw as Record<string, { noul?: number }>
  const of = (key: string) => answers[`${key}${suffix}`]?.noul ?? 0
  const neverSays = neverSaysIn(draft.text)
  const publicReply = draft.publicReply === true
  const alreadyTalked = alreadyTalkedIn(draft)
  const coldDm = !alreadyTalked && !publicReply
  const voice = of('voice')
  const inContext = of('inContext')
  const friendLike = of('friendLike')
  const openerOnly = alreadyTalked || publicReply ? 1 : of('openerOnly')
  const toThem = draft.evidence ? of('toThem') : null
  const buildsOn = draft.spoken ? of('buildsOn') : null
  const fitsTheRoom = draft.room ? of('fitsTheRoom') : null
  const watermark = watermarkReadingOf(draft.text)
  const answerRequired = !nobodyToAnswer(draft) && (draft.cardAnswerOwed ?? !nothingWaiting(draft))
  return { firstContact: coldDm, to: draft.to, voice, inContext, answerRequired, friendLike, openerOnly, toThem, buildsOn, fitsTheRoom, neverSays, watermark, pass: !neverSays.length && watermark.level !== 'artifacts' && voice >= VOICE_PASS && (!answerRequired || inContext >= CONTEXT_PASS) && friendLike >= CONTEXT_PASS && openerOnly >= CONTEXT_PASS && (toThem === null || toThem >= CONTEXT_PASS) && (buildsOn === null || buildsOn >= CONTEXT_PASS) && (fitsTheRoom === null || fitsTheRoom >= CONTEXT_PASS), model }
}

export async function readVoice(draft: VoiceDraft, guide: string, decide: DecisionsClient): Promise<VoiceReading> {
  const response = await decide(voiceRequestOf(draft, guide))
  return voiceReadingOf(draft, response.answers, response.model ?? null)
}

const PER_OPTION_STATE = ['dm', 'dmAsItWillBeSent', 'wordsInEachMessageAsSent', 'wordPairsOwnerHasNeverWritten', 'watermarkScramblerLayerA']

export function optionsRequestOf(draft: VoiceDraft, options: readonly OptionDraft[], guide: string): DecisionRequest {
  const base = voiceRequestOf({ ...draft, text: options[0]?.text ?? '' }, guide)
  const state = Object.fromEntries(Object.entries(base.state as Record<string, unknown>).filter(([key]) => !PER_OPTION_STATE.includes(key)))
  const listed = options.map((o, i) => {
    const burst = burstOf(o.text)
    return { option: i + 1, dm: o.text, ...(draft.publicReply !== true && burst.messages.length > 1 ? { asItWillBeSent: burst.messages, wordsInEachMessage: burst.words } : {}), ...(o.phrasesNewToOwner ? { wordPairsOwnerHasNeverWritten: o.phrasesNewToOwner } : {}), ...(o.scrambler ? { watermarkScramblerLayerA: o.scrambler } : {}) }
  })
  const questions: DecisionRequest['questions'] = {}
  options.forEach((_, i) => {
    for (const [key, question] of Object.entries(base.questions)) questions[`${key}_${i + 1}`] = { ...question, instructions: `${optionPreamble(i)} ${question.instructions}` }
  })
  return { model: base.model, state: { ...state, options: listed }, questions }
}

export function optionPreamble(i: number): string {
  return `Judge option ${i + 1} only (options[${i}].dm). Its own asItWillBeSent, wordsInEachMessage and wordPairsOwnerHasNeverWritten stand in for dmAsItWillBeSent, wordsInEachMessageAsSent and wordPairsOwnerHasNeverWritten. Grade it on its own, never against the other options.`
}

export async function readVoices(draft: VoiceDraft, options: readonly OptionDraft[], guide: string, decide: DecisionsClient): Promise<VoiceReading[]> {
  if (options.length === 1) return [await readVoice({ ...draft, ...options[0] }, guide, decide)]
  const response = await decide(optionsRequestOf(draft, options, guide))
  return options.map((o, i) => voiceReadingOf({ ...draft, text: o.text }, response.answers, response.model ?? null, `_${i + 1}`))
}
