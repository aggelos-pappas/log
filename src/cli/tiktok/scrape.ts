import { fetchDetails, videoId, saveExport } from '../../tiktok/details/index'
import { tiktokSearchCommand } from './search'
import { findTiktokAccount, tiktokGate } from '../../tiktok/account/session/index'
import { JSON_FLAG, parseArgs, parserSpecOf, refuseError } from '../runner/helpers/index'
import type { Command, CommandInput } from '../runner/types'

export const TIKTOK_SCRAPE_USAGE = 'Usage: log tiktok scrape --account <name> (--query <text or #hashtag> | --url <video link>) [--limit <1-100>] [--pages <1-10>] [--output <file.json>] [--json]\nSearches through the open Log browser, then extracts each video through Log’s bundled omkarcloud/tiktok-scraper engine. Each videos entry preserves the upstream parser output exactly. The collection includes failures, pending links and bounded search coverage. Saves progress after every video when --output is given.'
export const TIKTOK_SCRAPE_INPUT: CommandInput = { forms: [{ words: [], positionals: [], summary: 'Export full TikTok video details from a query, hashtag or video link', flags: [
  { name: 'account', kind: 'string', required: true, description: 'The TikTok account name' },
  { name: 'query', kind: 'string', description: 'Search text or a hashtag, exclusive with url' },
  { name: 'url', kind: 'string', description: 'One full TikTok video or photo link, exclusive with query' },
  { name: 'limit', kind: 'string', description: 'Maximum videos, default 20, at most 100' },
  { name: 'pages', kind: 'string', description: 'Browser search batches, default 1, at most 10' },
  { name: 'output', kind: 'string', description: 'Save one JSON collection with incremental progress' }, JSON_FLAG,
] }] }

export const tiktokScrapeCommand: Command = {
  name: 'scrape', platform: 'tiktok', effect: 'read', input: TIKTOK_SCRAPE_INPUT, usage: TIKTOK_SCRAPE_USAGE,
  args: '--account <name> (--query <text> | --url <video>) [--output <file.json>] [--json]',
  summary: 'Collect full video details from TikTok search or a video link using the bundled omkarcloud scraper, retaining its output format',
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_SCRAPE_INPUT))
    if (!parsed.ok) return { code: 1, stderr: `${parsed.error}\n${TIKTOK_SCRAPE_USAGE}` }
    const query = String(parsed.flags.query ?? '').trim()
    const link = String(parsed.flags.url ?? '').trim()
    const output = parsed.flags.output ? String(parsed.flags.output) : null
    const limit = Number(parsed.flags.limit ?? 20)
    const pages = Number(parsed.flags.pages ?? 1)
    if (Boolean(query) === Boolean(link) || parsed.positionals.length || parsed.flags.output === '' || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pages) || pages < 1 || pages > 10) return { code: 1, stderr: TIKTOK_SCRAPE_USAGE }
    try {
      if (link) videoId(link)
      const account = await findTiktokAccount(context.twenty, String(parsed.flags.account))
      const gate = tiktokGate(account)
      if (!gate.ok) return { code: 1, stderr: gate.detail }
      if (!context.directTiktok) return { code: 1, stderr: 'The TikTok detail engine is not wired in this context' }
      let search: any = null
      let links = link ? [link] : []
      if (query) {
        const args = ['--account', account.accountName, '--query', query, '--json']
        for (const flag of ['limit', 'pages']) if (parsed.flags[flag] !== undefined) args.push(`--${flag}`, String(parsed.flags[flag]))
        const result = await tiktokSearchCommand.run(context, args)
        if (result.code !== 0) return result
        const { videos, ...metadata } = JSON.parse(result.stdout ?? '{}')
        search = metadata
        links = videos.map((video: { url: string }) => video.url)
      }
      const collection = {
        schemaVersion: '1.0', query: query || null, queryType: query ? (query.startsWith('#') ? 'hashtag' : 'text') : 'video',
        requestedUrl: link || null, collectedAt: (context.now?.() ?? new Date()).toISOString(),
        source: { repository: 'https://github.com/omkarcloud/tiktok-scraper', revision: '127209e86ae663e2427baf171b8f92933fa12d02', engine: 'bundled', method: 'item/detail + parsers.video' },
        search, complete: false, extractionComplete: false, stopped: 'inProgress', discoveredCount: links.length,
        extractedCount: 0, videos: [] as Record<string, unknown>[],
        failures: [] as { link: string; error: string; status: number | null }[], pending: [...links],
      }
      const persist = () => { if (output) saveExport(output, collection) }
      persist()
      for (const url of links) {
        context.err(`${account.accountName}: extracting video ${links.indexOf(url) + 1}/${links.length} through Log’s bundled scraper`)
        let stop = false
        try {
          const result = fetchDetails(url, (id) => context.directTiktok!(account, { action: 'details', videoId: id, proxy: account.proxy }).answer)
          if (result.ok) collection.videos.push(result.data)
          else {
            collection.failures.push({ link: url, error: result.error, status: result.status })
            stop = result.stop
          }
        } catch (error) {
          collection.failures.push({ link: url, error: error instanceof Error ? error.message : String(error), status: null })
          stop = true
        }
        collection.pending.shift()
        collection.extractedCount = collection.videos.length
        persist()
        if (stop) { collection.stopped = 'engineRefusalOrFailure'; break }
      }
      if (collection.stopped === 'inProgress') collection.stopped = collection.failures.length ? 'completedWithFailures' : 'completed'
      collection.extractionComplete = !collection.failures.length && !collection.pending.length
      collection.complete = collection.extractionComplete && (link ? true : Boolean(search?.complete))
      persist()
      return { code: collection.failures.length ? 1 : 0, stdout: JSON.stringify(collection, null, 2) }
    } catch (error) { return refuseError('tiktok scrape', error) }
  },
}
