#!/usr/bin/env bun
import { join } from 'node:path'
import { relateAnswer } from '../../src/agentHooks/answers/index'
import { contextOutput, hookHostOf } from '../../src/agentHooks/harness/index'

const raw = await Bun.stdin.text().catch(() => '')
const answer = await relateAnswer(raw, join(import.meta.dir, '..', '..'))
if (answer.context) process.stdout.write(contextOutput('UserPromptSubmit', answer.context, hookHostOf(process.argv)))
