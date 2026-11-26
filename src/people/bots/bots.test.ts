import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { markAutomatedIdentity } from '../../storage/platform/index'
import { buildGraph } from '../../relate/graph/index'
import { relateMachine } from '../../relate/machine/index'
import { botKnowledge, namedBot } from '../../relate/machine/helpers/bots'
import { writeIdentityProfile } from '../../storage/platform/index'
import { DISCORD_CHANNELS, DISCORD_PEOPLE, seedDiscordWorld } from '../../relate/machine/fixtures/discordWorld'
import { DEMO_OWNER } from '../../relate/graph/fixtures/demoWorld'
import { MACHINE_NOW } from '../../relate/machine/fixtures/machineWorld'
import { BOT_DISCORD_REQUESTS_PER_RUN, backfillBots, botSources } from './client'
import type { BotSources } from './types'

const iso = (ms: number): string => new Date(ms).toISOString()

const said = (on: ReturnType<typeof openDatabase>, userId: string, text: string): void => {
  const chatId = `discord:${DEMO_OWNER.discordAccount}:${DISCORD_CHANNELS.talk.id}`
  on.prepare("INSERT INTO messages (messageKey, chatId, senderPlatform, senderUserId, fromOwner, sentAt, sentAtMs, text, source, receivedAt) VALUES (?, ?, 'discord', ?, 0, ?, ?, ?, 'live', ?)").run(`botsFixture:${userId}:${text.length}`, chatId, userId, iso(MACHINE_NOW), MACHINE_NOW, text, iso(MACHINE_NOW))
  on.prepare("INSERT OR IGNORE INTO memberships (platform, roomId, userId, firstSeenAt, lastSeenAt) VALUES ('discord', ?, ?, ?, ?)").run(chatId, userId, iso(MACHINE_NOW), iso(MACHINE_NOW))
}

describe("a bot the platform names and nothing else does", () => {
  const quiet = { userId: '9100000399', handle: 'night_owl' }
  const path = join(mkdtempSync(join(tmpdir(), 'botFlag-')), 'log.db')
  const on = openDatabase(path)
  seedDiscordWorld(on)
  on.prepare("INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES ('discord', ?, ?, 'Night Owl', ?, ?)").run(quiet.userId, quiet.handle, iso(MACHINE_NOW), iso(MACHINE_NOW))
  said(on, quiet.userId, 'standing by for the build to finish')
  markAutomatedIdentity(on, 'discord', quiet.userId, new Date(MACHINE_NOW))
  buildGraph(path, new Date(MACHINE_NOW))

  test('its name holds no bot word, no chat says bot, and only the platform flag knows', () => {
    const knowledge = botKnowledge(openDatabase(path))
    expect(knowledge.keys.has(`discord:${quiet.userId}`)).toBe(true)
    expect(knowledge.why.get(`discord:${quiet.userId}`)).toBe('the platform marks it automated')
  })

  test('the network view drops it while the person view still answers for it', async () => {
    const network = await relateMachine({ view: 'network', platform: 'discord' }, path, MACHINE_NOW)
    if (!network.ok) throw new Error(`${network.code}: ${network.problem}`)
    const handles = network.block.states.flatMap((s) => s.people ?? []).map((p) => p.handle)
    expect(handles).not.toContain(quiet.handle)
    expect(handles).toContain(DISCORD_PEOPLE.regular.handle)
    const everyone = (on.prepare("SELECT COUNT(*) AS n FROM identities WHERE platform = 'discord'").get() as { n: number }).n
    expect(network.block.states.reduce((n, s) => n + (s.count ?? 0), 0)).toBe(everyone - 3)
    const person = await relateMachine({ person: `discord:${quiet.handle}` }, path, MACHINE_NOW)
    if (!person.ok) throw new Error(`${person.code}: ${person.problem}`)
    expect(person.block.view).toBe('person')
    expect(person.block.states.find((s) => s.current)).toBeTruthy()
  })
})

