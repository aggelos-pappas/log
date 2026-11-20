#!/usr/bin/env bun
import { diskFree, runsBytes, storageVerdict } from '../../src/browser/runStore/index'
import { storageAnswer } from '../../src/agentHooks/answers/client'
import { contextOutput, hookHostOf } from '../../src/agentHooks/harness/index'
import type { HookEvent } from '../../src/agentHooks/registry/types'

const raw = await Bun.stdin.text().catch(() => '')
let event = 'UserPromptSubmit'
try {
  event = (JSON.parse(raw || '{}') as { hook_event_name?: string }).hook_event_name ?? event
} catch {}

const answer = storageAnswer(raw, () => storageVerdict(runsBytes(), diskFree()), { event: event as HookEvent })
if (answer.context) process.stdout.write(contextOutput(event, answer.context, hookHostOf(process.argv)))
