import { jsonIn, llmConfig, sessionHeaders } from '../../../extensions/memeTaste/helpers/llm'
import type { ChatMessage, LlmConfig } from '../../../extensions/memeTaste/helpers/llm'
import { nearestPairs, profileFor, recentInChat } from '../../pairs/index'
import type { VoiceIndex, VoicePair, VoiceTarget } from '../../pairs/index'
import { packOf, renderPack } from '../../pack/index'
import { chatKeyOf } from './corpus'
import { wordCountOf } from './profile'
import { FRESH_AT_ONCE, FRESH_MODELS, FRESH_NEAR, FRESH_OPTIONS } from '../types'
import type { CorpusRow, FreshModel } from '../types'

export interface FreshAnswer {
  text: string
  inTokens: number
  outTokens: number
}

export type FreshAsk = (model: string, messages: ChatMessage[]) => Promise<FreshAnswer>

export interface FreshPlan {
  moments: VoicePair[]
  models: FreshModel[]
  estimateUsd: number
}

export interface FreshResult {
  rows: Omit<CorpusRow, 'id'>[]
  spentUsd: number
  calls: number
  failed: { model: string; why: string }[]
  byFamily: Record<string, number>
}

const FRESH_SYSTEM = `You draft chat replies for one person, as him. You get his grounding pack: his real replies to messages like this one, his features, facts he has said, and lines that are not him. Write exactly ${FRESH_OPTIONS} different options he could send now, each in his words and the way he talks to this person. Answer with JSON only: {"options": ["...", "...", "..."]}`

const OUT_TOKENS = 400
const CHARS_PER_TOKEN = 3.5

export function freshMoments(pairs: readonly VoicePair[], count: number, taken: ReadonlySet<string> = new Set(), perChat = 3): VoicePair[] {
  const usable = pairs.filter((p) => p.kind === 'dm' && p.with.length === 1 && wordCountOf(p.said) >= 2 && wordCountOf(p.reply) >= 3 && !taken.has(p.id)).sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
  const perChatCount = new Map<string, number>()
  const out: VoicePair[] = []
  for (const pair of usable) {
    if (out.length >= count) break
    const key = `${pair.platform}:${pair.conversationId}`
    if ((perChatCount.get(key) ?? 0) >= perChat) continue
    perChatCount.set(key, (perChatCount.get(key) ?? 0) + 1)
    out.push(pair)
  }
  return out
}

export async function freshPrompt(index: VoiceIndex, pair: VoicePair): Promise<ChatMessage[]> {
  const target: VoiceTarget = { platform: pair.platform, conversationId: pair.conversationId, with: pair.with }
  const keep = (p: VoicePair) => p.id !== pair.id && p.reply.trim() !== pair.reply.trim() && String(p.at ?? '') < String(pair.at ?? '\uffff')
  const near = (await nearestPairs(index, pair.said, target, FRESH_NEAR + 4)).filter((n) => keep(n.pair)).slice(0, FRESH_NEAR)
  const recent = recentInChat(index, target, 20).filter(keep).slice(0, 10)
  const pack = packOf({ chat: pair.chat, near: near.map((n) => ({ said: n.pair.said, reply: n.pair.reply, chat: n.pair.chat, tier: n.tier, at: n.pair.at, saidBy: n.pair.saidBy })), chatReplies: recent.map((p) => p.reply), profile: profileFor(index, target), aiPhrases: [], theirLines: [pair.said], style: null, facts: [] })
  const user = `${renderPack({ ...pack, ask: '' }).trim()}\n\nIn ${pair.chat}, they just wrote:\n${pair.said}\n\nWrite ${FRESH_OPTIONS} options he could send now.`
  return [{ role: 'system', content: FRESH_SYSTEM }, { role: 'user', content: user }]
}

export function estimateUsd(promptChars: number, model: FreshModel): number {
  return ((promptChars / CHARS_PER_TOKEN) * model.inPerMillion + OUT_TOKENS * model.outPerMillion) / 1e6
}

export function spentUsd(answer: Pick<FreshAnswer, 'inTokens' | 'outTokens'>, model: FreshModel): number {
  return (answer.inTokens * model.inPerMillion + answer.outTokens * model.outPerMillion) / 1e6
}

export function optionsIn(text: string): string[] {
  const parsed = jsonIn(text) as { options?: unknown } | unknown[] | null
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { options?: unknown } | null)?.options) ? ((parsed as { options: unknown[] }).options) : []
  return list.filter((o): o is string => typeof o === 'string' && !!o.trim()).map((o) => o.trim()).slice(0, FRESH_OPTIONS)
}

