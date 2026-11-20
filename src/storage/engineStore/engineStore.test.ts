import { afterAll, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrate, missingObjectsOf, openDatabase } from '../schema/client'
import { MIGRATIONS } from '../schema/helpers'
import { assembleEngineStore, enginePartsOf, readEngineStore } from './index'

const python = join(import.meta.dir, '..', '..', '..', 'python')
const dirs: string[] = []
const dbs: string[] = []

function scratch(): { dir: string; db: string; root: string } {
  const dir = mkdtempSync(join(tmpdir(), 'engineStore'))
  dirs.push(dir)
  const db = join(dir, 'log.db')
  dbs.push(db)
  openDatabase(db)
  return { dir, db, root: join(dir, 'twitter') }
}

function runPython(script: string, env: Record<string, string>): Record<string, unknown> {
  const run = spawnSync(process.env.LOG_PYTHON || 'python', ['-c', script], { cwd: python, encoding: 'utf8', env: { ...process.env, ...env }, windowsHide: true })
  if (run.status !== 0) throw new Error(run.stderr)
  return JSON.parse(run.stdout.trim().split(/\r?\n/).pop() ?? '{}') as Record<string, unknown>
}

function inboxFile(root: string, account: string, messages: { event_id: string; text: string; time_ms: number }[]): string {
  const file = join(root, account, 'inboxSync.json')
  mkdirSync(join(root, account), { recursive: true })
  const conversation = { participants: ['7'], handles: { '7': 'linus_k' }, lastMs: messages.at(-1)?.time_ms ?? null, lastSender: '7', messages: messages.map((m) => ({ ...m, sender_id: '7', conversation_id: '7:100' })) }
  writeFileSync(file, JSON.stringify({ version: 1, maxSequenceId: '5', syncedAt: null, userId: '100', xchat: { '7:100': conversation }, legacy: { conversations: {}, users: {}, messages: [], boxes: {} } }))
  return file
}

