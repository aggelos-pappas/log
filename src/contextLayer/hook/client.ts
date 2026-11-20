import { playReminder, sessionPlayOf, transcriptTail } from '../session/index'
import { listUseCases, readUseCase } from '../../mcp/server/helpers/guides.ts'
import { logTiming } from '../service/client'
import { askOf, isPrompt, loadToolFacts, outcomeOf, playMatchText, routerSection, route as wordRoute, useCaseVocabulary } from '../../useCases/router/client'
import { playSkipOf } from '../../useCases/router/helpers/index'
import type { MeaningAnswer, PlayMatch, RoutableUseCase, ToolFacts } from '../../useCases/router/types'
import type { HookInput, HookResult } from './types'
import { promptNameHints, promptWords } from '../../inbox/nameHints/index'

export type RouteFn = (prompt: string) => Promise<{ play?: PlayMatch | null; menu?: PlayMatch[]; ranked?: PlayMatch[]; skipped?: string; meaning?: MeaningAnswer } | null>

export type UseCasesFn = () => readonly RoutableUseCase[]

export type NamesFn = (prompt: string) => string

export function timedNameHints(prompt: string): string {
  const started = performance.now()
  const text = promptNameHints(prompt)
  if (promptWords(prompt).length) logTiming({ event: 'UserPromptSubmit', provider: 'names', ms: performance.now() - started, chars: text.length, outcome: text ? 'named' : 'none' })
  return text
}

export async function hookAnswer(input: HookInput, route: RouteFn, useCases: UseCasesFn = listUseCases, names: NamesFn = timedNameHints, toolFacts: () => readonly ToolFacts[] = loadToolFacts): Promise<HookResult> {
  const event = input.hook_event_name ?? 'UserPromptSubmit'
  if (event === 'SessionStart') {
    const play = sessionPlayOf(transcriptTail(input.transcript_path ?? ''))
    const page = play ? readUseCase(play.id) : null
    return play && page ? { event, text: playReminder(play, page), outcome: `reinjected ${play.id}` } : { event, text: '', outcome: 'noPlay' }
  }
  const whole = String(input.prompt ?? '')
  if (!isPrompt(whole)) return { event, text: '', outcome: 'notAPrompt' }
  const prompt = askOf(whole)
  const served = await route(prompt)
  const known = useCases()
  const answer = served ?? wordRoute(prompt, { useCases: known })
  const skip = playSkipOf(prompt, useCaseVocabulary(known))
  const play = skip ? null : (answer.play ?? null)
  const menu = skip ? [] : (answer.menu ?? [])
  const outcome = answer.skipped ?? outcomeOf({ play, menu })
  const namesStarted = performance.now()
  const named = names(prompt)
  const namesMs = Math.round(performance.now() - namesStarted)
  const sectionStarted = performance.now()
  const meaning = served?.meaning ?? null
  const tools = routerSection(prompt, known, meaning?.meaning ?? null, { decision: answer.ranked ? { ranked: answer.ranked } : null, playShown: Boolean(play || menu.length), noPlay: Boolean(skip), facts: toolFacts(), play: play?.id ?? null })
  const fallback = !served ? 'noService' : meaning?.meaning ? null : meaning ? (meaning.fallback ?? 'nothingToEmbed') : 'notLoaded'
  logTiming({ event, provider: 'router', ms: (meaning?.ms ?? 0) + performance.now() - sectionStarted, chars: tools.text.length, outcome: fallback ? `lexical:${fallback}` : 'fused', attrs: { ...(skip ? { playSkipped: skip } : {}), meaning: fallback ?? 'used', meaningMs: Math.round((meaning?.ms ?? 0) * 10) / 10, play: tools.play, tools: tools.tools, skills: tools.skills } })
  const text = [[playMatchText(play ? [play] : [], menu), tools.text].filter(Boolean).join('\n'), named].filter(Boolean).join('\n\n')
  return { event, text, outcome: `${served ? outcome : `wordsOnly ${outcome}`}${named ? ' named' : ''}`, namesMs, ...(menu.length && !play ? { menu: menu.map((m) => m.id) } : {}), ...(tools.tools.length ? { tools: tools.tools } : {}), ...(tools.skills.length ? { skills: tools.skills } : {}) }
}

export function hookOutput(result: HookResult): string {
  return result.text ? JSON.stringify({ hookSpecificOutput: { hookEventName: result.event, additionalContext: result.text } }) : ''
}
