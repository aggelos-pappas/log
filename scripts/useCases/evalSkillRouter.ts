#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listUseCases } from '../../src/mcp/server/helpers/index.ts'
import { localEmbedder } from '../../src/search/conversations/helpers/embed.ts'
import { EMBED_DIMENSIONS, EMBED_MODEL } from '../../src/search/conversations/types.ts'
import { catalogHash } from '../../src/useCases/router/helpers/index'
import { buildMeaningIndex, fuseSkills, fuseTools, loadToolFacts, openMeaningIndex, routerCatalog, routerMeaning, routerSection, shippedSkills } from '../../src/useCases/router/index'
import { MEANING_DEPTH, ROUTER_MEANING_FILE, TOOL_GOLDEN_FILE } from '../../src/useCases/router/index'
import type { CatalogKind, RouterGolden, RouterMeaning, RouterMeaningFixture, ToolFusion } from '../../src/useCases/router/index'

const fixtures = join(import.meta.dir, '..', '..', 'src', 'useCases', 'router', 'fixtures')
const golden = JSON.parse(readFileSync(join(fixtures, TOOL_GOLDEN_FILE), 'utf8')) as RouterGolden[]
const useCases = listUseCases()
const facts = loadToolFacts()
const skills = shippedSkills()
const items = routerCatalog(useCases, facts, skills)
const embedder = localEmbedder()
const started = performance.now()
const index = openMeaningIndex(items, EMBED_MODEL, EMBED_DIMENSIONS) ?? (await buildMeaningIndex(items, embedder))
process.stderr.write(`index ready in ${Math.round(performance.now() - started)} ms: ${items.length} items\n`)

await embedder.embed(['warm the model'])
const meanings = new Map<string, RouterMeaning>()
const ms: number[] = []
for (const g of golden) {
  const m = await routerMeaning(g.prompt, index, (texts) => embedder.embed(texts))
  ms.push(m.ms)
  meanings.set(g.prompt, m)
}

const modes: ToolFusion[] = ['lexical', 'meaning', 'rrf', 'weighted']
const rows: string[] = []
const misses: Record<string, string[]> = {}
for (const mode of modes) {
  let first = 0, three = 0, skillFirst = 0, skillTwo = 0, negatives = 0
  const asks = golden.filter((g) => g.expect.length)
  const skillAsks = golden.filter((g) => g.skills?.length)
  const none = golden.filter((g) => !g.expect.length && !g.skills?.length)
  misses[mode] = []
  for (const g of golden) {
    const meaning = mode === 'lexical' ? null : meanings.get(g.prompt)!
    const tools = fuseTools(g.prompt, useCases, meaning, mode, facts).matches.map((m) => m.name)
    const chosen = fuseSkills(g.prompt, meaning, skills, mode)
    if (g.expect.length) {
      if (g.expect.includes(tools[0] ?? '')) first++
      else misses[mode].push(`${g.prompt} -> ${tools.slice(0, 3).join(', ') || '(nothing)'}`)
      if (tools.slice(0, 3).some((t) => g.expect.includes(t))) three++
    }
    if (g.skills?.length) {
      if (g.skills.includes(chosen[0] ?? '')) skillFirst++
      if (chosen.slice(0, 2).some((s) => g.skills!.includes(s))) skillTwo++
      else misses[mode].push(`skill: ${g.prompt} -> ${chosen.join(', ') || '(nothing)'}`)
    }
    if (!g.expect.length && !g.skills?.length) {
      const text = mode === 'lexical' ? fuseTools(g.prompt, useCases, null, 'lexical', facts).matches.length : routerSection(g.prompt, useCases, meaning, { facts, skills, fusion: mode }).text.length
      if (!text) negatives++
      else misses[mode].push(`NEGATIVE FIRED: ${g.prompt}`)
    }
  }
  rows.push(`| ${mode} | ${first}/${asks.length} | ${three}/${asks.length} | ${skillFirst}/${skillAsks.length} | ${skillTwo}/${skillAsks.length} | ${negatives}/${none.length} |`)
}
console.log('| fusion | tools top-1 | tools top-3 | skills top-1 | skills top-2 | negatives silent |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const row of rows) console.log(row)
const sorted = [...ms].sort((a, b) => a - b)
console.log(`\nmeaning per prompt (embed + score, warm): p50 ${sorted[Math.floor(sorted.length / 2)].toFixed(1)} ms, p99 ${sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1)].toFixed(1)} ms`)
if (process.argv.includes('--misses')) for (const [mode, list] of Object.entries(misses)) console.log(`\n${mode}:\n  ${list.join('\n  ')}`)
if (process.argv.includes('--cosines')) {
  for (const g of golden) {
    const m = meanings.get(g.prompt)!
    console.log(`${g.expect.length || g.skills?.length ? '+' : '-'} ${m.tool[0]?.id}:${m.tool[0]?.score.toFixed(3)} ${m.skill[0]?.id}:${m.skill[0]?.score.toFixed(3)} ${m.play[0]?.id}:${m.play[0]?.score.toFixed(3)}  ${g.prompt.slice(0, 70)}`)
  }
}
if (process.argv.includes('--write')) {
  const fixture: RouterMeaningFixture = { model: EMBED_MODEL, hash: catalogHash(items, EMBED_MODEL), prompts: {} }
  for (const [prompt, m] of meanings) {
    const kinds: Partial<Record<CatalogKind, [string, number][]>> = {}
    for (const kind of ['play', 'tool', 'skill'] as CatalogKind[]) kinds[kind] = m[kind].slice(0, MEANING_DEPTH).map((h) => [h.id, Number(h.score.toFixed(4))])
    fixture.prompts[prompt] = kinds
  }
  const prompts = Object.entries(fixture.prompts).map(([prompt, kinds]) => `  ${JSON.stringify(prompt)}: ${JSON.stringify(kinds)}`)
  writeFileSync(join(fixtures, ROUTER_MEANING_FILE), `{"model": ${JSON.stringify(fixture.model)}, "hash": ${JSON.stringify(fixture.hash)}, "prompts": {\n${prompts.join(',\n')}\n}}\n`)
}
embedder.stop?.()
