import type { Database } from 'bun:sqlite'
import { readFileSync, statSync } from 'node:fs'
import { defaultDbPath, openDatabase } from '../schema/client'
import { ENGINE_HEAD_PART, ENGINE_STORES } from './types'
import type { EngineStoreName } from './types'

type Body = Record<string, unknown>

function handleOf(): Database {
  return openDatabase(defaultDbPath())
}

export function engineImportKey(name: EngineStoreName, account: string): string {
  return `engineState:${ENGINE_STORES[name].platform}:${account}:${name}`
}

export function legacyStampOf(file: string): number | null {
  try {
    return Math.floor(statSync(file).mtimeMs)
  } catch {
    return null
  }
}

export function enginePartsOf(name: EngineStoreName, body: Body): Map<string, string> {
  const splits = ENGINE_STORES[name].splits
  const head: Body = {}
  for (const [key, value] of Object.entries(body)) if (!splits.includes(key)) head[key] = value
  const parts = new Map<string, string>([[ENGINE_HEAD_PART, JSON.stringify(head)]])
  for (const key of splits) {
    const map = body[key]
    if (!map || typeof map !== 'object') continue
    for (const [entry, value] of Object.entries(map as Body)) parts.set(`${key}:${entry}`, JSON.stringify(value))
  }
  return parts
}

export function assembleEngineStore(name: EngineStoreName, rows: readonly { part: string; body: string }[]): Body | null {
  const splits = ENGINE_STORES[name].splits
  const out: Body = {}
  for (const key of splits) out[key] = {}
  let head = false
  for (const row of rows) {
    let value: unknown
    try {
      value = JSON.parse(row.body)
    } catch {
      continue
    }
    if (row.part === ENGINE_HEAD_PART) {
      if (value && typeof value === 'object') Object.assign(out, value)
      head = true
      continue
    }
    const at = row.part.indexOf(':')
    const key = row.part.slice(0, at)
    if (at < 1 || !splits.includes(key)) continue
    ;(out[key] as Body)[row.part.slice(at + 1)] = value
  }
  return head ? out : null
}

function rowsOf(handle: Database, name: EngineStoreName, account: string): { part: string; body: string }[] {
  return handle.prepare('SELECT part, body FROM engineState WHERE platform = ? AND account = ? AND store = ?').all(ENGINE_STORES[name].platform, account, name) as { part: string; body: string }[]
}

export function writeEngineStore(name: EngineStoreName, account: string, body: Body, handle: Database = handleOf(), now: number = Date.now()): number {
  const held = new Map(rowsOf(handle, name, account).map((r) => [r.part, r.body]))
  const upsert = handle.prepare('INSERT INTO engineState (platform, account, store, part, body, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(platform, account, store, part) DO UPDATE SET body = excluded.body, updatedAt = excluded.updatedAt')
  let changed = 0
  for (const [part, text] of enginePartsOf(name, body)) {
    if (held.get(part) === text) continue
    upsert.run(ENGINE_STORES[name].platform, account, name, part, text, now)
    changed++
  }
  return changed
}

function importedStampOf(handle: Database, key: string): number | null {
  const row = handle.prepare("SELECT detail FROM imports WHERE store = ? AND state = 'done'").get(key) as { detail: string | null } | null
  const stamp = Number(row?.detail)
  return row && Number.isFinite(stamp) ? stamp : null
}

function parsedFile(file: string): Body | null {
  try {
    const body = JSON.parse(readFileSync(file, 'utf8')) as unknown
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Body) : null
  } catch {
    return null
  }
}

export function readEngineStore<T extends Body>(name: EngineStoreName, account: string, legacyFile?: string, handle: Database = handleOf()): T | null {
  const key = engineImportKey(name, account)
  const stamp = legacyFile ? legacyStampOf(legacyFile) : null
  const imported = stamp === null ? null : importedStampOf(handle, key)
  if (legacyFile && stamp !== null && (imported === null || stamp > imported)) {
    const parsed = parsedFile(legacyFile)
    if (parsed && !handle.inTransaction && rowsOf(handle, name, account).length === 0) {
      const now = new Date().toISOString()
      handle.exec('BEGIN IMMEDIATE')
      try {
        if (rowsOf(handle, name, account).length === 0) writeEngineStore(name, account, parsed, handle)
        handle.prepare("INSERT INTO imports (store, state, files, rows, detail, startedAt, endedAt) VALUES (?, 'done', 1, ?, ?, ?, ?) ON CONFLICT(store) DO UPDATE SET state = 'done', files = 1, rows = excluded.rows, detail = excluded.detail, endedAt = excluded.endedAt").run(key, enginePartsOf(name, parsed).size, String(stamp), now, now)
        handle.exec('COMMIT')
      } catch (error) {
        handle.exec('ROLLBACK')
        throw error
      }
    }
    if (parsed) return parsed as T
  }
  return assembleEngineStore(name, rowsOf(handle, name, account)) as T | null
}
