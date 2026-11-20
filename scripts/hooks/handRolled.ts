#!/usr/bin/env bun
import { classifyCall, handRolledAdvice } from '../../src/agentHooks/handRolled/client'
import { contextOutput, hookHostOf } from '../../src/agentHooks/harness/index'

interface HookInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
  cwd?: string
}

const raw = await Bun.stdin.text().catch(() => '')
let input: HookInput = {}
try {
  input = JSON.parse(raw || '{}') as HookInput
} catch {
  input = {}
}

const verdict = classifyCall(input.tool_name ?? '', input.tool_input ?? {}, { cwd: input.cwd })
if (verdict.handRolled) {
  let seen = 0
  try {
    const { recordHandRolled } = await import('../../src/agentHooks/handRolled/helpers/store')
    seen = recordHandRolled(verdict)
  } catch {}
  process.stdout.write(contextOutput('PreToolUse', handRolledAdvice(verdict, seen), hookHostOf(process.argv)))
}
