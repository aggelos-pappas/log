import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { mutedRules, ownersOwnPhrases, ruleHits, valeRules } from '../../aiTells/client'
import { percentile } from '../../aiTells/client'
import { bandOf, bandWords, loadConventions, readConventionsOf } from '../client'
import { agentSessionDrafts, corpusOf, draftsFromFile, normalText, ownerMessages, saveCorpus, usableText } from './corpus'
import type { OwnerMessage } from './corpus'
import { buildOwnIndex, ownMatchIn } from '../../owned/index'
import { buildProfile, gramHits, habitHits, repeatedOpeners, wordCountOf } from './profile'
import type { ProfileRow } from './profile'
import { planFresh, runFresh } from './fresh'
import type { FreshAsk, FreshResult } from './fresh'
import { ABSTAIN_BELOW_WORDS, BAND_MIN_AUC, BANDS, LATENCY_SAMPLE, OWNER_PASS, OWNER_PROFILE_SAMPLE, OWNER_RECENT_DAYS, OWNER_SAMPLE, GRAM_BUDGET, RULE_BUDGET, RULE_MUTE_SHARE, SENT_SOURCES, SPEND_CAP_USD, TRAIN_PARAMS } from '../types'
import type { BandCalibration, ConventionsModel, CorpusRow, FamilyCatch, FreshModel, TrainerInput, TrainerOutput, TrainReport } from '../types'
import type { VoiceIndex } from '../../pairs/index'
import type { AiTellRule } from '../../aiTells/types'

export const TRAINER_PATH = fileURLToPath(new URL('../../../../python/voiceConventions/train.py', import.meta.url))

export interface TrainDeps {
  embedModel: string
  embed: (texts: string[]) => Promise<ArrayLike<number>[]>
  rawEmbed?: (texts: string[]) => Promise<ArrayLike<number>[]>
  fit: (input: TrainerInput) => Promise<TrainerOutput>
  agentDrafts: () => Omit<CorpusRow, 'id'>[]
  owner: (aiTexts: ReadonlySet<string>) => { messages: OwnerMessage[]; droppedAsSends: number; sent?: string[] }
  rules?: () => AiTellRule[]
  log: (line: string) => void
  now?: () => Date
}

export interface TrainOptions {
  draftsFile?: string
  fresh?: number
  spendUsd?: number
  ask?: FreshAsk | null
  index?: () => Promise<VoiceIndex>
  models?: FreshModel[]
}

export interface TrainResult {
  model: ConventionsModel | null
  report: TrainReport | null
  imported: { agentSession: number; file: number }
  fresh: (FreshResult & { estimateUsd: number; moments: number }) | null
  droppedAsSends: number
  heldOut?: HeldOutRow[]
  why?: string
}

export interface HeldOutRow {
  text: string
  label: number
  family: string
  source: string
  chatKey: string
  words: number
  p: number
  reasons: string[]
  flagged: boolean
}

interface Row {
  text: string
  label: number
  chatKey: string
  family: string
  source: string
  moment: string
  weight: number
  words: number
}

function groupOf(key: string): number {
  return parseInt(createHash('sha1').update(key).digest('hex').slice(0, 8), 16)
}

function seeded(text: string): number {
  return parseInt(createHash('sha1').update(`sample:${text}`).digest('hex').slice(0, 8), 16) / 0xffffffff
}

export function ownerSample(messages: readonly OwnerMessage[], aiChats: ReadonlySet<string>, count = OWNER_SAMPLE, recentDays = OWNER_RECENT_DAYS): { text: string; chatKey: string; weight: number }[] {
  if (!messages.length) return []
  const newest = Date.parse(messages[messages.length - 1].at) || Date.now()
  const since = newest - recentDays * 86400000
  const chosen = new Map<string, { text: string; chatKey: string; weight: number }>()
  const add = (m: OwnerMessage, weight: number) => {
    if (chosen.size < count && !chosen.has(m.text)) chosen.set(m.text, { text: m.text, chatKey: m.chatKey, weight })
  }
  const recent = messages.filter((m) => Date.parse(m.at) >= since)
  const inAiChats = messages.filter((m) => aiChats.has(m.chatKey))
  for (const m of [...inAiChats].reverse()) add(m, 1)
  const recentShare = Math.min(1, (count * 0.6) / Math.max(recent.length, 1))
  for (const m of [...recent].reverse()) if (seeded(m.text) < recentShare) add(m, 1)
  const older = messages.filter((m) => Date.parse(m.at) < since)
  const olderShare = Math.min(1, (count - chosen.size) / Math.max(older.length, 1))
  for (const m of older) if (seeded(m.text) < olderShare) add(m, 0.5)
  return [...chosen.values()]
}