describe('backfilling the flag from a member list', () => {
  const bot = { userId: '159985870458322944', username: 'MEE6', bot: true }
  const human = { userId: '792842038332358656', username: 'Robin', bot: false }
  const calls: string[] = []
  const sources: BotSources = {
    accounts: () => [{ platform: 'discord', account: 'sourcedand', session: true }, { platform: 'slack', account: 'teamSlack', session: false }],
    sources: [
      {
        platform: 'discord',
        sweep: async () => {
          calls.push('discord')
          return { ok: true, members: [bot, human], requests: 1, places: 2, stopped: null }
        },
      },
      {
        platform: 'slack',
        sweep: async () => {
          calls.push('slack')
          return { ok: true, members: [], places: 0, stopped: null }
        },
      },
    ],
  }

  test('marks the members the platform says are bots, not the ones whose name looks human, and says why a platform was skipped', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsBackfill-')), 'log.db'))
    const report = await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(report.flagged).toBe(1)
    expect(report.bots).toBe(1)
    expect(report.read).toBe(2)
    expect(botKnowledge(on).keys.has(`discord:${bot.userId}`)).toBe(true)
    expect(botKnowledge(on).keys.has(`discord:${human.userId}`)).toBe(false)
    const discord = report.platforms.find((p) => p.platform === 'discord')!
    expect(discord.accounts[0]).toMatchObject({ account: 'sourcedand', read: 2, bots: 1, flagged: 1, already: 0, places: 2 })
    const slack = report.platforms.find((p) => p.platform === 'slack')!
    expect(slack.accounts[0].refused?.code).toBe('noPlatformSession')
    expect(calls).toEqual(['discord'])
    expect(report.platforms.find((p) => p.platform === 'x')?.skipped).toContain('no automated flag')
    expect(report.refused).toBe(1)
  })

  test('running it again marks nothing and counts what was already known', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsAgain-')), 'log.db'))
    await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    const again = await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(again.flagged).toBe(0)
    expect(again.already).toBe(1)
    expect(on.prepare("SELECT COUNT(*) AS n FROM identityProfiles WHERE platform = 'discord'").get()).toEqual({ n: 1 } as unknown as Record<string, unknown>)
  })
})

describe('a name that only ends in the letters b-o-t', () => {
  test('is a person: only bot as its own word, a -bot or _bot suffix or a camel-case Bot names a bot', () => {
    for (const person of ['abbot', 'talbot', 'sherbot', 'Botanist', 'Robotics Rob', 'Mr Talbot']) expect(namedBot(person)).toBe(false)
    for (const bot of ['VIBE BOT', 'helper_bot', 'build-bot', 'WelcomeBot', 'MEE6Bot', 'bot']) expect(namedBot(bot)).toBe(true)
  })

  test('stays visible, and a platform that says not a bot wins over a bot-looking name', () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsName-')), 'log.db'))
    const at = iso(MACHINE_NOW)
    const add = (userId: string, handle: string) => on.prepare("INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES ('twitter', ?, ?, NULL, ?, ?)").run(userId, handle, at, at)
    add('42', 'sherbot')
    add('43', 'helper_bot')
    add('44', 'deploy_bot')
    writeIdentityProfile(on, { platform: 'twitter', userId: '44', bio: null, avatarHash: null, followerCount: null, verified: null, extra: { bot: false }, fetchedAt: at })
    const knowledge = botKnowledge(on)
    expect(knowledge.keys.has('twitter:42')).toBe(false)
    expect(knowledge.keys.has('twitter:43')).toBe(true)
    expect(knowledge.keys.has('twitter:44')).toBe(false)
  })
})

