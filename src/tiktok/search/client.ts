import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function searchUrl(query: string): string {
  const url = new URL('https://www.tiktok.com/search/video')
  url.searchParams.set('q', query.trim())
  return url.href
}

export function videosOfSnapshot(snapshot: string) {
  const matches = [...snapshot.matchAll(/\/url: (https:\/\/www\.tiktok\.com\/@([^/\s]+)\/video\/(\d+))[^\n]*\n/g)]
  return matches.map((match, index) => {
    const block = snapshot.slice(match.index! + match[0].length, matches[index + 1]?.index ?? snapshot.length)
    const imageDescription = block.match(/img "(.*?)" \[ref=/)?.[1] ?? null
    const caption = imageDescription?.split(' created by ')[0] ?? null
    const displayedCount = block.match(/strong \[ref=[^\]]+\]: "?([\d.,]+[KMB]?)"?/)?.[1] ?? null
    return {
      id: match[3], url: match[1], authorHandle: decodeURIComponent(match[2]),
      caption, imageDescription, displayedCount,
      hashtags: [...new Set([
        ...[...block.matchAll(/\/url: \/tag\/([^\s]+)/g)].map(tag => decodeURIComponent(tag[1])),
        ...[...(caption ?? '').matchAll(/#([\p{L}\p{N}_]+)/gu)].map(tag => tag[1]),
      ])],
    }
  })
}

export function readSearchStep(folder: string) {
  const snapshot = readFileSync(join(folder, 'snapshot.yml'), 'utf8')
  const har = JSON.parse(readFileSync(join(folder, 'network.har'), 'utf8'))
  const blocked = har.log.entries.some((entry: any) => {
    const host = new URL(entry.request.url).hostname
    return (host === 'tiktok.com' || host.endsWith('.tiktok.com')) && entry.response.status === 429
  })
  const checkpoint = /(?:heading|paragraph|button).*?(?:verify to continue|verify you are human|security verification|complete the puzzle)/i.test(snapshot)
  return { videos: videosOfSnapshot(snapshot), blocked, checkpoint, empty: /No results found|Couldn't find any results/i.test(snapshot) }
}
