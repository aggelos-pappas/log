import { BOT_NAMES } from '../../../people/types'
import { ASK } from '../../label/types'
import type { LastWordMessage } from '../../lastWord/index'
import { EMOTION_GROUPS, FAST_REPLIES, FAST_REPLY_MS, LONG_REPLY_CHARS, WINDOW_CHARS, WINDOW_LINE_CHARS, WINDOW_MESSAGES } from '../types'
import type { BotSignal, Emotion, Features, WindowLine } from '../types'

const DAY = 86_400_000

const BOT_WORD = /(^|[^A-Za-z])bot([^A-Za-z]|$)|^(system|automod|noreply|notifications?|alerts?)$/i

const BOT_HANDLE = /[a-z0-9](Bot|BOT)$|(Updates|Notifications|NoReply|noreply)$/

const TEMPLATED = /(automated message|do not reply|verification code|has reached level|you('ve| have) (been|reached)|unsubscribe|click (here|below) to|your (order|ticket|subscription)|this channel is)/i

export function windowOf(said: readonly LastWordMessage[], size: number = WINDOW_MESSAGES): WindowLine[] {
  return said.slice(-size).map((m) => ({ fromOwner: m.fromOwner, text: m.text.replace(/\s+/g, ' ').trim().slice(0, WINDOW_LINE_CHARS), ms: m.ms, seq: m.seq, sender: m.fromOwner ? 'me' : (m.senderLabel ?? m.senderUserId) }))
}

export function windowText(lines: readonly WindowLine[], budget: number = WINDOW_CHARS): string {
  const kept: string[] = []
  let used = 0
  for (const l of [...lines].reverse()) {
    const line = `${l.fromOwner ? 'me' : 'them'}: ${l.text || '[attachment]'}`
    if (kept.length && used + line.length > budget) break
    kept.unshift(line.slice(0, budget))
    used += line.length + 1
  }
  return kept.join('\n')
}

export function turnsIn(said: readonly Pick<LastWordMessage, 'fromOwner'>[]): number {
  let turns = 0
  for (let i = 1; i < said.length; i++) if (said[i].fromOwner !== said[i - 1].fromOwner) turns++
  return turns
}

export function openAskIn(said: readonly Pick<LastWordMessage, 'fromOwner' | 'text'>[]): boolean {
  const at = said.map((m, i) => (m.fromOwner && ASK.test(m.text) ? i : -1)).filter((i) => i >= 0).pop()
  return at !== undefined && !said.slice(at + 1).some((m) => !m.fromOwner)
}

const shapeOf = (text: string): string => text.toLowerCase().replace(/https?:\/\/\S+/g, 'u').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 24)

export function botSignal(name: string, said: readonly LastWordMessage[]): BotSignal {
  const why: string[] = []
  const parts: number[] = []
  const plain = name.toLowerCase().replace(/^@/, '').replace(/[_.-]+/g, ' ').trim()
  if (BOT_NAMES.some((b) => plain === b || plain.replace(/\s+/g, '') === b.replace(/\s+/g, '')) || BOT_WORD.test(name) || BOT_HANDLE.test(name)) {
    parts.push(0.9)
    why.push(`the name "${name}" reads as a bot or system account`)
  }
  const theirs = said.filter((m) => !m.fromOwner)
  const mine = said.filter((m) => m.fromOwner)
  if (theirs.length >= 3) {
    const texts = [...new Set(theirs.map((m) => m.text.replace(/\s+/g, ' ').trim()).filter((t) => shapeOf(t).length >= 8))]
    const byShape = new Map<string, number>()
    for (const t of texts) byShape.set(shapeOf(t), (byShape.get(shapeOf(t)) ?? 0) + 1)
    const repeated = [...byShape.values()].filter((n) => n >= 2).reduce((a, b) => a + b, 0)
    const phrased = theirs.filter((m) => TEMPLATED.test(m.text)).length
    if (texts.length >= 3 && repeated / texts.length >= 0.5) {
      parts.push(0.6)
      why.push(`${repeated} of their ${texts.length} different messages share one template`)
    } else if (phrased / theirs.length >= 0.5) {
      parts.push(0.6)
      why.push('their messages read as system notices')
    }
    if (!mine.length) {
      parts.push(0.3)
      why.push('they write and the owner never answers')
    }
  }
  const gaps: number[] = []
  for (let i = 1; i < said.length; i++) if (said[i - 1].fromOwner && !said[i].fromOwner) gaps.push(said[i].ms - said[i - 1].ms)
  const long = theirs.length ? theirs.reduce((sum, m) => sum + m.text.length, 0) / theirs.length >= LONG_REPLY_CHARS : false
  if (gaps.length >= FAST_REPLIES && long) {
    const sorted = [...gaps].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    if (median > 0 && median < FAST_REPLY_MS) {
      parts.push(0.5)
      why.push(`they answer in ${Math.round(median / 100) / 10} s on the median, faster than a person types`)
    }
  }
  const score = 1 - parts.reduce((left, p) => left * (1 - p), 1)
  return { score: Math.round(score * 1000) / 1000, why }
}

export function featuresOf(said: readonly LastWordMessage[], bot: BotSignal, now: number = Date.now(), emotions: readonly Emotion[] | null = null): Features {
  const last = said[said.length - 1]
  const theirs = said.filter((m) => !m.fromOwner).length
  const feels = (group: keyof typeof EMOTION_GROUPS) => Math.round((emotions ?? []).filter((e) => EMOTION_GROUPS[group].includes(e.label)).reduce((sum, e) => sum + e.score, 0) * 1000) / 1000
  return {
    turns: turnsIn(said),
    daysQuiet: last ? Math.max(0, Math.floor((now - last.ms) / DAY)) : 0,
    openAsk: openAskIn(said) ? 1 : 0,
    lastFromMe: last?.fromOwner ? 1 : 0,
    theirShare: said.length ? Math.round((theirs / said.length) * 1000) / 1000 : 0,
    botScore: bot.score,
    neverWroteBack: theirs ? 0 : 1,
    feelsGood: feels('feelsGood'),
    feelsBad: feels('feelsBad'),
    feelsCurious: feels('feelsCurious'),
  }
}
