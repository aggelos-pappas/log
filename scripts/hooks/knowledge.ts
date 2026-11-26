#!/usr/bin/env bun
import { memoryContext } from '../../src/memory/index'
import { contextOutput, hookHostOf } from '../../src/agentHooks/harness/index'

const raw = await Bun.stdin.text().catch(() => '')
let event = 'SessionStart'
try {
  event = (JSON.parse(raw || '{}') as { hook_event_name?: string }).hook_event_name ?? event
} catch {}

process.stdout.write(contextOutput(event, memoryContext(), hookHostOf(process.argv)))
