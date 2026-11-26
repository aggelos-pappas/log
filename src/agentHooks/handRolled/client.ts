import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, resolve } from 'node:path'
import { freshBlock } from '../sessionBlocks/index'
import type { BlockStore } from '../sessionBlocks/index'
import { SHARED_SESSION, sessionIdOf } from '../sessionOffsets/index'
import { textHits } from './helpers/detect'
import { normaliseCall } from './helpers/normalise'
import { HAND_ROLLED_GUIDE, HAND_ROLLED_RULE } from './types'
import type { ClassifyOptions, HandRolledHit, HandRolledKind, HandRolledVerdict, NormalisedCall } from './types'

const EXCLUDED = /^(?:(?:export\s+)?[A-Za-z_]\w*=\S*\s+)*(?:git|gh|tsc|npx\s+tsc|bunx\s+tsc|bun\s+(?:test|install|add|link|x\s+tsc|bin[\\/]logMcp\.ts|bin[\\/]log\.ts)|bun\s+run\s+(?!\S+\.(?:ts|tsx|js|mjs|cjs)\b)|log|logMcp|npm|pnpm|yarn)(?:\s|$)/

const RUNS = /(?:^|[\s;&|(])(?:bun(?:\s+run)?|bunx\s+tsx|tsx|node|deno\s+run(?:\s+-\S+)*|python3?|py|pwsh\s+-File|powershell(?:\.exe)?\s+-File|bash|sh)\s+(?:-\S+\s+)*(['"]?)([^\s'"|;&]+\.(?:ts|tsx|js|mjs|cjs|py|sh|ps1))\1/g

const REPO_SOURCE = /(?:^|[\\/])(?:src|scripts|docs|python|bin|vendor|site|skills|hermesPlugin|tests?|node_modules|\.claude|\.codex|\.opencode|\.agents|\.cursor)[\\/]|\.test\.\w+$/

const SCRIPT_FILE = /\.(?:ts|tsx|js|mjs|cjs|py|sh|ps1|sql)$/i

const LOG_FILE = /\.logCli[\\/]+(?!devlog\b|mcp[\\/]|privacy\b)/i

const READS_LABEL: Readonly<Record<string, string>> = { readsData: 'reads data', actsOnData: 'acts on data', both: 'reads and acts on data' }

export function isScratchScript(path: string): boolean {
  return SCRIPT_FILE.test(path) && !REPO_SOURCE.test(path.replace(/\\/g, '/'))
}

export function excludedCommand(segment: string): boolean {
  return EXCLUDED.test(segment.trim())
}

export function scriptsRun(segment: string): string[] {
  return [...segment.matchAll(RUNS)].map((m) => m[2])
}

function readScriptIn(cwd: string | undefined, path: string): string | null {
  try {
    const full = isAbsolute(path) ? path : resolve(cwd ?? process.cwd(), path)
    if (!existsSync(full) || statSync(full).size > 512_000) return null
    return readFileSync(full, 'utf8')
  } catch {
    return null
  }
}

function sameFile(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
  return norm(a) === norm(b) || norm(a).endsWith(`/${norm(b)}`) || norm(b).endsWith(`/${norm(a)}`)
}

function clip(text: string, max = 300): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export function hitsOf(call: NormalisedCall, options: ClassifyOptions = {}): HandRolledHit[] {
  const readScript = options.readScript ?? ((path: string) => readScriptIn(options.cwd, path))
  const hits: HandRolledHit[] = []
  for (const file of call.writtenFiles) {
    if (LOG_FILE.test(file.path)) {
      hits.push({ kind: 'actsOnData', target: `~/.logCli/${file.path.replace(/\\/g, '/').split(/\.logCli\/+/i)[1] ?? ''}`, why: `writes log's own files by hand: ${file.path}` })
      continue
    }
    if (!isScratchScript(file.path)) continue
    for (const hit of textHits(file.content)) hits.push({ ...hit, why: `the scratch script ${file.path} ${hit.why}` })
  }
  for (const segment of call.effectiveCommands) {
    if (excludedCommand(segment)) continue
    hits.push(...textHits(segment))
    for (const path of scriptsRun(segment)) {
      if (!isScratchScript(path)) continue
      const written = call.writtenFiles.find((f) => sameFile(f.path, path))
      if (written) continue
      const content = readScript(path)
      if (content) for (const hit of textHits(content)) hits.push({ ...hit, why: `runs the scratch script ${path}, which ${hit.why}` })
    }
  }
  for (const code of call.code) {
    const browser = code.startsWith('browser\n')
    hits.push(...textHits(browser ? code.slice(8) : code, browser))
  }
  const seen = new Set<string>()
  return hits.filter((h) => {
    const key = `${h.kind} ${h.target}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function classifyCall(toolName: string, input: Record<string, unknown>, options: ClassifyOptions = {}): HandRolledVerdict {
  const call = normaliseCall(toolName, input ?? {}, options.home ?? homedir())
  const hits = hitsOf(call, options)
  const kinds = [...new Set(hits.map((h) => h.kind))].sort() as HandRolledKind[]
  const targets = [...new Set(hits.map((h) => h.target))]
  const sample = clip(call.effectiveCommands.find((c) => !excludedCommand(c)) ?? call.writtenFiles[0]?.path ?? call.code[0] ?? '')
  return { handRolled: hits.length > 0, tool: call.tool, kinds, target: targets[0] ?? '', targets, why: hits.map((h) => h.why).join('; '), hits, sample }
}

export function kindsLabel(kinds: readonly HandRolledKind[]): string {
  return READS_LABEL[kinds.length > 1 ? 'both' : (kinds[0] ?? 'readsData')]
}

export function handRolledAdvice(verdict: HandRolledVerdict, seen = 0): string {
  if (!verdict.handRolled) return ''
  const times = seen > 1 ? ` This one-off has come up ${seen} times.` : ''
  return [
    `>>> HAND-ROLLED (${verdict.kinds.join(' + ')}): this ${verdict.tool} call ${kindsLabel(verdict.kinds)} against ${verdict.targets.join(', ')} by hand (${clip(verdict.hits[0]?.why ?? '', 200)}).${times}`,
    `log should have a tool for this. You may go on: this is advice, not a block, and the owner isn't asked (rule ${HAND_ROLLED_RULE}). Once it has worked, make it a real log command and MCP tool: getGuide({ useCase: "${HAND_ROLLED_GUIDE}" }), then toolScaffold { name, summary } (a dry run) and toolScaffoldLive to write it.`,
  ].join('\n')
}

export function handRolledText(raw: string, record: (verdict: HandRolledVerdict) => number, store?: BlockStore): string {
  let input: { tool_name?: string; tool_input?: Record<string, unknown>; cwd?: string } = {}
  try {
    input = JSON.parse(raw || '{}') as typeof input
  } catch {}
  const verdict = classifyCall(input.tool_name ?? '', input.tool_input ?? {}, { cwd: input.cwd })
  if (!verdict.handRolled) return ''
  let seen = 0
  try {
    seen = record(verdict)
  } catch {}
  const session = sessionIdOf(raw)
  const advice = handRolledAdvice(verdict, seen)
  return session === SHARED_SESSION ? advice : freshBlock(`handRolled ${verdict.kinds.join('+')} ${verdict.targets.join(',')}`, session, advice, 'shown', store)
}
