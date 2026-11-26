import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { Database } from 'bun:sqlite'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema'
import { signalsOf } from '../score/index'
import type { ScoreInput } from '../score/client'
import { bandOf, bandThreshold, pythonFit, TRAIN_PARAMS, buildProfile, calibrateBands, charGramsOf, conventionsLine, corpusOf, draftsFromFile, draftsInCalls, estimateUsd, familyOf, gramHits, habitsOf, loadConventions, optionsIn, ownerMessages, ownerSample, probabilityOf, readConventions, repeatedOpeners, runFresh, saveCorpus, trainConventions } from './index'
import type { ConventionsModel, TrainerInput } from './index'

const scratch = mkdtempSync(join(tmpdir(), 'logConventions'))
const before = process.env.LOG_DB

function modelOf(overrides: Partial<ConventionsModel> = {}): ConventionsModel {
  const profile = buildProfile([
    ...['happy to help with that', 'happy to jump on a call', 'totally — happy to help', 'happy to share more'].map((text, i) => ({ side: 'ai' as const, text, chat: `chat${i}` })),
    ...['yo lad filmed it today', 'nah mate not yet', 'sound lad cheers', 'yo you about later'].map((text) => ({ side: 'owner' as const, text, chat: 'grace_ships' })),
  ], () => 'sound lad cheers')
  return { builtAt: '2026-11-21T00:00:00.000Z', embedModel: 'hash', ngram: [2, 4], vocab: ['ha', 'ap', 'yo'], idf: [1, 1, 1], gramWeights: [2, 2, -3], embedWeights: [0.5, -0.5], embedScale: 1, bias: 0, bands: [{ band: 'short', threshold: 0.9, gramRatio: 0, ownerP50: 0.2, abstain: false, ownerHeldOut: 0, ownerFlagged: 0, aiHeldOut: 0, aiCaught: 0, auc: 0.9 }, { band: 'medium', threshold: 0.8, gramRatio: 0, ownerP50: 0.3, abstain: false, ownerHeldOut: 0, ownerFlagged: 0, aiHeldOut: 0, aiCaught: 0, auc: 0.9 }, { band: 'long', threshold: 0.8, gramRatio: 0, ownerP50: 0.3, abstain: false, ownerHeldOut: 0, ownerFlagged: 0, aiHeldOut: 0, aiCaught: 0, auc: 0.9 }], profile, mutedRules: [], ownersPhrases: [], report: {} as ConventionsModel['report'], ...overrides }
}

beforeEach(() => {
  process.env.LOG_DB = join(scratch, 'log.db')
})

afterEach(() => {
  if (before === undefined) delete process.env.LOG_DB
  else process.env.LOG_DB = before
})

