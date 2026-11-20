#!/usr/bin/env bun
import { READER_PATTERN } from '../../src/inbox/pending/index'
import { localEmotions, pipelineLabels, pushLabeller, startTeacher } from '../../src/inbox/pipeline/index'
import { createDecisionsClient } from '../../src/subq/decisions/index'
import { pushLoop } from '../../src/inbox/push/index'
import { localEmbedder } from '../../src/search/conversations/index'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 ? (args[at + 1] ?? '') : ''
}
const reader = flag('reader')
const host = flag('host') || 'claudeCode'
if (!READER_PATTERN.test(reader)) {
  process.stderr.write('log push: --reader <name> is required (letters, digits, _ and -), the same reader the session prompt hook uses, so a pushed message is never shown twice\n')
  process.exit(2)
}
const embedder = localEmbedder()
const emotions = localEmotions()
const label = process.env.LOG_PIPELINE === 'off' ? undefined : pushLabeller(() => ({ embedder, emotions, emotionsLater: true }))
if (label && process.env.LOG_PIPELINE_TEACHER !== 'off') startTeacher(() => ({ client: createDecisionsClient(), labels: pipelineLabels(), embedderModel: embedder.model }))
if (label) void Promise.all([embedder.embed(['warm']), emotions(['warm'])]).catch(() => null)
await pushLoop(reader, host, (batch) => process.stdout.write(`${JSON.stringify(batch)}\n`), { label })
