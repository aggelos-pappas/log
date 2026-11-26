import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { gliner2Screener } from './helpers/screen'

interface FakeChild {
  child: ChildProcessWithoutNullStreams
  asked: string[]
  say: (line: unknown) => void
  killed: () => boolean
}

function fakeChild(): FakeChild {
  const emitter = new EventEmitter()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const stdin = new PassThrough()
  const asked: string[] = []
  let killed = false
  stdin.on('data', (chunk: Buffer) => asked.push(chunk.toString()))
  const child = Object.assign(emitter, { stdout, stderr, stdin, kill: () => { killed = true; return true } }) as unknown as ChildProcessWithoutNullStreams
  return { child, asked, say: (line) => stdout.write(`${JSON.stringify(line)}\n`), killed: () => killed }
}

const marks = (n: number) => Array.from({ length: n }, () => ({ kind: 'none', confidence: 0.9, entities: [], relations: [] }))
const settle = () => new Promise((done) => setTimeout(done, 5))

describe('the fact screen worker', () => {
  test('a startup that never answers is killed, and the next call starts a fresh worker', async () => {
    const spawned: FakeChild[] = []
    const screener = gliner2Screener('model', 'python', null, { launch: () => { const fake = fakeChild(); spawned.push(fake); return fake.child }, startMs: 20, askMs: 200 })
    await expect(screener.screen(['a long enough test message'])).rejects.toThrow('factScreenUnavailable')
    expect(spawned.length).toBe(1)
    expect(spawned[0].killed()).toBe(true)
    const second = screener.screen(['a long enough test message'])
    await settle()
    expect(spawned.length).toBe(2)
    spawned[1].say({ ok: true })
    await settle()
    spawned[1].say({ ok: true, marks: marks(1), ms: 3 })
    expect((await second).ms).toBe(3)
  })

  test('a request that times out is not answered by the next request\'s reply', async () => {
    const spawned: FakeChild[] = []
    const screener = gliner2Screener('model', 'python', null, { launch: () => { const fake = fakeChild(); spawned.push(fake); return fake.child }, startMs: 200, askMs: 30 })
    const first = screener.screen(['first message here'])
    await settle()
    spawned[0].say({ ok: true })
    await expect(first).rejects.toThrow('gave no answer')
    const second = screener.screen(['second message here'])
    await settle()
    expect(spawned.length).toBe(2)
    expect(spawned[0].killed()).toBe(true)
    spawned[0].say({ ok: true, marks: marks(1), ms: 99 })
    spawned[1].say({ ok: true })
    await settle()
    spawned[1].say({ ok: true, marks: marks(1), ms: 7 })
    expect((await second).ms).toBe(7)
    screener.stop?.()
  })
})
