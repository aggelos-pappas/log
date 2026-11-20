import { BROWSER_TOOLS, CODE_TOOLS, OUT_OF_SCOPE_TOOLS, PATCH_TOOLS, SHELL_TOOLS, WRAPPER_TOOLS, WRITE_TOOLS } from '../types'
import type { NormalisedCall, WrittenFile } from '../types'

const LOG_TOOL = /^mcp__log__\w+$/

const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1/

const ASSIGNMENT = /^(?:export\s+)?([A-Za-z_]\w*)=(.*)$/s

const HEREDOC_FILE = /(?:^|\s)(?:cat\s*>{1,2}|tee\s+(?:-a\s+)?)\s*(['"]?)([^\s'"<>|;&]+)\1\s*$/

type Vars = Map<string, string>

function listed(names: readonly string[], name: string): boolean {
  const lower = name.toLowerCase()
  return names.some((n) => n.toLowerCase() === lower)
}

export function hostToolOf(name: string): string {
  const bare = name.trim()
  if (LOG_TOOL.test(bare)) return bare
  const inner = bare.startsWith('mcp__') ? bare.slice(5) : bare
  for (const list of [SHELL_TOOLS, WRITE_TOOLS, PATCH_TOOLS, CODE_TOOLS, BROWSER_TOOLS, WRAPPER_TOOLS, OUT_OF_SCOPE_TOOLS]) {
    const found = list.find((n) => n.toLowerCase() === inner.toLowerCase())
    if (found) return found
  }
  if (/^(bash|sh|zsh|pwsh|cmd)$/i.test(inner)) return 'Bash'
  return bare
}

function unquote(value: string): string {
  const v = value.trim()
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) return v.slice(1, -1)
  return v
}

export function expand(text: string, vars: Vars, home: string): string {
  return text
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (whole, a: string | undefined, b: string | undefined) => vars.get((a ?? b) as string) ?? whole)
    .replace(/(^|[\s'"=])~(?=[\\/])/g, (_, lead: string) => `${lead}${home}`)
}

export function splitSegments(text: string): string[] {
  const out: string[] = []
  let quote = ''
  let current = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < text.length) {
        current += c + text[++i]
        continue
      }
      if (c === quote) quote = ''
      current += c
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      current += c
      continue
    }
    const two = text.slice(i, i + 2)
    if (two === '&&' || two === '||') {
      out.push(current)
      current = ''
      i++
      continue
    }
    if (c === ';' || c === '\n') {
      out.push(current)
      current = ''
      continue
    }
    current += c
  }
  out.push(current)
  return out.map((s) => s.trim()).filter(Boolean)
}

