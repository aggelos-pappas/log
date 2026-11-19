import { FUSED_TOOLS_SHOWN, TOOL_LEXICAL_WEIGHT, TOOL_MEANING_FLOOR, TOOL_MEANING_SPREAD, BM25_B, BM25_K1, NAME_FLAGS, PLATFORM_NAME_ALIASES, TOOL_PLATFORM_BONUS, PLATFORM_WORDS, STOP_WORDS, TOOL_FIELD_WEIGHTS, TOOL_KEEP_SHARE, TOOL_MIN_SCORE, TOOL_SUMMARY_CHARS, TOOL_GENERIC_WORDS, TOOL_RARE_DF, TOOL_READ_EFFECTS, TOOL_WRITE_WORDS, TOOL_STOP_WORDS, TOOL_SYNONYMS, TOOL_WEAK_WORDS, TOOL_TEXT_BUDGET, TOOLS_SHOWN } from '../types'
import type { FusedTools, MeaningHit, ToolFusion, RoutableUseCase, ToolDoc, ToolFacts, ToolFill, ToolMatch } from '../types'
import { reciprocalRankFusion } from './semantic'

export interface ToolTerms {
  stem: (word: string) => string
  contentWords: (text: string) => string[]
  platformsOf: (words: Iterable<string>) => string[]
}

export interface ToolIndex {
  docs: ToolDoc[]
  terms: Map<string, number>[]
  lengths: number[]
  average: number
  frequency: Map<string, number>
  names: Set<string>[]
}

const STEP_ROW = /^\|\s*\d+[a-z]?\s*\|/

const PLATFORM_TERMS = new Set(Object.keys(PLATFORM_WORDS))

const PLATFORM_NAMES = new Set([...Object.values(PLATFORM_WORDS), ...PLATFORM_NAME_ALIASES])

export function stepRowsOf(text: string): { step: string; tools: string[] }[] {
  return text
    .split('\n')
    .filter((line) => STEP_ROW.test(line))
    .map((line) => {
      const cells = line.split('|').map((c) => c.trim())
      return { step: cells[2] ?? '', tools: [...new Set([...(cells[3] ?? '').matchAll(/`(\w+)`/g)].map((m) => m[1]))] }
    })
}

export function nameWords(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
}

export function toolDocsOf(facts: readonly ToolFacts[], useCases: readonly (RoutableUseCase & { text?: string })[], phrasesOf: (u: RoutableUseCase) => string[]): ToolDoc[] {
  const asks = new Map<string, Set<string>>()
  const steps = new Map<string, string[]>()
  const plays = new Map<string, number>()
  const names = new Set(facts.map((f) => f.name))
  const base = (tool: string) => (tool.endsWith('Live') && names.has(tool.slice(0, -4)) ? tool.slice(0, -4) : tool)
  for (const useCase of useCases) {
    const phrases = phrasesOf(useCase)
    const rows = stepRowsOf(useCase.text ?? '').map((r) => ({ ...r, tools: [...new Set(r.tools.map(base))] }))
    for (const tool of new Set(rows.flatMap((r) => r.tools))) plays.set(tool, (plays.get(tool) ?? 0) + 1)
    for (const row of rows) {
      for (const tool of row.tools) {
        const known = asks.get(tool) ?? new Set<string>()
        for (const phrase of phrases) known.add(phrase)
        asks.set(tool, known)
        steps.set(tool, [...(steps.get(tool) ?? []), row.step])
      }
    }
  }
  return facts.map((f) => ({ ...f, asks: [...(asks.get(f.name) ?? [])], steps: steps.get(f.name) ?? [], plays: plays.get(f.name) ?? 0 }))
}

