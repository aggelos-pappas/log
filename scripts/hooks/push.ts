#!/usr/bin/env bun
import { READER_PATTERN } from '../../src/inbox/pending/index'
import { pushLoop } from '../../src/inbox/push/index'

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
await pushLoop(reader, host, (batch) => process.stdout.write(`${JSON.stringify(batch)}\n`))
