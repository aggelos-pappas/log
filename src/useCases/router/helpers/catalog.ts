import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MEANING_DEPTH, MEANING_STEP_DISCOUNT, SKILL_DIRS } from '../types'
import type { CatalogItem, CatalogKind, CatalogText, MeaningHit, MeaningIndex, RoutableUseCase, SkillFacts, ToolDoc } from '../types'
import { cosine } from './semantic'
import { nameWords, stepRowsOf } from './tools'

const ITEM_TEXT_CHARS = 360

const frontValue = (head: string, key: string): string => {
  const line = new RegExp(`^${key}:\s*(.+)$`, 'm').exec(head)?.[1]?.trim() ?? ''
  return line.replace(/^(['"])([\s\S]*)\1$/, '$2').replace(/\\"/g, '"').replace(/''/g, "'")
}

export function skillOf(text: string): SkillFacts | null {
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
  if (!head) return null
  const name = frontValue(head, 'name')
  if (!name) return null
  const description = frontValue(head, 'description')
  const asks = [...frontValue(head, 'when_to_use').matchAll(/"([^"]+)"/g)].map((m) => m[1])
  const play = /A log play \(docs\/useCases\/(\w+\/\w+)\.md\)/.exec(description)?.[1] ?? null
  return { name, description, asks, play }
}

export function skillsIn(repo: string, dirs: readonly string[] = SKILL_DIRS): SkillFacts[] {
  const out = new Map<string, SkillFacts>()
  for (const dir of dirs) {
    const root = join(repo, dir)
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(root, entry.name, 'SKILL.md')
      if (!existsSync(path)) continue
      const skill = skillOf(readFileSync(path, 'utf8'))
      if (skill && !out.has(skill.name)) out.set(skill.name, skill)
    }
  }
  return [...out.values()]
}

const firstClause = (text: string) => text.split(/(?<=[.;:])\s|\s[-\u2014]\s|,\s/)[0]

const clip = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, ITEM_TEXT_CHARS)

const textsOf = (entries: readonly CatalogText[]): CatalogText[] => {
  const seen = new Set<string>()
  return entries.map((e) => ({ ...e, text: clip(e.text).toLowerCase() })).filter((e) => e.text && !seen.has(e.text) && Boolean(seen.add(e.text)))
}

export function catalogOf(useCases: readonly (RoutableUseCase & { text?: string })[], tools: readonly ToolDoc[], skills: readonly SkillFacts[], phrasesOf: (u: RoutableUseCase) => string[]): CatalogItem[] {
  const plays: CatalogItem[] = useCases.map((u) => ({
    kind: 'play',
    id: u.id,
    label: u.title,
    texts: textsOf([{ text: u.title, source: 'own' }, ...phrasesOf(u).map((text) => ({ text, source: 'own' as const })), ...stepRowsOf(u.text ?? '').map((r) => ({ text: r.step, source: 'step' as const }))]),
  }))
  const toolItems: CatalogItem[] = tools.map((t) => ({
    kind: 'tool',
    id: t.name,
    label: t.summary,
    texts: textsOf([{ text: `${nameWords(t.name)}: ${t.summary}`, source: 'own' }, { text: `${nameWords(t.name)}: ${firstClause(t.summary)}`, source: 'own' }, ...t.steps.map((text) => ({ text, source: 'step' as const }))]),
  }))
  const skillItems: CatalogItem[] = skills.map((s) => ({
    kind: 'skill',
    id: s.name,
    label: s.description,
    texts: textsOf([{ text: `${s.name.replace(/-/g, ' ')}: ${s.description}`, source: 'own' }, { text: `${nameWords(s.name).replace(/-/g, ' ')}: ${firstClause(s.description)}`, source: 'own' }, ...s.asks.map((text) => ({ text, source: 'own' as const }))]),
  }))
  return [...plays, ...toolItems, ...skillItems].filter((item) => item.texts.length)
}

export function catalogHash(items: readonly CatalogItem[], model: string): string {
  const hash = createHash('sha256').update(model)
  for (const item of items) hash.update(`\u0001${item.kind}\u0000${item.id}\u0000${item.texts.map((t) => `${t.source}:${t.text}`).join('\u0002')}`)
  return hash.digest('hex').slice(0, 32)
}

export function meaningRanks(promptVectors: readonly Float32Array[], index: Pick<MeaningIndex, 'items' | 'vectors'>, depth: number = MEANING_DEPTH): Record<CatalogKind, MeaningHit[]> {
  const out: Record<CatalogKind, MeaningHit[]> = { play: [], tool: [], skill: [] }
  if (!promptVectors.length) return out
  index.items.forEach((item, at) => {
    const scores: number[] = []
    item.texts.forEach((t, i) => {
      const vector = index.vectors[at][i]
      if (!vector) return
      let score = -1
      for (const p of promptVectors) score = Math.max(score, cosine(p, vector))
      scores.push(t.source === 'step' ? score * MEANING_STEP_DISCOUNT : score)
    })
    if (!scores.length) return
    scores.sort((a, b) => b - a)
    out[item.kind].push({ id: item.id, score: (scores[0] + (scores[1] ?? scores[0])) / 2 })
  })
  for (const kind of Object.keys(out) as CatalogKind[]) out[kind] = out[kind].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, depth)
  return out
}
