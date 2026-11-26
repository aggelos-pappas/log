import type { Database } from 'bun:sqlite'
import { join } from 'node:path'
import type { DecisionAnswer, DecisionsClient } from '../../../subq/decisions/index'
import { OLD_LABEL_FIELDS } from '../../label/types'
import type { LabelEntry } from '../../label/types'
import { CHARS_PER_TOKEN, FEATURE_NAMES, HEAD_MIN_KINDS, HEAD_MIN_ROWS, SALES_WHO, SUBQ_USD_PER_MILLION_INPUT, TEACHER_BY, TEACHER_MIN_CONFIDENCE, TEACHER_STATE_CHARS, TEACHER_TRAIN_FLOOR } from '../types'
import type { PipelineHead, PipelineLabels, PipelineRow, TeacherLabel } from '../types'
import { saveHead } from './store'

export interface TeachItem {
  platform: string
  account: string
  person: string
  with: string
  state: string
  throughSeq?: number
}

export interface TeachPlan {
  items: TeachItem[]
  inputTokens: number
  usd: number
}

function whoQuestion(labels: PipelineLabels) {
  return { type: 'choice' as const, instructions: 'Who is this person to the owner (the lines marked me)? Pick the one that fits the whole conversation.', criteria: labels.who }
}

function whereQuestion(labels: PipelineLabels) {
  return { type: 'choice' as const, instructions: 'The owner turns people from his communities into leads and clients. Where is this person in that cycle right now?', criteria: labels.where }
}

export interface TeachContext {
  about?: string
  examples?: readonly { with: string; platform: string; who: string }[]
}

export function teachState(item: Pick<TeachItem, 'with' | 'platform'>, window: string, context: TeachContext = {}): string {
  const about = context.about ? `About the owner: ${context.about}\n` : ''
  const examples = context.examples?.length ? `People the owner labelled himself: ${context.examples.map((e) => `${e.with} on ${e.platform} is ${e.who}`).join('; ')}.\n` : ''
  const head = `${about}${examples}A direct conversation on ${item.platform} between the owner (lines marked me) and ${item.with} (lines marked them), oldest first:\n`
  const body = window.length > TEACHER_STATE_CHARS ? window.slice(window.length - TEACHER_STATE_CHARS) : window
  return head + body
}

export function teachPlan(items: TeachItem[], labels: PipelineLabels): TeachPlan {
  const questions = JSON.stringify({ who: whoQuestion(labels), where: whereQuestion(labels) }).length
  const chars = items.reduce((sum, i) => sum + i.state.length + questions, 0)
  const inputTokens = Math.ceil(chars / CHARS_PER_TOKEN)
  return { items, inputTokens, usd: Math.round((inputTokens / 1e6) * SUBQ_USD_PER_MILLION_INPUT * 10000) / 10000 }
}

function choiceOf(answer: DecisionAnswer | undefined): { choice: string; confidence: number; runnerUp: string | null } | null {
  if (!answer || answer.type !== 'choice') return null
  const sorted = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])
  return { choice: answer.choice, confidence: Math.min(answer.confidence, sorted[0]?.[1] ?? 0), runnerUp: sorted[1]?.[0] ?? null }
}

export async function teach(plan: TeachPlan, client: DecisionsClient, labels: PipelineLabels): Promise<(TeacherLabel & { candidates: string[]; inputTokens: number })[]> {
  const out: (TeacherLabel & { candidates: string[]; inputTokens: number })[] = []
  for (const item of plan.items) {
    const answer = await client({ state: item.state, questions: { who: whoQuestion(labels), where: whereQuestion(labels) } })
    const who = choiceOf(answer.answers.who)
    if (!who) continue
    const where = SALES_WHO.includes(who.choice) ? choiceOf(answer.answers.where) : null
    const confidence = Math.round(Math.min(who.confidence, where?.confidence ?? 1) * 1000) / 1000
    const candidates = confidence < TEACHER_MIN_CONFIDENCE ? [who.choice, who.runnerUp].filter((c): c is string => Boolean(c)) : []
    out.push({ platform: item.platform, account: item.account, person: item.person, who: who.choice, where: where?.choice ?? null, confidence, candidates, inputTokens: answer.usage?.input_tokens ?? 0 })
  }
  return out
}

export interface TrainingRow {
  x: number[]
  who: string
  where: string | null
  weight: number
  source: 'owner' | 'teacher'
}

export function trainingSet(rows: readonly PipelineRow[], entries: readonly LabelEntry[], labels: PipelineLabels): TrainingRow[] {
  const set: TrainingRow[] = []
  for (const row of rows) {
    if (!row.vector) continue
    const entry = entries.find((e) => e.platform === row.platform && e.account === row.account && e.person === row.person)
    const who = entry?.who ?? (entry?.label ? OLD_LABEL_FIELDS[entry.label].who : null)
    if (!entry || !who || !(who in labels.who)) continue
    const teacher = entry.by === TEACHER_BY
    if (teacher && (entry.confidence ?? 0) < TEACHER_TRAIN_FLOOR) continue
    const stage = entry.who ? entry.where : entry.label ? OLD_LABEL_FIELDS[entry.label].where : null
    const where = SALES_WHO.includes(who) && stage && stage in labels.where ? stage : null
    const weight = teacher ? Math.round(0.5 * Math.min(1, (entry.confidence ?? 0) / TEACHER_MIN_CONFIDENCE) * 1000) / 1000 : 1
    set.push({ x: [...row.vector, ...FEATURE_NAMES.map((f) => row.features[f] ?? 0)], who, where, weight, source: teacher ? 'teacher' : 'owner' })
  }
  return set
}

export type HeadTrainer = (input: { model: string; features: string[]; rows: TrainingRow[] }) => Promise<PipelineHead>

export const TRAIN_SCRIPT = join(import.meta.dir, '..', '..', '..', '..', 'scripts', 'pipeline', 'trainHead.py')

export const uvTrainer: HeadTrainer = async (input) => {
  const child = Bun.spawn(['uv', 'run', '--no-project', '--with', 'scikit-learn', '--with', 'numpy', 'python', TRAIN_SCRIPT], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  child.stdin.write(JSON.stringify(input))
  child.stdin.end()
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (code !== 0) throw new Error(`the head trainer failed (${code}): ${err.trim().split('\n').slice(-3).join(' ')}`)
  return JSON.parse(out) as PipelineHead
}

export async function trainAndSave(rows: readonly PipelineRow[], entries: readonly LabelEntry[], labels: PipelineLabels, model: string, on: Database, trainer: HeadTrainer = uvTrainer): Promise<{ head: PipelineHead; id: number } | { refused: string; owner: number; teacher: number }> {
  const set = trainingSet(rows, entries, labels)
  const owner = set.filter((r) => r.source === 'owner').length
  const teacher = set.length - owner
  const kinds = new Set(set.map((r) => r.who)).size
  if (kinds < HEAD_MIN_KINDS || set.length < HEAD_MIN_ROWS) return { refused: `needs at least ${HEAD_MIN_ROWS} labelled chats of at least ${HEAD_MIN_KINDS} kinds of who; has ${owner} owner and ${teacher} teacher labels of ${kinds} kinds`, owner, teacher }
  const head = await trainer({ model, features: [...FEATURE_NAMES], rows: set })
  return { head, id: saveHead(on, head) }
}
