import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { modelByKey } from '../../../models/manifest/index'
import { placeOf } from '../../../models/store/index'
import { latestRevision } from '../../../indexPass/helpers/train'
import { MARK_MIN, PROMISE_KINDS, PROMISE_MARK_MIN, PRONOUNS_LISTENER, PRONOUNS_SPEAKER, SCREEN_ASK_MS, SCREEN_BATCH, SCREEN_KINDS, SCREEN_MIN_CHARS, SCREEN_MODEL_KEY, SCREEN_START_MS } from '../types'
import type { Candidate, ChatLine, ScreenAnswer, ScreenMark, Screener } from '../types'

export const SCREEN_PATH = fileURLToPath(new URL('../../../../python/facts/screen.py', import.meta.url))

export class ScreenUnavailable extends Error {
  readonly code = 'factScreenUnavailable'
}

export interface ScreenerLaunch {
  launch?: (command: string, args: string[], options: { windowsHide: boolean; env: NodeJS.ProcessEnv }) => ChildProcessWithoutNullStreams
  startMs?: number
  askMs?: number
}

export function gliner2Screener(modelDir: string | null = placeOf(modelByKey(SCREEN_MODEL_KEY)), python: string = process.env.LOG_PYTHON || 'python', revision: string | null = latestRevision(), options: ScreenerLaunch = {}): Screener {
  const launch = options.launch ?? ((command, args, spawnOptions) => spawn(command, args, { ...spawnOptions, windowsHide: true }))
  let child: ChildProcessWithoutNullStreams | null = null
  let starting: Promise<void> | null = null
  let buffer = ''
  let stderr = ''
  const tailOf = (text: string): string => text.trim().split('\n').slice(-5).join(' | ').slice(-600)
  const waiting: ((line: string) => void)[] = []
  const nextLine = (ms: number): Promise<string> => new Promise((resolve, reject) => {
    const onLine = (line: string) => {
      clearTimeout(timer)
      resolve(line)
    }
    const timer = setTimeout(() => {
      const at = waiting.indexOf(onLine)
      if (at >= 0) waiting.splice(at, 1)
      reject(new ScreenUnavailable(`factScreenUnavailable: the fact screen gave no answer in ${Math.round(ms / 1000)} s`))
    }, ms)
    waiting.push(onLine)
  })
  const retire = (which: ChildProcessWithoutNullStreams | null) => {
    if (!which || which !== child) return
    child = null
    starting = null
    buffer = ''
    which.stdin.end()
    which.kill()
  }
  const launchChild = async () => {
    if (!modelDir) throw new ScreenUnavailable('factScreenUnavailable: no place for the fact model; run log models --fetch')
    const spawned = launch(python, [SCREEN_PATH, modelDir, ...(revision ? [revision] : [])], { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    child = spawned
    buffer = ''
    spawned.stdout.setEncoding('utf8')
    spawned.stdout.on('data', (chunk: string) => {
      if (child !== spawned) return
      buffer += chunk
      let at = buffer.indexOf('\n')
      while (at >= 0) {
        const line = buffer.slice(0, at).trim()
        buffer = buffer.slice(at + 1)
        if (line.startsWith('{')) waiting.shift()?.(line)
        at = buffer.indexOf('\n')
      }
    })
    spawned.stderr.setEncoding('utf8')
    spawned.stderr.on('data', (chunk: string) => { stderr = (stderr + chunk).slice(-4_000) })
    spawned.on('error', () => {
      if (child === spawned) waiting.shift()?.(JSON.stringify({ ok: false, error: `the fact screen could not start: ${stderr}` }))
    })
    spawned.on('exit', (code, signal) => {
      if (child !== spawned) return
      child = null
      starting = null
      const why = `the fact screen stopped (code ${code ?? 'null'}, signal ${signal ?? 'none'}): ${tailOf(stderr)}`
      while (waiting.length) waiting.shift()?.(JSON.stringify({ ok: false, error: why }))
    })
    try {
      const ready = JSON.parse(await nextLine(options.startMs ?? SCREEN_START_MS)) as { ok: boolean; error?: string }
      if (!ready.ok) throw new ScreenUnavailable(`factScreenUnavailable: ${ready.error ?? 'the fact model did not load'}; run log models --fetch and check gliner2 is installed in LOG_PYTHON`)
    } catch (error) {
      retire(spawned)
      throw error
    }
  }
  const start = (): Promise<void> => (starting ??= launchChild())
  return {
    model: modelByKey(SCREEN_MODEL_KEY).id,
    async screen(texts) {
      if (!texts.length) return { marks: [], ms: 0 }
      await start()
      const asking = child
      if (!asking) throw new ScreenUnavailable('factScreenUnavailable: the fact screen stopped before it was asked')
      const asked = nextLine(options.askMs ?? SCREEN_ASK_MS)
      asking.stdin.write(`${JSON.stringify({ texts, batchSize: SCREEN_BATCH })}\n`)
      let line: string
      try {
        line = await asked
      } catch (error) {
        retire(asking)
        throw error
      }
      const answer = JSON.parse(line) as { ok: boolean; error?: string; marks?: ScreenMark[]; ms?: number }
      if (!answer.ok || !answer.marks) throw new ScreenUnavailable(`factScreenUnavailable: ${answer.error ?? 'no marks'}`)
      return { marks: answer.marks, ms: answer.ms ?? 0 }
    },
    stop() {
      retire(child)
    },
  }
}

export function isCandidate(line: Pick<ChatLine, 'text'>, mark: ScreenMark): boolean {
  return line.text.trim().length >= SCREEN_MIN_CHARS && SCREEN_KINDS.includes(mark.kind) && mark.confidence >= (PROMISE_KINDS.has(mark.kind) ? PROMISE_MARK_MIN : MARK_MIN)
}

export async function screenLines(lines: readonly ChatLine[], screener: Screener, before: (line: ChatLine) => ChatLine[]): Promise<{ candidates: Candidate[]; marks: { line: ChatLine; mark: ScreenMark }[]; perMessageMs: number[] }> {
  const asked = lines.filter((l) => l.text.trim().length >= SCREEN_MIN_CHARS)
  const marks: { line: ChatLine; mark: ScreenMark }[] = []
  const perMessageMs: number[] = []
  for (let i = 0; i < asked.length; i += SCREEN_BATCH) {
    const batch = asked.slice(i, i + SCREEN_BATCH)
    const answer: ScreenAnswer = await screener.screen(batch.map((l) => l.text))
    batch.forEach((line, n) => marks.push({ line, mark: answer.marks[n] }))
    perMessageMs.push(...batch.map(() => answer.ms / batch.length))
  }
  const candidates = marks.filter((m) => m.mark && isCandidate(m.line, m.mark)).map((m) => ({ ...m.line, mark: m.mark, before: before(m.line) }))
  return { candidates, marks, perMessageMs }
}

export function endpointsOf(mark: ScreenMark, sides: { speaker: string; listener: string }, known: ReadonlyMap<string, string>): { label: string; head: string; tail: string }[] {
  const resolve = (end: string): string | null => {
    const word = end.trim().toLowerCase().replace(/^@/, '')
    if (PRONOUNS_SPEAKER.has(word)) return sides.speaker
    if (PRONOUNS_LISTENER.has(word)) return sides.listener
    return known.get(word) ?? null
  }
  return mark.relations.flatMap((r) => {
    const head = resolve(r.head)
    const tail = resolve(r.tail)
    return head && tail && head !== tail ? [{ label: r.label, head, tail }] : []
  })
}