function auc(owner: readonly number[], ai: readonly number[]): number {
  if (!owner.length || !ai.length) return 0.5
  const all = [...owner.map((p) => [p, 0] as const), ...ai.map((p) => [p, 1] as const)].sort((a, b) => a[0] - b[0])
  let rank = 0
  let sum = 0
  let i = 0
  while (i < all.length) {
    let j = i
    while (j < all.length && all[j][0] === all[i][0]) j++
    const mid = (i + j + 1) / 2
    for (let k = i; k < j; k++) if (all[k][1] === 1) sum += mid
    rank = j
    i = j
  }
  return rank ? (sum - (ai.length * (ai.length + 1)) / 2) / (ai.length * owner.length) : 0.5
}

export function bandThreshold(owner: readonly { p: number; other: boolean }[], pass = OWNER_PASS, flaggedElsewhere = 0, total = owner.length): number {
  const budget = Math.floor((1 - pass) * total)
  const otherFlagged = owner.filter((o) => o.other).length + flaggedElsewhere
  if (otherFlagged >= budget) return 1
  const ps = owner.filter((o) => !o.other).map((o) => o.p).sort((a, b) => b - a)
  const allowed = budget - otherFlagged
  return allowed >= ps.length ? 0 : Number(ps[allowed].toFixed(6))
}

export function gramCutoff(ownerMaxRatios: readonly number[], budget = GRAM_BUDGET): number {
  const allowed = Math.floor(budget * ownerMaxRatios.length)
  const hit = ownerMaxRatios.filter((r) => r > 0).sort((a, b) => b - a)
  if (hit.length <= allowed) return 0
  return Number((hit[allowed] + 1e-6).toFixed(6))
}

export interface CalibrationRow {
  label: number
  words: number
  p: number
  other: boolean
  gram?: number
  rules?: string[]
}

export function bandMutedRules(owner: readonly Pick<CalibrationRow, 'rules'>[], budget = RULE_BUDGET): string[] {
  const allowed = Math.floor(budget * owner.length)
  const muted = new Set<string>()
  const hitting = () => owner.filter((o) => (o.rules ?? []).some((r) => !muted.has(r))).length
  while (hitting() > allowed) {
    const counts = new Map<string, number>()
    for (const o of owner) for (const r of new Set(o.rules ?? [])) if (!muted.has(r)) counts.set(r, (counts.get(r) ?? 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    if (!top) break
    muted.add(top[0])
  }
  return [...muted].sort()
}

export function calibrateBands(rows: readonly CalibrationRow[]): BandCalibration[] {
  return BANDS.map((band) => {
    const inBand = rows.filter((r) => r.words >= band.min && r.words <= band.max)
    const gramRatio = gramCutoff(inBand.filter((r) => r.label === 0).map((r) => r.gram ?? 0))
    const mutedRules = bandMutedRules(inBand.filter((r) => r.label === 0))
    const otherOf = (r: CalibrationRow) => r.other
    const scored = inBand.filter((r) => r.words >= ABSTAIN_BELOW_WORDS)
    const owner = scored.filter((r) => r.label === 0)
    const ai = scored.filter((r) => r.label === 1)
    const area = auc(owner.map((o) => o.p), ai.map((a) => a.p))
    const abstain = area < BAND_MIN_AUC || owner.length < 20
    const threshold = abstain ? 1 : bandThreshold(owner.map((o) => ({ p: o.p, other: otherOf(o) })), OWNER_PASS, inBand.filter((r) => r.label === 0 && r.words < ABSTAIN_BELOW_WORDS && otherOf(r)).length, inBand.filter((r) => r.label === 0).length)
    const flagged = (r: CalibrationRow) => otherOf(r) || (!abstain && r.words >= ABSTAIN_BELOW_WORDS && r.p > threshold)
    return { band: band.name, threshold, gramRatio, mutedRules, ownerP50: Number(percentile(owner.map((o) => o.p), 50).toFixed(6)), abstain, ownerHeldOut: inBand.filter((r) => r.label === 0).length, ownerFlagged: inBand.filter((r) => r.label === 0 && flagged(r)).length, aiHeldOut: inBand.filter((r) => r.label === 1).length, aiCaught: inBand.filter((r) => r.label === 1 && flagged(r)).length, auc: Number(area.toFixed(4)) }
  })
}

export function pythonFit(python = process.env.LOG_PYTHON || 'python'): (input: TrainerInput) => Promise<TrainerOutput> {
  const run = (command: string, args: string[], input: string) => new Promise<{ code: number; out: string; err: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (b: Buffer) => out.push(b))
    child.stderr.on('data', (b: Buffer) => err.push(b))
    child.on('error', reject)
    child.stdin.on('error', () => undefined)
    child.on('close', (code) => resolve({ code: code ?? 1, out: Buffer.concat(out).toString('utf8'), err: Buffer.concat(err).toString('utf8') }))
    child.stdin.end(input)
  })
  return async (input) => {
    const body = JSON.stringify(input)
    let result = await run(python, [TRAINER_PATH], body)
    if (result.code === 3) result = await run('uv', ['run', '--no-project', '--with', 'scikit_learn', 'python', TRAINER_PATH], body)
    const line = result.out.trim().split('\n').pop() ?? ''
    if (result.code !== 0 || !line.startsWith('{')) throw Object.assign(new Error(result.code === 3 ? 'scikit-learn is not installed in LOG_PYTHON and uv could not run it' : `the trainer failed: ${result.err.trim().split('\n').slice(-3).join(' ')}`), { code: result.code === 3 ? 'sklearnMissing' : 'trainerFailed' })
    return JSON.parse(line) as TrainerOutput
  }
}

