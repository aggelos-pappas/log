import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { aiIndexOf, saveAiIndex, storedEmbedder, vectorsFor } from '../../inbox/store/index'
import { askTermsOf, buildToolIndex, catalogHash, catalogOf, clearsToolBar, correctTypos, denseScores, fuseToolsOver, meaningRanks, rankToolsOver, reciprocalRankFusion, shortSummary, skillsIn, toolDocsOf, toolsText, windowsOf } from './helpers'
import type { ChatNameOf, ToolIndex } from './helpers'
import { EMBED_BATCH, PLAY_MEANING_FLOOR, ROUTER_BUDGET_MS, ROUTER_INDEX_NAME, ROUTER_VECTOR_KIND, SKILL_MEANING_FLOOR, SKILL_SUMMARY_CHARS, SKILL_WORD_FLOOR, SKILLS_SHOWN, TOOL_MEANING_SPREAD, TOOL_TEXT_BUDGET, AMBIGUITY_BAND, DEFAULT_MENU_FLOOR, DEFAULT_THRESHOLD, DENSE_WEIGHT, MATCHES_SHOWN, MIN_PHRASE_WORDS, NOT_A_PROMPT, PLATFORM_BONUS, PLATFORM_FOLDERS, PLATFORM_WORDS, SHORT_PROMPT_WORDS, STOP_WORDS, TOOL_INDEX_FILE, TOOL_SYNONYMS, WORD_AMBIGUITY_BAND, WORD_MENU_FLOOR, WORD_THRESHOLD } from './types'
import type { ToolFusion, CatalogItem, CatalogKind, EmbedTexts, FusedTools, MeaningAnswer, MeaningIndex, RouterMeaning, RouterSection, SkillFacts, PlayMatch, RoutableUseCase, RouteContext, RouteDecision, RouteIndex, Thresholds, ToolFacts, ToolMatch, Utterance } from './types'

const PLACEHOLDER = /<[^<>]*>/g

const TIE_EPSILON = 1e-9

export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length > 5 && word.endsWith('ied')) return `${word.slice(0, -3)}y`
  const plain = word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word
  if (plain.length > 5 && plain.endsWith('ing')) return plain.slice(0, -3)
  if (plain.length > 5 && plain.endsWith('ed')) return plain.slice(0, -2)
  if (plain.length > 4 && plain.endsWith('e')) return plain.slice(0, -1)
  return plain
}

