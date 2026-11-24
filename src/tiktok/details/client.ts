import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export function videoId(link: string): string {
  const url = new URL(link)
  if (url.protocol !== 'https:' || !['www.tiktok.com', 'tiktok.com'].includes(url.hostname)) throw Error('Use a full HTTPS TikTok video link')
  const id = url.pathname.match(/^\/@[^/]+\/(?:video|photo)\/(\d+)\/?$/)?.[1]
  if (!id) throw Error('Use a TikTok link containing /@creator/video/ID or /@creator/photo/ID')
  return id
}

export function localApiUrl(base: string, link: string): string {
  const url = new URL(base)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) throw Error('The scraper API must be a local HTTP service')
  url.pathname = '/videos/details'
  url.search = ''
  url.hash = ''
  url.searchParams.set('video', videoId(link))
  return url.href
}

export async function fetchDetails(base: string, link: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(localApiUrl(base, link), { signal: AbortSignal.timeout(120000), redirect: 'error' })
  if (!response.ok) return { ok: false as const, status: response.status, error: `Scraper returned HTTP ${response.status}`, stop: [401, 403, 429].includes(response.status) || response.status >= 500 }
  const data = await response.json()
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('id' in data) || data.id !== videoId(link)) return { ok: false as const, status: response.status, error: 'The scraper returned no matching video-detail object', stop: true }
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
