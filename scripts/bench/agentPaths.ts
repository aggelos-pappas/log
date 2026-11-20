#!/usr/bin/env bun
import { Database } from 'bun:sqlite'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const USAGE = `bun scripts/bench/agentPaths.ts [--repo <path>] [--runs <n>] [--gapMs <ms>] [--parts hooks,mcp,python] [--json]
  Times log's agent-side paths on this machine: the context service's hooks (UserPromptSubmit with the router, PostToolUse, Stop, the hand-rolled check), the MCP proxy (initialize, tools/list, a cheap call) and a Python engine start.
  Everything runs against a scratch log.db and inbox folder, so no account is touched and the live timings stay clean. --repo picks the checkout to time (default this one), so a base worktree and a branch can be compared.`

const argv = process.argv.slice(2)
if (argv.includes('--help')) {
  console.log(USAGE)
  process.exit(0)
}
const flag = (name: string, fallback: string) => {
  const at = argv.indexOf(`--${name}`)
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback
}
const repo = resolve(flag('repo', join(import.meta.dir, '..', '..')))
const runs = Math.max(1, Number(flag('runs', '40')))
const gapMs = Math.max(0, Number(flag('gapMs', '250')))
const parts = new Set(flag('parts', 'hooks,mcp,python').split(','))
const asJson = argv.includes('--json')

const PROMPTS = [
  'what did grace_ships say on discord today',
  'reply to linus_k on x about the demo, keep it short',
  'how slow is log right now, p95 and p99 per tool',
  'go through my x dms and tell me who is waiting on me',
  'read the latest messages in the build channel and outline them',
  'check if the slack account is still logged in',
  'whats the status',
  'search for the pricing thread with grace_ships and draft a follow up in my voice, then queue it for the morning so it goes out after the call',
  'is the instagram watcher running',
  'make a dashboard of my week: messages answered, people waiting, the slowest tools and what failed',
  Array.from({ length: 8 }, () => 'measure the hooks and the router and the mcp proxy and the python engine start, then fix the slowest step and tell me the numbers before and after').join(' '),
  'ok continue',
]

type Row = { path: string; n: number; p50: number; p95: number; p99: number; max: number }

function quantile(values: readonly number[], q: number): number {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]
}

function rowOf(path: string, values: readonly number[]): Row {
  return { path, n: values.length, p50: quantile(values, 0.5), p95: quantile(values, 0.95), p99: quantile(values, 0.99), max: values.length ? Math.max(...values) : NaN }
}

const rows: Row[] = []
const notes: string[] = []
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function freePort(): Promise<number> {
  const probe = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('') })
  const port = probe.port ?? 0
  probe.stop(true)
  return port
}

function killTree(pid: number | undefined): void {
  if (!pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
  else
    try {
      process.kill(pid, 'SIGTERM')
    } catch {}
}

function scratchEnv(scratch: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, LOG_DB: join(scratch, 'log.db'), LOG_INBOX_STATE: join(scratch, 'inbox'), LOG_CONTEXT_LAYER: join(scratch, 'contextLayer'), LOG_INBOX_POLL: 'off', LOG_HOOK_MEMORY: join(scratch, 'hookState.json'), ...extra }
  delete env.LOG_CONTEXT_SERVICE
  return env
}

async function timed<T>(work: () => Promise<T>): Promise<[number, T]> {
  const started = performance.now()
  const out = await work()
  return [performance.now() - started, out]
}

