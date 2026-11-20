#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { hookAnswer } from '../../src/contextLayer/hook/index'
import { listUseCases } from '../../src/mcp/server/helpers/guides.ts'
import { nameHints, namedChats, messageCounter, mentionCounter, wordUseCounter } from '../../src/inbox/nameHints/index'
import { labelMatch } from '../../src/inbox/nameHints/helpers/index'
import { askOf, route as wordRoute } from '../../src/useCases/router/index'
import { blockTokens } from './helpers/blocks'
import type { BenchTurn } from './helpers/blocks'

const arg = (name: string, fallback = '') => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback
}

const promptsPath = arg('prompts')
const dbPath = arg('db', process.env.LOG_DB ?? '')
if (!promptsPath || !dbPath) {
  console.error('usage: bun scripts/bench/nameHints.ts --prompts <turns.json> --db <copy of log.db> [--blocks] [--all]')
  process.exit(2)
}

const raw = JSON.parse(readFileSync(promptsPath, 'utf8')) as (string | BenchTurn)[]
const turns: BenchTurn[] = raw.map((t, i) => (typeof t === 'string' ? { session: 'bench', prompt: t, tools: [], at: i } : t))
const database = new Database(dbPath, { readonly: true })
const chats = namedChats(database)
const count = messageCounter(database)
const mentions = mentionCounter(database)
const uses = wordUseCounter(database)
const names = (prompt: string) => nameHints(prompt, chats, count, mentions, uses)
const useCases = listUseCases()

const matches: { turn: number; said: string; name: string; platform: string; label: string; why: string }[] = []
const fires: { turn: number; kind: string; line: string; prompt: string }[] = []
let hookChars = 0
for (const [i, turn] of turns.entries()) {
  const prompt = askOf(turn.prompt)
  for (const hint of names(prompt)) {
    const { label, why } = labelMatch(prompt, hint.said, hint.chat.name)
    matches.push({ turn: i, said: hint.said, name: hint.chat.name, platform: `${hint.chat.platform} ${hint.chat.kind}`, label, why })
  }
  const result = await hookAnswer({ hook_event_name: 'UserPromptSubmit', prompt: turn.prompt }, async (p) => wordRoute(p, { useCases }), () => useCases, () => '')
  hookChars += result.text.length
  const line = result.text.split('\n').find((l) => l.startsWith('>>> PLAY MATCH') || l.startsWith('>>> MAYBE A PLAY'))
  if (line) fires.push({ turn: i, kind: line.startsWith('>>> PLAY MATCH') ? 'play' : 'maybe', line: `${line.slice(0, 140)} ${result.text.split('\n')[1]?.trim().slice(0, 60) ?? ''}`, prompt: turn.prompt.slice(0, 160) })
}
database.close()

const wrong = matches.filter((m) => m.label === 'wrong').length
const right = matches.filter((m) => m.label === 'right').length
const unclear = matches.filter((m) => m.label === 'unclear').length
const report = {
  prompts: turns.length,
  names: { matches: matches.length, right, wrong, unclear, precision: matches.length ? right / (right + wrong + unclear) : 1, precisionOfLabelled: right + wrong ? right / (right + wrong) : 1, wrongPer50: (wrong / turns.length) * 50, promptsWithAPointer: new Set(matches.map((m) => m.turn)).size },
  router: { fires: fires.length, play: fires.filter((f) => f.kind === 'play').length, maybe: fires.filter((f) => f.kind === 'maybe').length, hookTokensPerTurn: Math.round(hookChars / 4 / turns.length) },
  blocks: process.argv.includes('--blocks') ? await blockTokens(turns) : null,
  matches,
  fires,
}
console.log(JSON.stringify(process.argv.includes('--all') ? report : { prompts: report.prompts, names: report.names, router: report.router, blocks: report.blocks }, null, 2))
