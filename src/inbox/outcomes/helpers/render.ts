import type { ReportBlock, ReportSpec } from '../../../mcp/apps/report/types'
import type { Comparison, MatchedWindow, OutcomeReport, Positivity, Rate } from '../types'

const pct = (x: number | null): string => (x === null ? '-' : `${Math.round(x * 100)}%`)

export const rateText = (r: Rate): string => (r.rate === null ? 'n=0' : `${pct(r.rate)} [${pct(r.low)}-${pct(r.high)}] n=${r.n}`)

const points = (x: number | null): string => (x === null ? '-' : `${x > 0 ? '+' : ''}${Math.round(x * 100)} pts`)

export const matchedText = (m: MatchedWindow): string =>
  m.difference === null ? `no person had both kinds of send at one stage` : `log ${pct(m.log)} vs hand ${pct(m.hand)}, ${points(m.difference)} [${points(m.low)} to ${points(m.high)}] over ${m.people} people, ${m.strata} person-stage pairs, ${m.logSends} log and ${m.handSends} hand sends`

export const gapText = (m: MatchedWindow): string => (m.difference === null ? '-' : `${points(m.difference)} [${points(m.low)} to ${points(m.high)}], ${m.people} people`)

const minutes = (m: number | null): string => (m === null ? '-' : m < 90 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`)

function comparisonLines(title: string, rows: readonly Comparison[]): string[] {
  return [
    title,
    ...rows.flatMap((c) => [
      `  ${c.group}`,
      `    log  ${String(c.log.sends).padStart(5)} sends · 24 h ${rateText(c.log.day)} · 7 d ${rateText(c.log.week)} · median reply ${minutes(c.log.medianReplyMinutes)} · moved on ${rateText(c.log.movedForward)}`,
      `    hand ${String(c.hand.sends).padStart(5)} sends · 24 h ${rateText(c.hand.day)} · 7 d ${rateText(c.hand.week)} · median reply ${minutes(c.hand.medianReplyMinutes)} · moved on ${rateText(c.hand.movedForward)}`,
    ]),
  ]
}

const oddsText = (p: Positivity): string => `${p.scored} scored · warm ${rateText(p.positive)} vs not ${rateText(p.notPositive)} · odds ${p.oddsRatio ?? '-'} [${p.low ?? '-'}-${p.high ?? '-'}] · same person and stage ${p.matchedOddsRatio ?? '-'} [${p.matchedLow ?? '-'}-${p.matchedHigh ?? '-'}]`

export function outcomeText(r: OutcomeReport): string {
  return [
    `log inbox outcomes: ${r.sends.log} sends by log (${r.sends.lines.log} lines) and ${r.sends.hand} by hand (${r.sends.lines.hand} lines) in one-to-one dms since log first sent on each account (${Object.entries(r.since).map(([k, v]) => `${k} ${v.slice(0, 10)}`).join(', ') || 'never'}). log's sends found by: send record ${r.foundBy.sendRecord}, queue ${r.foundBy.queue}, send call ${r.foundBy.sendSpan}.`,
    '',
    ...comparisonLines('Raw reply rates (95% Wilson interval):', r.raw),
    '',
    'Matched, same person at the same stage (bootstrap 95% over people):',
    `  replied in 24 h: ${matchedText(r.matched.day)}`,
    `  replied in 7 d:  ${matchedText(r.matched.week)}`,
    `  moved on in 7 d: ${matchedText(r.matched.movedForward)}`,
    `  median reply: log ${minutes(r.matched.medianReplyMinutes.log)} (${r.matched.medianReplyMinutes.logReplies} replies) vs hand ${minutes(r.matched.medianReplyMinutes.hand)} (${r.matched.medianReplyMinutes.handReplies})`,
    '',
    ...comparisonLines('By who (the labeller\'s read now):', r.byWho),
    '',
    ...comparisonLines('By stage at the send:', r.byStage),
    '',
    'Stage moves within 7 days:',
    ...(r.moves.length ? r.moves.slice(0, 12).map((m) => `  ${m.from} -> ${m.to}: log ${m.log}, hand ${m.hand}`) : ['  none']),
    '',
    'By play (log sends):',
    ...(r.plays.length ? r.plays.map((p) => `  ${p.play}: ${p.sends} sends · 24 h ${rateText(p.day)} · 7 d ${rateText(p.week)} · median ${minutes(p.medianReplyMinutes)} · same person and stage: 24 h ${gapText(p.matchedDay)}, 7 d ${gapText(p.matchedWeek)}`) : ['  none']),
    '',
    r.positivity ? `Warmth (GoEmotions positive share of the send at least 0.5) vs a reply in 7 d:\n  all:  ${oddsText(r.positivity.all)}\n  log:  ${oddsText(r.positivity.log)}\n  hand: ${oddsText(r.positivity.hand)}` : 'Warmth vs reply: run with --feelings to score each send with the pinned GoEmotions model.',
    '',
    ...r.notes.map((n) => `  ${n}`),
  ].join('\n')
}

