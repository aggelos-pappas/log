import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModelAsk, ModelScorer } from './types'
import { ASK_TIMEOUT_MS, MODEL_CHANNEL, MODEL_MIN_CHARS, START_GRACE_MS } from './types'

export const ASK_PATH = fileURLToPath(new URL('../../../python/judge/ask.py', import.meta.url))
export const SERVER_PATH = fileURLToPath(new URL('../../../python/judge/server.py', import.meta.url))

function judgeHome(): string {
  return join(process.env.LOG_HOME || join(homedir(), '.logCli'), 'judge')
}

function python(): string {
  return process.env.LOG_PYTHON || 'python'
}

export function parseAsk(stdout: string): ModelAsk {
  try {
    const parsed = JSON.parse(stdout.trim().split('\n').pop() || '{}') as ModelAsk
    return parsed && typeof parsed === 'object' ? parsed : { ok: false }
  } catch {
    return { ok: false }
  }
}

export function startJudgeServer(now = Date.now()): boolean {
  if (process.env.LOG_JUDGE_MODEL_OFF === '1') return false
  const home = judgeHome()
  const marker = join(home, 'starting')
  if (existsSync(marker) && now - statSync(marker).mtimeMs < START_GRACE_MS) return false
  mkdirSync(home, { recursive: true })
  writeFileSync(marker, String(now))
  const child = spawn(python(), [SERVER_PATH], { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => undefined)
  child.unref()
  return true
}

export function judgeServerState(): { pid: number; port: number } | null {
  const file = join(judgeHome(), 'server.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as { pid: number; port: number }
  } catch {
    return null
  }
}

export const modelScores: ModelScorer = (texts) => {
  if (process.env.LOG_JUDGE_MODEL_OFF === '1') return null
  const wanted = texts.map((t) => t.trim().length >= MODEL_MIN_CHARS)
  const asked = texts.filter((_, i) => wanted[i])
  if (!asked.length) return texts.map(() => 0)
  const run = spawnSync(python(), [ASK_PATH], { input: JSON.stringify({ texts: asked, channels: asked.map(() => MODEL_CHANNEL) }), encoding: 'utf8', timeout: ASK_TIMEOUT_MS, windowsHide: true })
  const answer = parseAsk(run.stdout ?? '')
  if (!answer.ok || !answer.scores || answer.scores.length !== asked.length) {
    if (answer.down) startJudgeServer()
    return null
  }
  let next = 0
  return texts.map((_, i) => (wanted[i] ? answer.scores![next++] : 0))
}
