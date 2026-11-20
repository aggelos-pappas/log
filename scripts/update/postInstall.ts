#!/usr/bin/env bun
import '../../src/config/userEnv/autoload.ts'
import { join } from 'node:path'
import { livePostInstallDeps, postInstallText, runPostInstall, stepsWithout } from '../../src/release/postInstall/index'
import { modelsText } from '../../src/models/store/index'

const args = process.argv.slice(2)
const json = args.includes('--json')
const at = args.indexOf('--skip')
const skip = [...(at >= 0 ? (args[at + 1] ?? '').split(',') : []), ...(process.env.LOG_MODELS?.trim() === 'off' ? ['models'] : [])]
const root = join(import.meta.dir, '..', '..')
const report = await runPostInstall(root, stepsWithout(skip), livePostInstallDeps(json ? (line) => process.stderr.write(`${line}\n`) : (line) => console.log(`log: ${line}`)))
if (json) process.stdout.write(`${JSON.stringify(report)}\n`)
else {
  console.log(postInstallText(report))
  if (report.models.length) console.log(modelsText(report.models))
}
process.exit(report.ok ? 0 : 1)