afterAll(() => {
  for (const db of dbs) openDatabase(db).close()
  Bun.gc(true)
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

describe('engine stores in log.db (issues #96, #97)', () => {
  test('migration 23 adds engineState to a database left at 22, and repairs it when lost', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engineStoreUpgrade'))
    dirs.push(dir)
    const handle = new Database(join(dir, 'log.db'), { create: true })
    try {
      for (const migration of MIGRATIONS.filter((m) => m.version <= 22)) migration.apply(handle)
      handle.exec('PRAGMA user_version = 22')
      const now = new Date('2026-01-01T00:00:00.000Z')
      expect(migrate(handle, now)[0]).toEqual({ version: 23, name: 'engineStores', appliedAt: now.toISOString() })
      expect(missingObjectsOf(handle, ['engineState'])).toEqual([])
      handle.exec('DROP TABLE engineState')
      expect(migrate(handle, now).find((m) => m.version === 23)).toEqual({ version: 23, name: 'engineStores', appliedAt: now.toISOString(), repaired: ['engineState'] })
    } finally {
      handle.close()
    }
  })

  test('a store is kept as one row per conversation and put back together the same', () => {
    const body = { version: 1, maxSequenceId: '9', xchat: { 'a:b': { messages: [{ event_id: '1' }] }, 'c:d': { messages: [] } }, legacy: { users: {} } }
    const parts = enginePartsOf('xInbox', body)
    expect([...parts.keys()].sort()).toEqual(['head', 'xchat:a:b', 'xchat:c:d'])
    expect(assembleEngineStore('xInbox', [...parts].map(([part, text]) => ({ part, body: text })))).toEqual(body)
  })

  test('the old inboxSync.json is imported once on first read and kept, then log.db answers', () => {
    const { db, root } = scratch()
    const file = inboxFile(root, 'xAccount', [{ event_id: '1', text: 'first', time_ms: 1000 }])
    const handle = openDatabase(db)
    const read = readEngineStore<{ xchat: Record<string, { messages: unknown[] }> }>('xInbox', 'xAccount', file, handle)
    expect(read?.xchat['7:100'].messages).toHaveLength(1)
    expect(handle.prepare("SELECT part FROM engineState WHERE store = 'xInbox' ORDER BY part").all()).toEqual([{ part: 'head' }, { part: 'xchat:7:100' }])
    expect(existsSync(file)).toBe(true)
    handle.prepare("UPDATE engineState SET body = json_set(body, '$.handles.7', 'grace_ships') WHERE part = 'xchat:7:100'").run()
    expect(readEngineStore<{ xchat: Record<string, { handles: Record<string, string> }> }>('xInbox', 'xAccount', file, handle)?.xchat['7:100'].handles['7']).toBe('grace_ships')
    const later = (Date.now() + 60_000) / 1000
    utimesSync(file, later, later)
    expect(readEngineStore<{ xchat: Record<string, { handles: Record<string, string> }> }>('xInbox', 'xAccount', file, handle)?.xchat['7:100'].handles['7']).toBe('linus_k')
  })

  test('a stale X inbox state written after a live push keeps the pushed message, merged inside one write transaction, and the old file is left as it was', () => {
    const { db, root } = scratch()
    const file = inboxFile(root, 'xAccount', [{ event_id: '1', text: 'first', time_ms: 1000 }])
    const before = readFileSync(file, 'utf8')
    const out = runPython(String.raw`
import json, sys
from pathlib import Path
sys.path.insert(0, ".")
from twitterApi import inboxSync
path = Path(r"${file}")
stale = inboxSync.read_state(path)
inboxSync.push_message(path, "100", {"event_id": "2", "sender_id": "7", "time_ms": 2000, "text": "pushed", "conversation_id": "7:100"}, "linus_k")
stale["xchat"]["9:100"] = {"participants": ["9"], "handles": {}, "lastMs": 3000, "lastSender": "9", "messages": [{"event_id": "3", "sender_id": "9", "time_ms": 3000, "text": "other chat", "conversation_id": "9:100"}]}
inboxSync.write_state(path, stale)
held = inboxSync.read_state(path)
print(json.dumps({"ids": sorted(m["event_id"] for c in held["xchat"].values() for m in c["messages"])}))
`, { LOG_DB: db, LOG_TWITTER_STATE: root })
    expect(out.ids).toEqual(['1', '2', '3'])
    expect(readFileSync(file, 'utf8')).toBe(before)
    const read = readEngineStore<{ xchat: Record<string, { messages: { text: string }[] }> }>('xInbox', 'xAccount', file, openDatabase(db))
    expect(read?.xchat['7:100'].messages.map((m) => m.text)).toEqual(['first', 'pushed'])
  })

  test('X notifications, the last call, Discord servers and threads and LinkedIn connects are written to log.db, not files', () => {
    const { db, dir, root } = scratch()
    const out = runPython(String.raw`
import json, sys
from pathlib import Path
sys.path.insert(0, ".")
from twitterApi import notifications, engine
from discordApi import engine as discord
from linkedinApi import engine as linkedin
notes = Path(r"${join(root, 'xAccount', 'notifications.json')}")
store = notifications.empty_store("100")
store["rows"]["like:7:1"] = {"key": "like:7:1", "kind": "like", "at": "2026-01-01T00:00:00Z", "userId": "7", "handle": "linus_k"}
notifications.write_store(notes, store)
engine.mark_call("xAccount", 1000.0)
spec = {"account": "discordAccount"}
discord.keep_threads(spec, [{"id": "1", "name": "one"}])
discord.keep_threads(spec, [{"id": "2", "name": "two"}])
class Socket:
    guilds = [{"name": "demo", "guild_id": 1, "channels": [{"id": 2, "name": "general", "type": 0}]}]
saved = discord.save_servers_from(Socket(), spec)
linkedin.connect_noted({"stateRoot": r"${join(dir, 'linkedin')}", "account": "linkedinAccount"}, 5.0)
print(json.dumps({"wait": engine.spacing_wait("xAccount", 1000.0, lambda a, b: 3.0), "saved": saved, "threads": [t["id"] for t in discord.kept_threads(spec)], "connects": linkedin.connects_sent({"stateRoot": r"${join(dir, 'linkedin')}", "account": "linkedinAccount"})}))
`, { LOG_DB: db, LOG_TWITTER_STATE: root, LOG_HOME: dir })
    expect(out).toEqual({ wait: 3, saved: 1, threads: ['1', '2'], connects: [5] })
    const handle = openDatabase(db)
    expect((handle.prepare('SELECT DISTINCT store FROM engineState ORDER BY store').all() as { store: string }[]).map((r) => r.store)).toEqual(['discordServers', 'discordThreads', 'linkedinConnects', 'xLastCall', 'xNotifications'])
    expect(existsSync(join(root, 'xAccount', 'notifications.json'))).toBe(false)
    expect(existsSync(join(dir, 'discord', 'discordAccount', 'threads.json'))).toBe(false)
    expect(existsSync(join(dir, 'discord', 'discordAccount', 'servers.json'))).toBe(false)
    expect(readEngineStore<{ rows: Record<string, { handle: string }> }>('xNotifications', 'xAccount', join(root, 'xAccount', 'notifications.json'), handle)?.rows['like:7:1'].handle).toBe('linus_k')
  })

  test('with no log.db yet the engine keeps writing its old file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engineStoreNoDb'))
    dirs.push(dir)
    const file = join(dir, 'twitter', 'xAccount', 'notifications.json')
    const out = runPython(String.raw`
import json, sys
from pathlib import Path
sys.path.insert(0, ".")
from twitterApi import notifications
path = Path(r"${file}")
notifications.write_store(path, notifications.empty_store("100"))
print(json.dumps({"rows": len(notifications.read_store(path)["rows"])}))
`, { LOG_DB: join(dir, 'missing.db'), LOG_TWITTER_STATE: join(dir, 'twitter') })
    expect(out).toEqual({ rows: 0 })
    expect(existsSync(file)).toBe(true)
    expect(existsSync(join(dir, 'missing.db'))).toBe(false)
  })
})
