import { afterEach, describe, expect, it, vi } from 'vitest'
import { createActor, waitFor } from 'xstate'
import { browserStream, castBrowser, parseView, partReader, requestBrowser } from './browserCheckData'
import { browserCheckMachine } from './browserCheckMachine'

const view = { accountId: 'a'.repeat(24), account: 'fixtureAccount', phase: 'signInRequired', location: 'remote', viewerId: 'g'.repeat(32), generation: 'g'.repeat(32), revision: 'b'.repeat(64), pageState: 'loginForm', address: 'https://example.com/login', width: 800, height: 600, canInteract: true, canResolve: true, canComplete: false, canNavigate: true, canGoBack: true, stream: null, reason: null }

afterEach(() => { vi.unstubAllGlobals() })

describe('the console browser check', () => {
  it('reads a view, lets only a sign-in page take input and drops an unsafe stream', () => {
    expect(parseView(view)).toMatchObject({ phase: 'signInRequired', canInteract: true, canResolve: true, location: 'remote' })
    expect(parseView({ ...view, phase: 'needsAttention' })).toMatchObject({ canInteract: false, canResolve: false })
    expect(parseView({ ...view, phase: 'ready', canComplete: true }).canComplete).toBe(false)
    expect(() => parseView({ ...view, phase: 'launchBlocked' })).toThrow('browserResponseInvalid')
    expect(parseView({ ...view, stream: { kind: 'voxl', url: 'javascript:alert(1)', page: { width: 1, height: 1 }, window: {} } }).stream).toBeNull()
  })

  it('sends each step to its console operation, locally and hosted', async () => {
    const calls: string[] = []
    vi.stubGlobal('document', { cookie: 'logCsrf=csrfValue' })
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => { calls.push(`${url} ${init.body}`); return new Response(JSON.stringify({ view }), { headers: { 'content-type': 'application/json' } }) }))
    await requestBrowser({ kind: 'local' }, view.accountId, 'resolve', parseView(view))
    await requestBrowser({ kind: 'hosted', teamId: 't1' }, view.accountId, 'complete', parseView(view))
    expect(calls[0]).toBe(`/api/console/browserCheck/action {"accountId":"${view.accountId}","action":"resolve","generation":"${view.generation}","revision":"${view.revision}"}`)
    expect(calls[1].startsWith('/api/v1/teams/t1/console/browser/saveState ')).toBe(true)
  })

  it('splits the stream into its jpeg parts whatever the chunk edges, and sees the end', () => {
    const encoder = new TextEncoder()
    const whole = encoder.encode('--logFrame\r\nContent-Type: image/jpeg\r\nContent-Length: 3\r\n\r\nabc\r\n--logFrame\r\nContent-Type: image/jpeg\r\nContent-Length: 2\r\n\r\nde\r\n--logFrame--\r\n')
    for (const edge of [1, 7, 30, whole.length]) {
      const reader = partReader('logFrame')
      const parts = []
      for (let at = 0; at < whole.length; at += edge) parts.push(...reader.push(whole.slice(at, at + edge)))
      expect(parts.map((part) => new TextDecoder().decode(part.data))).toEqual(['abc', 'de'])
      expect(parts[0].headers['content-type']).toBe('image/jpeg')
      expect(reader.ended).toBe(true)
    }
    expect(() => partReader('logFrame').push(encoder.encode('--logFrame\r\nContent-Length: x\r\n\r\n'))).toThrow('browserStreamInvalid')
  })

  it('draws only the newest frame of a burst, and refuses another generation', async () => {
    const generation = 'g'.repeat(32)
    const part = (text: string, at = generation) => `--logFrame\r\nContent-Type: image/jpeg\r\nContent-Length: ${text.length}\r\nX-Log-Browser-Generation: ${at}\r\n\r\n${text}\r\n`
    const answer = (body: string) => new Response(new ReadableStream({ start: (controller) => { controller.enqueue(new TextEncoder().encode(body)); controller.close() } }), { headers: { 'content-type': 'multipart/x-mixed-replace; boundary=logFrame', 'X-Log-Browser-Generation': generation } })
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { urls.push(`${url} ${(init.headers as Record<string, string>)['x-log-console']}`); return answer(part('one') + part('two') + part('three') + '--logFrame--\r\n') }))
    const drawn: string[] = []
    expect(await browserStream('a1', generation, new AbortController().signal, async (blob) => { drawn.push(await blob.text()) })).toBe(1)
    expect(drawn).toEqual(['three'])
    expect(urls).toEqual([`/api/console/browserCheck/stream?accountId=a1&generation=${generation} 1`])
    vi.stubGlobal('fetch', vi.fn(async () => answer(part('old', 'd'.repeat(32)))))
    await expect(browserStream('a1', generation, new AbortController().signal, async () => {})).rejects.toThrow('browserGenerationChanged')
  })

  it('a stream that cannot start hands the picture back to frame polling after three tries', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: 'browserViewerUnavailable' }, { status: 503 }))
    vi.stubGlobal('fetch', fetcher)
    let lost = 0
    await castBrowser('a1', 'g'.repeat(32), new AbortController().signal, async () => {}, () => { lost++ }, 0)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(lost).toBe(3)
  })

  it('polls frames only while no stream is drawing', async () => {
    for (const casting of [false, true]) {
      const paths: string[] = []
      vi.stubGlobal('fetch', vi.fn(async (url: string) => { paths.push(url); if (url.endsWith('/frame')) return new Response(JSON.stringify({ frame: { mimeType: 'image/jpeg', data: btoa('jpeg') } }), { headers: { 'content-type': 'application/json' } }); return new Response(JSON.stringify({ view: { ...view, location: 'local', canResolve: false } }), { headers: { 'content-type': 'application/json' } }) }))
      const actor = createActor(browserCheckMachine, { input: { target: { kind: 'local' }, accountId: view.accountId, autoSignIn: false, drawFrame: async () => {}, casting: () => casting } }).start()
      await waitFor(actor, (snapshot) => snapshot.context.hasFrame)
      actor.stop()
      expect(paths.includes('/api/console/browserCheck/frame')).toBe(!casting)
    }
  })

  it('opens a missing browser, and on close stops only the browser it opened', async () => {
    const paths: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { paths.push(url); return new Response(JSON.stringify({ view: { ...view, phase: 'browserMissing', viewerId: null, generation: null, revision: null, canInteract: false, canResolve: false } }), { headers: { 'content-type': 'application/json' } }) }))
    const actor = createActor(browserCheckMachine, { input: { target: { kind: 'local' }, accountId: view.accountId, autoSignIn: false, drawFrame: async () => {} } }).start()
    await waitFor(actor, (snapshot) => snapshot.matches('uncertain'))
    actor.send({ type: 'CLOSE' })
    await waitFor(actor, (snapshot) => snapshot.status === 'done')
    expect(paths).toEqual(['/api/console/browserCheck/state', '/api/console/browserCheck/open', '/api/console/browserCheck/close'])
  })
})
