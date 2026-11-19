import { playReminder, sessionPlayOf, transcriptTail } from '../session/index'
import { listUseCases, readUseCase } from '../../mcp/server/helpers/guides.ts'
import { isPrompt, outcomeOf, playMatchText, route as wordRoute } from '../../useCases/router/client'
import type { PlayMatch, RoutableUseCase } from '../../useCases/router/types'
import type { HookInput, HookResult } from './types'
import { promptNameHints, promptWords } from '../../inbox/nameHints/index'
import { logTiming } from '../service/client'

export type RouteFn = (prompt: string) => Promise<{ play?: PlayMatch | null; menu?: PlayMatch[]; skipped?: string } | null>

export type UseCasesFn = () => readonly RoutableUseCase[]

export type NamesFn = (prompt: string) => string

export function timedNameHints(prompt: string): string {
  const started = performance.now()
  const text = promptNameHints(prompt)
  if (promptWords(prompt).length) logTiming({ event: 'UserPromptSubmit', provider: 'names', ms: performance.now() - started, chars: text.length, outcome: text ? 'named' : 'none' })
  return text
}

export async function hookAnswer(input: HookInput, route: RouteFn, useCases: UseCasesFn = listUseCases, names: NamesFn = timedNameHints): Promise<HookResult> {
  const event = input.hook_event_name ?? 'UserPromptSubmit'
  if (event === 'SessionStart') {
    const play = sessionPlayOf(transcriptTail(input.transcript_path ?? ''))
    const page = play ? readUseCase(play.id) : null
    return play && page ? { event, text: playReminder(play, page), outcome: `reinjected ${play.id}` } : { event, text: '', outcome: 'noPlay' }
  }
  const prompt = String(input.prompt ?? '')
  if (!isPrompt(prompt)) return { event, text: '', outcome: 'notAPrompt' }
  const served = await route(prompt)
  const answer = served ?? wordRoute(prompt, { useCases: useCases() })
  const play = answer.play ?? null
  const menu = answer.menu ?? []
  const outcome = answer.skipped ?? outcomeOf({ play, menu })
  const namesStarted = performance.now()
  const named = names(prompt)
  const namesMs = Math.round(performance.now() - namesStarted)
  const text = [playMatchText(play ? [play] : [], menu), named].filter(Boolean).join('\n\n')
  return { event, text, outcome: `${served ? outcome : `wordsOnly ${outcome}`}${named ? ' named' : ''}`, namesMs, ...(menu.length && !play ? { menu: menu.map((m) => m.id) } : {}) }
}

export function hookOutput(result: HookResult): string {
  return result.text ? JSON.stringify({ hookSpecificOutput: { hookEventName: result.event, additionalContext: result.text } }) : ''
}
