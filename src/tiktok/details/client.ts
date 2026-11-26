import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PlatformAnswer } from '../../platformKit/session/index'

export function videoId(link: string): string {
  const url = new URL(link)
  if (url.protocol !== 'https:' || !['www.tiktok.com', 'tiktok.com'].includes(url.hostname)) throw Error('Use a full HTTPS TikTok video link')
  const id = url.pathname.match(/^\/@[^/]+\/(?:video|photo)\/(\d+)\/?$/)?.[1]
  if (!id) throw Error('Use a TikTok link containing /@creator/video/ID or /@creator/photo/ID')
  return id
}

export function fetchDetails(link: string, extract: (id: string) => PlatformAnswer) {
  const answer = extract(videoId(link))
  if (!answer.ok) return { ok: false as const, status: typeof answer.status === 'number' ? answer.status : null, error: `${answer.code ?? 'extractionFailed'}: ${answer.detail ?? 'Video extraction failed'}`, stop: answer.code !== 'videoNotFound' }
  const data = answer.data
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('id' in data) || data.id !== videoId(link)) return { ok: false as const, status: null, error: 'The scraper returned no matching video-detail object', stop: true }
  return { ok: true as const, data: data as Record<string, unknown> }
}

export function saveExport(path: string, data: unknown): void {
  const target = resolve(path)
  mkdirSync(dirname(target), { recursive: true })
  const temporary = `${target}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
    renameSync(temporary, target)
  } finally { rmSync(temporary, { force: true }) }
}