export function toolTermsOf(text: string, terms: ToolTerms): string[] {
  const words = (text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/<[^<>]*>/g, ' ').replace(/['\u2019]/g, '').match(/[a-z0-9]+/g) ?? []).filter((w) => !TOOL_STOP_WORDS.has(w)).map((w) => TOOL_SYNONYMS[w] ?? w)
  return terms.contentWords(words.filter((w) => !PLATFORM_NAMES.has(w)).join(' '))
}

export function buildToolIndex(docs: readonly ToolDoc[], terms: ToolTerms): ToolIndex {
  const fields = (d: ToolDoc): [string, number][] => [
    [nameWords(d.name), TOOL_FIELD_WEIGHTS.name],
    [d.summary, TOOL_FIELD_WEIGHTS.summary],
    [d.asks.join(' . '), TOOL_FIELD_WEIGHTS.asks / Math.max(1, d.plays)],
    [d.steps.join(' . '), TOOL_FIELD_WEIGHTS.steps],
    [d.flags.map(nameWords).join(' '), TOOL_FIELD_WEIGHTS.flags],
    [d.notes, TOOL_FIELD_WEIGHTS.notes],
  ]
  const termMaps = docs.map((d) => {
    const counts = new Map<string, number>()
    for (const [text, weight] of fields(d)) for (const term of toolTermsOf(text, terms)) counts.set(term, (counts.get(term) ?? 0) + weight)
    return counts
  })
  const lengths = termMaps.map((m) => [...m.values()].reduce((a, b) => a + b, 0))
  const frequency = new Map<string, number>()
  for (const m of termMaps) for (const term of m.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1)
  return { docs: [...docs], names: docs.map((d) => new Set(toolTermsOf(nameWords(d.name), terms))), terms: termMaps, lengths, average: lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length), frequency }
}

export function askTermsOf(prompt: string, terms: ToolTerms): string[] {
  const generic = new Set([...TOOL_GENERIC_WORDS].map(terms.stem))
  const words = (prompt.toLowerCase().replace(/['’]/g, '').match(/[a-z0-9]+/g) ?? []).filter((w) => !TOOL_GENERIC_WORDS.has(w))
  return toolTermsOf(words.join(' '), terms).filter((w) => !generic.has(w))
}

export function writesToAccount(doc: Pick<ToolFacts, 'platform' | 'effect'>): boolean {
  return doc.platform !== null && !TOOL_READ_EFFECTS.has(doc.effect)
}

export function asksToWrite(prompt: string): boolean {
  return (prompt.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => TOOL_WRITE_WORDS.has(w))
}

export function specificEnough(index: ToolIndex, query: readonly string[], at: number): boolean {
  const matched = [...new Set(query)].filter((term) => !TOOL_WEAK_WORDS.has(term) && index.terms[at].has(term))
  return matched.length >= 2 || matched.some((term) => index.names[at].has(term) || (index.frequency.get(term) ?? 0) <= TOOL_RARE_DF)
}

export function bm25(index: ToolIndex, query: readonly string[], at: number): number {
  const counts = index.terms[at]
  const n = index.docs.length
  let score = 0
  for (const term of new Set(query)) {
    const tf = counts.get(term) ?? 0
    if (!tf) continue
    const df = index.frequency.get(term) ?? 0
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
    score += (idf * tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + (BM25_B * index.lengths[at]) / index.average))
  }
  return score
}

export type ChatNameOf = (word: string) => string | null

export function fillOf(prompt: string, known: ReadonlySet<string>, platforms: readonly string[], chatNameOf: ChatNameOf = () => null): ToolFill {
  const text = prompt.toLowerCase().replace(/https?:\/\/\S+/g, ' ')
  const fill: ToolFill = { platforms: [...platforms] }
  const search = /\bsearch\s+(?:the\s+|my\s+)?([a-z0-9_. -]+?)\s+(?:server\s+|discord\s+)?for\s+["\u201c]?([^"\u201d?.!,]+)/.exec(text)
  if (search) {
    const server = search[1].replace(/\s+(server|discord)$/, '').trim()
    if (server && !STOP_WORDS.has(server)) fill.server = server
    fill.words = search[2].trim()
  }
  for (const m of text.matchAll(/\b(?:with|from|to|by)\s+@?([a-z0-9_.]+)/g)) {
    const word = m[1].replace(/\.+$/, '')
    if (word.length < 3 || STOP_WORDS.has(word) || PLATFORM_TERMS.has(word) || known.has(word)) continue
    const chat = chatNameOf(word)
    if (!chat) continue
    fill.name = chat
    break
  }
  return fill
}

export function callOf(doc: ToolFacts, fill: ToolFill): string {
  const parts: string[] = []
  const used = new Set<string>()
  const add = (flag: string, value?: string) => {
    if (used.has(flag)) return
    used.add(flag)
    parts.push(value === undefined ? flag : `${flag}: ${JSON.stringify(value)}`)
  }
  for (const flag of doc.required) {
    if (flag === 'query' && fill.words) add(flag, fill.words)
    else if (flag === 'server' && fill.server) add(flag, fill.server)
    else if (NAME_FLAGS.includes(flag) && fill.name) add(flag, fill.name)
    else add(flag)
  }
  if (fill.name && doc.flags.includes('with')) add('with', fill.name)
  if (fill.name && doc.flags.includes('from') && doc.required.includes('query')) add('from', fill.name)
  if (fill.platforms.length === 1 && doc.flags.includes('platform') && !doc.platform) add('platform', fill.platforms[0])
  return `${doc.name} { ${parts.join(', ')} }`.replace('{  }', '{}')
}

export interface ToolCandidates {
  query: string[]
  fill: ToolFill
  eligible: (at: number) => boolean
  lexical: { at: number; score: number }[]
}

export function toolCandidates(prompt: string, index: ToolIndex, terms: ToolTerms, known: ReadonlySet<string>, raw: string = prompt, chatNameOf?: ChatNameOf): ToolCandidates | null {
  const named = new Set(terms.platformsOf(terms.contentWords(prompt)))
  const query = askTermsOf(prompt, terms)
  if (!query.length) return null
  const fill = fillOf(raw, known, [...named], chatNameOf)
  const writes = asksToWrite(raw)
  const eligible = (at: number) => {
    const doc = index.docs[at]
    return !((named.size && doc.platform && !named.has(doc.platform)) || (!writes && writesToAccount(doc)))
  }
  const lexical = index.docs
    .map((doc, at) => ({ at, score: !eligible(at) || !specificEnough(index, query, at) ? 0 : bm25(index, query, at) * (doc.platform && named.has(doc.platform) ? 1 + TOOL_PLATFORM_BONUS : 1) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || index.docs[a.at].name.localeCompare(index.docs[b.at].name))
  return { query, fill, eligible, lexical }
}

const matchOf = (doc: ToolDoc, score: number, fill: ToolFill): ToolMatch => ({ name: doc.name, score, call: callOf(doc, fill), summary: doc.summary })

export function rankToolsOver(prompt: string, index: ToolIndex, terms: ToolTerms, known: ReadonlySet<string>, limit: number = TOOLS_SHOWN, raw: string = prompt, chatNameOf?: ChatNameOf): ToolMatch[] {
  const found = toolCandidates(prompt, index, terms, known, raw, chatNameOf)
  if (!found?.lexical.length) return []
  const top = found.lexical[0].score
  return found.lexical
    .filter((s) => s.score >= top * TOOL_KEEP_SHARE)
    .slice(0, limit)
    .map((s) => matchOf(index.docs[s.at], s.score, found.fill))
}

export function fuseToolsOver(prompt: string, index: ToolIndex, terms: ToolTerms, known: ReadonlySet<string>, meaning: readonly MeaningHit[] | null, fusion: ToolFusion = 'rrf', raw: string = prompt, chatNameOf?: ChatNameOf, limit: number = FUSED_TOOLS_SHOWN): FusedTools {
  const none: FusedTools = { matches: [], lexical: [], meaning: [] }
  if (!meaning || fusion === 'lexical') {
    const matches = rankToolsOver(prompt, index, terms, known, TOOLS_SHOWN, raw, chatNameOf)
    return clearsToolBar(matches) ? { matches: matches.slice(0, fusion === 'lexical' ? TOOLS_SHOWN : limit), lexical: matches.map((m) => m.name), meaning: [] } : none
  }
  const found = toolCandidates(prompt, index, terms, known, raw, chatNameOf)
  if (!found) return none
  const at = new Map(index.docs.map((d, i) => [d.name, i]))
  const lexicalTop = found.lexical[0]?.score ?? 0
  const lexicalOn = lexicalTop >= TOOL_MIN_SCORE
  const lexical = lexicalOn ? found.lexical.filter((s) => s.score >= lexicalTop * TOOL_KEEP_SHARE).map((s) => index.docs[s.at].name) : []
  const close = meaning.filter((h) => at.has(h.id) && found.eligible(at.get(h.id)!))
  const meaningOn = (close[0]?.score ?? 0) >= TOOL_MEANING_FLOOR
  const near = meaningOn ? close.filter((h) => h.score >= close[0].score - TOOL_MEANING_SPREAD).map((h) => h.id) : []
  if (fusion === 'meaning') return { matches: near.slice(0, limit).map((name) => matchOf(index.docs[at.get(name)!], close.find((h) => h.id === name)!.score, found.fill)), lexical, meaning: near }
  if (!lexical.length && !near.length) return { ...none, lexical, meaning: near }
  const fused = fusion === 'rrf' ? reciprocalRankFusion([lexical, near]) : weightedFusion(found.lexical.map((s) => ({ id: index.docs[s.at].name, score: s.score })).filter((s) => lexical.includes(s.id)), close.filter((h) => near.includes(h.id)))
  return { matches: fused.slice(0, limit).map((f) => matchOf(index.docs[at.get(f.id)!], f.score, found.fill)), lexical, meaning: near }
}

export function weightedFusion(lexical: readonly MeaningHit[], meaning: readonly MeaningHit[], weight: number = TOOL_LEXICAL_WEIGHT): MeaningHit[] {
  const top = lexical[0]?.score ?? 0
  const best = meaning[0]?.score ?? 0
  const scores = new Map<string, number>()
  for (const h of lexical) scores.set(h.id, weight * (top ? h.score / top : 0))
  for (const h of meaning) scores.set(h.id, (scores.get(h.id) ?? 0) + (1 - weight) * Math.max(0, 1 - (best - h.score) / TOOL_MEANING_SPREAD))
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

export function clearsToolBar(matches: readonly ToolMatch[], floor: number = TOOL_MIN_SCORE): boolean {
  return (matches[0]?.score ?? 0) >= floor
}

export function shortSummary(summary: string, chars: number = TOOL_SUMMARY_CHARS): string {
  const first = summary.split(/(?<=[.;])\s/)[0].replace(/[.;]$/, '')
  return first.length > chars ? `${first.slice(0, chars - 1).replace(/[\s,]+\S*$/, '')}\u2026` : first
}

export function toolsText(matches: readonly ToolMatch[], budget: number = TOOL_TEXT_BUDGET): string {
  if (!matches.length) return ''
  const head = '>>> Tools for this ask, ranked from log\'s tools:'
  const tail = "Use these; don't parse log output with scripts."
  const lines: string[] = []
  for (const m of matches) {
    const size = [head, ...lines, tail].join('\n').length + 1
    const line = `  ${m.call}: ${shortSummary(m.summary)}`
    const bare = `  ${m.call}`
    if (size + line.length <= budget) lines.push(line)
    else if (size + bare.length <= budget) lines.push(bare)
  }
  return lines.length ? [head, ...lines, tail].join('\n') : ''
}
