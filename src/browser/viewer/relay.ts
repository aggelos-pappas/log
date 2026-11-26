import { STREAM_TYPE, TICKET_SECONDS, viewerDeps, viewerDescriptor, viewerOwner, viewerTicket } from './client'

export const RELAY_SERVICE = 'logBrowserStream'
export const DEFAULT_RELAY_PORT = 47613
export const RELAY_PATH = '/browserStream'
export const RELAY_CORS: Readonly<Record<string, string>> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Expose-Headers': 'X-Log-Browser-Generation',
  'Access-Control-Max-Age': '600',
}
const ACCOUNT = /^[A-Za-z0-9_.@+-]{1,128}$/
const TICKET = /^[A-Za-z0-9_-]{16,64}$/

export function relayPort(env: Record<string, string | undefined> = process.env): number {
  const port = Number(env.LOG_BROWSER_STREAM_PORT)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_RELAY_PORT
}

export function relayOrigin(env: Record<string, string | undefined> = process.env): string {
  return `http://127.0.0.1:${relayPort(env)}`
}

function answer(status: number, body: unknown): Response {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...RELAY_CORS, 'Cache-Control': 'no-store', ...(body === null ? {} : { 'Content-Type': 'application/json' }) } })
}

export async function relayAnswer(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') return answer(204, null)
  if (request.method !== 'GET') return answer(405, { error: 'browserRouteMissing' })
  if (url.pathname === '/health') return answer(200, { service: RELAY_SERVICE })
  if (url.pathname !== RELAY_PATH) return answer(404, { error: 'browserRouteMissing' })
  const account = url.searchParams.get('account') ?? ''
  const ticket = url.searchParams.get('ticket') ?? ''
  if (!ACCOUNT.test(account) || !TICKET.test(ticket)) return answer(403, { error: 'browserAccessDenied' })
  const owner = viewerOwner(account)
  const descriptor = owner ? viewerDescriptor(owner) : null
  if (!descriptor) return answer(503, { error: 'browserViewerUnavailable' })
  let upstream: Response
  try {
    upstream = await viewerDeps.fetch(`http://127.0.0.1:${descriptor.port}/stream?ticket=${ticket}`, { method: 'GET', redirect: 'error', signal: request.signal })
  } catch {
    return answer(503, { error: 'browserViewerUnavailable' })
  }
  const type = upstream.headers.get('content-type') ?? ''
  if (!upstream.ok || !upstream.body || !type.startsWith(STREAM_TYPE)) {
    await upstream.body?.cancel().catch(() => {})
    return answer(upstream.status === 403 ? 403 : 503, { error: upstream.status === 403 ? 'browserAccessDenied' : 'browserStreamUnavailable' })
  }
  return new Response(upstream.body, { status: 200, headers: { ...RELAY_CORS, 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Log-Browser-Generation': upstream.headers.get('X-Log-Browser-Generation') ?? '' } })
}

export const relayDeps: { serve: (port: number) => { stop: (force?: boolean) => void }; probe: (origin: string) => Promise<boolean> } = {
  serve: (port) => Bun.serve({ hostname: '127.0.0.1', port, idleTimeout: 30, fetch: relayAnswer }),
  probe: async (origin) => {
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1500) })
      const body = (await response.json().catch(() => null)) as { service?: unknown } | null
      return body?.service === RELAY_SERVICE
    } catch {
      return false
    }
  },
}

let running: Promise<boolean> | null = null
let server: { stop: (force?: boolean) => void } | null = null

export function ensureRelay(env: Record<string, string | undefined> = process.env): Promise<boolean> {
  running ??= (async () => {
    try {
      server = relayDeps.serve(relayPort(env))
      return true
    } catch {
      const shared = await relayDeps.probe(relayOrigin(env))
      if (!shared) running = null
      return shared
    }
  })()
  return running
}

export function stopRelay(): void {
  server?.stop(true)
  server = null
  running = null
}

export async function relayTicket(account: string, generation: unknown, seconds: number = TICKET_SECONDS, env: Record<string, string | undefined> = process.env): Promise<{ url: string; expiresIn: number } | null> {
  if (!(await ensureRelay(env))) return null
  const given = await viewerTicket(account, generation, seconds)
  return { url: `${relayOrigin(env)}${RELAY_PATH}?account=${encodeURIComponent(account)}&ticket=${given.ticket}`, expiresIn: given.expiresIn }
}