function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

async function inBatches(texts: string[], embed: TrainDeps['embed'], size = 128): Promise<ArrayLike<number>[]> {
  const out: ArrayLike<number>[] = []
  for (let i = 0; i < texts.length; i += size) out.push(...(await embed(texts.slice(i, i + size))))
  return out
}

export function familyCatches(rows: readonly (Row & { flagged: boolean })[]): FamilyCatch[] {
  const families = [...new Set(rows.filter((r) => r.label === 1).map((r) => r.family))].sort()
  return families.map((family) => {
    const mine = rows.filter((r) => r.label === 1 && r.family === family)
    const byBand = Object.fromEntries(BANDS.map((b) => {
      const inBand = mine.filter((r) => bandOf(Math.max(r.words, 1)) === b.name)
      return [b.name, { drafts: inBand.length, caught: inBand.filter((r) => r.flagged).length }]
    })) as FamilyCatch['byBand']
    return { family, drafts: mine.length, caught: mine.filter((r) => r.flagged).length, byBand }
  })
}

export async function trainConventions(deps: TrainDeps, options: TrainOptions = {}): Promise<TrainResult> {
  const now = deps.now?.() ?? new Date()
  const imported = { agentSession: saveCorpus(deps.agentDrafts(), now), file: options.draftsFile ? saveCorpus(draftsFromFile(options.draftsFile), now) : 0 }
  deps.log(`voice train: ${imported.agentSession} new agent drafts from the agent's sessions${options.draftsFile ? `, ${imported.file} from ${options.draftsFile}` : ''}`)
  let fresh: TrainResult['fresh'] = null
  if (options.fresh && options.fresh > 0) {
    if (!options.ask || !options.index || !options.models?.length) throw Object.assign(new Error('fresh drafts need OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_ANALYSIS_MODEL and the voice index'), { code: 'llmNotConfigured' })
    const cap = options.spendUsd ?? SPEND_CAP_USD
    const taken = new Set(corpusOf('ai').filter((r) => r.source === 'paired' && r.momentKey).map((r) => r.momentKey!))
    const plan = await planFresh(await options.index(), options.fresh, taken, options.models)
    deps.log(`voice train: ${plan.moments.length} of his past moments to answer with ${options.models.map((m) => m.model).join(', ')}; estimated $${plan.estimateUsd.toFixed(2)} (cap $${cap.toFixed(2)})`)
    if (plan.estimateUsd > cap) throw Object.assign(new Error(`the fresh drafts would cost about $${plan.estimateUsd.toFixed(2)}, over the $${cap.toFixed(2)} cap: ask for fewer with --fresh or raise --spend`), { code: 'spendOverCap' })
    const ran = await runFresh(plan, options.ask, cap, deps.log)
    saveCorpus(ran.rows, now)
    fresh = { ...ran, estimateUsd: plan.estimateUsd, moments: plan.moments.length }
    deps.log(`voice train: ${ran.calls} moments answered, ${ran.rows.filter((r) => r.side === 'ai').length} drafts, $${ran.spentUsd.toFixed(3)} spent${ran.failed.length ? `, ${ran.failed.length} calls failed` : ''}`)
  }
  const aiCorpus = corpusOf('ai').filter((r) => usableText(r.text))
  const aiTexts = new Set(aiCorpus.filter((r) => SENT_SOURCES.includes(r.source)).map((r) => normalText(r.text)))
  const owned = deps.owner(aiTexts)
  const hisSent = buildOwnIndex(owned.sent ?? owned.messages.map((m) => m.text))
  const aiRows = aiCorpus.filter((r) => !ownMatchIn(hisSent, r.text))
  if (aiRows.length < aiCorpus.length) deps.log(`voice train: ${aiCorpus.length - aiRows.length} drafts left off the model-written side because the owner sent those words himself`)
  const pairedOwner = corpusOf('owner').filter((r) => usableText(r.text) && !aiTexts.has(normalText(r.text)))
  const aiSeen = new Set<string>()
  const aiUnique = aiRows.filter((r) => (aiSeen.has(normalText(r.text)) ? false : (aiSeen.add(normalText(r.text)), true)))
  const aiChats = new Set(aiUnique.map((r) => r.chatKey))
  const sample = ownerSample(owned.messages, aiChats)
  const ownerSeen = new Set(sample.map((s) => normalText(s.text)))
  for (const r of pairedOwner) if (!ownerSeen.has(normalText(r.text))) {
    ownerSeen.add(normalText(r.text))
    sample.push({ text: r.text, chatKey: r.chatKey, weight: 1 })
  }
  if (aiUnique.length < 2 || sample.length < 20) return { model: null, report: null, imported, fresh, droppedAsSends: owned.droppedAsSends, why: `not enough to train on: ${aiUnique.length} AI drafts and ${sample.length} of his messages` }
  const rows: Row[] = [
    ...sample.map((s) => ({ text: s.text, label: 0, chatKey: s.chatKey, family: 'owner', source: 'owner', moment: `owner:${s.text}`, weight: s.weight, words: wordCountOf(s.text) })),
    ...aiUnique.map((r) => ({ text: r.text, label: 1, chatKey: r.chatKey, family: r.family, source: r.source, moment: r.momentKey ?? `ai:${r.id}`, weight: 1, words: wordCountOf(r.text) })),
  ]
  deps.log(`voice train: ${sample.length} of his messages (${owned.droppedAsSends} left out as sends made through log) against ${aiUnique.length} AI drafts from ${new Set(aiUnique.map((r) => r.family)).size} model families, in ${new Set(rows.map((r) => r.chatKey)).size} chats; embedding them with ${deps.embedModel}`)
  const vectors = await inBatches(rows.map((r) => r.text), deps.embed)
  deps.log('voice train: fitting the classifier head on char 2-4 grams + the embedding, folds split by chat')
  const fitted = await deps.fit({ texts: rows.map((r) => r.text), labels: rows.map((r) => r.label), groups: rows.map((r) => groupOf(r.chatKey)), weights: rows.map((r) => r.weight), embeddings: vectors.map((v) => Array.from(v, (x) => Number(x.toFixed(5)))), params: TRAIN_PARAMS })
  const rules = deps.rules?.() ?? valeRules()
  const ownerProfileTexts = owned.messages.slice(-OWNER_PROFILE_SAMPLE)
  const ownerTexts = ownerProfileTexts.map((m) => m.text)
  const mutedByBand = BANDS.flatMap((b) => mutedRules(ownerTexts.filter((t) => bandOf(Math.max(wordCountOf(t), 1)) === b.name), rules, RULE_MUTE_SHARE))
  const muted = new Set([...mutedByBand, ...ownersOwnPhrases(ownerTexts, rules)])
  const siblings = new Map<string, number[]>()
  rows.forEach((r, i) => siblings.set(r.moment, [...(siblings.get(r.moment) ?? []), i]))
  const repeats = new Set<number>()
  for (const members of siblings.values()) if (members.length > 1) for (const k of repeatedOpeners(members.map((i) => rows[i].text))) repeats.add(members[k])
  const folds = [...new Set(fitted.folds)]
  const other = new Array<boolean>(rows.length).fill(false)
  const gram = new Array<number>(rows.length).fill(0)
  const ruleNames: string[][] = rows.map(() => [])
  const reasons: string[][] = rows.map(() => [])
  for (const fold of folds) {
    const heldChats = new Set(rows.filter((_, i) => fitted.folds[i] === fold).map((r) => r.chatKey))
    const profileRows: ProfileRow[] = [
      ...rows.filter((r, i) => fitted.folds[i] !== fold && r.label === 1).map((r) => ({ side: 'ai' as const, text: r.text, chat: r.chatKey })),
      ...ownerProfileTexts.filter((m) => !heldChats.has(m.chatKey)).map((m) => ({ side: 'owner' as const, text: m.text, chat: m.chatKey })),
    ]
    const profile = buildProfile(profileRows)
    rows.forEach((r, i) => {
      if (fitted.folds[i] !== fold) return
      const grams = gramHits(r.text, profile)
      const habits = habitHits(r.text, profile, repeats.has(i)).map((h) => `habit:${h.habit}`)
      const hits = ruleHits(r.text, rules, muted)
      reasons[i] = [...grams.map((g) => `gram:${g.gram}:${g.ratio}`), ...habits, ...hits.map((h) => `rule:${h.rule}:${h.match}`)]
      gram[i] = grams.reduce((m, g) => Math.max(m, g.ratio), 0)
      ruleNames[i] = [...new Set(hits.map((h) => h.rule))]
      other[i] = habits.length > 0
    })
  }
  const scored = rows.map((r, i) => ({ ...r, p: fitted.oof[i], other: other[i], gram: gram[i], rules: ruleNames[i] }))
  const bands = calibrateBands(scored)
  const flaggedRow = (r: (typeof scored)[number]) => {
    const band = bands.find((b) => b.band === bandOf(Math.max(r.words, 1)))!
    return r.other || (!band.abstain && r.words >= ABSTAIN_BELOW_WORDS && r.p > band.threshold)
  }
  const judged = scored.map((r) => ({ ...r, flagged: flaggedRow(r) }))
  const ownerVectors = rows.map((r, i) => ({ r, v: vectors[i] })).filter((x) => x.r.label === 0 && x.r.words >= 3)
  const vectorOf = new Map(rows.map((r, i) => [r.text, vectors[i]]))
  const his = (_gram: string, aiTexts: string[]) => {
    const v = aiTexts.map((t) => vectorOf.get(t)).find(Boolean)
    if (!v || !ownerVectors.length) return null
    let best = ownerVectors[0]
    let bestScore = -2
    for (const o of ownerVectors) {
      const c = cosine(v, o.v)
      if (c > bestScore) {
        bestScore = c
        best = o
      }
    }
    return best.r.text.slice(0, 160)
  }
  const profile = buildProfile([...rows.filter((r) => r.label === 1).map((r) => ({ side: 'ai' as const, text: r.text, chat: r.chatKey })), ...ownerProfileTexts.map((m) => ({ side: 'owner' as const, text: m.text, chat: m.chatKey }))], his)
  const builtAt = now.toISOString()
  const ownerJudged = judged.filter((r) => r.label === 0)
  const aiJudged = judged.filter((r) => r.label === 1)
  const report: TrainReport = {
    builtAt,
    owner: ownerJudged.length,
    ai: aiJudged.length,
    chats: new Set(rows.map((r) => r.chatKey)).size,
    folds: folds.length,
    bands,
    families: familyCatches(judged),
    overall: { ownerFlagged: ownerJudged.filter((r) => r.flagged).length, ownerHeldOut: ownerJudged.length, aiCaught: aiJudged.filter((r) => r.flagged).length, aiHeldOut: aiJudged.length, abstained: judged.filter((r) => r.words < ABSTAIN_BELOW_WORDS || bands.find((b) => b.band === bandOf(Math.max(r.words, 1)))!.abstain).length },
    latency: { options: 0, p50: 0, p95: 0 },
    classifierOnly: { aiCaught: aiJudged.filter((r) => { const b = bands.find((x) => x.band === bandOf(Math.max(r.words, 1)))!; return !b.abstain && r.words >= ABSTAIN_BELOW_WORDS && r.p > b.threshold }).length, ownerFlagged: ownerJudged.filter((r) => { const b = bands.find((x) => x.band === bandOf(Math.max(r.words, 1)))!; return !b.abstain && r.words >= ABSTAIN_BELOW_WORDS && r.p > b.threshold }).length },
    sources: Object.fromEntries([...new Set(aiUnique.map((r) => r.source))].map((s) => [s, aiUnique.filter((r) => r.source === s).length])),
  }
  const model: ConventionsModel = { builtAt, embedModel: deps.embedModel, ngram: [TRAIN_PARAMS.ngramMin, TRAIN_PARAMS.ngramMax], vocab: fitted.vocab, idf: fitted.idf, gramWeights: fitted.gramWeights, embedWeights: fitted.embedWeights, embedScale: TRAIN_PARAMS.embedScale, bias: fitted.bias, bands, profile, mutedRules: [...muted].filter((m) => rules.some((r) => r.name === m)), ownersPhrases: [...muted].filter((m) => !rules.some((r) => r.name === m)), report }
  const timingEmbed = deps.rawEmbed ?? deps.embed
  const loaded = loadConventions(model, builtAt, rules)
  const probe = aiJudged.filter((r) => r.words >= ABSTAIN_BELOW_WORDS).slice(0, LATENCY_SAMPLE).map((r) => r.text)
  const times: number[] = []
  for (const text of probe.slice(0, 5)) await readConventionsOf(loaded, [text], timingEmbed)
  for (const text of probe) times.push((await readConventionsOf(loaded, [text], timingEmbed))[0].ms)
  report.latency = { options: times.length, p50: Number(percentile(times, 50).toFixed(2)), p95: Number(percentile(times, 95).toFixed(2)) }
  const heldOut = judged.map((r, i) => ({ text: r.text, label: r.label, family: r.family, source: r.source, chatKey: r.chatKey, words: r.words, p: r.p, reasons: reasons[i], flagged: r.flagged }))
  return { model, report, imported, fresh, droppedAsSends: owned.droppedAsSends, heldOut }
}

