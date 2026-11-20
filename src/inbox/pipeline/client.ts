import type { Database } from 'bun:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { settingsPath } from '../../browser/identity/index'
import type { Embedder } from '../../search/conversations/types'
import { chatsOf, personKeyOf, saidOnly } from '../lastWord/index'
import type { LastWordMessage, PersonChat } from '../lastWord/index'
import { db } from '../store/index'
import { botSignal, featuresOf } from './helpers/features'
import { conversationIdsOf, fallbackReason, humanTalk, queueForTeacher, withoutFalseBot } from './helpers/fallback'
import { buildPrototypes, entropyOf, guessOf, withExemplars } from './helpers/model'
import { chatsMovedSince, lastMessageSeq, latestHead, messageIdOf, putRow, setEmotions, storedRow, storedRows } from './helpers/store'
import { getState } from '../../storage/state/index'
import { OLD_LABEL_FIELDS } from '../label/types'
import type { LabelEntry, LabelList } from '../label/types'
import { EMBED_BATCH, EMOTION_CHARS, PIPELINE_SETTING, QUEUE_SIZE, SALES_WHO, SLIDE_LINES, TEACHER_BY, WHERE_LABELS, WHO_LABELS, WINDOW_LINE_CHARS, WINDOW_MESSAGES } from './types'
import type { EmotionReader, PipelineHead, PipelineLabels, PipelineRow, Prototypes, QueueRow, TeachQueueItem } from './types'

export function pipelineLabels(file: string = settingsPath()): PipelineLabels {
  const defaults = { who: { ...WHO_LABELS }, where: { ...WHERE_LABELS } }
  if (!existsSync(file)) return defaults
  try {
    const saved = (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>)[PIPELINE_SETTING] as { who?: unknown; where?: unknown; about?: unknown } | undefined
    const listOf = (value: unknown, fallback: Record<string, string>) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
      const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => /^[a-z][A-Za-z0-9]*$/.test(k) && typeof v === 'string' && v.trim())
      return entries.length >= 2 ? Object.fromEntries(entries.map(([k, v]) => [k, String(v).trim()])) : fallback
    }
    const about = typeof saved?.about === 'string' && saved.about.trim() ? saved.about.trim() : undefined
    return { who: listOf(saved?.who, defaults.who), where: listOf(saved?.where, defaults.where), ...(about ? { about } : {}) }
  } catch {
    return defaults
  }
}

export interface PipelineDeps {
  embedder: Pick<Embedder, 'embed' | 'model'>
  emotions?: EmotionReader | null
  emotionsLater?: boolean
  labels?: PipelineLabels
  head?: PipelineHead | null
  now?: number
}

const prototypeCache = new Map<string, Promise<Prototypes>>()

export function prototypesFor(labels: PipelineLabels, embedder: Pick<Embedder, 'embed' | 'model'>): Promise<Prototypes> {
  const key = `${embedder.model}\u0000${JSON.stringify(labels)}`
  let found = prototypeCache.get(key)
  if (!found) {
    found = buildPrototypes(labels, embedder)
    prototypeCache.set(key, found)
    found.catch(() => prototypeCache.delete(key))
  }
  return found
}

export function exemplarsOf(on: Database, labels: PipelineLabels): { who: string; vector: Float32Array }[] {
  const entries = (getState<LabelList>('inboxLabels', 'all')?.body.entries ?? []).filter((e) => e.by !== TEACHER_BY)
  if (!entries.length) return []
  return entries.flatMap((e) => {
    const who = e.who ?? (e.label ? OLD_LABEL_FIELDS[e.label].who : null)
    const vector = who && who in labels.who ? storedRow(on, e.platform, e.account, e.person)?.vector : null
    return who && who in labels.who && vector ? [{ who, vector }] : []
  })
}

type Chat = Pick<PersonChat, 'platform' | 'account' | 'storedAsGroup' | 'with' | 'personKey' | 'messages'>

export function lineText(m: Pick<LastWordMessage, 'fromOwner' | 'text'>): string {
  return `${m.fromOwner ? 'me' : 'them'}: ${m.text.replace(/\s+/g, ' ').trim().slice(0, WINDOW_LINE_CHARS) || '[attachment]'}`
}

