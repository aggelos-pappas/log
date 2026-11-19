import { describe, expect, test } from 'bun:test'
import { createTregClient, hedgedRun, measuredHedgeMs, percentileOf } from './client'
import type { TregRun, TregRunner } from './types'

const ok = (stdout: string): TregRun => ({ ok: true, code: 0, stdout, stderr: '' })
const failed: TregRun = { ok: false, code: 1, stdout: '', stderr: 'boom' }

function runner(answers: { ms: number; run: TregRun }[]): { run: TregRunner; started: number; aborted: number } {
  const seen = { run: (() => Promise.resolve(failed)) as TregRunner, started: 0, aborted: 0 }
  seen.run = (_args, _timeout, signal) => {
    const answer = answers[seen.started++] ?? { ms: 0, run: failed }
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(answer.run), answer.ms)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        seen.aborted++
        resolve(failed)
      })
    })
  }
  return seen
}

describe('free treg catalog reads are hedged after their measured p95, and a paid call never is', () => {
  test('a read that answers before the hedge delay starts no second request', async () => {
    const fake = runner([{ ms: 5, run: ok('first') }])
    expect((await hedgedRun(fake.run, 'treg.get', ['catalog', 'get', 'x'], {}, 200)).stdout).toBe('first')
    expect(fake.started).toBe(1)
  })

  test('a slow read is raced by one hedge, the loser is cancelled', async () => {
    const fake = runner([{ ms: 5_000, run: ok('slow') }, { ms: 5, run: ok('hedge') }])
    const started = performance.now()
    expect((await hedgedRun(fake.run, 'treg.get', ['catalog', 'get', 'x'], {}, 30)).stdout).toBe('hedge')
    expect(performance.now() - started).toBeLessThan(1_000)
    expect(fake.started).toBe(2)
    expect(fake.aborted).toBe(1)
  })

  test('when the first finisher failed, the other attempt still answers', async () => {
    const fake = runner([{ ms: 60, run: failed }, { ms: 120, run: ok('hedge') }])
    expect((await hedgedRun(fake.run, 'treg.get', ['catalog', 'get', 'x'], {}, 20)).stdout).toBe('hedge')
  })

  test('the delay is the p95 of the stored spans, never under the floor, and the call itself is a single request', async () => {
    expect(percentileOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100], 0.95)).toBe(100)
    expect(measuredHedgeMs('treg.hedgeFloor', 1e12, () => [10, 20, 30])).toBe(2_000)
    expect(measuredHedgeMs('treg.hedgeTest', 1e12, () => Array.from({ length: 100 }, (_, i) => 3_000 + i * 100))).toBe(12_500)
    const fake = runner([{ ms: 80, run: ok('called') }])
    const client = createTregClient(fake.run, () => 10)
    expect((await client.call({ id: 'anyapi.x.user.posts', params: [] })).stdout).toBe('called')
    expect(fake.started).toBe(1)
  })

  test('an endpoint read once is kept, so an approved live call reads its price without waiting on treg again', async () => {
    const fake = runner([{ ms: 1, run: ok('price $0.001') }])
    const client = createTregClient(fake.run, () => 10_000)
    expect(client.keptGet?.('anyapi.x.user.posts')).toBeNull()
    await client.get('anyapi.x.user.posts')
    expect(client.keptGet?.('anyapi.x.user.posts')?.stdout).toBe('price $0.001')
  })
})
