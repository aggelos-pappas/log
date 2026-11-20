import { spawn } from 'node:child_process'
import { join } from 'node:path'
import type { MoveSession } from '../types'

export const READ_STATE_SCRIPT = join(import.meta.dir, '..', '..', '..', '..', 'python', 'browser', 'cdpState.py')

export function readStateOverCdp(cdpUrl: string, origins: string[], python = process.env.LOG_PYTHON || 'python'): Promise<MoveSession> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [READ_STATE_SCRIPT], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => (out += chunk))
    child.stderr.on('data', (chunk) => (err += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      try {
        const answer = JSON.parse(out.trim().split(/\r?\n/).pop() || '{}') as { ok?: boolean; cookies?: MoveSession['cookies']; origins?: unknown[]; code?: string; detail?: string }
        if (code === 0 && answer.ok) return resolve({ cookies: answer.cookies ?? [], origins: answer.origins ?? [] })
        reject(Object.assign(new Error(`${answer.code ?? 'cdpStateFailed'}: ${answer.detail ?? err.trim().slice(-300)}`), { code: answer.code ?? 'cdpStateFailed', detail: answer.detail ?? err.trim().slice(-300) }))
      } catch {
        reject(Object.assign(new Error(`cdpStateFailed: ${err.trim().slice(-300)}`), { code: 'cdpStateFailed', detail: err.trim().slice(-300) }))
      }
    })
    child.stdin.end(JSON.stringify({ cdpUrl, origins }))
  })
}