const cellRate = (r: Rate): string => (r.rate === null ? '-' : `${pct(r.rate)} (${r.n})`)

function comparisonTable(title: string, rows: readonly Comparison[]): ReportBlock {
  return {
    type: 'table',
    title,
    columns: [
      { key: 'group', label: 'Group' },
      { key: 'by', label: 'Sent by' },
      { key: 'sends', label: 'Sends', format: 'number', align: 'right' },
      { key: 'day', label: 'Reply 24 h' },
      { key: 'week', label: 'Reply 7 d' },
      { key: 'median', label: 'Median reply' },
      { key: 'moved', label: 'Moved on' },
    ],
    rows: rows.flatMap((c) => (['log', 'hand'] as const).map((by) => ({ group: c.group, by, sends: c[by].sends, day: cellRate(c[by].day), week: cellRate(c[by].week), median: minutes(c[by].medianReplyMinutes), moved: cellRate(c[by].movedForward) }))),
  }
}

export function outcomeBlocks(r: OutcomeReport): ReportSpec {
  const all = r.raw[0]
  const blocks: ReportBlock[] = [
    {
      type: 'stat',
      items: [
        { label: 'Log sends', value: r.sends.log },
        { label: 'Hand sends', value: r.sends.hand },
        { label: 'Log reply in 7 d', value: pct(all?.log.week.rate ?? null), hint: `n=${all?.log.week.n ?? 0}` },
        { label: 'Hand reply in 7 d', value: pct(all?.hand.week.rate ?? null), hint: `n=${all?.hand.week.n ?? 0}` },
        { label: 'Matched 7 d gap', value: points(r.matched.week.difference), hint: `${points(r.matched.week.low)} to ${points(r.matched.week.high)}` },
      ],
    },
    comparisonTable('Raw, per platform', r.raw),
    {
      type: 'table',
      title: 'Matched: same person, same stage',
      columns: [
        { key: 'window', label: 'Outcome' },
        { key: 'log', label: 'Log' },
        { key: 'hand', label: 'Hand' },
        { key: 'gap', label: 'Gap' },
        { key: 'interval', label: '95% interval' },
        { key: 'people', label: 'People', format: 'number', align: 'right' },
      ],
      rows: ([['Reply 24 h', r.matched.day], ['Reply 7 d', r.matched.week], ['Moved on 7 d', r.matched.movedForward]] as const).map(([window, m]) => ({ window, log: pct(m.log), hand: pct(m.hand), gap: points(m.difference), interval: `${points(m.low)} to ${points(m.high)}`, people: m.people })),
    },
    comparisonTable('By who', r.byWho),
    comparisonTable('By stage at the send', r.byStage),
    {
      type: 'table',
      title: 'By play',
      columns: [
        { key: 'play', label: 'Play' },
        { key: 'sends', label: 'Sends', format: 'number', align: 'right' },
        { key: 'day', label: 'Reply 24 h' },
        { key: 'week', label: 'Reply 7 d' },
        { key: 'median', label: 'Median reply' },
        { key: 'matchedDay', label: 'Matched 24 h gap' },
        { key: 'matchedWeek', label: 'Matched 7 d gap' },
      ],
      rows: r.plays.slice(0, 40).map((p) => ({ play: p.play, sends: p.sends, day: cellRate(p.day), week: cellRate(p.week), median: minutes(p.medianReplyMinutes), matchedDay: gapText(p.matchedDay), matchedWeek: gapText(p.matchedWeek) })),
    },
    ...(r.positivity ? [{ type: 'table', title: 'Warm sends vs a reply in 7 d', columns: [{ key: 'side', label: 'Sent by' }, { key: 'warm', label: 'Warm' }, { key: 'cold', label: 'Not warm' }, { key: 'odds', label: 'Odds ratio' }, { key: 'matched', label: 'Same person and stage' }], rows: (['all', 'log', 'hand'] as const).map((side) => { const p = r.positivity![side]; return { side, warm: cellRate(p.positive), cold: cellRate(p.notPositive), odds: `${p.oddsRatio ?? '-'} [${p.low ?? '-'}-${p.high ?? '-'}]`, matched: `${p.matchedOddsRatio ?? '-'} [${p.matchedLow ?? '-'}-${p.matchedHigh ?? '-'}]` } }) } as ReportBlock] : []),
    { type: 'callout', tone: 'info', title: 'How it is counted', text: r.notes.join(' ') },
  ]
  return { title: 'Do people answer what log sends?', subtitle: `log vs the owner by hand since ${Object.values(r.since).sort()[0]?.slice(0, 10) ?? '-'}`, blocks }
}
