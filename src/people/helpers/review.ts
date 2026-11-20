import type { Database } from 'bun:sqlite'
import { CHARS_PER_TOKEN, SUBQ_USD_PER_MILLION_INPUT } from '../../inbox/pipeline/types'
import type { DecisionsClient } from '../../subq/decisions/index'
import { REVIEW_CHECKS, REVIEW_LINES, REVIEW_SURE } from '../types'
import type { IdentityInfo, LinkReport, Suggestion } from '../types'
import { profileOf } from './evidence'

const QUESTION = {
  type: 'choice' as const,
  instructions: 'Are these two accounts, on different platforms, run by the same person? Judge from how they write, what they talk about, when they are active and the evidence measured. Answer unsure when the messages do not settle it.',
  criteria: { same: 'one person runs both accounts', different: 'two different people', unsure: 'the messages do not settle it' },
}

function sideText(handle: Database, who: IdentityInfo, lines: number): string {
  const texts = profileOf(handle, who.platform, who.userId, new Set()).texts.filter((t) => t.trim().length >= 4).slice(0, lines)
  return `${who.platform} @${who.handle ?? who.userId}${who.name ? ` (${who.name})` : ''}, their latest messages:\n${texts.map((t) => `  - ${t}`).join('\n') || '  (none stored)'}`
}

export function reviewState(handle: Database, s: Suggestion, lines: number): string {
  const evidence = s.comparisons.map((c) => `${c.comparison} ${c.level} (${c.matchWeight >= 0 ? '+' : ''}${c.matchWeight.toFixed(1)} bits)`).join('; ')
  return `Account A: ${sideText(handle, s.a, lines)}\n\nAccount B: ${sideText(handle, s.b, lines)}\n\nRecord linkage evidence: ${evidence}. Total ${s.matchWeight.toFixed(1)} bits.`
}

export async function reviewBand(handle: Database, report: LinkReport, client: DecisionsClient, limit: number = REVIEW_CHECKS): Promise<{ checked: number; inputTokens: number; usd: number }> {
  let checked = 0
  let inputTokens = 0
  for (const s of report.suggestions.filter((x) => x.band === 'review').slice(0, limit)) {
    let steps = 0
    let used = 0
    let answer: { choice: string; confidence: number } | null = null
    for (const lines of REVIEW_LINES) {
      const state = reviewState(handle, s, lines)
      const reply = await client({ state, questions: { samePerson: QUESTION } })
      steps++
      used += reply.usage?.input_tokens || Math.ceil(state.length / CHARS_PER_TOKEN)
      const got = reply.answers.samePerson
      if (!got || got.type !== 'choice') break
      answer = { choice: got.choice, confidence: Math.round(got.confidence * 1000) / 1000 }
      if (got.choice === 'unsure' || got.confidence >= REVIEW_SURE) break
    }
    inputTokens += used
    if (!answer) continue
    s.review = { ...answer, steps, inputTokens: used }
    checked++
  }
  return { checked, inputTokens, usd: Math.round((inputTokens / 1e6) * SUBQ_USD_PER_MILLION_INPUT * 1e6) / 1e6 }
}