async function benchHooks(scratch: string): Promise<void> {
  const port = await freePort()
  const service = spawn('bun', [join(repo, 'scripts', 'contextLayer', 'service.ts')], { cwd: repo, env: scratchEnv(scratch, { LOG_CONTEXT_PORT: String(port) }), stdio: 'ignore', windowsHide: true })
  const base = `http://127.0.0.1:${port}`
  try {
    const deadline = Date.now() + 180_000
    let ready = false
    while (Date.now() < deadline && !ready) {
      try {
        const health = (await (await fetch(`${base}/health`)).json()) as { router?: unknown }
        ready = Boolean(health.router)
      } catch {}
      if (!ready) await sleep(500)
    }
    if (!ready) {
      notes.push('the context service did not load its router within 180 s, so the hooks were not timed')
      return
    }
    const post = async (path: string, body: unknown) => {
      const response = await fetch(`${base}${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
      return { status: response.status, text: await response.text() }
    }
    const client: Record<string, number[]> = { UserPromptSubmit: [], PostToolUse: [], Stop: [], handRolled: [] }
    let handRolledServed = true
    for (let i = 0; i < runs; i++) {
      const prompt = PROMPTS[i % PROMPTS.length]
      const sent = { session_id: 'bench', log_sent_at: Date.now() }
      const [promptMs] = await timed(() => post('/hooks/UserPromptSubmit?host=hermes', { ...sent, hook_event_name: 'UserPromptSubmit', prompt, log_sent_at: Date.now() }))
      client.UserPromptSubmit.push(promptMs)
      const [toolMs] = await timed(() => post('/hooks/PostToolUse?host=hermes', { ...sent, hook_event_name: 'PostToolUse', tool_name: 'mcp__log__accountsList', log_sent_at: Date.now() }))
      client.PostToolUse.push(toolMs)
      if (handRolledServed) {
        const [handMs, answer] = await timed(() => post('/hooks/PreToolUse/handRolled?host=hermes', { ...sent, hook_event_name: 'PreToolUse', tool_name: 'terminal', tool_input: { command: 'bun scratch/probe.ts' }, cwd: scratch }))
        if (answer.status === 404) handRolledServed = false
        else client.handRolled.push(handMs)
      }
      const [stopMs] = await timed(() => post('/hooks/Stop?host=hermes', { ...sent, hook_event_name: 'Stop', tool_calls: 1, log_sent_at: Date.now() }))
      client.Stop.push(stopMs)
      await sleep(gapMs)
    }
    for (const [event, values] of Object.entries(client)) if (values.length) rows.push(rowOf(`service ${event} (client round trip)`, values))
    if (!handRolledServed) notes.push('this checkout has no warm hand-rolled check: the Hermes plugin starts a Bun process for it')
    await sleep(500)
    const db = new Database(join(scratch, 'log.db'), { readonly: true })
    const spans = db.query("SELECT spanId, tool, ms, attrs FROM spans WHERE parentId IS NULL AND tool LIKE 'hook:%'").all() as { spanId: string; tool: string; ms: number; attrs: string }[]
    const byTool = new Map<string, number[]>()
    for (const s of spans) byTool.set(s.tool, [...(byTool.get(s.tool) ?? []), s.ms])
    for (const [tool, values] of [...byTool].sort()) rows.push(rowOf(tool, values))
    const stages = db.query("SELECT p.tool AS tool, s.name AS name, s.ms AS ms FROM spans s JOIN spans p ON s.parentId = p.spanId WHERE p.tool LIKE 'hook:UserPromptSubmit:hookEvent%' OR p.tool LIKE 'hook:PostToolUse:hookEvent%'").all() as { tool: string; name: string; ms: number }[]
    const byStage = new Map<string, number[]>()
    for (const s of stages) byStage.set(`  ${s.tool.split(':')[1]} ${s.name}`, [...(byStage.get(`  ${s.tool.split(':')[1]} ${s.name}`) ?? []), s.ms])
    for (const [stage, values] of [...byStage].sort()) rows.push(rowOf(stage, values))
    const meaning = new Map<string, number>()
    for (const s of spans.filter((x) => x.tool === 'hook:UserPromptSubmit:router')) {
      const outcome = String((JSON.parse(s.attrs || '{}') as { meaning?: string }).meaning ?? 'none')
      meaning.set(outcome, (meaning.get(outcome) ?? 0) + 1)
    }
    if (meaning.size) notes.push(`router meaning outcomes: ${[...meaning].map(([k, v]) => `${k} ${v}`).join(', ')}`)
    db.close()
  } finally {
    killTree(service.pid)
  }
}

async function benchHandRolledProcess(scratch: string): Promise<void> {
  const script = join(repo, 'scripts', 'hooks', 'handRolled.ts')
  const values: number[] = []
  for (let i = 0; i < Math.min(runs, 20); i++) {
    const started = performance.now()
    spawnSync('bun', [script, '--host', 'hermes'], { cwd: repo, input: JSON.stringify({ session_id: 'bench', tool_name: 'terminal', tool_input: { command: 'bun scratch/probe.ts' }, cwd: scratch }), env: scratchEnv(scratch), windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] })
    values.push(performance.now() - started)
  }
  rows.push(rowOf('handRolled as a Bun process (the fallback)', values))
}

type Pending = { resolve: (message: Record<string, unknown>) => void }

async function benchMcp(scratch: string): Promise<void> {
  const child = spawn('bun', [join(repo, 'bin', 'logMcp.ts')], { cwd: repo, env: scratchEnv(scratch), stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true })
  const waiting = new Map<number, Pending>()
  let buffer = ''
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
      try {
        const message = JSON.parse(line) as { id?: number }
        if (typeof message.id === 'number') {
          waiting.get(message.id)?.resolve(message as Record<string, unknown>)
          waiting.delete(message.id)
        }
      } catch {}
    }
  })
  let next = 1
  const request = (method: string, params: unknown, timeoutMs = 120_000) =>
    new Promise<Record<string, unknown>>((resolveIt, reject) => {
      const id = next++
      const timer = setTimeout(() => reject(new Error(`${method} took over ${timeoutMs} ms`)), timeoutMs)
      waiting.set(id, { resolve: (m) => (clearTimeout(timer), resolveIt(m)) })
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  try {
    const [initMs] = await timed(() => request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'logBench', version: '1' } }))
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
    rows.push(rowOf('mcp initialize (cold start, proxy + server)', [initMs]))
    const lists: number[] = []
    const calls: number[] = []
    for (let i = 0; i < runs; i++) {
      const [listMs] = await timed(() => request('tools/list', {}))
      lists.push(listMs)
      const [callMs] = await timed(() => request('tools/call', { name: 'accountsList', arguments: {} }))
      calls.push(callMs)
    }
    rows.push(rowOf('mcp tools/list', lists.slice(1)))
    rows.push(rowOf('mcp tools/call accountsList', calls.slice(1)))
    notes.push(`first tools/list ${Math.round(lists[0])} ms, first accountsList ${Math.round(calls[0])} ms (left out of the rows above)`)
  } catch (error) {
    notes.push(`the MCP bench stopped: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    child.stdin.end()
    killTree(child.pid)
  }
}

function benchPython(): void {
  const python = process.env.LOG_PYTHON || 'python'
  const cwd = join(repo, 'python')
  const bare: number[] = []
  const engine: number[] = []
  for (let i = 0; i < Math.min(runs, 15); i++) {
    let started = performance.now()
    spawnSync(python, ['-c', 'pass'], { cwd, windowsHide: true, stdio: 'ignore' })
    bare.push(performance.now() - started)
    started = performance.now()
    const run = spawnSync(python, ['-c', 'import discordApi.engine'], { cwd, windowsHide: true, stdio: 'ignore' })
    if (run.status === 0) engine.push(performance.now() - started)
  }
  rows.push(rowOf('python start (python -c pass)', bare))
  if (engine.length) rows.push(rowOf('python start + engine imports (discordApi.engine)', engine))
}

const scratch = mkdtempSync(join(tmpdir(), 'logBench-'))
try {
  if (parts.has('hooks')) {
    await benchHooks(scratch)
    await benchHandRolledProcess(scratch)
  }
  if (parts.has('mcp')) await benchMcp(scratch)
  if (parts.has('python')) benchPython()
} finally {
  await sleep(300)
  for (let i = 0; i < 10 && existsSync(scratch); i++) {
    try {
      rmSync(scratch, { recursive: true, force: true })
    } catch {
      await sleep(300)
    }
  }
}

const fmt = (ms: number) => (Number.isFinite(ms) ? (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 1 : 0)} ms`) : '-')
if (asJson) console.log(JSON.stringify({ repo, runs, gapMs, rows, notes }, null, 2))
else {
  console.log(`log agent paths, ${runs} runs, ${gapMs} ms apart, checkout ${repo}`)
  console.log(`${'path'.padEnd(58)} ${'n'.padStart(4)} ${'p50'.padStart(9)} ${'p95'.padStart(9)} ${'p99'.padStart(9)} ${'max'.padStart(9)}`)
  for (const r of rows) console.log(`${r.path.padEnd(58)} ${String(r.n).padStart(4)} ${fmt(r.p50).padStart(9)} ${fmt(r.p95).padStart(9)} ${fmt(r.p99).padStart(9)} ${fmt(r.max).padStart(9)}`)
  for (const note of notes) console.log(`- ${note}`)
}
process.exit(0)
