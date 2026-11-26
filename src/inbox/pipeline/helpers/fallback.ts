import type { Database } from 'bun:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { settingsPath } from '../../../browser/identity/index'
import { claimState, getState, putState } from '../../../storage/state/index'
import type { DecisionsClient } from '../../../subq/decisions/index'
import { labelList, setLabel } from '../../label/client'
import { OLD_LABEL_FIELDS } from '../../label/types'
import type { LabelEntry } from '../../label/types'
import { chatsOf, saidOnly } from '../../lastWord/index'
import type { LastWordMessage, PersonChat } from '../../lastWord/index'
import { db } from '../../store/index'
import { xPartiesOf } from '../../../twitter/dm/person/client'
import { BOT_THRESHOLD, FALLBACK_BELOW, PIPELINE_SETTING, RETRAIN_AFTER, SALES_WHO, STAGE_CHANGE_SCORE, SUBQ_DAILY_USD, SUBQ_USD_PER_MILLION_INPUT, TEACH_BATCH, TEACH_EVERY_MS, TEACH_QUEUE_KEPT, TEACHER_BY, TEACHER_STALE_MESSAGES, TWO_WAY_OWNER_LINES, TWO_WAY_TURNS, UNSURE_MIN_NEW } from '../types'
import type { FallbackReason, PipelineLabels, PipelineRow, TeachQueueItem, TeachRun, TeachSpend } from '../types'
import { turnsIn, windowOf, windowText } from './features'
import { latestHead, storedRows } from './store'
import { teach, teachPlan, teachState, trainAndSave, uvTrainer } from './teach'
import type { HeadTrainer, TeachContext, TeachItem } from './teach'

const QUEUE_KEY = 'queue'

const DRAIN_KEY = 'draining'

const keyOf = (r: { platform: string; account: string; person: string }): string => `${r.platform}\u0000${r.account}\u0000${r.person}`

export function humanTalk(said: readonly Pick<LastWordMessage, 'fromOwner'>[], ownAccount = false): boolean {
  if (ownAccount) return true
  return turnsIn(said) >= TWO_WAY_TURNS && said.filter((m) => m.fromOwner).length >= TWO_WAY_OWNER_LINES
}

export function withoutFalseBot<T extends Pick<PipelineRow, 'who' | 'where' | 'source' | 'scores'>>(row: T, talking: boolean): T {
  if (row.who !== 'bot' || (row.source === 'bot' && !talking)) return row
  const next = Object.entries(row.scores.who).filter(([k]) => k !== 'bot').sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'community'
  const where = SALES_WHO.includes(next) ? (Object.entries(row.scores.where).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) : null
  return { ...row, who: next, where }
}

export interface FallbackInput {
  confidence: number
  where: string | null
  whereScores: Record<string, number>
  botScore: number
  said: readonly Pick<LastWordMessage, 'seq' | 'at' | 'fromOwner'>[]
  teacher?: LabelEntry
  ownerLabelled: boolean
}

export function fallbackReason(input: FallbackInput): FallbackReason | null {
  if (input.ownerLabelled || !input.said.some((m) => !m.fromOwner)) return null
  const teacher = input.teacher
  if (!teacher) return 'noTeacherLabel'
  const since = teacher.throughSeq
  const taughtAt = Date.parse(teacher.at)
  const fresh = input.said.filter((m) => (typeof since === 'number' ? m.seq > since : Date.parse(m.at) > taughtAt))
  if (!fresh.length) return null
  if (fresh.length >= TEACHER_STALE_MESSAGES) return 'staleTeacher'
  if (input.botScore >= BOT_THRESHOLD && teacher.who !== 'bot') return 'botCheck'
  const topWhere = input.where ? (input.whereScores[input.where] ?? 0) : 0
  if (input.where && teacher.where && teacher.who && SALES_WHO.includes(teacher.who) && input.where !== teacher.where && topWhere >= STAGE_CHANGE_SCORE) return 'stageChange'
  if (input.confidence < FALLBACK_BELOW && fresh.length >= UNSURE_MIN_NEW) return 'unsure'
  return null
}

export function teachQueue(on: Database = db()): TeachQueueItem[] {
  return getState<{ items: TeachQueueItem[] }>('pipelineTeach', QUEUE_KEY, {}, on)?.body.items ?? []
}

