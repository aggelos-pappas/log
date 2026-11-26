import { expect, test } from 'bun:test'
import { searchUrl, videosOfSnapshot } from './client'
import { readSearchStep } from './client'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('search query preserves hashtag, Unicode and reserved characters', () => {
  const query = '#φοιτητές & exams?'
  const url = new URL(searchUrl(query))
  expect(url.pathname).toBe('/search/video')
  expect(url.searchParams.get('q')).toBe(query)
})

test('recorded video cards preserve string IDs and keep adjacent metadata separate', () => {
  const snapshot = `- /url: https://www.tiktok.com/@creator.one/video/7674260259619343630
  - img "My study plan #college created by Creator with music" [ref=e1]
  - strong [ref=e2]: 51.6K
  - /url: /tag/college
- /url: https://www.tiktok.com/@creator.two/video/7672448095346543902
  - img "Second caption created by Another with music" [ref=e3]
  - /url: /tag/exams
`
  const videos = videosOfSnapshot(snapshot)
  expect(videos).toHaveLength(2)
  expect(videos[0]).toMatchObject({ id: '7674260259619343630', authorHandle: 'creator.one', caption: 'My study plan #college', displayedCount: '51.6K', hashtags: ['college'] })
  expect(videos[1]).toMatchObject({ caption: 'Second caption', displayedCount: null, hashtags: ['exams'] })
})

test('non-video links do not become search results', () => {
  expect(videosOfSnapshot('- /url: https://www.tiktok.com/@creator\n- /url: /tag/college')).toEqual([])
})

test('search captures report TikTok throttling and visible verification checkpoints', () => {
  const folder = mkdtempSync(join(tmpdir(), 'tiktokSearch'))
  try {
    writeFileSync(join(folder, 'snapshot.yml'), '- heading "Verify to continue" [level=2]')
    writeFileSync(join(folder, 'network.har'), JSON.stringify({ log: { entries: [{ request: { url: 'https://www.tiktok.com/api/search/item/full/' }, response: { status: 429 } }] } }))
    expect(readSearchStep(folder)).toMatchObject({ blocked: true, checkpoint: true, videos: [] })
  } finally { rmSync(folder, { recursive: true, force: true }) }
})