export function contentWords(text: string): string[] {
  return (text.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(PLACEHOLDER, ' ').replace(/['’]/g, '').match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP_WORDS.has(w)).map(stem)
}

const STEMMED_PLATFORM_WORDS: ReadonlyMap<string, string> = new Map(Object.entries(PLATFORM_WORDS).flatMap(([word, platform]) => [[word, platform], [stem(word), platform]]))

export function platformsOf(words: Iterable<string>): string[] {
  const out = new Set<string>()
  for (const word of words) {
    const platform = STEMMED_PLATFORM_WORDS.get(word)
    if (platform) out.add(platform)
  }
  return [...out].sort()
}

export function folderOf(id: string): string {
  return id.split('/')[0] ?? ''
}

export function isPlatformFolder(id: string): boolean {
  return PLATFORM_FOLDERS.has(folderOf(id))
}

export function phrasesOf(useCase: RoutableUseCase): string[] {
  const quoted = [...useCase.asks.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  return [...quoted, useCase.title].filter((p) => {
    const words = new Set(contentWords(p)).size
    return words >= MIN_PHRASE_WORDS || (words === 1 && !/<[^<>]*>/.test(p))
  })
}

export function phraseScore(promptWords: ReadonlySet<string>, phrase: string): number {
  const words = [...new Set(contentWords(phrase))]
  if (!words.length) return 0
  if (words.length < MIN_PHRASE_WORDS) return promptWords.has(words[0]) ? (promptWords.size <= SHORT_PROMPT_WORDS ? 1 : 1 / MIN_PHRASE_WORDS) : 0
  return words.filter((w) => promptWords.has(w)).length / words.length
}

export function isPrompt(text: string): boolean {
  return !NOT_A_PROMPT.some((pattern) => pattern.test(text))
}

export function utterancesOf(useCases: readonly RoutableUseCase[], extra: readonly Utterance[] = []): Utterance[] {
  const known = new Set(useCases.map((u) => u.id))
  return [...useCases.flatMap((u) => phrasesOf(u).map((text) => ({ route: u.id, text }))), ...extra.filter((u) => known.has(u.route))]
}

export function vocabularyOf(texts: readonly string[]): Set<string> {
  const vocabulary = new Set(texts.flatMap((t) => (t.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3)))
  for (const word of STOP_WORDS) vocabulary.add(word)
  for (const word of Object.keys(PLATFORM_WORDS)) vocabulary.add(word)
  return vocabulary
}

const vocabularies = new WeakMap<readonly RoutableUseCase[], Set<string>>()

let lastVocabulary: { key: string; vocabulary: Set<string> } | null = null

const textOf = (useCase: RoutableUseCase) => (useCase as RoutableUseCase & { text?: string }).text ?? ''

export function useCaseVocabulary(useCases: readonly RoutableUseCase[]): Set<string> {
  const known = vocabularies.get(useCases)
  if (known) return known
  const key = useCases.map((u) => `${u.id}\u0000${u.asks}\u0000${textOf(u)}`).join('\u0001')
  const built = lastVocabulary?.key === key ? lastVocabulary.vocabulary : vocabularyOf([...utterancesOf(useCases).map((u) => u.text), ...useCases.map(textOf)])
  lastVocabulary = { key, vocabulary: built }
  vocabularies.set(useCases, built)
  return built
}

export async function buildRouteIndex(useCases: readonly RoutableUseCase[], embed: EmbedTexts, model: string, extra: readonly Utterance[] = [], vocabularyText = ''): Promise<RouteIndex> {
  const utterances = utterancesOf(useCases, extra)
  const vectors = await embed(utterances.map((u) => u.text.toLowerCase()))
  const vocabulary = vocabularyOf([...utterances.map((u) => u.text), vocabularyText])
  return { model, useCases: [...useCases], utterances, extra: [...extra], vectors, vocabulary, titles: new Map(useCases.map((u) => [u.id, u.title])) }
}

export function sparseScores(prompt: string, utterances: readonly Utterance[]): Map<string, { score: number; text: string }> {
  const words = new Set(contentWords(prompt))
  const out = new Map<string, { score: number; text: string }>()
  for (const u of utterances) {
    const score = phraseScore(words, u.text)
    if (score > (out.get(u.route)?.score ?? 0)) out.set(u.route, { score, text: u.text })
  }
  return out
}

interface Scored extends PlayMatch {
  base: number
  named: boolean
  guess: boolean
}

const byScore = (a: Scored, b: Scored) => b.score - a.score || Number(b.named) - Number(a.named) || a.id.localeCompare(b.id)

const emptyDecision = (started: number, skipped?: RouteDecision['skipped']): RouteDecision => ({ outcome: 'none', play: null, matches: [], ranked: [], menu: [], platforms: [], ...(skipped ? { skipped } : {}), corrected: [], ms: { correct: 0, embed: 0, score: 0, total: performance.now() - started } })

export function route(prompt: string, context: RouteContext): RouteDecision {
  const started = performance.now()
  if (!isPrompt(prompt)) return emptyDecision(started, 'notAPrompt')
  const vocabulary = context.vocabulary === undefined ? useCaseVocabulary(context.useCases) : context.vocabulary
  const fixed = vocabulary ? correctTypos(prompt.replace(/https?:\/\/\S+/g, ' '), vocabulary) : { text: prompt, corrected: [] }
  const corrected = performance.now()
  const words = new Set(contentWords(fixed.text))
  if (!words.size) return { ...emptyDecision(started, 'trivial'), corrected: fixed.corrected }
  const platforms = platformsOf(words)
  const named = new Set(platforms)
  const sparse = sparseScores(fixed.text, utterancesOf(context.useCases, context.extra ?? []))
  const dense = context.dense
  const thresholds: Thresholds = context.thresholds ?? {}
  const scored: Scored[] = []
  for (const useCase of context.useCases) {
    const folder = folderOf(useCase.id)
    if (named.size && PLATFORM_FOLDERS.has(folder) && !named.has(folder)) continue
    const s = sparse.get(useCase.id)
    const d = dense?.get(useCase.id)
    const base = dense ? DENSE_WEIGHT * (d?.score ?? 0) + (1 - DENSE_WEIGHT) * (s?.score ?? 0) : (s?.score ?? 0)
    if (base <= 0) continue
    const onPlatform = named.has(folder)
    const phrase = (dense ? (d?.text ?? s?.text) : s?.text) ?? ''
    const guess = !onPlatform && platformsOf(contentWords(phrase)).some((p) => !named.has(p))
    scored.push({ id: useCase.id, title: useCase.title, score: base + (onPlatform ? PLATFORM_BONUS : 0), base, phrase, named: onPlatform, guess })
  }
  scored.sort(byScore)
  const ranked = scored.slice(0, MATCHES_SHOWN).map(({ named: _n, guess: _g, base: _b, ...m }) => m)
  const threshold = (id: string) => thresholds[id] ?? thresholds.default ?? (dense ? DEFAULT_THRESHOLD : WORD_THRESHOLD)
  const band = dense ? AMBIGUITY_BAND : WORD_AMBIGUITY_BAND
  const menuFloor = thresholds.menu ?? (dense ? DEFAULT_MENU_FLOOR : WORD_MENU_FLOOR)
  const [top, second] = scored
  const clear = Boolean(top) && !top.guess && top.base >= threshold(top.id) && (!second || top.score - second.score >= band - TIE_EPSILON)
  const done = performance.now()
  const ms = { correct: corrected - started, embed: 0, score: done - corrected, total: done - started }
  if (clear) {
    const play = ranked[0]
    return { outcome: 'play', play, matches: [play], ranked, menu: [], platforms, corrected: fixed.corrected, ms }
  }
  const menu = ranked.filter((m) => m.score >= menuFloor)
  return { outcome: menu.length ? 'menu' : 'none', play: null, matches: [], ranked, menu, platforms, corrected: fixed.corrected, ms }
}

export async function routePrompt(prompt: string, index: RouteIndex, embed: EmbedTexts, thresholds: Thresholds = {}): Promise<RouteDecision> {
  const started = performance.now()
  if (!isPrompt(prompt)) return emptyDecision(started, 'notAPrompt')
  const fixed = correctTypos(prompt.replace(/https?:\/\/\S+/g, ' '), index.vocabulary)
  if (!contentWords(fixed.text).length) return { ...emptyDecision(started, 'trivial'), corrected: fixed.corrected }
  const corrected = performance.now()
  const vectors = await embed(windowsOf(fixed.text))
  const embedded = performance.now()
  const decision = route(fixed.text, { useCases: index.useCases, extra: index.extra, dense: denseScores(vectors, index), thresholds, vocabulary: null })
  const done = performance.now()
  return { ...decision, corrected: fixed.corrected, ms: { correct: corrected - started, embed: embedded - corrected, score: done - embedded, total: done - started } }
}

export function outcomeOf(decision: Pick<RouteDecision, 'play' | 'menu' | 'skipped'>): string {
  if (decision.play) return decision.play.id
  return decision.menu.length ? 'menu' : 'none'
}

export function playMatchText(matches: readonly PlayMatch[], menu: readonly PlayMatch[] = []): string {
  const draft = "In a play, every message is drafted from that person's own thread and the owner's real replies (`search`, `voice` with no text), and no two read alike."
  const none = 'Building, fixing or talking about log itself is not a play.'
  if (matches.length) {
    const [top] = matches
    return [
      `>>> PLAY MATCH: the prompt matches the log play ${top.id} (${top.title}), closest to "${top.phrase}" (${Math.round(top.score * 100)}%). Its steps load with getGuide({ useCase: "${top.id}" }). ${none}`,
      draft,
    ].join('\n')
  }
  if (!menu.length) return ''
  return [
    `>>> MAYBE A PLAY: the prompt is close to these log plays, and none of them is a clear match. A play loads with getGuide({ useCase }). ${none}`,
    ...menu.map((m) => `  ${m.id}: ${m.title}`),
  ].join('\n')
}

export const TOOL_INDEX_PATH = join(import.meta.dir, 'fixtures', TOOL_INDEX_FILE)

export interface CommandToolEntry {
  tool: string
  live: boolean
  effect: string
  command: { platform: string; summary: string; usage: string; input?: { forms: readonly unknown[] } }
  form: { summary: string; flags: readonly { name: string; required?: boolean }[] } | null
}

const USAGE_NOTE_CHARS = 400

export function toolFactsOf(entries: readonly CommandToolEntry[], isPlatform: (word: string) => boolean): ToolFacts[] {
  const names = new Set(entries.map((e) => e.tool))
  return entries
    .filter((e) => !(e.live && names.has(e.tool.replace(/Live$/, ''))))
    .map((e) => {
      const flags = (e.form?.flags ?? []).map((f) => f.name).filter((name) => name !== 'json')
      const single = (e.command.input?.forms.length ?? 1) <= 1
      const notes = single ? e.command.usage.split('\n').map((line) => line.trim()).filter((line) => line && !/^(Usage:\s*)?log /.test(line)).join(' ').slice(0, USAGE_NOTE_CHARS) : ''
      return {
        name: e.tool,
        platform: isPlatform(e.command.platform) ? e.command.platform : null,
        summary: [...new Set([e.form?.summary, single ? e.command.summary : ''])].filter(Boolean).join('. '),
        flags,
        required: (e.form?.flags ?? []).filter((f) => f.required && f.name !== 'json').map((f) => f.name),
        notes,
        effect: e.effect,
      }
    })
}

let toolFacts: { path: string; facts: ToolFacts[] } | null = null

export function loadToolFacts(path: string = TOOL_INDEX_PATH): ToolFacts[] {
  if (toolFacts?.path === path) return toolFacts.facts
  const facts = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ToolFacts[]) : []
  toolFacts = { path, facts }
  return facts
}

let lastToolIndex: { key: string; index: ToolIndex; known: Set<string> } | null = null

const toolTerms = { stem, contentWords, platformsOf }

export function toolIndexOf(useCases: readonly RoutableUseCase[], facts: readonly ToolFacts[] = loadToolFacts()): { index: ToolIndex; known: Set<string> } {
  const key = `${facts.length}\u0001${useCases.map((u) => `${u.id}\u0000${u.asks}\u0000${textOf(u).length}`).join('\u0001')}`
  if (lastToolIndex?.key === key) return lastToolIndex
  const docs = toolDocsOf(facts, useCases, phrasesOf)
  const known = vocabularyOf([...useCases.map((u) => `${u.title} ${u.asks} ${textOf(u)}`), ...facts.map((f) => `${f.summary} ${f.notes}`), Object.keys(TOOL_SYNONYMS).join(' ')])
  lastToolIndex = { key, index: buildToolIndex(docs, toolTerms), known }
  return lastToolIndex
}

export function rankTools(prompt: string, useCases: readonly RoutableUseCase[], facts: readonly ToolFacts[] = loadToolFacts(), chatNameOf?: ChatNameOf): ToolMatch[] {
  if (!isPrompt(prompt) || !facts.length) return []
  const { index, known } = toolIndexOf(useCases, facts)
  const fixed = correctTypos(prompt.replace(/https?:\/\/\S+/g, ' '), known)
  return rankToolsOver(fixed.text, index, toolTerms, known, undefined, prompt, chatNameOf)
}

export function toolMatchText(prompt: string, useCases: readonly RoutableUseCase[], facts: readonly ToolFacts[] = loadToolFacts(), chatNameOf?: ChatNameOf): { text: string; tools: string[] } {
  const matches = rankTools(prompt, useCases, facts, chatNameOf)
  if (!clearsToolBar(matches)) return { text: '', tools: [] }
  const text = toolsText(matches)
  return { text, tools: matches.map((m) => m.name) }
}

export const REPO_ROOT = join(import.meta.dir, '..', '..', '..')

export interface RouterEmbedder {
  model: string
  dimensions: number
  embed(texts: string[]): Promise<Float32Array[]>
}

export function routerCatalog(useCases: readonly RoutableUseCase[], facts: readonly ToolFacts[] = loadToolFacts(), skills: readonly SkillFacts[] = skillsIn(REPO_ROOT)): CatalogItem[] {
  return catalogOf(useCases, toolDocsOf(facts, useCases, phrasesOf), skills, phrasesOf)
}

export interface RouterIndexState {
  built: boolean
  fresh: boolean
  builtAt: string | null
  hash: string
  storedHash: string | null
  texts: number
  counts: Record<CatalogKind, number>
}

const countsOf = (items: readonly CatalogItem[]): Record<CatalogKind, number> => {
  const counts = { play: 0, tool: 0, skill: 0 }
  for (const item of items) counts[item.kind]++
  return counts
}

export function routerIndexState(items: readonly CatalogItem[], model: string): RouterIndexState {
  const hash = catalogHash(items, model)
  const row = aiIndexOf(ROUTER_INDEX_NAME)
  const stored = row ? (JSON.parse(row.meta) as { hash?: string }) : null
  return { built: Boolean(row), fresh: Boolean(row) && row?.model === model && stored?.hash === hash, builtAt: row?.builtAt ?? null, hash, storedHash: stored?.hash ?? null, texts: new Set(items.flatMap((i) => i.texts.map((t) => t.text))).size, counts: countsOf(items) }
}

export function openMeaningIndex(items: readonly CatalogItem[], model: string, dimensions: number): MeaningIndex | null {
  const state = routerIndexState(items, model)
  if (!state.fresh) return null
  const vectors = items.map((item) => vectorsFor(model, dimensions, item.texts.map((t) => t.text)))
  if (vectors.some((row) => row.some((v) => !v))) return null
  return { model, dimensions, hash: state.hash, items: [...items], vectors: vectors as Float32Array[][] }
}

export async function buildMeaningIndex(items: readonly CatalogItem[], embedder: RouterEmbedder, now: Date = new Date()): Promise<MeaningIndex> {
  const stored = storedEmbedder({ model: embedder.model, dimensions: embedder.dimensions, embed: (texts: string[]) => embedder.embed(texts) }, ROUTER_VECTOR_KIND)
  const unique = [...new Set(items.flatMap((i) => i.texts.map((t) => t.text)))]
  const made = new Map<string, Float32Array>()
  for (let at = 0; at < unique.length; at += EMBED_BATCH) {
    const batch = unique.slice(at, at + EMBED_BATCH)
    const vectors = await stored.embed(batch)
    batch.forEach((text, i) => made.set(text, vectors[i]))
  }
  const hash = catalogHash(items, embedder.model)
  saveAiIndex(ROUTER_INDEX_NAME, embedder.model, { hash, dimensions: embedder.dimensions, texts: unique.length, counts: countsOf(items) }, now)
  return { model: embedder.model, dimensions: embedder.dimensions, hash, items: [...items], vectors: items.map((item) => item.texts.map((t) => made.get(t.text)!)) }
}

export async function routerMeaning(prompt: string, index: MeaningIndex, embed: (texts: string[]) => Promise<Float32Array[]>): Promise<RouterMeaning> {
  const started = performance.now()
  const text = prompt.replace(/https?:\/\/\S+/g, ' ').toLowerCase()
  const ranks = meaningRanks(await embed(windowsOf(text)), index)
  return { model: index.model, ...ranks, ms: performance.now() - started }
}

export async function meaningWithin(prompt: string, index: MeaningIndex | null, embed: (texts: string[]) => Promise<Float32Array[]>, budgetMs: number = ROUTER_BUDGET_MS): Promise<MeaningAnswer> {
  const started = performance.now()
  if (!index) return { meaning: null, fallback: 'notLoaded', ms: 0 }
  if (!isPrompt(prompt) || !contentWords(prompt).length) return { meaning: null, ms: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<'late'>((resolve) => (timer = setTimeout(() => resolve('late'), budgetMs)))
  try {
    const answer = await Promise.race([routerMeaning(prompt, index, embed), late])
    const ms = performance.now() - started
    return answer === 'late' ? { meaning: null, fallback: 'overBudget', ms } : { meaning: answer, ms }
  } catch {
    return { meaning: null, fallback: 'failed', ms: performance.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

export function fuseTools(prompt: string, useCases: readonly RoutableUseCase[], meaning: RouterMeaning | null, fusion: ToolFusion = 'rrf', facts: readonly ToolFacts[] = loadToolFacts(), chatNameOf?: ChatNameOf): FusedTools {
  if (!isPrompt(prompt) || !facts.length) return { matches: [], lexical: [], meaning: [] }
  const { index, known } = toolIndexOf(useCases, facts)
  const fixed = correctTypos(prompt.replace(/https?:\/\/\S+/g, ' '), known)
  return fuseToolsOver(fixed.text, index, toolTerms, known, meaning?.tool ?? null, fusion, prompt, chatNameOf)
}

export function skillWordScore(prompt: string, skill: SkillFacts): number {
  const words = new Set(askTermsOf(prompt, toolTerms))
  return Math.max(
    0,
    ...skill.asks.map((ask) => {
      const terms = [...new Set(askTermsOf(ask, toolTerms))]
      return terms.length >= MIN_PHRASE_WORDS ? terms.filter((t) => words.has(t)).length / terms.length : 0
    }),
  )
}

const skillOnPlatform = (named: ReadonlySet<string>, name: string) => {
  const folder = /^log-([a-z]+)-/.exec(name)?.[1]
  return !named.size || !folder || !PLATFORM_FOLDERS.has(folder) || named.has(folder)
}

export function fuseSkills(prompt: string, meaning: RouterMeaning | null, skills: readonly SkillFacts[], fusion: ToolFusion = 'rrf', limit: number = SKILLS_SHOWN): string[] {
  if (!isPrompt(prompt) || !askTermsOf(prompt, toolTerms).length) return []
  const named = new Set(platformsOf(contentWords(prompt)))
  const lexical = skills
    .map((s) => ({ id: s.name, score: skillWordScore(prompt, s) }))
    .filter((s) => s.score >= SKILL_WORD_FLOOR && skillOnPlatform(named, s.id))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((s) => s.id)
  const hits = (meaning?.skill ?? []).filter((h) => skillOnPlatform(named, h.id))
  const near = (hits[0]?.score ?? 0) >= SKILL_MEANING_FLOOR ? hits.filter((h) => h.score >= hits[0].score - TOOL_MEANING_SPREAD).map((h) => h.id) : []
  if (fusion === 'lexical') return lexical.slice(0, limit)
  if (fusion === 'meaning') return near.slice(0, limit)
  return reciprocalRankFusion([lexical, near]).slice(0, limit).map((f) => f.id)
}

export function fusePlay(prompt: string, decision: Pick<RouteDecision, 'ranked'> | null, meaning: RouterMeaning | null, titles: ReadonlyMap<string, string> = new Map()): PlayMatch | null {
  const hits = meaning?.play ?? []
  if (!hits.length || hits[0].score < PLAY_MEANING_FLOOR || !askTermsOf(prompt, toolTerms).length) return null
  const named = new Set(platformsOf(contentWords(prompt)))
  const allowed = (id: string) => !named.size || !isPlatformFolder(id) || named.has(folderOf(id))
  const lexical = (decision?.ranked ?? []).map((m) => m.id).filter(allowed)
  const near = hits.filter((h) => allowed(h.id) && h.score >= PLAY_MEANING_FLOOR).map((h) => h.id)
  if (!near.length) return null
  const top = reciprocalRankFusion([lexical, near])[0]
  const hit = hits.find((h) => h.id === top.id)
  return { id: top.id, title: titles.get(top.id) ?? decision?.ranked.find((m) => m.id === top.id)?.title ?? '', score: hit?.score ?? 0, phrase: '' }
}

const skillLine = (skill: SkillFacts | undefined, name: string) => `  skill ${name}${skill ? `: ${shortSummary(skill.description, SKILL_SUMMARY_CHARS)}` : ''}`

export function routerText(play: PlayMatch | null, tools: readonly ToolMatch[], skills: readonly string[], known: readonly SkillFacts[], budget: number = TOOL_TEXT_BUDGET): string {
  if (!play && !tools.length && !skills.length) return ''
  const head = ">>> Tools for this ask, ranked from log's plays, tools and skills by meaning and words:"
  const tail = "Use these; don't parse log output with scripts."
  const byName = new Map(known.map((s) => [s.name, s]))
  const wanted: [string, string][] = [
    ...(play ? [[`  play ${play.id}${play.title ? `: ${shortSummary(play.title, SKILL_SUMMARY_CHARS)}` : ''} (getGuide)`, `  play ${play.id} (getGuide)`] as [string, string]] : []),
    ...tools.map((m) => [`  ${m.call}: ${shortSummary(m.summary)}`, `  ${m.call}`] as [string, string]),
    ...skills.map((name) => [skillLine(byName.get(name), name), `  skill ${name}`] as [string, string]),
  ]
  const lines: string[] = []
  for (const [full, bare] of wanted) {
    const size = [head, ...lines, tail].join('\n').length + 1
    if (size + full.length <= budget) lines.push(full)
    else if (size + bare.length <= budget) lines.push(bare)
  }
  return lines.length ? [head, ...lines, tail].join('\n') : ''
}

export interface RouterOptions {
  decision?: Pick<RouteDecision, 'ranked'> | null
  playShown?: boolean
  facts?: readonly ToolFacts[]
  skills?: readonly SkillFacts[]
  chatNameOf?: ChatNameOf
  fusion?: ToolFusion
}

let skillCache: SkillFacts[] | null = null

export function shippedSkills(): SkillFacts[] {
  skillCache ??= skillsIn(REPO_ROOT)
  return skillCache
}

export function routerSection(prompt: string, useCases: readonly RoutableUseCase[], meaning: RouterMeaning | null, options: RouterOptions = {}): RouterSection {
  const facts = options.facts ?? loadToolFacts()
  const skills = options.skills ?? shippedSkills()
  const fusion = options.fusion ?? 'rrf'
  const tools = fuseTools(prompt, useCases, meaning, fusion, facts, options.chatNameOf).matches
  const titles = new Map(useCases.map((u) => [u.id, u.title]))
  const play = options.playShown || !meaning ? null : fusePlay(prompt, options.decision ?? route(prompt, { useCases }), meaning, titles)
  const playSkill = new Set(skills.filter((s) => s.play && s.play === play?.id).map((s) => s.name))
  const chosen = meaning ? fuseSkills(prompt, meaning, skills, fusion).filter((name) => !playSkill.has(name)) : []
  const text = routerText(play, tools, chosen, skills)
  return { text, tools: tools.map((m) => m.name), skills: chosen, play: play?.id ?? null }
}