export function queueForTeacher(items: readonly TeachQueueItem[], on: Database = db(), now: number = Date.now()): number {
  if (!items.length) return 0
  const held = new Map(teachQueue(on).map((i) => [keyOf(i), i]))
  for (const item of items) {
    const before = held.get(keyOf(item))
    held.set(keyOf(item), before ? { ...item, queuedAt: before.queuedAt } : item)
  }
  const kept = [...held.values()].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)).slice(-TEACH_QUEUE_KEPT)
  putState('pipelineTeach', QUEUE_KEY, { items: kept }, now, on)
  return kept.length
}

export function subqDailyUsd(file: string = settingsPath()): number {
  if (!existsSync(file)) return SUBQ_DAILY_USD
  try {
    const saved = (JSON.parse(readFileSync(file, 'utf8')) as Record<string, { subqDailyUsd?: unknown } | undefined>)[PIPELINE_SETTING]?.subqDailyUsd
    return typeof saved === 'number' && saved >= 0 ? saved : SUBQ_DAILY_USD
  } catch {
    return SUBQ_DAILY_USD
  }
}

export function teachSpend(day: string, on: Database = db()): TeachSpend {
  return getState<TeachSpend>('pipelineTeach', `spend:${day}`, {}, on)?.body ?? { day, usd: 0, chats: 0, runs: [] }
}

export function teachContext(entries: readonly LabelEntry[], labels: PipelineLabels, on: Database = db()): TeachContext {
  const examples = entries.filter((e) => e.by !== TEACHER_BY).flatMap((e) => {
    const who = e.who ?? (e.label ? OLD_LABEL_FIELDS[e.label].who : null)
    if (!who) return []
    const chat = chatsOf({ platform: e.platform, account: e.account, conversationIds: conversationIdsOf(e.person) }, on).find((c) => c.personKey === e.person && !c.storedAsGroup)
    return chat ? [{ with: chat.with, platform: e.platform, who }] : []
  })
  return { ...(labels.about ? { about: labels.about } : {}), examples }
}

export function teachItemOf(chat: Pick<PersonChat, 'platform' | 'account' | 'personKey' | 'with' | 'messages'>, context: TeachContext): TeachItem | null {
  const said = saidOnly(chat.messages)
  if (!said.some((m) => !m.fromOwner)) return null
  return { platform: chat.platform, account: chat.account, person: chat.personKey, with: chat.with, state: teachState({ platform: chat.platform, with: chat.with }, windowText(windowOf(said)), context), throughSeq: Math.max(...said.map((m) => m.seq)) }
}

export function conversationIdsOf(conversationId: string): string[] {
  const pair = xPartiesOf(conversationId)
  if (!pair.length) return [conversationId]
  const [a, b] = pair
  return [`${a}-${b}`, `${a}:${b}`, `${b}-${a}`, `${b}:${a}`]
}

export interface TeacherDeps {
  client: DecisionsClient
  labels: PipelineLabels
  embedderModel: string
  trainer?: HeadTrainer
  now?: number
  capUsd?: number
  batch?: number
  retrainAfter?: number
}

