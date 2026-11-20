import { describe, expect, test } from 'bun:test'
import { landedLines, landedStats } from './index'
import type { LandedRow } from './index'

const at = (ms: number) => new Date(ms).toISOString()

describe('landed to pushed, per platform', () => {
  test('each message is timed from its own timestamp to log.db and then to the session, split by how it came in', () => {
    const t0 = 1_800_000_000_000
    const rows: LandedRow[] = [
      { platform: 'discord', source: 'live', sourceAtMs: t0, appendedAt: at(t0 + 700), shownAt: at(t0 + 900) },
      { platform: 'discord', source: 'live', sourceAtMs: t0, appendedAt: at(t0 + 1_000), shownAt: at(t0 + 1_200) },
      { platform: 'discord', source: 'catchUp', sourceAtMs: t0, appendedAt: at(t0 + 300_000), shownAt: at(t0 + 300_200) },
      { platform: 'instagram', source: 'live', sourceAtMs: t0, appendedAt: at(t0 + 2_000), shownAt: null },
    ]
    const stats = landedStats(rows)
    expect(stats.map((s) => `${s.platform} ${s.source}`)).toEqual(['discord live', 'discord catchUp', 'instagram live'])
    expect(stats[0]).toMatchObject({ messages: 2, stored: { n: 2, p50: 700, p95: 1_000 }, pushed: { n: 2, p50: 200 }, landedToPushed: { n: 2, p95: 1_200 }, notPushed: 0 })
    expect(stats[2]).toMatchObject({ notPushed: 1, landedToPushed: { n: 0 } })
    const text = landedLines(stats, 24).join('\n')
    expect(text).toContain("Every platform's live p95 is within")
    expect(text).toContain('instagram live: 1 message(s), 1 not pushed yet')
  })

  test('a live p95 over the target is named', () => {
    const t0 = 1_800_000_000_000
    const stats = landedStats([{ platform: 'slack', source: 'live', sourceAtMs: t0, appendedAt: at(t0 + 1_000), shownAt: at(t0 + 14_000) }])
    expect(landedLines(stats, 24)[1]).toContain('slack')
  })
})