export function shellParts(command: string, vars: Vars = new Map(), home = ''): { commands: string[]; files: WrittenFile[] } {
  const commands: string[] = []
  const files: WrittenFile[] = []
  const take = (segment: string) => {
    const assigned = ASSIGNMENT.exec(segment)
    if (assigned && !/\s/.test(unquote(assigned[2])) && !/^\(/.test(assigned[2])) {
      vars.set(assigned[1], expand(unquote(assigned[2]), vars, home))
      return
    }
    commands.push(expand(segment, vars, home))
  }
  const lines = command.replace(/\r\n/g, '\n').split('\n')
  let plain: string[] = []
  const flush = () => {
    for (const segment of splitSegments(plain.join('\n'))) take(segment)
    plain = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const marker = HEREDOC.exec(line)
    if (!marker) {
      plain.push(line)
      continue
    }
    flush()
    const body: string[] = []
    let j = i + 1
    while (j < lines.length && lines[j].trim() !== marker[2]) body.push(lines[j++])
    const heads = splitSegments(line.slice(0, marker.index))
    const owner = heads.pop() ?? ''
    for (const segment of heads) take(segment)
    const target = HEREDOC_FILE.exec(owner)
    if (target) files.push({ path: expand(target[2], vars, home), content: body.join('\n') })
    else commands.push(`${expand(owner, vars, home)}\n${body.join('\n')}`)
    plain.push(line.slice(marker.index + marker[0].length))
    i = j
  }
  flush()
  return { commands, files }
}

const PY_STRING = /([rRbBfFuU]{0,2})("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/y

const PY_NAME = /([A-Za-z_][\w.]*)/y

function pyUnescape(body: string): string {
  return body.replace(/\\(n|t|r|\\|"|'|\n)/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === '\n' ? '' : c))
}

function skipSpace(code: string, at: number): number {
  while (at < code.length && /\s/.test(code[at])) at++
  return at
}

export function pyLiteral(code: string, at: number, vars: Vars): { value: string; end: number } | null {
  PY_STRING.lastIndex = at
  const found = PY_STRING.exec(code)
  if (!found) return null
  const prefix = found[1].toLowerCase()
  const raw = found[2]
  const quote = raw.startsWith('"""') || raw.startsWith("'''") ? 3 : 1
  let value = raw.slice(quote, raw.length - quote)
  if (!prefix.includes('r')) value = pyUnescape(value)
  if (prefix.includes('f')) value = value.replace(/\{([A-Za-z_]\w*)\}/g, (whole, name: string) => vars.get(name) ?? whole)
  return { value, end: PY_STRING.lastIndex }
}

export function pyArgument(code: string, at: number, vars: Vars, keyword?: string): { value: string | null; end: number } {
  let start = skipSpace(code, at)
  if (keyword) {
    const named = new RegExp(`${keyword}\\s*=\\s*`, 'y')
    named.lastIndex = start
    if (named.exec(code)) start = named.lastIndex
  }
  const literal = pyLiteral(code, start, vars)
  if (literal) return literal
  PY_NAME.lastIndex = start
  const name = PY_NAME.exec(code)
  if (name) return { value: vars.get(name[1]) ?? null, end: PY_NAME.lastIndex }
  return { value: null, end: start }
}

export function pyVariables(code: string): Vars {
  const vars: Vars = new Map()
  const assignment = /^[ \t]*([A-Za-z_]\w*)[ \t]*=[ \t]*/gm
  for (let m = assignment.exec(code); m; m = assignment.exec(code)) {
    const literal = pyLiteral(code, assignment.lastIndex, vars)
    if (literal) vars.set(m[1], literal.value)
  }
  return vars
}

function afterComma(code: string, at: number): number {
  const i = skipSpace(code, at)
  return code[i] === ',' ? i + 1 : i
}

function pyListStrings(code: string, at: number, vars: Vars): string | null {
  const start = skipSpace(code, at)
  if (code[start] !== '[') return null
  const parts: string[] = []
  let i = start + 1
  while (i < code.length && code[i] !== ']') {
    const literal = pyLiteral(code, skipSpace(code, i), vars)
    if (literal) {
      parts.push(literal.value)
      i = literal.end
      continue
    }
    i++
  }
  return parts.join(' ')
}

export function pythonParts(code: string, home = ''): { commands: string[]; files: WrittenFile[]; rest: string } {
  const vars = pyVariables(code)
  const commands: string[] = []
  const files: WrittenFile[] = []
  const spans: [number, number][] = []
  const shell = (text: string) => {
    const parts = shellParts(text, new Map(vars), home)
    commands.push(...parts.commands)
    files.push(...parts.files)
  }
  for (const m of code.matchAll(/\bterminal\s*\(/g)) {
    const at = m.index! + m[0].length
    const arg = pyArgument(code, at, vars, 'command')
    spans.push([at, arg.end])
    if (arg.value) shell(arg.value)
  }
  for (const m of code.matchAll(/\b(?:subprocess\.(?:run|call|check_call|check_output|Popen)|os\.(?:system|popen))\s*\(/g)) {
    const at = m.index! + m[0].length
    const list = pyListStrings(code, at, vars)
    if (list !== null) {
      commands.push(list)
      spans.push([at, code.indexOf(']', at) + 1])
      continue
    }
    const arg = pyArgument(code, at, vars, 'args')
    spans.push([at, arg.end])
    if (arg.value) shell(arg.value)
  }
  for (const m of code.matchAll(/\bwrite_file\s*\(/g)) {
    const path = pyArgument(code, m.index! + m[0].length, vars, 'path')
    const content = pyArgument(code, afterComma(code, path.end), vars, 'content')
    spans.push([m.index!, content.end])
    if (path.value) files.push({ path: path.value, content: content.value ?? '' })
  }
  for (const m of code.matchAll(/\bopen\s*\(/g)) {
    const path = pyArgument(code, m.index! + m[0].length, vars, 'file')
    const mode = pyArgument(code, afterComma(code, path.end), vars, 'mode')
    if (!path.value || !mode.value || !/[wa]/.test(mode.value)) continue
    const write = /\.write\s*\(/g
    write.lastIndex = mode.end
    const call = write.exec(code)
    const content = call ? pyArgument(code, write.lastIndex, vars) : null
    if (content) spans.push([write.lastIndex, content.end])
    files.push({ path: path.value, content: content?.value ?? '' })
  }
  for (const m of code.matchAll(/\bPath\s*\(/g)) {
    const path = pyArgument(code, m.index! + m[0].length, vars)
    const write = /\s*\)\s*\.write_text\s*\(/y
    write.lastIndex = path.end
    if (!path.value || !write.exec(code)) continue
    const content = pyArgument(code, write.lastIndex, vars)
    spans.push([write.lastIndex, content.end])
    files.push({ path: path.value, content: content.value ?? '' })
  }
  let rest = code
  for (const [start, end] of [...spans].sort((a, b) => b[0] - a[0])) if (end > start) rest = `${rest.slice(0, start)}${' '.repeat(end - start)}${rest.slice(end)}`
  return { commands, files, rest }
}

export function patchFiles(patch: string): WrittenFile[] {
  const files: WrittenFile[] = []
  let current: WrittenFile | null = null
  for (const line of patch.replace(/\r\n/g, '\n').split('\n')) {
    const added = /^\*\*\* (?:Add|Update) File: (.+)$/.exec(line)
    if (added) {
      current = { path: added[1].trim(), content: '' }
      files.push(current)
      continue
    }
    if (line.startsWith('***')) {
      current = null
      continue
    }
    if (current && line.startsWith('+')) current.content += `${line.slice(1)}\n`
  }
  return files
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === 'string')
    if (parts.length >= 3 && /^(bash|sh|zsh|pwsh|powershell)(\.exe)?$/i.test(parts[0]) && /^-\w*c$|^-Command$/i.test(parts[1])) return parts.slice(2).join(' ')
    return parts.join(' ')
  }
  return ''
}

function firstText(input: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const text = textOf(input[key])
    if (text) return text
  }
  return ''
}

function argumentsOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return {}
}

function empty(tool: string): NormalisedCall {
  return { tool, effectiveCommands: [], writtenFiles: [], code: [], logTools: [], skipped: [] }
}

export function normaliseCall(toolName: string, input: Record<string, unknown>, home = '', depth = 0): NormalisedCall {
  const tool = hostToolOf(toolName)
  const out = empty(tool)
  if (LOG_TOOL.test(tool)) {
    out.logTools.push(tool)
    return out
  }
  if (listed(OUT_OF_SCOPE_TOOLS, tool)) {
    out.skipped.push(tool)
    return out
  }
  if (listed(SHELL_TOOLS, tool)) {
    const parts = shellParts(firstText(input, ['command', 'cmd', 'CommandLine', 'script']), new Map(), home)
    out.effectiveCommands.push(...parts.commands)
    out.writtenFiles.push(...parts.files)
    return out
  }
  if (listed(WRITE_TOOLS, tool)) {
    const path = firstText(input, ['file_path', 'path', 'filePath', 'TargetFile'])
    if (path) out.writtenFiles.push({ path, content: firstText(input, ['content', 'contents', 'CodeContent', 'text']) })
    return out
  }
  if (listed(PATCH_TOOLS, tool)) {
    out.writtenFiles.push(...patchFiles(firstText(input, ['input', 'patch', 'command'])))
    return out
  }
  if (listed(CODE_TOOLS, tool)) {
    const code = firstText(input, ['code'])
    const parts = pythonParts(code, home)
    out.code.push(parts.rest)
    out.effectiveCommands.push(...parts.commands)
    out.writtenFiles.push(...parts.files)
    return out
  }
  if (listed(BROWSER_TOOLS, tool)) {
    out.code.push(`browser\n${firstText(input, ['code'])}`)
    return out
  }
  if (listed(WRAPPER_TOOLS, tool) && depth < 3) {
    const calls = Array.isArray(input.calls) ? input.calls : []
    for (const call of calls) {
      if (!call || typeof call !== 'object') continue
      const record = call as Record<string, unknown>
      const inner = normaliseCall(String(record.name ?? ''), argumentsOf(record.arguments ?? record.args), home, depth + 1)
      out.effectiveCommands.push(...inner.effectiveCommands)
      out.writtenFiles.push(...inner.writtenFiles)
      out.code.push(...inner.code)
      out.logTools.push(...inner.logTools)
      out.skipped.push(...inner.skipped)
    }
  }
  return out
}
