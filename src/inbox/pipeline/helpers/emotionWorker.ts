import { env, pipeline } from '@huggingface/transformers'
import { revisionOf } from '../../../models/manifest/index'
import { hfCacheDir, pinnedModelReady } from '../../../models/store/index'

const model = process.argv[2]
const kept = Number(process.argv[3] ?? 3)
env.cacheDir = hfCacheDir()
await pinnedModelReady(model)
const classify = (await pipeline('text-classification', model, { dtype: 'q8', revision: revisionOf(model) })) as unknown as (texts: string[], options: Record<string, unknown>) => Promise<{ label: string; score: number }[] | { label: string; score: number }[][]>
process.stdout.write(JSON.stringify({ ready: true }) + '\n')

let buffer = ''
for await (const chunk of Bun.stdin.stream()) {
  buffer += new TextDecoder().decode(chunk)
  let newline = buffer.indexOf('\n')
  while (newline >= 0) {
    const line = buffer.slice(0, newline)
    buffer = buffer.slice(newline + 1)
    newline = buffer.indexOf('\n')
    if (!line.trim()) continue
    const { id, texts } = JSON.parse(line) as { id: number; texts: string[] }
    const out = await classify(texts, { top_k: kept })
    const rows = texts.length === 1 && !Array.isArray(out[0]) ? [out as { label: string; score: number }[]] : (out as { label: string; score: number }[][])
    process.stdout.write(JSON.stringify({ id, rows }) + '\n')
  }
}