export function meanOf(vectors: readonly Float32Array[]): Float32Array {
  const mean = new Float32Array(vectors[0]?.length ?? 0)
  for (const v of vectors) for (let i = 0; i < mean.length; i++) mean[i] += v[i] / vectors.length
  const n = Math.hypot(...mean) || 1
  return mean.map((x) => x / n)
}

export function blended(previous: Float32Array, fresh: Float32Array, share: number): Float32Array {
  const mixed = previous.map((x, i) => x * (1 - share) + (fresh[i] ?? 0) * share)
  const n = Math.hypot(...mixed) || 1
  return mixed.map((x) => x / n)
}

export function modelTag(embedder: Pick<Embedder, 'model'>, head: PipelineHead | null, labels: PipelineLabels | null = null, exemplars = 0): string {
  if (head) return `${embedder.model}+head@${head.trainedAt}`
  const text = JSON.stringify(labels)
  let h = 2166136261
  for (let k = 0; k < text.length; k++) h = Math.imul(h ^ text.charCodeAt(k), 16777619)
  return `${embedder.model}+prototypes@${(h >>> 0).toString(36)}.${exemplars}`
}

const pendingEmotions = new Set<Promise<void>>()

export async function emotionsSettled(): Promise<void> {
  await Promise.all([...pendingEmotions])
}

