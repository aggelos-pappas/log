import { join } from 'node:path'
import { EMBED_DIMENSIONS, EMBED_MODEL, EMBEDDER_UNAVAILABLE } from '../types'
import type { Embedder } from '../types'

type Worker = { send(texts: string[]): Promise<Float32Array[]>; stop(): void }

function startWorker(model: string): Worker {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'embedWorker.ts'), model], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const complaint = new Response(child.stderr).text().catch(() => '')
  const waiting = new Map<number, { resolve: (vectors: Float32Array[]) => void; reject: (error: Error) => void }>()
  let ready: () => void = () => {}
  let failed: (error: Error) => void = () => {}
  const started = new Promise<void>((resolve, reject) => {
    ready = resolve
    failed = reject
  })
  started.catch(() => {})
  let stopped: Error | null = null
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
        const reply = JSON.parse(line) as { ready?: boolean; id?: number; width?: number; data?: number[] }
        if (reply.ready) ready()
        if (reply.id === undefined || !reply.data || !reply.width) continue
        const all = Float32Array.from(reply.data)
        const width = reply.width
        waiting.get(reply.id)?.resolve(Array.from({ length: all.length / width }, (_, i) => all.slice(i * width, (i + 1) * width)))
        waiting.delete(reply.id)
      }
    }
  })().catch(() => {}).finally(async () => {
    const said = (await complaint).trim().split('\n').slice(-2).join(' | ')
    stopped = Object.assign(new Error(`the embedding model ${model} stopped${said ? `: ${said}` : ''}`), { code: EMBEDDER_UNAVAILABLE })
    failed(stopped)
    for (const pending of waiting.values()) pending.reject(stopped)
    waiting.clear()
  })
  return {
    async send(texts) {
      await started
      if (stopped) throw stopped
      const id = next++
      const answer = new Promise<Float32Array[]>((resolve, reject) => waiting.set(id, { resolve, reject }))
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

export function localEmbedder(model = EMBED_MODEL, dimensions = EMBED_DIMENSIONS): Embedder {
  let worker: Worker | null = null
  return {
    model,
    dimensions,
    async embed(texts) {
      if (!texts.length) return []
      worker ??= startWorker(model)
      return worker.send(texts)
    },
    stop() {
      worker?.stop()
      worker = null
    },
  }
}

export function hashEmbedder(dimensions = 64): Embedder {
  return {
    model: 'hash',
    dimensions,
    async embed(texts) {
      return texts.map((text) => {
        const v = new Float32Array(dimensions)
        for (const word of text.toLowerCase().match(/\w+/g) ?? []) {
          let h = 2166136261
          for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619)
          v[Math.abs(h) % dimensions] += 1
        }
        const norm = Math.hypot(...v) || 1
        return v.map((x) => x / norm)
      })
    },
  }
}
