#!/usr/bin/env bun
import '../../src/config/userEnv/autoload.ts'
import { defaultDbPath } from '../../src/storage/schema/index'
import { runGraphOwner } from '../../src/relate/owner/index'

const stamp = () => new Date().toISOString()
let stopped = false
process.on('SIGTERM', () => { stopped = true })
process.on('SIGINT', () => { stopped = true })
const outcome = await runGraphOwner({ dbPath: defaultDbPath(), log: (line) => console.log(`${stamp()} ${line}`), stopped: () => stopped })
console.log(`${stamp()} graph owner: ${outcome.ok ? `stopped (${outcome.reason}) after ${outcome.batches} batches` : `${outcome.code}: ${outcome.reason}`}`)
process.exit(outcome.ok ? 0 : outcome.code === 'graphOwnerRunning' ? 3 : 1)
