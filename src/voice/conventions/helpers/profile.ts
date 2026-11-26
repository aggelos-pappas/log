import { CONNECTIVES, HABIT_MAX_OWNER_SHARE, HABIT_MIN_RATIO, HEDGES, NGRAM_KEPT, NGRAM_MIN_AI, NGRAM_MIN_AI_SHARE, NGRAM_MIN_CHATS, NGRAM_MIN_RATIO, GRAM_MAX_OWNER_SHARE, OWNER_OPENER_SHARE } from '../types'
import { BANDS } from '../types'
import type { BandName, ConventionsProfile, HabitName, HabitStat, OverusedGram } from '../types'

const HABITS: readonly HabitName[] = ['emDash', 'curlyQuotes', 'markdown', 'endsWithFullStop', 'capitalStart', 'apostrophes', 'connectives', 'hedges', 'evenSentences', 'semicolon', 'exclamation']

export function tokensOf(text: string): string[] {
  return text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[’‘]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []
}

export function gramsOf(text: string): Set<string> {
  const tokens = tokensOf(text)
  const out = new Set<string>()
  for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(' '))
  return out
}

export function wordCountOf(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function sentencesOf(text: string): number[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => wordCountOf(s)).filter((n) => n > 0)
}

export function habitsOf(text: string): Set<HabitName> {
  const out = new Set<HabitName>()
  const trimmed = text.trim()
  if (/[—–]|\s--\s/.test(trimmed)) out.add('emDash')
  if (/[“”‘’]/.test(trimmed)) out.add('curlyQuotes')
  if (/\*\*[^*]+\*\*|__[^_]+__|^#{1,6}\s|^\s*[-*•]\s+\S|^\s*\d+\.\s+\S|`[^`]+`/m.test(trimmed)) out.add('markdown')
  if (/[a-z0-9)]\.$/i.test(trimmed) && !/\.\.$/.test(trimmed)) out.add('endsWithFullStop')
  if (/^[A-Z][a-z]/.test(trimmed)) out.add('capitalStart')
  if (/\b(I'm|I've|I'll|I'd|don't|can't|won't|isn't|it's|that's|you're|we're|they're|didn't|doesn't|wasn't)\b/.test(trimmed.replace(/’/g, "'"))) out.add('apostrophes')
  if (CONNECTIVES.test(trimmed)) out.add('connectives')
  if (HEDGES.test(trimmed.replace(/’/g, "'"))) out.add('hedges')
  if (/;/.test(trimmed)) out.add('semicolon')
  if (/!/.test(trimmed)) out.add('exclamation')
  const lengths = sentencesOf(trimmed)
  if (lengths.length >= 3) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length)
    if (mean >= 5 && sd / mean < 0.3) out.add('evenSentences')
  }
  return out
}

export function openerOf(text: string): string {
  return tokensOf(text).slice(0, 2).join(' ')
}

export function repeatedOpeners(texts: readonly string[]): Set<number> {
  const openers = texts.map(openerOf)
  const out = new Set<number>()
  openers.forEach((o, i) => {
    if (o && openers.some((p, j) => j !== i && p === o)) out.add(i)
  })
  return out
}

export interface ProfileRow {
  side: 'owner' | 'ai'
  text: string
  chat: string
}

