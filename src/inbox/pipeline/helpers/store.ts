import type { Database } from 'bun:sqlite'
import type { Emotion, Features, PipelineHead, PipelineRow } from '../types'

interface Stored {
  platform: string
  account: string
  person: string
  lastSeq: number
  who: string
  stage: string | null
  confidence: number
  margin: number
  movedBySeq: number | null
  movedById: string | null
  source: string
  model: string
  scores: string
  features: string
  emotions: string | null
  vector: Uint8Array | null
  labelledAt: string
}

function rowOf(s: Stored): PipelineRow & { model: string } {
  return {
    platform: s.platform,
    account: s.account,
    person: s.person,
    lastSeq: s.lastSeq,
    who: s.who,
    where: s.stage,
    confidence: s.confidence,
    margin: s.margin,
    movedBySeq: s.movedBySeq,
    movedById: s.movedById,
    source: s.source,
    model: s.model,
    scores: JSON.parse(s.scores) as PipelineRow['scores'],
    features: JSON.parse(s.features) as Features,
    emotions: s.emotions ? (JSON.parse(s.emotions) as Emotion[]) : null,
    vector: s.vector ? new Float32Array(new Uint8Array(s.vector).buffer) : null,
    labelledAt: s.labelledAt,
  }
}

export function hasPipelineTables(on: Database): boolean {
  return Boolean(on.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'chatPipeline'").get())
}

export function storedRow(on: Database, platform: string, account: string, person: string): (PipelineRow & { model: string }) | null {
  if (!hasPipelineTables(on)) return null
  const row = on.prepare('SELECT * FROM chatPipeline WHERE platform = ? AND account = ? AND person = ?').get(platform, account, person) as Stored | null
  return row ? rowOf(row) : null
}

export function storedRows(on: Database, query: { platform?: string; account?: string } = {}): (PipelineRow & { model: string })[] {
  if (!hasPipelineTables(on)) return []
  const rows = on.prepare('SELECT * FROM chatPipeline WHERE (?1 IS NULL OR platform = ?1) AND (?2 IS NULL OR account = ?2)').all(query.platform ?? null, query.account ?? null) as Stored[]
  return rows.map(rowOf)
}

export function putRow(on: Database, row: PipelineRow & { model: string }): void {
  on.prepare(
    `INSERT INTO chatPipeline (platform, account, person, lastSeq, who, stage, confidence, margin, movedBySeq, movedById, source, model, scores, features, emotions, vector, labelledAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(platform, account, person) DO UPDATE SET lastSeq = excluded.lastSeq, who = excluded.who, stage = excluded.stage, confidence = excluded.confidence, margin = excluded.margin, movedBySeq = excluded.movedBySeq, movedById = excluded.movedById, source = excluded.source, model = excluded.model, scores = excluded.scores, features = excluded.features, emotions = excluded.emotions, vector = excluded.vector, labelledAt = excluded.labelledAt`,
  ).run(
    row.platform,
    row.account,
    row.person,
    row.lastSeq,
    row.who,
    row.where,
    row.confidence,
    row.margin,
    row.movedBySeq,
    row.movedById,
    row.source,
    row.model,
    JSON.stringify(row.scores),
    JSON.stringify(row.features),
    row.emotions ? JSON.stringify(row.emotions) : null,
    row.vector ? new Uint8Array(row.vector.buffer.slice(row.vector.byteOffset, row.vector.byteOffset + row.vector.byteLength)) : null,
    row.labelledAt,
  )
}

export function latestHead(on: Database): PipelineHead | null {
  if (!hasPipelineTables(on)) return null
  const row = on.prepare('SELECT head FROM pipelineHeads ORDER BY id DESC LIMIT 1').get() as { head: string } | null
  return row ? (JSON.parse(row.head) as PipelineHead) : null
}

export function saveHead(on: Database, head: PipelineHead): number {
  const result = on.prepare('INSERT INTO pipelineHeads (model, head, trainedAt) VALUES (?, ?, ?)').run(head.model, JSON.stringify(head), head.trainedAt)
  return Number(result.lastInsertRowid)
}

export function messageIdOf(on: Database, seq: number): string | null {
  const row = on.prepare('SELECT COALESCE(platformMessageId, messageKey) AS id FROM messages WHERE seq = ?').get(seq) as { id: string } | null
  return row?.id ?? null
}

export function chatsMovedSince(on: Database, seq: number): { platform: string; account: string; conversationId: string; seq: number }[] {
  return on.prepare("SELECT c.platform, c.account, c.conversationId, MAX(m.seq) AS seq FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE m.seq > ? AND c.kind IN ('dm', 'group') GROUP BY c.chatId").all(seq) as { platform: string; account: string; conversationId: string; seq: number }[]
}

export function lastMessageSeq(on: Database): number {
  return (on.prepare('SELECT COALESCE(MAX(seq), 0) AS n FROM messages').get() as { n: number }).n
}

export function setEmotions(on: Database, platform: string, account: string, person: string, emotions: Emotion[]): void {
  on.prepare('UPDATE chatPipeline SET emotions = ? WHERE platform = ? AND account = ? AND person = ?').run(JSON.stringify(emotions), platform, account, person)
}