export function trainLines(report: TrainReport): string[] {
  const pct = (n: number, of: number) => (of ? `${((100 * n) / of).toFixed(1)}%` : '-')
  const lines = [
    `held out by chat (${report.folds} folds over ${report.chats} chats): his ${report.owner} messages, ${report.ai} AI drafts`,
    `  band          his flagged        AI caught          AUC   line`,
    ...report.bands.map((b) => `  ${bandWords(b.band).padEnd(13)} ${`${b.ownerFlagged}/${b.ownerHeldOut} ${pct(b.ownerFlagged, b.ownerHeldOut)}`.padEnd(18)} ${`${b.aiCaught}/${b.aiHeldOut} ${pct(b.aiCaught, b.aiHeldOut)}`.padEnd(18)} ${b.auc.toFixed(2)}  ${b.abstain ? 'abstains' : b.threshold.toFixed(3)}`),
    `  all           ${`${report.overall.ownerFlagged}/${report.overall.ownerHeldOut} ${pct(report.overall.ownerFlagged, report.overall.ownerHeldOut)}`.padEnd(18)} ${`${report.overall.aiCaught}/${report.overall.aiHeldOut} ${pct(report.overall.aiCaught, report.overall.aiHeldOut)}`}`,
    `  the classifier alone: AI caught ${pct(report.classifierOnly.aiCaught, report.overall.aiHeldOut)}, his flagged ${pct(report.classifierOnly.ownerFlagged, report.overall.ownerHeldOut)}; under ${ABSTAIN_BELOW_WORDS} words gets no verdict (${report.overall.abstained} held out)`,
    `AI drafts caught by model family:`,
    ...report.families.map((f) => `  ${f.family.padEnd(10)} ${`${f.caught}/${f.drafts} ${pct(f.caught, f.drafts)}`.padEnd(18)} ${BANDS.map((b) => `${bandWords(b.name)} ${f.byBand[b.name].caught}/${f.byBand[b.name].drafts}`).join(', ')}`),
    `per option on the CPU, no network: p50 ${report.latency.p50.toFixed(1)} ms, p95 ${report.latency.p95.toFixed(1)} ms over ${report.latency.options} drafts`,
    `AI drafts by source: ${Object.entries(report.sources).map(([s, n]) => `${s} ${n}`).join(', ')}`,
  ]
  return lines
}
