import { inspectCommand } from '../inspect/index'
import { readCurrentInspect } from '../../browser/inspect/index'
import { findTiktokAccount, tiktokGate } from '../../tiktok/account/session/index'
import { readSearchStep, searchUrl } from '../../tiktok/search/index'
import { JSON_FLAG, numberOf, parseArgs, parserSpecOf, refuseInput, refuseGated, refuseError } from '../runner/helpers/index'
import type { Command, CommandInput } from '../runner/types'

export const TIKTOK_SEARCH_USAGE = 'Usage: log tiktok search --account <name> --query <text or #hashtag> [--limit <1-100>] [--pages <1-10>] [--json]\nUses the open account browser. Returns deduplicated video cards in source order with bounded coverage. Stops on checkpoints or rate limits.'
export const TIKTOK_SEARCH_INPUT: CommandInput = { forms: [{ words: [], positionals: [], summary: 'Search TikTok videos in the open account browser', flags: [
  { name: 'account', kind: 'string', required: true, description: 'The saved TikTok account name' },
  { name: 'query', kind: 'string', required: true, description: 'Search text or a hashtag including its leading #' },
  { name: 'limit', kind: 'integer', description: 'Maximum videos returned, default 20, at most 100' },
  { name: 'pages', kind: 'integer', description: 'Maximum browser batches, default 1, at most 10' }, JSON_FLAG,
] }] }

export const tiktokSearchCommand: Command = {
  platform: 'tiktok', name: 'search', effect: 'read', input: TIKTOK_SEARCH_INPUT,
  usage: TIKTOK_SEARCH_USAGE, args: '--account <name> --query <text> [--limit <n>] [--pages <n>] [--json]',
  summary: 'Search video links and card metadata in the open TikTok browser',
  async run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(TIKTOK_SEARCH_INPUT))
    if (!parsed.ok) return refuseInput('tiktok search', parsed.error, TIKTOK_SEARCH_USAGE)
    const query = String(parsed.flags.query ?? '').trim()
    const limit = numberOf(parsed, 'limit') ?? 20
    const pages = numberOf(parsed, 'pages') ?? 1
    if (!query || query === '#' || parsed.positionals.length || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pages) || pages < 1 || pages > 10) return refuseInput('tiktok search', 'Invalid query, URL or collection bounds', TIKTOK_SEARCH_USAGE)
    try {
      const account = await findTiktokAccount(context.accounts, String(parsed.flags.account))
      const gate = tiktokGate(account)
      if (!gate.ok) return refuseGated('tiktok search', gate, 'accountNotUsable')
      if (!readCurrentInspect(undefined, account.accountName)) return refuseInput('tiktok search', `Open this account first: log inspect start --account ${account.accountName} --url https://www.tiktok.com/ --detach`)
      const videos = new Map<string, ReturnType<typeof readSearchStep>['videos'][number]>()
      let stopped = 'pageLimit'
      let batches = 0
      for (let batch = 0; batch < pages; batch++) {
        context.err(`${account.accountName}: TikTok search ${JSON.stringify(query)}, browser batch ${batch + 1}/${pages}`)
        const action = batch === 0 ? ['goto', searchUrl(query)] : ['scroll', '3', '600']
        const result = await inspectCommand.run(context, ['do', ...action, '--account', account.accountName, '--timeout', '180', '--json'])
        if (result.code !== 0) {
          if (!videos.size) return result
          stopped = 'browserError'
          break
        }
        const step = JSON.parse(result.stdout ?? '{}')
        if (!step.folder) return refuseInput('tiktok search', 'Log did not return a recorded search step')
        const found = readSearchStep(step.folder)
        batches++
        if (found.blocked || found.checkpoint) { stopped = found.blocked ? 'rateLimited' : 'checkpoint'; break }
        if (new URL(step.url).pathname.startsWith('/login')) { stopped = 'loggedOut'; break }
        for (const video of found.videos) if (!videos.has(video.id)) videos.set(video.id, video)
        if (videos.size >= limit) { stopped = 'resultLimit'; break }
        if (found.empty) { stopped = 'noResults'; break }
      }
      const items = [...videos.values()].slice(0, limit)
      if (!items.length && stopped === 'pageLimit') stopped = 'unrecognizedResults'
      const ok = !['rateLimited', 'checkpoint', 'loggedOut', 'unrecognizedResults', 'browserError'].includes(stopped)
      const answer = { ok, platform: 'tiktok', account: account.accountName, query, queryType: query.startsWith('#') ? 'hashtag' : 'text', searchUrl: searchUrl(query), collectedAt: (context.now?.() ?? new Date()).toISOString(), batches, complete: false, stopped, count: items.length, videos: items }
      return { code: ok ? 0 : 1, stdout: parsed.flags.json ? JSON.stringify(answer, null, 2) : items.map(video => video.url).join('\n'), ...(!ok ? { stderr: `TikTok search stopped: ${stopped}` } : {}) }
    } catch (error) { return refuseError('tiktok search', error) }
  },
}
