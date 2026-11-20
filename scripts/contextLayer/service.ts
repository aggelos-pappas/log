#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contextOutput, hookHostOf, hostBody } from '../../src/agentHooks/harness/index'
import { hookAnswer } from '../../src/contextLayer/hook/index'
import type { HookInput } from '../../src/contextLayer/hook/index'
import { CODE_CHECK_MS, CONTEXT_PORT, forgetService, HOST, labelledPath, logTiming, newestChange, readService, serviceStarted, sharedEmbed, SOURCE_CHECK_MS, startService, UNCASED_MODELS, writeService } from '../../src/contextLayer/service/index'
import { codeStampAsync } from '../../src/mcp/freshness/index.ts'
import { handRolledText, recordHandRolled } from '../../src/agentHooks/handRolled/index'
import { listUseCases } from '../../src/mcp/server/helpers/index.ts'
import { localEmbedder } from '../../src/search/conversations/helpers/embed.ts'
import { EMBED_DIMENSIONS, EMBED_MODEL } from '../../src/search/conversations/types.ts'
import { askOf, buildMeaningIndex, buildRouteIndex, route as wordRoute, meaningWithin, openMeaningIndex, PLAY_ROUTE_BUDGET_MS, routePrompt, routerCatalog, SKILL_DIRS, withinBudget } from '../../src/useCases/router/index'
import { answerEvent, cachedFreshness, hookStages, useFreshnessSource } from '../../src/agentHooks/answers/index'
import { turnEvent } from '../../src/observability/turns/index'
import type { HookEvent } from '../../src/agentHooks/registry/index'
import type { MeaningIndex, RouteIndex, Thresholds, Utterance } from '../../src/useCases/router/index'

const repo = join(import.meta.dir, '..', '..')
const fixtures = join(repo, 'src', 'useCases', 'router', 'fixtures')
const sources = [join(repo, 'docs', 'useCases'), fixtures, labelledPath(), ...SKILL_DIRS.map((dir) => join(repo, dir))]

const running = readService()
if (running && running.pid !== process.pid) {
  console.log(`context layer already running (pid ${running.pid}, port ${running.port})`)
  serviceStarted()
  process.exit(0)
}

const sourcesStamp = async () => Math.max(...(await Promise.all(sources.map(newestChange))))