export function buildProfile(rows: readonly ProfileRow[], his: (gram: string, aiTexts: string[]) => string | null = () => null): ConventionsProfile {
  const ai = rows.filter((r) => r.side === 'ai')
  const owner = rows.filter((r) => r.side === 'owner')
  if (!ai.length || !owner.length) return { grams: [], habits: [], openers: [] }
  const aiCount = new Map<string, number>()
  const aiChats = new Map<string, Set<string>>()
  const aiTexts = new Map<string, string[]>()
  for (const row of ai) for (const gram of gramsOf(row.text)) {
    aiCount.set(gram, (aiCount.get(gram) ?? 0) + 1)
    const chats = aiChats.get(gram) ?? new Set<string>()
    chats.add(row.chat)
    aiChats.set(gram, chats)
    const texts = aiTexts.get(gram) ?? []
    if (texts.length < 3) texts.push(row.text)
    aiTexts.set(gram, texts)
  }
  const ownerCount = new Map<string, number>()
  for (const row of owner) for (const gram of gramsOf(row.text)) if (aiCount.has(gram)) ownerCount.set(gram, (ownerCount.get(gram) ?? 0) + 1)
  const minAi = Math.max(NGRAM_MIN_AI, Math.ceil(NGRAM_MIN_AI_SHARE * ai.length))
  const ratioOf = (a: number, o: number) => ((a + 0.5) / ai.length) / ((o + 0.5) / owner.length)
  const candidates: OverusedGram[] = []
  for (const [gram, a] of aiCount) {
    if (a < minAi || (aiChats.get(gram)?.size ?? 0) < NGRAM_MIN_CHATS) continue
    const o = ownerCount.get(gram) ?? 0
    const ratio = ratioOf(a, o)
    if (ratio >= NGRAM_MIN_RATIO && o / owner.length <= GRAM_MAX_OWNER_SHARE) candidates.push({ gram, ratio: Number(ratio.toFixed(2)), ai: a, owner: o, his: null })
  }
  const inside = (small: OverusedGram, big: OverusedGram) => small !== big && small.gram.length < big.gram.length && ` ${big.gram} `.includes(` ${small.gram} `)
  const kept = candidates.filter((c) => !candidates.some((big) => inside(c, big) && big.ai >= c.ai) && !candidates.some((small) => inside(small, c) && small.ratio >= c.ratio && small.ai > c.ai)).sort((a, b) => b.ratio * Math.log(1 + b.ai) - a.ratio * Math.log(1 + a.ai)).slice(0, NGRAM_KEPT)
  for (const gram of kept) gram.his = his(gram.gram, aiTexts.get(gram.gram) ?? [])
  const aiHabits = ai.map((r) => ({ band: bandOfWords(wordCountOf(r.text)), habits: habitsOf(r.text) }))
  const ownerHabits = owner.map((r) => ({ band: bandOfWords(wordCountOf(r.text)), habits: habitsOf(r.text) }))
  const rate = (rows: typeof aiHabits, habit: HabitName) => (rows.length ? rows.filter((r) => r.habits.has(habit)).length / rows.length : 0)
  const statOf = (a: number, o: number, enough: boolean) => ({ ai: Number(a.toFixed(4)), owner: Number(o.toFixed(4)), flags: enough && o <= HABIT_MAX_OWNER_SHARE && (a + 0.001) / (o + 0.001) >= HABIT_MIN_RATIO })
  const habits: HabitStat[] = HABITS.map((habit) => {
    const a = rate(aiHabits, habit)
    const o = rate(ownerHabits, habit)
    const byBand = Object.fromEntries(BANDS.map((b) => {
      const aiBand = aiHabits.filter((r) => r.band === b.name)
      const ownerBand = ownerHabits.filter((r) => r.band === b.name)
      return [b.name, statOf(rate(aiBand, habit), rate(ownerBand, habit), aiBand.length >= 10 && ownerBand.length >= 50)]
    }))
    return { habit, ...statOf(a, o, true), ratio: Number(((a + 0.001) / (o + 0.001)).toFixed(2)), byBand }
  })
  const openerCount = new Map<string, number>()
  for (const row of owner) {
    const opener = openerOf(row.text)
    if (opener) openerCount.set(opener, (openerCount.get(opener) ?? 0) + 1)
  }
  const openers = [...openerCount].filter(([, n]) => n / owner.length >= OWNER_OPENER_SHARE).sort((a, b) => b[1] - a[1]).map(([o]) => o)
  return { grams: kept, habits, openers }
}

export function gramHits(text: string, profile: ConventionsProfile): OverusedGram[] {
  const grams = gramsOf(text)
  const hits = profile.grams.filter((g) => grams.has(g.gram))
  return hits.filter((h) => !hits.some((o) => o !== h && o.gram.length > h.gram.length && ` ${o.gram} `.includes(` ${h.gram} `)))
}

export function bandOfWords(words: number): BandName {
  return (BANDS.find((b) => words >= b.min && words <= b.max) ?? BANDS[BANDS.length - 1]).name
}

export function habitHits(text: string, profile: ConventionsProfile, openerRepeat = false): HabitStat[] {
  const habits = habitsOf(text)
  const band = bandOfWords(Math.max(wordCountOf(text), 1))
  const out = profile.habits.filter((h) => (h.byBand?.[band]?.flags ?? h.flags) && habits.has(h.habit))
  if (openerRepeat && !profile.openers.includes(openerOf(text))) out.push({ habit: 'openerRepeat', ai: 0, owner: 0, ratio: 0, flags: true })
  return out
}
