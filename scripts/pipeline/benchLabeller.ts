#!/usr/bin/env bun
import { resolve } from 'node:path'
import { logHome } from '../../src/config/logHome/index'
import { chatsOf } from '../../src/inbox/lastWord/index'
import { emotionsSettled, labelChats, localEmotions } from '../../src/inbox/pipeline/index'
import { db } from '../../src/inbox/store/index'
import { localEmbedder } from '../../src/search/conversations/index'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 ? (args[at + 1] ?? fallback) : fallback
}
const live = resolve(logHome(), 'log.db').toLowerCase()
if (!process.env.LOG_DB || resolve(process.env.LOG_DB).toLowerCase() === live) {
  process.stderr.write('benchLabeller: set LOG_DB to a copy of log.db (it writes chatPipeline rows), never the live one\n')
  process.exit(2)
}
const runs = Number(flag('runs', '60'))
const withEmotion = !args.includes('--noEmotion')
const on = db()
const chats = chatsOf({}, on).filter((c) => !c.storedAsGroup && c.messages.some((m) => !m.fromOwner)).slice(0, runs)
const embedder = localEmbedder()
const emotions = withEmotion ? localEmotions() : null
let started = performance.now()
await embedder.embed(['warm'])
const embedLoad = performance.now() - started
started = performance.now()
if (emotions) await emotions(['warm'])
const emotionLoad = performance.now() - started
await labelChats(chats.slice(0, 1), { embedder, emotions }, on)
const times: number[] = []
const cold: number[] = []
const feelings: number[] = []
for (const chat of chats) {
  on.prepare('DELETE FROM chatPipeline WHERE platform = ? AND account = ? AND person = ?').run(chat.platform, chat.account, chat.personKey)
  const newest = Math.max(...chat.messages.map((m) => m.seq))
  let t = performance.now()
  await labelChats([{ ...chat, messages: chat.messages.filter((m) => m.seq !== newest) }], { embedder, emotions }, on)
  cold.push(performance.now() - t)
  t = performance.now()
  chatsOf({ platform: chat.platform, account: chat.account, conversationIds: chat.conversationIds }, on)
  await labelChats([chat], { embedder, emotions, emotionsLater: true }, on)
  times.push(performance.now() - t)
  t = performance.now()
  await emotionsSettled()
  feelings.push(performance.now() - t)
}
embedder.stop?.()
emotions?.stop()
const stats = (list: number[]) => {
  const sorted = [...list].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  const round = (n: number) => Math.round(n * 10) / 10
  return { p50Ms: round(at(0.5)), p95Ms: round(at(0.95)), maxMs: round(sorted[sorted.length - 1]), meanMs: round(list.reduce((a, b) => a + b, 0) / list.length) }
}
process.stdout.write(`${JSON.stringify({ chats: times.length, emotion: withEmotion, perNewMessage: stats(times), emotionAfter: stats(feelings), wholeWindowFirstTime: stats(cold), firstLoadMs: { embed: Math.round(embedLoad), emotion: Math.round(emotionLoad) } })}\n`)