export async function labelChats(chats: readonly Chat[], deps: PipelineDeps, on: Database = db()): Promise<PipelineRow[]> {
  const labels = deps.labels ?? pipelineLabels()
  const head = deps.head === undefined ? latestHead(on) : deps.head
  const now = deps.now ?? Date.now()
  const exemplars = head ? [] : exemplarsOf(on, labels)
  const tag = modelTag(deps.embedder, head, labels, exemplars.length)
  const due: { chat: Chat; said: ReturnType<typeof saidOnly>; lastSeq: number; previous: ReturnType<typeof storedRow> }[] = []
  for (const chat of chats) {
    const said = saidOnly(chat.messages)
    if (!said.length) continue
    const lastSeq = Math.max(...said.map((m) => m.seq))
    const previous = storedRow(on, chat.platform, chat.account, chat.personKey)
    if (previous && previous.lastSeq === lastSeq && previous.model === tag) continue
    due.push({ chat, said, lastSeq, previous })
  }
  if (!due.length) return []
  const people = due.filter((d) => !d.chat.storedAsGroup)
  const prototypes = people.length ? withExemplars(await prototypesFor(labels, deps.embedder), exemplars) : null
  const plans = people.map((d) => {
    const window = d.said.slice(-WINDOW_MESSAGES)
    const reusable = d.previous?.vector && d.previous.model.startsWith(`${deps.embedder.model}+`) ? d.previous : null
    const fresh = reusable ? window.filter((m) => m.seq > reusable.lastSeq) : window
    const mode: 'reuse' | 'slide' | 'full' = reusable && !fresh.length ? 'reuse' : reusable && fresh.length <= SLIDE_LINES && fresh.length < window.length ? 'slide' : 'full'
    return { d, window, mode, lines: (mode === 'full' ? window : mode === 'slide' ? fresh : []).map(lineText) }
  })
  const lastInbound = (d: (typeof due)[number]) => [...d.said].reverse().find((m) => !m.fromOwner)
  const feel = due.filter((d) => {
    const m = lastInbound(d)
    return Boolean(m && (!d.previous?.emotions || m.seq > d.previous.lastSeq))
  })
  const feelingsLater = deps.emotions && feel.length ? deps.emotions(feel.map((d) => lastInbound(d)!.text.replace(/\s+/g, ' ').trim().slice(0, EMOTION_CHARS) || '(nothing)')).catch(() => null) : Promise.resolve(null)
  const lines = plans.flatMap((p) => p.lines)
  const embedded: Float32Array[] = []
  for (let k = 0; k < lines.length; k += EMBED_BATCH) embedded.push(...(await deps.embedder.embed(lines.slice(k, k + EMBED_BATCH))))
  const feelings = deps.emotionsLater ? null : await feelingsLater
  let cursor = 0
  const vectors = new Map<(typeof due)[number], Float32Array>()
  for (const p of plans) {
    const mine = embedded.slice(cursor, cursor + p.lines.length)
    cursor += p.lines.length
    if (p.mode === 'reuse') vectors.set(p.d, p.d.previous!.vector!)
    else if (p.mode === 'slide') vectors.set(p.d, blended(p.d.previous!.vector!, meanOf(mine), mine.length / p.window.length))
    else if (mine.length) vectors.set(p.d, meanOf(mine))
  }
  const written: PipelineRow[] = []
  const entries = new Map((getState<LabelList>('inboxLabels', 'all')?.body.entries ?? []).map((e) => [`${e.platform} ${e.account} ${e.person}`, e] as const))
  const ownIds = ownAccountsOf(on)
  const queued: TeachQueueItem[] = []
  due.forEach((d) => {
    const bot = botSignal(d.chat.with, d.said)
    const entry: LabelEntry | undefined = entries.get(`${d.chat.platform} ${d.chat.account} ${d.chat.personKey}`)
    const teacher = entry?.by === TEACHER_BY ? entry : undefined
    const ownerLabelled = Boolean(entry && entry.by !== TEACHER_BY)
    const talking = humanTalk(d.said, ownIds.has(`${d.chat.platform}:${d.chat.personKey.toLowerCase()}`) || ownIds.has(`${d.chat.platform}:${d.chat.with.replace(/^@/, '').toLowerCase()}`))
    const gate = { teacherSaysBot: (ownerLabelled ? entry?.who : teacher?.who) === 'bot', humanTalk: talking }
    const vector = vectors.get(d) ?? null
    const at = feel.indexOf(d)
    const feeling = at >= 0 ? feelings?.[at] : undefined
    const features = featuresOf(d.said, bot, now, feeling?.length ? feeling : (d.previous?.emotions ?? null))
    const guess = vector && prototypes ? guessOf(vector, features, labels, prototypes, head, bot.why, gate) : { who: 'community' in labels.who ? 'community' : Object.keys(labels.who)[0], where: null, confidence: 1, margin: 1, whoScores: {}, whereScores: {}, source: 'group' as const, why: 'a group chat' }
    const moved = !d.previous || d.previous.who !== guess.who || d.previous.where !== guess.where
    const row = {
      platform: d.chat.platform,
      account: d.chat.account,
      person: d.chat.personKey,
      lastSeq: d.lastSeq,
      who: guess.who,
      where: guess.where,
      confidence: Math.round(guess.confidence * 1000) / 1000,
      margin: Math.round(guess.margin * 1000) / 1000,
      movedBySeq: moved ? d.lastSeq : d.previous!.movedBySeq,
      movedById: moved ? messageIdOf(on, d.lastSeq) : d.previous!.movedById,
      source: guess.source,
      model: tag,
      scores: { who: guess.whoScores, where: guess.whereScores },
      features,
      emotions: feeling?.length ? feeling : (d.previous?.emotions ?? null),
      vector,
      labelledAt: new Date(now).toISOString(),
    }
    putRow(on, row)
    written.push(row)
    const reason = guess.source === 'group' ? null : fallbackReason({ confidence: row.confidence, where: row.where, whereScores: guess.whereScores, botScore: features.botScore, said: d.said, teacher, ownerLabelled })
    if (reason) queued.push({ platform: row.platform, account: row.account, person: row.person, reason, confidence: row.confidence, throughSeq: d.lastSeq, queuedAt: new Date(now).toISOString() })
  })
  queueForTeacher(queued, on, now)
  if (deps.emotionsLater && feel.length) {
    const settling: Promise<void> = feelingsLater.then((later) => {
      later?.forEach((f, i) => {
        if (f?.length) setEmotions(on, feel[i].chat.platform, feel[i].chat.account, feel[i].chat.personKey, f)
      })
    }).catch(() => {}).finally(() => pendingEmotions.delete(settling))
    pendingEmotions.add(settling)
  }
  if (!head && written.some((w) => w.vector) && exemplarsOf(on, labels).length > exemplars.length) return [...written, ...(await labelChats(chats, deps, on))]
  return written
}