describe('a Discord server that refuses its member list', () => {
  test('does not stop the sweep: the next server is still read, and the refusal is said in the summary', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsRefused-')), 'log.db'))
    const asked: string[] = []
    const sources = botSources({
      handle: on,
      accounts: () => [{ platform: 'discord', account: 'sourcedand', session: true }],
      now: () => MACHINE_NOW,
      discord: async (_account: unknown, spec: Record<string, unknown>) => {
        asked.push(String(spec.action))
        if (spec.action === 'servers') return { ok: true, members: [], servers: [{ id: '2', name: 'closed' }, { id: '3', name: 'open' }] }
        if (spec.action === 'members' && String(spec.server) === '2') return { ok: false, code: 'platformError', detail: 'Discord answered 403 to server 2 members: Missing Access', members: [] }
        if (spec.action === 'members') return { ok: true, members: [{ userId: '9100000401', bot: true, username: 'Welcomer' }, { userId: '77', bot: false, username: 'Robin' }], requests: 1, stopped: null }
        return { ok: true, members: [], requests: 1, stopped: null }
      },
      slack: async () => ({ ok: true, members: [], places: 0, stopped: null }),
    })
    const report = await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(asked.filter((a) => a === 'members')).toHaveLength(2)
    expect(report.flagged).toBe(1)
    expect(botKnowledge(on).keys.has('discord:9100000401')).toBe(true)
    const account = report.platforms.find((p) => p.platform === 'discord')!.accounts[0]
    expect(account.read).toBe(2)
    expect(account.stopped).toContain('1 place(s) refused')
    expect(account.account).toBe('sourcedand')
  })

  test('a member list that fails still counts against the run budget, so 57 refusing servers stop at the cap', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsFailBudget-')), 'log.db'))
    let members = 0
    const sources = botSources({
      handle: on,
      accounts: () => [{ platform: 'discord', account: 'sourcedand', session: true }],
      now: () => MACHINE_NOW,
      discord: async (_account: unknown, spec: Record<string, unknown>) => {
        if (spec.action === 'servers') return { ok: true, members: [], servers: Array.from({ length: 57 }, (_, i) => ({ id: String(i + 1), name: `server ${i + 1}` })) }
        members++
        return { ok: false, code: 'platformError', detail: 'Discord answered 403: Missing Access', members: [] }
      },
      slack: async () => ({ ok: true, members: [], places: 0, stopped: null }),
    })
    const report = await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(members).toBe(BOT_DISCORD_REQUESTS_PER_RUN)
    expect(report.platforms.find((p) => p.platform === 'discord')!.accounts[0].stopped).toContain(`stopped at ${BOT_DISCORD_REQUESTS_PER_RUN} requests`)
  })

  test('a governor block stops the sweep and is never remembered as a place refusing, so the next run asks again', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsBudget-')), 'log.db'))
    const asked: string[] = []
    let blocked = true
    const sources = botSources({
      handle: on,
      accounts: () => [{ platform: 'discord', account: 'sourcedand', session: true }],
      now: () => MACHINE_NOW,
      discord: async (_account: unknown, spec: Record<string, unknown>) => {
        asked.push(`${String(spec.action)}:${String(spec.server ?? '')}`)
        if (spec.action === 'servers') return { ok: true, members: [], servers: [{ id: '9', name: 'first' }, { id: '10', name: 'second' }] }
        if (blocked) return { ok: false, code: 'governorBlocked', detail: 'hourly cap reached (120/h)', members: [] }
        return { ok: true, members: [{ userId: `91000004${String(spec.server)}`, bot: true, username: 'helper' }], requests: 1, stopped: null }
      },
      slack: async () => ({ ok: true, members: [], places: 0, stopped: null }),
    })
    const first = await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(first.flagged).toBe(0)
    expect(first.platforms.find((p) => p.platform === 'discord')!.accounts[0].stopped).toContain('governorBlocked')
    expect(asked.filter((a) => a.startsWith('members'))).toHaveLength(1)
    blocked = false
    const second = await backfillBots(on, sources, { now: new Date(MACHINE_NOW + 60_000) })
    expect(asked.filter((a) => a.startsWith('members'))).toEqual(['members:9', 'members:9', 'members:10'])
    expect(second.flagged).toBe(2)
  })

  test('a person the platform already answered about is not asked again, so the next run reaches the ones behind them', async () => {
    const on = openDatabase(join(mkdtempSync(join(tmpdir(), 'botsAsked-')), 'log.db'))
    const at = iso(MACHINE_NOW)
    for (const id of ['9100000501', '9100000502', '9100000503']) on.prepare("INSERT INTO identities (platform, userId, handle, displayName, firstSeenAt, lastSeenAt) VALUES ('discord', ?, ?, NULL, ?, ?)").run(id, `person_${id.slice(-1)}`, at, at)
    const askedFor: string[] = []
    const sources = botSources({
      handle: on,
      accounts: () => [{ platform: 'discord', account: 'sourcedand', session: true }],
      now: () => MACHINE_NOW,
      discord: async (_account: unknown, spec: Record<string, unknown>) => {
        if (spec.action === 'servers') return { ok: true, members: [], servers: [] }
        askedFor.push(String(spec.user))
        return { ok: true, members: [{ userId: String(spec.user), bot: false, username: null }], requests: 1, stopped: null }
      },
      slack: async () => ({ ok: true, members: [], places: 0, stopped: null }),
    })
    await backfillBots(on, sources, { now: new Date(MACHINE_NOW) })
    expect(askedFor).toHaveLength(3)
    await backfillBots(on, sources, { now: new Date(MACHINE_NOW + 3600_000) })
    expect(askedFor).toHaveLength(3)
  })
})
