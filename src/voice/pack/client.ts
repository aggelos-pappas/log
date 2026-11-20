import { wordPairsOf, wordsOf } from '../phrases/index'
import { cosineOf } from '../aiTells/helpers/bounded'
import type { AiPhrase } from '../aiTells/types'
import type { VoiceProfile } from '../pairs/types'
import { compareLines } from '../converge/client'
import { AI_PHRASE_MAX_WORDS, NEVER_SHARE, PACK_AI_LINES, PACK_ASK, PACK_PER_TIER, PACK_WORD_PAIRS, STOCK_NOT_HIM, USES_SHARE } from './types'
import type { GroundingPack, NotHimLine, PackInput, PackPair } from './types'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function topWordPairs(replies: readonly string[], limit = PACK_WORD_PAIRS): string[] {
  const counts = new Map<string, number>()
  for (const reply of replies) for (const pair of new Set(wordPairsOf(wordsOf(reply.replace(/\([^)]*\)/g, ' '))))) counts.set(pair, (counts.get(pair) ?? 0) + 1)
  return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([pair]) => pair)
}

export function featuresLine(profile: VoiceProfile | null, replies: readonly string[]): string {
  if (!profile) return 'no messages of his here yet: write short, lowercase and casual'
  const marks: [string, number][] = [['commas', profile.commas], ['full stops', profile.fullStops], ['questions', profile.questions], ['!', profile.exclamations], ['emoji', profile.emoji]]
  const uses = marks.filter(([, n]) => n >= USES_SHARE).map(([name, n]) => `${name} ${pct(n)}`)
  const never = marks.filter(([, n]) => n < NEVER_SHARE).map(([name]) => name)
  const pairs = topWordPairs(replies)
  return [
    `median ${profile.medianWords} words a message, ${profile.burst.median} message(s) a burst at about ${profile.burst.messageWords} words each, ${pct(profile.lowercase)} all lowercase`,
    `uses ${uses.join(', ') || 'little punctuation'}`,
    `never ${never.join(', ') || '-'}`,
    `his word pairs here: ${pairs.join(', ') || '-'}`,
    `opens with ${profile.openers.slice(0, 6).join(', ') || '-'}`,
  ].join('; ')
}

export function aiPhrasesNear(phrases: readonly AiPhrase[], vectors: readonly ArrayLike<number>[] | null, query: { text: string; vector?: ArrayLike<number> | null }, limit = PACK_AI_LINES): string[] {
  const short = phrases.map((p, i) => ({ p, i })).filter(({ p }) => p.text.split(/\s+/).length <= AI_PHRASE_MAX_WORDS)
  if (query.vector && vectors?.length) return short.map(({ p, i }) => ({ text: p.text, c: vectors[i] ? cosineOf(query.vector!, vectors[i]) : -1 })).sort((a, b) => b.c - a.c).slice(0, limit).map((x) => x.text)
  const words = new Set(wordsOf(query.text).filter((w) => w.length > 3))
  const scored = short.map(({ p }) => ({ text: p.text, shared: wordsOf(p.text).filter((w) => words.has(w)).length })).filter((x) => x.shared > 0)
  return scored.sort((a, b) => b.shared - a.shared || a.text.length - b.text.length).slice(0, limit).map((x) => x.text)
}

export function packOf(input: PackInput): GroundingPack {
  const answered = input.near.filter((n) => n.reply.trim())
  const thisChat = answered.filter((n) => n.tier === 'sameChat' || n.tier === 'samePerson').slice(0, PACK_PER_TIER)
  const allChats = answered.filter((n) => n.tier !== 'sameChat' && n.tier !== 'samePerson').slice(0, PACK_PER_TIER)
  const ai = (input.aiPhrases.length ? input.aiPhrases : STOCK_NOT_HIM).slice(0, PACK_AI_LINES)
  const notHim: NotHimLine[] = [...ai.map((text) => ({ text, why: 'an AI phrase close to this kind of reply' })), ...input.theirLines.filter((t) => t.trim()).slice(-1).map((text) => ({ text: text.slice(0, 200), why: 'how they write, not him' }))]
  if (notHim.length < 2) notHim.push(...STOCK_NOT_HIM.filter((t) => !notHim.some((n) => n.text === t)).slice(0, 2 - notHim.length).map((text) => ({ text, why: 'an AI phrase close to this kind of reply' })))
  return { chat: input.chat, thisChat, allChats, features: featuresLine(input.profile, input.chatReplies), notHim, talk: input.style ? compareLines(input.style) : [], facts: [...(input.facts ?? [])], ask: PACK_ASK }
}

function pairLines(pairs: readonly PackPair[]): string[] {
  return pairs.flatMap((p) => [`  ${p.chat} (${String(p.at ?? '').slice(0, 10)})`, ...(p.said ? [`    ${p.saidBy ?? 'they'} wrote: ${p.said.replace(/\n/g, ' / ').slice(0, 200)}`] : []), `    he answered: ${p.reply.replace(/\n/g, ' / ').slice(0, 240)}`])
}

export function renderPack(pack: GroundingPack): string {
  return [
    `his real replies to messages like this, in this chat first:`,
    ...(pack.thisChat.length ? pairLines(pack.thisChat) : ['  none in this chat yet']),
    `then from his other chats:`,
    ...(pack.allChats.length ? pairLines(pack.allChats) : ['  none']),
    `his features here: ${pack.features}`,
    ...pack.talk,
    ...(pack.facts.length ? ['facts he has said here (use only facts he has said):', ...pack.facts.map((f) => `  ${f}`)] : ['facts: none of his found here, so state no facts he has not said']),
    `not him (never write like these):`,
    ...pack.notHim.map((n) => `  "${n.text}" (${n.why})`),
    pack.ask,
  ].join('\n')
}
