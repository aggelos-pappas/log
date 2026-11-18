#!/usr/bin/env bun
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from '@relate/relate'
import { openDatabase } from '../../src/storage/schema/index'
import { DEMO_NOW, seedDemoWorld } from '../../src/relate/graph/fixtures/demoWorld'
import { countsIn, projectionOf, workspaceOf, writeProjection } from '../../src/relate/graph/index'

const out = join(import.meta.dir, '..', '..', 'docs', 'relate')
const file = join(out, 'demoGraph.rl')
const dbPath = join(mkdtempSync(join(tmpdir(), 'relateDemo-')), 'log.db')
const handle = openDatabase(dbPath)
seedDemoWorld(handle)
mkdirSync(out, { recursive: true })
rmSync(file, { force: true })
const db = Database.open(file)
const conn = db.connect()
writeProjection(conn, projectionOf(handle), { workspace: workspaceOf(dbPath), builtAt: new Date(DEMO_NOW).toISOString() })
db.checkpoint()
console.log(`demo graph: ${JSON.stringify(countsIn(conn))} -> docs/relate/demoGraph.rl`)