export async function refreshPipeline(query: { platform?: string; account?: string; conversationIds?: string[] }, deps: PipelineDeps, on: Database = db()): Promise<PipelineRow[]> {
  return labelChats(chatsOf(query, on), deps, on)
}

function ownAccountsOf(on: Database): Set<string> {
  const rows = on.prepare('SELECT platform, account, userId FROM accounts').all() as { platform: string; account: string; userId: string }[]
  return new Set(rows.flatMap((r) => [`${r.platform}:${r.account.toLowerCase()}`, `${r.platform}:${r.userId.toLowerCase()}`]))
}

export function pushLabeller(deps: () => PipelineDeps, on: () => Database = db): () => Promise<number> {
  let since: number | null = null
  let running: Promise<number> | null = null
  const pass = async (): Promise<number> => {
    const handle = on()
    if (since === null) {
      since = lastMessageSeq(handle)
      return 0
    }
    const moved = chatsMovedSince(handle, since)
    if (!moved.length) return 0
    since = Math.max(since, ...moved.map((m) => m.seq))
    let labelled = 0
    const given = deps()
    for (const chat of moved) labelled += (await refreshPipeline({ platform: chat.platform, account: chat.account, conversationIds: conversationIdsOf(chat.conversationId) }, given, handle)).length
    return labelled
  }
  return () => {
    running ??= pass().finally(() => {
      running = null
    })
    return running
  }
}

export function pipelineLine(platform: string, account: string, conversationId: string, on: Database = db()): string | null {
  let row: PipelineRow | null = null
  try {
    row = storedRow(on, platform, account, personKeyOf(conversationId))
  } catch {
    return null
  }
  if (!row) return null
  row = withoutFalseBot(row, false)
  const stage = row.where ? `, where ${row.where}` : ''
  const feels = row.emotions?.length ? `; their last message feels ${row.emotions.map((e) => `${e.label} ${Math.round(e.score * 100)}%`).join(', ')}` : ''
  return `  who ${row.who}${stage} (${Math.round(row.confidence * 100)}% sure, ${row.source}${row.movedById ? `, moved by message ${row.movedById}` : ''})${feels}`
}

export function labelQueue(rows: readonly (PipelineRow & { with?: string })[], skip: (row: PipelineRow) => boolean, size: number = QUEUE_SIZE): QueueRow[] {
  const candidates = rows
    .filter((r) => r.source !== 'group' && !skip(r))
    .map((r) => {
      const whoEntropy = entropyOf(r.scores.who)
      const whereEntropy = SALES_WHO.includes(r.who) ? entropyOf(r.scores.where) : 0
      return { row: r, uncertainty: Math.round(Math.max(1 - r.margin, (whoEntropy + whereEntropy) / 2) * 1000) / 1000 }
    })
    .sort((a, b) => b.uncertainty - a.uncertainty || b.row.lastSeq - a.row.lastSeq)
  const byPlatform = new Map<string, typeof candidates>()
  for (const c of candidates) byPlatform.set(c.row.platform, [...(byPlatform.get(c.row.platform) ?? []), c])
  const picked: typeof candidates = []
  const lanes = [...byPlatform.values()]
  for (let round = 0; picked.length < size && lanes.some((l) => l.length > round); round++) {
    const turn = lanes.map((l) => l[round]).filter(Boolean).sort((a, b) => b.uncertainty - a.uncertainty)
    for (const c of turn) if (picked.length < size) picked.push(c)
  }
  return picked.map(({ row, uncertainty }) => ({ platform: row.platform, account: row.account, person: row.person, with: row.with ?? row.person, who: row.who, where: row.where, confidence: row.confidence, margin: row.margin, uncertainty, chat: row.person }))
}

export function pipelineRows(query: { platform?: string; account?: string } = {}, on: Database = db()): PipelineRow[] {
  return storedRows(on, query)
}
