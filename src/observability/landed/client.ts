import type { Database } from 'bun:sqlite'
import { openDatabase } from '../../storage/schema/client'
import { msText, percentiles } from '../timing/helpers/report'
import { LANDED_TARGET_P95_MS } from './types'
import type { LandedRow, LandedStats } from './types'

export function readLanded(sinceMs: number, handle: Database = openDatabase()): LandedRow[] {
  return handle
    .prepare(
      `SELECT e.platform AS platform, e.source AS source, e.sourceAtMs AS sourceAtMs,
        (SELECT at FROM timings t WHERE t.eventId = e.eventId AND t.stage = 'appended') AS appendedAt,
        (SELECT at FROM timings t WHERE t.eventId = e.eventId AND t.stage = 'shown') AS shownAt
      FROM events e WHERE e.type = 'message' AND e.source <> 'backfill' AND e.receivedAtMs >= ?`,
    )
    .all(sinceMs) as LandedRow[]
}

function gap(from: number | null, to: string | null): number {
  if (from === null || !to) return Number.NaN
  const end = Date.parse(to)
  return Number.isFinite(end) && end >= from ? end - from : Number.NaN
}

export function landedStats(rows: readonly LandedRow[]): LandedStats[] {
  const groups = new Map<string, LandedRow[]>()
  for (const row of rows) {
    const key = `${row.platform}\u0000${row.source}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.values()]
    .map((group) => {
      const appended = (r: LandedRow) => (r.appendedAt ? Date.parse(r.appendedAt) : null)
      return {
        platform: group[0].platform,
        source: group[0].source,
        messages: group.length,
        stored: percentiles(group.map((r) => gap(r.sourceAtMs, r.appendedAt))),
        pushed: percentiles(group.map((r) => gap(appended(r), r.shownAt))),
        landedToPushed: percentiles(group.map((r) => gap(r.sourceAtMs, r.shownAt))),
        notPushed: group.filter((r) => !r.shownAt).length,
      }
    })
    .sort((a, b) => a.platform.localeCompare(b.platform) || (a.source === 'live' ? -1 : b.source === 'live' ? 1 : a.source.localeCompare(b.source)))
}

export function landedLines(stats: readonly LandedStats[], hours: number): string[] {
  if (!stats.length) return [`No messages landed in the last ${hours} h. Each one is timed from the platform's own timestamp to log.db and then to the session it was pushed to.`]
  const p = (x: { n: number; p50: number; p95: number; p99: number }) => (x.n ? `p50 ${msText(x.p50).padStart(8)}  p95 ${msText(x.p95).padStart(8)}  p99 ${msText(x.p99).padStart(8)}` : 'no timings'.padEnd(44))
  const live = stats.filter((s) => s.source === 'live' && s.landedToPushed.n)
  const over = live.filter((s) => s.landedToPushed.p95 > LANDED_TARGET_P95_MS).map((s) => s.platform)
  return [
    `Landed to pushed in the last ${hours} h, per platform: landed is the platform's own timestamp, stored is when log.db had it, pushed is when a session's push loop or prompt hook first took it. live came through the watcher as it happened; catchUp was read after a gap, so its wait is the gap itself.`,
    over.length ? `Live p95 over ${msText(LANDED_TARGET_P95_MS)}: ${over.join(', ')}.` : `Every platform's live p95 is within ${msText(LANDED_TARGET_P95_MS)}.`,
    '',
    ...stats.flatMap((s) => [
      `${s.platform} ${s.source}: ${s.messages} message(s)${s.notPushed ? `, ${s.notPushed} not pushed yet` : ''}`,
      `  landed -> stored   ${p(s.stored)}`,
      `  stored -> pushed   ${p(s.pushed)}`,
      `  landed -> pushed   ${p(s.landedToPushed)}`,
    ]),
  ]
}
