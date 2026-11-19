import { playReminder, sessionPlayOf, transcriptTail } from '../session/index'
import { listUseCases, readUseCase } from '../../mcp/server/helpers/guides.ts'
import { isPrompt, loadToolFacts, outcomeOf, playMatchText, toolMatchText, route as wordRoute } from '../../useCases/router/client'
import type { PlayMatch, RoutableUseCase, ToolFacts } from '../../useCases/router/types'
import type { HookInput, HookResult } from './types'

export type RouteFn = (prompt: string) => Promise<{ play?: PlayMatch | null; menu?: PlayMatch[]; skipped?: string } | null>

export type UseCasesFn = () => readonly RoutableUseCase[]

export async function hookAnswer(input: HookInput, route: RouteFn, useCases: UseCasesFn = listUseCases, toolFacts: () => readonly ToolFacts[] = loadToolFacts): Promise<HookResult> {
  const event = input.hook_event_name ?? 'UserPromptSubmit'
  if (event === 'SessionStart') {
    const play = sessionPlayOf(transcriptTail(input.transcript_path ?? ''))
    const page = play ? readUseCase(play.id) : null
    return play && page ? { event, text: playReminder(play, page), outcome: `reinjected ${play.id}` } : { event, text: '', outcome: 'noPlay' }
  }
  const prompt = String(input.prompt ?? '')
  if (!isPrompt(prompt)) return { event, text: '', outcome: 'notAPrompt' }
  const served = await route(prompt)
  const known = useCases()
  const answer = served ?? wordRoute(prompt, { useCases: known })
  const play = answer.play ?? null
  const menu = answer.menu ?? []
  const outcome = answer.skipped ?? outcomeOf({ play, menu })
  const tools = toolMatchText(prompt, known, toolFacts())
  const text = [playMatchText(play ? [play] : [], menu), tools.text].filter(Boolean).join('\n')
  return { event, text, outcome: served ? outcome : `wordsOnly ${outcome}`, ...(menu.length && !play ? { menu: menu.map((m) => m.id) } : {}), ...(tools.tools.length ? { tools: tools.tools } : {}) }
}

export function hookOutput(result: HookResult): string {
  return result.text ? JSON.stringify({ hookSpecificOutput: { hookEventName: result.event, additionalContext: result.text } }) : ''
}