export function freshModels(env: Record<string, string | undefined> = process.env): FreshModel[] {
  const named = env.LOG_VOICE_TRAIN_MODELS?.trim()
  if (!named) return [...FRESH_MODELS]
  return named.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [family, model] = part.includes('=') ? part.split('=') : [part, part]
    return FRESH_MODELS.find((m) => m.model === model) ?? { family, model, inPerMillion: 3, outPerMillion: 15 }
  })
}

export function openAiAsk(config: LlmConfig | null = llmConfig(), fetcher: typeof fetch = fetch): FreshAsk | null {
  if (!config) return null
  const session = `voiceTrain-${Date.now()}`
  return async (model, messages) => {
    const answer = await fetcher(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', ...sessionHeaders(config.baseUrl, session) },
      body: JSON.stringify({ model, messages, max_tokens: OUT_TOKENS * 4, temperature: 0.9 }),
      signal: AbortSignal.timeout(120000),
    })
    const body = (await answer.json().catch(() => null)) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number }; error?: { message?: string } } | null
    if (!answer.ok) throw Object.assign(new Error(`${model} answered HTTP ${answer.status}: ${String(body?.error?.message ?? '').slice(0, 160)}`), { code: 'llmFailed' })
    return { text: body?.choices?.[0]?.message?.content ?? '', inTokens: body?.usage?.prompt_tokens ?? 0, outTokens: body?.usage?.completion_tokens ?? 0 }
  }
}

export async function planFresh(index: VoiceIndex, count: number, taken: ReadonlySet<string>, models: FreshModel[]): Promise<FreshPlan & { prompts: ChatMessage[][] }> {
  const moments = freshMoments(index.pairs, count, taken)
  const prompts: ChatMessage[][] = []
  for (const pair of moments) prompts.push(await freshPrompt(index, pair))
  const estimate = prompts.reduce((sum, p, i) => sum + estimateUsd(p.reduce((n, m) => n + m.content.length, 0), models[i % models.length]), 0)
  return { moments, models, estimateUsd: Number(estimate.toFixed(3)), prompts }
}

export async function runFresh(plan: FreshPlan & { prompts: ChatMessage[][] }, ask: FreshAsk, capUsd: number, log: (line: string) => void = () => {}): Promise<FreshResult> {
  const rows: Omit<CorpusRow, 'id'>[] = []
  const failed: { model: string; why: string }[] = []
  const byFamily: Record<string, number> = {}
  let spent = 0
  let reserved = 0
  let calls = 0
  let next = 0
  const planned = plan.moments.length ? plan.estimateUsd / plan.moments.length : 0
  const dead = new Set<string>()
  const worker = async () => {
    while (next < plan.moments.length) {
      const perCall = calls ? spent / calls : planned
      if (spent + reserved + perCall > capUsd || spent >= capUsd) return
      const i = next++
      const pair = plan.moments[i]
      let model = plan.models[i % plan.models.length]
      if (dead.has(model.model)) model = plan.models.find((m) => !dead.has(m.model)) ?? model
      if (dead.has(model.model)) return
      reserved += perCall
      try {
        const answer = await ask(model.model, plan.prompts[i])
        calls++
        spent += spentUsd(answer, model)
        const options = optionsIn(answer.text)
        const chatKey = chatKeyOf(pair.with[0] ?? pair.chat)
        for (const text of options) rows.push({ side: 'ai', family: model.family, model: model.model, source: 'paired', chatKey, momentKey: pair.id, text, at: pair.at })
        if (options.length) rows.push({ side: 'owner', family: 'owner', model: null, source: 'paired', chatKey, momentKey: pair.id, text: pair.reply, at: pair.at })
        byFamily[model.family] = (byFamily[model.family] ?? 0) + options.length
        if (calls % 25 === 0) log(`voice train: ${calls} moments answered, $${spent.toFixed(3)} spent`)
      } catch (error) {
        const why = error instanceof Error ? error.message : String(error)
        failed.push({ model: model.model, why })
        if (failed.filter((f) => f.model === model.model).length >= 3) dead.add(model.model)
      } finally {
        reserved -= perCall
      }
    }
  }
  await Promise.all(Array.from({ length: FRESH_AT_ONCE }, worker))
  return { rows, spentUsd: Number(spent.toFixed(4)), calls, failed, byFamily }
}