export async function drainTeacher(deps: TeacherDeps, on: Database = db()): Promise<TeachRun> {
  const now = deps.now ?? Date.now()
  const at = new Date(now).toISOString()
  const day = at.slice(0, 10)
  const spend = teachSpend(day, on)
  const cap = deps.capUsd ?? subqDailyUsd()
  const queue = teachQueue(on)
  const run: TeachRun = { at, chats: 0, inputTokens: 0, usd: 0, left: queue.length, stopped: null, retrainedHead: null, retrain: null }
  if (!queue.length) return { ...run, stopped: 'nothing queued' }
  const remaining = cap - spend.usd
  const save = (runs: (latest: TeachSpend) => TeachRun[], usd: number, chats: number): void =>
    on.transaction(() => {
      const latest = teachSpend(day, on)
      putState('pipelineTeach', `spend:${day}`, { day, usd: Math.round((latest.usd + usd) * 1e6) / 1e6, chats: latest.chats + chats, runs: runs(latest).slice(-200) } satisfies TeachSpend, now, on)
    })()
  const record = (done: TeachRun): TeachRun => {
    save((latest) => [...latest.runs, done], done.usd, done.chats)
    return done
  }
  const amend = (done: TeachRun): TeachRun => {
    save((latest) => latest.runs.map((r) => (r.at === done.at ? done : r)), 0, 0)
    return done
  }
  if (remaining <= 0) return record({ ...run, stopped: `the daily SubQ cap of $${cap} is spent` })
  const entries = labelList()
  const byKey = new Map(entries.map((e) => [keyOf(e), e]))
  const context = teachContext(entries, deps.labels, on)
  const handled = new Set<string>()
  const items: TeachItem[] = []
  for (const q of queue) {
    if (items.length >= (deps.batch ?? TEACH_BATCH)) break
    handled.add(keyOf(q))
    const entry = byKey.get(keyOf(q))
    if (entry && entry.by !== TEACHER_BY) continue
    const chat = chatsOf({ platform: q.platform, account: q.account, conversationIds: conversationIdsOf(q.person) }, on).find((c) => c.personKey === q.person && !c.storedAsGroup)
    const item = chat ? teachItemOf(chat, context) : null
    if (item) items.push(item)
  }
  let plan = teachPlan(items, deps.labels)
  while (plan.items.length && plan.usd > remaining) plan = teachPlan(plan.items.slice(0, -1), deps.labels)
  for (const dropped of items.slice(plan.items.length)) handled.delete(keyOf(dropped))
  const leftAfter = (): number => {
    const rest = teachQueue(on).filter((i) => !handled.has(keyOf(i)) || i.queuedAt > at)
    putState('pipelineTeach', QUEUE_KEY, { items: rest }, now, on)
    return rest.length
  }
  if (!plan.items.length) return record({ ...run, left: leftAfter(), stopped: items.length ? `the daily SubQ cap of $${cap} is spent` : null })
  let answers: Awaited<ReturnType<typeof teach>>
  try {
    answers = await teach(plan, deps.client, deps.labels)
  } catch (error) {
    return record({ ...run, stopped: `SubQ refused: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}` })
  }
  const through = new Map(plan.items.map((i) => [keyOf(i), i.throughSeq]))
  for (const a of answers) setLabel({ platform: a.platform, account: a.account, chat: a.person }, { who: a.who, where: a.where, confidence: a.confidence, ...(a.candidates.length ? { candidates: a.candidates } : {}), ...(typeof through.get(keyOf(a)) === 'number' ? { throughSeq: through.get(keyOf(a)) } : {}) }, TEACHER_BY, new Date(now))
  const inputTokens = answers.reduce((sum, a) => sum + a.inputTokens, 0) || plan.inputTokens
  const usd = Math.round((inputTokens / 1e6) * SUBQ_USD_PER_MILLION_INPUT * 1e6) / 1e6
  const done: TeachRun = record({ ...run, chats: answers.length, inputTokens, usd, left: leftAfter() })
  const head = latestHead(on)
  const fresh = labelList().filter((e) => e.by === TEACHER_BY && (!head || e.at > head.trainedAt)).length
  if (fresh >= (deps.retrainAfter ?? RETRAIN_AFTER)) {
    const trained = await trainAndSave(storedRows(on), labelList(), deps.labels, deps.embedderModel, on, deps.trainer ?? uvTrainer).catch((error: unknown) => ({ refused: error instanceof Error ? error.message.slice(0, 160) : String(error) }))
    if ('id' in trained) done.retrainedHead = trained.id
    done.retrain = 'id' in trained ? `head ${trained.id} trained after ${fresh} new teacher labels` : `not retrained: it ${trained.refused}`
    return amend(done)
  }
  return done
}

export function startTeacher(deps: () => TeacherDeps, on: () => Database = db, everyMs: number = TEACH_EVERY_MS): () => void {
  let running = false
  const tick = async (): Promise<void> => {
    if (running) return
    const handle = on()
    if (!claimState('pipelineTeach', DRAIN_KEY, { pid: process.pid }, everyMs - 1000, Date.now(), handle)) return
    running = true
    try {
      await drainTeacher(deps(), handle)
    } catch {
    } finally {
      running = false
    }
  }
  const timer = setInterval(() => void tick(), everyMs)
  timer.unref?.()
  return () => clearInterval(timer)
}
