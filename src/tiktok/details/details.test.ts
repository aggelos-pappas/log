import { expect, test } from 'bun:test'
import { fetchDetails, localApiUrl, saveExport, videoId } from './client'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const link = 'https://www.tiktok.com/@creator/video/7676887069293153566'

test('video links retain exact IDs and local service requests use the upstream endpoint', () => {
  expect(videoId(link)).toBe('7676887069293153566')
  expect(localApiUrl('http://localhost:8000', link)).toBe('http://localhost:8000/videos/details?video=7676887069293153566')
  expect(() => videoId('https://example.com/@creator/video/123')).toThrow()
})

test('detail response keeps upstream field names, nulls, nested values and arrays', async () => {
  const upstream = { id: '7676887069293153566', created_at: '2026-08-22T16:02:58Z', title: null, stats: { play_count: 1405 }, music: { streaming_links: [] }, video: { qualities: [{ size_bytes: 1003655 }] } }
  const fetcher = (async () => Response.json(upstream)) as unknown as typeof fetch
  expect(await fetchDetails('http://127.0.0.1:8000', link, fetcher)).toEqual({ ok: true, data: upstream })
})

test('HTTP 429 halts the export without retrying or treating it as a missing video', async () => {
  let calls = 0
  const fetcher = (async () => { calls++; return new Response('', { status: 429 }) }) as unknown as typeof fetch
  expect(await fetchDetails('http://127.0.0.1:8000', link, fetcher)).toMatchObject({ ok: false, status: 429, stop: true })
  expect(calls).toBe(1)
})

test('checkpoint saves replace earlier progress with valid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tiktokExport'))
  try {
    const file = join(dir, 'videos.json')
    saveExport(file, { videos: [], pending: [link] })
    saveExport(file, { videos: [{ id: '7676887069293153566' }], pending: [] })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ videos: [{ id: '7676887069293153566' }], pending: [] })
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
