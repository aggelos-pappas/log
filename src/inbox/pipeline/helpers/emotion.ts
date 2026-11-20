import { join } from 'node:path'
import { EMOTION_MODEL, EMOTIONS_KEPT } from '../types'
import type { Emotion, EmotionReader } from '../types'

type Worker = { send(texts: string[]): Promise<Emotion[][]>; stop(): void }

function startWorker(model: string): Worker {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'emotionWorker.ts'), model, String(EMOTIONS_KEPT)], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const waiting = new Map<number, (rows: Emotion[][]) => void>()
  let ready: () => void = () => {}
  let failed: (error: Error) => void = () => {}
  const started = new Promise<void>((resolve, reject) => {
    ready = resolve
    failed = reject
  })
  let next = 0
  void (async () => {
    let buffer = ''
    for await (const chunk of child.stdout) {
      buffer += new TextDecoder().decode(chunk)
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
        const reply = JSON.parse(line) as { ready?: boolean; id?: number; rows?: Emotion[][] }
        if (reply.ready) ready()
        if (reply.id === undefined || !reply.rows) continue
        waiting.get(reply.id)?.(reply.rows.map((row) => row.map((e) => ({ label: e.label, score: Math.round(e.score * 1000) / 1000 }))))
        waiting.delete(reply.id)
      }
    }
    failed(new Error('the emotion model stopped before it was ready'))
    for (const resolve of waiting.values()) resolve([])
    waiting.clear()
  })()
  return {
    async send(texts) {
      await started
      const id = next++
      const answer = new Promise<Emotion[][]>((resolve) => waiting.set(id, resolve))
      child.stdin.write(JSON.stringify({ id, texts }) + '\n')
      child.stdin.flush()
      return answer
    },
    stop() {
      child.stdin.end()
      child.kill()
    },
  }
}

export function localEmotions(model: string = EMOTION_MODEL): EmotionReader & { stop(): void } {
  let worker: Worker | null = null
  const read = (async (texts: string[]) => {
    if (!texts.length) return []
    worker ??= startWorker(model)
    return worker.send(texts)
  }) as EmotionReader & { stop(): void }
  read.stop = () => {
    worker?.stop()
    worker = null
  }
  return read
}