const readJson = <T>(path: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

const embedder = localEmbedder()
const embed = sharedEmbed((texts) => embedder.embed(texts), { uncased: UNCASED_MODELS.has(EMBED_MODEL) })
let meaningIndex: MeaningIndex | null = null
let meaningBuilding = false
let index: RouteIndex
let thresholds: Thresholds = {}
let stamp = 0

async function load(): Promise<void> {
  const started = performance.now()
  const labelled = readJson<{ prompt: string; play: string }[]>(labelledPath(), [])
  const extra: Utterance[] = labelled.filter((l) => l.play !== 'none').map((l) => ({ route: l.play, text: l.prompt.toLowerCase().slice(0, 400) }))
  const useCases = listUseCases()
  index = await buildRouteIndex(useCases, embed, EMBED_MODEL, extra, useCases.map((u) => u.text).join(' '))
  thresholds = readJson<Thresholds>(join(fixtures, 'thresholds.json'), {})
  stamp = await sourcesStamp()
  console.log(`${new Date().toISOString()} loaded ${index.utterances.length} utterances for ${index.titles.size} plays in ${Math.round(performance.now() - started)} ms`)
  void loadMeaning()
}

async function loadMeaning(): Promise<void> {
  if (meaningBuilding) return
  meaningBuilding = true
  const started = performance.now()
  try {
    const items = routerCatalog(listUseCases())
    const opened = openMeaningIndex(items, EMBED_MODEL, EMBED_DIMENSIONS)
    meaningIndex = opened ?? (await buildMeaningIndex(items, embedder))
    console.log(`${new Date().toISOString()} ${opened ? 'opened' : 'built'} the router's meaning index: ${items.length} plays, tools and skills in ${Math.round(performance.now() - started)} ms`)
  } catch (error) {
    console.log(`${new Date().toISOString()} the router's meaning index did not load, so the router uses words only: ${String(error).slice(0, 200)}`)
  } finally {
    meaningBuilding = false
  }
}

await load()
let checkingSources = false
setInterval(async () => {
  if (checkingSources) return
  checkingSources = true
  try {
    if ((await sourcesStamp()) > stamp) await load()
  } finally {
    checkingSources = false
  }
}, SOURCE_CHECK_MS)

const route = async (prompt: string) => {
  const [decision, meaning] = await Promise.all([routePrompt(prompt, index, embed, thresholds), meaningWithin(prompt, meaningIndex, embed)])
  return { ...decision, meaning }
}
const hookRoute = async (prompt: string) => {
  const [decision, meaning] = await Promise.all([withinBudget(routePrompt(prompt, index, embed, thresholds), PLAY_ROUTE_BUDGET_MS), meaningWithin(prompt, meaningIndex, embed)])
  return decision ? { ...decision, meaning } : { ...wordRoute(askOf(prompt), { useCases: listUseCases() }), meaning, overBudget: true }
}
useFreshnessSource(cachedFreshness(repo, { background: true }))

let server: ReturnType<typeof Bun.serve>
let inFlight = 0
const codeNow = async () => Math.max(await codeStampAsync(repo), await newestChange(join(repo, 'scripts')))
const codeAtStart = await codeNow()
async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/health') return Response.json({ ok: true, utterances: index.utterances.length, router: meaningIndex ? { model: meaningIndex.model, items: meaningIndex.items.length, hash: meaningIndex.hash } : null })
    if (url.pathname === '/hook' && request.method === 'POST') {
      const started = performance.now()
      let input: HookInput = {}
      try {
        input = JSON.parse((await request.text()) || '{}') as HookInput
      } catch {}
      const result = await hookAnswer(input, hookRoute)
      const body = contextOutput(result.event, result.text, hookHostOf(['--host', url.searchParams.get('host') ?? '']))
      logTiming({ event: result.event, provider: 'contextLayer', ms: performance.now() - started, chars: result.text.length, outcome: result.outcome })
      return new Response(body, { headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/hooks/PreToolUse/handRolled' && request.method === 'POST') {
      const started = performance.now()
      const text = handRolledText(await request.text(), (verdict) => recordHandRolled(verdict))
      const body = contextOutput('PreToolUse', text, hookHostOf(['--host', url.searchParams.get('host') ?? '']))
      logTiming({ event: 'PreToolUse', provider: 'handRolled', ms: performance.now() - started, chars: text.length, outcome: text ? 'handRolled' : 'none' })
      return new Response(body, { headers: { 'content-type': 'application/json' } })
    }
    const eventPath = /^\/hooks\/(SessionStart|UserPromptSubmit|PostToolUse|Stop)$/.exec(url.pathname)
    if (eventPath && request.method === 'POST') {
      const arrivedAt = Date.now()
      const host = hookHostOf(['--host', url.searchParams.get('host') ?? ''])
      const raw = await request.text()
      turnEvent(eventPath[1], raw, host)
      const answered = await answerEvent(eventPath[1] as HookEvent, raw, repo, hookRoute)
      const chars = JSON.stringify(answered.body ?? '').length
      const stages = hookStages(raw, answered.timings, { arrivedAt })
      const firstAt = Math.min(arrivedAt, ...stages.map((s) => s.startedAt))
      logTiming({ event: answered.event, provider: host === 'claudeCode' ? 'hookEvent' : `hookEvent:${host}`, ms: Date.now() - firstAt, chars, outcome: answered.timings.map((t) => `${t.hook}${t.ok ? '' : '!'}:${Math.round(t.ms)}`).join(','), attrs: { inFlight }, stages })
      const body = hostBody(host, answered.event, answered.body)
      return body ? Response.json(body) : new Response('', { status: 200 })
    }
    if (url.pathname !== '/route' || request.method !== 'POST') return new Response('not found', { status: 404 })
    const { prompt } = (await request.json()) as { prompt?: string }
    const decision = await route(String(prompt ?? ''))
    logTiming({ event: 'UserPromptSubmit', provider: 'routeService', ms: decision.ms.total, chars: 0, outcome: decision.skipped ?? (decision.matches[0]?.id || 'none') })
    return Response.json(decision)
}
try {
  server = Bun.serve({
  hostname: HOST,
  port: CONTEXT_PORT,
  async fetch(request) {
    inFlight++
    try {
      return await handle(request)
    } finally {
      inFlight--
    }
  },
  })
} catch (error) {
  console.log(`${new Date().toISOString()} port ${CONTEXT_PORT} is taken, so another context layer holds it: ${String(error).slice(0, 160)}`)
  serviceStarted()
  embedder.stop?.()
  process.exit(0)
}

writeService({ pid: process.pid, port: server.port ?? 0, startedAt: new Date().toISOString(), model: EMBED_MODEL, utterances: index.utterances.length, sourceStamp: stamp })
serviceStarted()
console.log(`${new Date().toISOString()} context layer listening on ${HOST}:${server.port} (pid ${process.pid})`)

let checkingCode = false
setInterval(async () => {
  if (checkingCode || inFlight > 0) return
  checkingCode = true
  const changed = (await codeNow().finally(() => (checkingCode = false))) > codeAtStart
  if (!changed || inFlight > 0) return
  console.log(`${new Date().toISOString()} log's code changed since this service started, so it hands over to a fresh one running the new code`)
  void server.stop(true)
  embedder.stop?.()
  forgetService()
  serviceStarted()
  startService(repo)
  process.exit(0)
}, CODE_CHECK_MS)