afterAll(() => {
  openDatabase(join(scratch, 'log.db')).close()
  Bun.gc(true)
  rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

describe('the frontier-conventions detector', () => {
  test('char grams follow the trainer: lowercase, runs of whitespace as one space, code points', () => {
    const grams = charGramsOf('Yo  Lad 🔥', 2, 2)
    expect(grams.get('yo')).toBe(1)
    expect(grams.get('o ')).toBe(1)
    expect(grams.has('  ')).toBe(false)
    expect(grams.get(' 🔥')).toBe(1)
  })

  test('the head is a logistic over l2 tf-idf char grams plus the embedding', () => {
    const loaded = loadConventions(modelOf(), 'k', [])
    const ai = probabilityOf(loaded, 'happy', [1, 0])
    const mine = probabilityOf(loaded, 'yo yo', [0, 1])
    expect(ai).toBeGreaterThan(0.5)
    expect(mine).toBeLessThan(0.5)
  })

  test('the over-use profile keeps phrases models write across chats that he never does, with his nearest phrasing', () => {
    const profile = modelOf().profile
    expect(profile.grams.map((g) => g.gram)).toContain('happy to')
    expect(profile.grams.find((g) => g.gram === 'happy to')!.his).toBe('sound lad cheers')
    expect(profile.grams.some((g) => g.gram === 'lad')).toBe(false)
    expect(gramHits('happy to help mate', profile).map((g) => g.gram)).toEqual(['happy to'])
  })

  test('structure: em dash, markdown, a closing full stop, even sentences and a repeated opener across options', () => {
    expect(habitsOf('sure — sounds good').has('emDash')).toBe(true)
    expect(habitsOf('**bold** move').has('markdown')).toBe(true)
    expect(habitsOf('That works for me.').has('endsWithFullStop')).toBe(true)
    expect(habitsOf('This is one line here. This is two line here. This is three line here.').has('evenSentences')).toBe(true)
    expect([...repeatedOpeners(['haha fair play', 'haha fair enough', 'nah mate'])]).toEqual([0, 1])
  })

  test('a draft too short to tell gets no verdict and a neutral signal; an AI draft names the words beside his phrasing', () => {
    const loaded = loadConventions(modelOf(), 'k', [])
    const short = readConventions(loaded, 'yo lad', [0, 1])
    expect(short.abstain).toBe(true)
    expect(short.value).toBeNull()
    for (const his of ['yeah lad thats mad', 'this is it mate', 'one two three four five']) {
      const reading = readConventions(loaded, his, [1, 0])
      expect(reading.abstain).toBe(true)
      expect(reading.probability).toBeNull()
    }
    expect(readConventions(loaded, 'one two three four five six', [1, 0]).abstain).toBe(false)
    const ai = readConventions(loaded, 'happy to help with the build', [1, 0])
    expect(ai.flagged).toBe(true)
    expect(ai.band).toBe('medium')
    expect(conventionsLine(ai)).toContain('"happy to"')
    expect(conventionsLine(ai)).toContain("he'd say: \"sound lad cheers\"")
    const base: ScoreInput = { voice: 0.9, friendLike: 0.9, toThem: 0.9, inContext: 0.9, answerRequired: true, buildsOn: null, openerOnly: 1, neverSays: [], watermark: { level: 'clean' } }
    expect(signalsOf({ ...base, conventions: ai }).notAiTell).toBe(ai.value)
    expect(signalsOf({ ...base, conventions: short }).notAiTell).toBeNull()
  })

  test('each band gets a line that lets 95% of his held-out messages pass, and a band that cannot tell abstains', () => {
    const owner = Array.from({ length: 100 }, (_, i) => ({ p: i / 100, other: false }))
    expect(bandThreshold(owner)).toBe(0.94)
    expect(bandThreshold([...owner.slice(0, 95), ...owner.slice(95).map((o) => ({ ...o, other: true }))])).toBe(1)
    const rows = [...owner.map((o) => ({ ...o, label: 0, words: 8 })), ...Array.from({ length: 50 }, (_, i) => ({ p: 0.95 + i / 1000, other: false, label: 1, words: 8 })), ...owner.map((o) => ({ ...o, label: 0, words: 2 })), ...owner.map((o) => ({ ...o, label: 0, words: 3 })), ...owner.map((o) => ({ ...o, label: 1, words: 3 }))]
    const bands = calibrateBands(rows)
    const medium = bands.find((b) => b.band === 'medium')!
    expect(medium.ownerFlagged / medium.ownerHeldOut).toBeLessThanOrEqual(0.05)
    expect(medium.aiCaught).toBe(50)
    expect(bands.find((b) => b.band === 'short')!.abstain).toBe(true)
    expect(bandOf(16)).toBe('long')
  })

  test('his side leaves out sends made through log and texts an agent drafted', () => {
    const handle = new Database(':memory:')
    handle.exec("CREATE TABLE chats (chatId TEXT, platform TEXT, conversationId TEXT, name TEXT); CREATE TABLE messages (chatId TEXT, fromOwner INTEGER, text TEXT, sentAt TEXT, sentAtMs INTEGER); CREATE TABLE spans (tool TEXT, startedAt REAL, ms REAL, parentId TEXT)")
    handle.exec("INSERT INTO chats VALUES ('c1', 'discord', '1', 'linus_k')")
    const at = Date.parse('2026-11-01T10:00:00Z')
    handle.prepare('INSERT INTO messages VALUES (?, 1, ?, ?, ?)').run('c1', 'yo lad filmed it today', new Date(at).toISOString(), at)
    handle.prepare('INSERT INTO messages VALUES (?, 1, ?, ?, ?)').run('c1', 'sent by the agent here', new Date(at + 60000).toISOString(), at + 60000)
    handle.prepare('INSERT INTO messages VALUES (?, 1, ?, ?, ?)').run('c1', 'drafted by the agent too', new Date(at + 900000).toISOString(), at + 900000)
    handle.prepare('INSERT INTO spans VALUES (?, ?, ?, NULL)').run('discordSendLive', at + 58000, 1500)
    const { messages, droppedAsSends } = ownerMessages(handle, new Set(['drafted by the agent too']))
    expect(messages.map((m) => m.text)).toEqual(['yo lad filmed it today'])
    expect(messages[0].chatKey).toBe('linus_k')
    expect(droppedAsSends).toBe(2)
    expect(ownerMessages(handle).sent).toEqual(['yo lad filmed it today', 'sent by the agent here', 'drafted by the agent too'])
  })

  test("agent drafts are read from the agent's tool calls: options and texts of voice, and sends", () => {
    const rows = draftsInCalls([{ name: 'mcp__log__voice', args: { to: '@grace_ships', options: ['option one here', 'option two here'] } }, { name: 'mcp__log__discordSendLive', args: { channel: 'linus_k', text: 'sent line here' } }, { name: 'terminal', args: { command: 'ls' } }], 'claudeOpus5', null)
    expect(rows.map((r) => [r.text, r.chatKey, r.family])).toEqual([['option one here', 'grace_ships', 'claude'], ['option two here', 'grace_ships', 'claude'], ['sent line here', 'linus_k', 'claude']])
    expect(rows[0].momentKey).toBe(rows[1].momentKey)
    expect(familyOf('gpt-5.6-luna')).toBe('gpt')
    expect(familyOf(null)).toBe('agent')
    const file = join(scratch, 'drafts.json')
    writeFileSync(file, JSON.stringify([{ to: 'linus_k', today: 'first try line', options: ['option a here', 'option b here'], family: 'claude' }]))
    expect(draftsFromFile(file).map((r) => r.text)).toEqual(['first try line', 'option a here', 'option b here'])
  })

  test('fresh drafts stop at the spend cap and keep his real reply beside them', async () => {
    const pair = (n: number) => ({ id: `p${n}`, platform: 'discord', account: 'a', conversationId: `c${n}`, chat: 'grace_ships', kind: 'dm' as const, with: ['grace_ships'], at: '2026-11-01', said: 'you about later', saidBy: 'grace_ships', reply: 'yeah after six lad', parts: 1, gaps: [] })
    const models = [{ family: 'claude', model: 'm1', inPerMillion: 1000, outPerMillion: 1000 }]
    const ran = await runFresh({ moments: [pair(1), pair(2), pair(3)], models, estimateUsd: 3, prompts: [[], [], []] }, async () => ({ text: '{"options": ["sure thing, happy to!", "yep after six works"]}', inTokens: 500, outTokens: 500 }), 1)
    expect(ran.calls).toBe(1)
    expect(ran.rows.filter((r) => r.side === 'ai').map((r) => r.text)).toEqual(['sure thing, happy to!', 'yep after six works'])
    expect(ran.rows.find((r) => r.side === 'owner')!.text).toBe('yeah after six lad')
    expect(optionsIn('```json\n["a b", "c d"]\n```')).toEqual(['a b', 'c d'])
    expect(estimateUsd(3500, { family: 'x', model: 'x', inPerMillion: 1, outPerMillion: 10 })).toBeCloseTo(0.005, 6)
  })

  test('training stores the corpus in log.db, splits folds by chat and reports his flagged and the drafts caught per band and family', async () => {
    saveCorpus([...Array.from({ length: 30 }, (_, i) => ({ side: 'ai' as const, family: i % 2 ? 'gpt' : 'claude', model: null, source: 'paired', chatKey: `chat${i % 6}`, momentKey: `m${i}`, text: `happy to help with that build number ${i}`, at: null }))])
    expect(corpusOf('ai').length).toBe(30)
    const owner = Array.from({ length: 60 }, (_, i) => ({ text: `yo lad filmed number ${i} today`, at: new Date(Date.UTC(2026, 9, 1 + (i % 28))).toISOString(), chatKey: `chat${i % 6}`, platform: 'discord' }))
    const seen: TrainerInput[] = []
    const result = await trainConventions({
      embedModel: 'hash',
      embed: async (texts) => texts.map((t) => (t.includes('happy') ? [1, 0] : [0, 1])),
      fit: async (input) => {
        seen.push(input)
        return { vocab: ['ha', 'yo'], idf: [1, 1], gramWeights: [3, -3], embedWeights: [1, -1], bias: 0, oof: input.labels.map((l, i) => (l ? 0.8 + (i % 10) / 100 : (i % 50) / 100)), folds: input.groups.map((g) => g % 5) }
      },
      agentDrafts: () => [],
      owner: () => ({ messages: owner, droppedAsSends: 0 }),
      rules: () => [],
      log: () => {},
    })
    expect(result.model).not.toBeNull()
    expect(new Set(seen[0].groups).size).toBe(6)
    const medium = result.report!.bands.find((b) => b.band === 'medium')!
    expect(medium.ownerFlagged / medium.ownerHeldOut).toBeLessThanOrEqual(0.05)
    expect(result.report!.families.map((f) => f.family)).toEqual(['claude', 'gpt'])
    expect(result.report!.latency.options).toBeGreaterThan(0)
    expect(ownerSample(owner, new Set(['chat1']), 10).length).toBe(10)
  })

  test("his own sent messages never land on the model-written side, even when a gate or an agent recorded them as drafts", async () => {
    saveCorpus([
      { side: 'ai', family: 'agent', model: null, source: 'gate', chatKey: 'linus_k', momentKey: null, text: 'fml man the glazing with no offers is the worst part\nill send anything i see your way', at: null },
      { side: 'ai', family: 'agent', model: null, source: 'agentSession', chatKey: 'linus_k', momentKey: null, text: "I'll send anything I see your way", at: null },
    ])
    const owner = Array.from({ length: 40 }, (_, i) => ({ text: `yo lad filmed number ${i} today`, at: new Date(Date.UTC(2026, 9, 1 + (i % 28))).toISOString(), chatKey: `chat${i % 6}`, platform: 'twitter' }))
    const sent = [...owner.map((m) => m.text), 'fml man the glazing with no offers is the worst part', 'ill send anything i see your way']
    const seen: TrainerInput[] = []
    const lines: string[] = []
    await trainConventions({
      embedModel: 'hash',
      embed: async (texts) => texts.map((t) => (t.includes('happy') ? [1, 0] : [0, 1])),
      fit: async (input) => {
        seen.push(input)
        return { vocab: ['ha', 'yo'], idf: [1, 1], gramWeights: [3, -3], embedWeights: [1, -1], bias: 0, oof: input.labels.map((l, i) => (l ? 0.8 + (i % 10) / 100 : (i % 50) / 100)), folds: input.groups.map((g) => g % 5) }
      },
      agentDrafts: () => [],
      owner: () => ({ messages: owner, droppedAsSends: 0, sent }),
      rules: () => [],
      log: (line) => lines.push(line),
    })
    const modelSide = seen[0].texts.filter((_, i) => seen[0].labels[i] === 1)
    expect(modelSide.some((t) => /ill send anything/i.test(t))).toBe(false)
    expect(modelSide.length).toBeGreaterThan(0)
    expect(lines.some((l) => l.includes('2 drafts left off the model-written side'))).toBe(true)
  })

  test.skipIf(spawnSync(process.env.LOG_PYTHON || 'python', ['-c', 'import sklearn'], { windowsHide: true }).status !== 0)('the weights sklearn fits give the same probability when TypeScript applies them', async () => {
    const texts = [...Array.from({ length: 12 }, (_, i) => `happy to help with build ${i} — let me know`), ...Array.from({ length: 12 }, (_, i) => `yo lad filmed ${i} today`)]
    const embeddings = texts.map((t, i) => [t.includes('happy') ? 1 : 0, (i % 3) / 3, 0.5])
    const fitted = await pythonFit()({ texts, labels: texts.map((t) => (t.includes('happy') ? 1 : 0)), groups: texts.map((_, i) => i % 6), weights: texts.map(() => 1), embeddings, params: { ...TRAIN_PARAMS, minDf: 1, folds: 3, probe: texts.length } })
    const loaded = loadConventions({ ...modelOf(), vocab: fitted.vocab, idf: fitted.idf, gramWeights: fitted.gramWeights, embedWeights: fitted.embedWeights, bias: fitted.bias }, 'k', [])
    texts.forEach((text, i) => expect(probabilityOf(loaded, text, embeddings[i])).toBeCloseTo(fitted.fitted![i], 4))
    expect(fitted.oof.length).toBe(texts.length)
    expect(new Set(fitted.folds).size).toBe(3)
  }, 60000)
})
