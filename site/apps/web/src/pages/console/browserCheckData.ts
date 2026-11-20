import { consoleRequest, type ConsoleTarget } from './consoleClient'
import { browserPhases, type BrowserCheckView, type BrowserInput, type BrowserOperation, type BrowserStream } from './browserCheckTypes'

export class BrowserRequestError extends Error {
  constructor(code: string) { super(code); this.name = 'BrowserRequestError' }
}

const ROUTES: Record<BrowserOperation, { path: string; action?: string }> = {
  status: { path: 'state' },
  open: { path: 'open' },
  linkProfile: { path: 'action', action: 'linkProfile' },
  verify: { path: 'action', action: 'verify' },
  resolve: { path: 'action', action: 'resolve' },
  back: { path: 'action', action: 'back' },
  reload: { path: 'action', action: 'reload' },
  input: { path: 'input' },
  complete: { path: 'saveState' },
  close: { path: 'close' },
}

const text = (value: unknown, max: number) => typeof value === 'string' && value.length <= max ? value : null

function streamOf(value: unknown): BrowserStream | null {
  if (!value || typeof value !== 'object') return null
  const row = value as BrowserStream
  if (row.kind !== 'voxl' || typeof row.url !== 'string' || !row.page || !row.window || !(row.page.width > 0) || !(row.page.height > 0)) return null
  try { const url = new URL(row.url); if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return null } catch { return null }
  return row
}

function browserOf(value: unknown): BrowserCheckView['browser'] {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const logo = typeof row.logo === 'string' && /^\/logos\/[\w.]+$/.test(row.logo) ? row.logo : null
  return typeof row.name === 'string' && /^[a-zA-Z]{1,20}$/.test(row.name) && typeof row.label === 'string' && row.label.length <= 40 ? { name: row.name, label: row.label, logo } : null
}

export function parseView(value: unknown): BrowserCheckView {
  if (!value || typeof value !== 'object') throw new BrowserRequestError('browserResponseInvalid')
  const row = value as Record<string, unknown>
  if (!browserPhases.includes(row.phase as BrowserCheckView['phase']) || typeof row.accountId !== 'string' || typeof row.account !== 'string' || !['viewerId', 'generation', 'revision', 'pageState', 'address'].every((key) => row[key] === null || typeof row[key] === 'string')) throw new BrowserRequestError('browserResponseInvalid')
  const size = (key: string) => (Number.isSafeInteger(row[key]) && (row[key] as number) > 0 ? (row[key] as number) : null)
  const reason = row.reason && typeof row.reason === 'object' ? row.reason as Record<string, unknown> : null
  const phase = row.phase as BrowserCheckView['phase']
  return {
    accountId: row.accountId, account: row.account, browser: browserOf(row.browser), phase, location: row.location === 'remote' ? 'remote' : 'local',
    viewerId: row.viewerId as string | null, generation: row.generation as string | null, revision: row.revision as string | null, pageState: row.pageState as string | null, address: text(row.address, 2048),
    width: size('width'), height: size('height'),
    canInteract: row.canInteract === true && phase === 'signInRequired', canResolve: row.canResolve === true && ['signInRequired', 'needsResolution'].includes(phase), canComplete: row.canComplete === true && phase === 'verified', canNavigate: row.canNavigate === true, canGoBack: row.canGoBack === true,
    stream: streamOf(row.stream),
    reason: reason && typeof reason.code === 'string' && /^[a-zA-Z]+$/.test(reason.code) && typeof reason.message === 'string' && reason.message.length <= 800 ? { code: reason.code, message: reason.message } : null,
  }
}

function codeOf(error: unknown): string {
  const code = error instanceof Error ? (error as Error & { code?: string }).code ?? error.message : ''
  return /^[a-zA-Z]+$/.test(code) ? code : 'browserOperationUnconfirmed'
}

export async function requestBrowser(target: ConsoleTarget, accountId: string, operation: BrowserOperation, view?: BrowserCheckView | null, event?: BrowserInput | null, signal?: AbortSignal): Promise<BrowserCheckView> {
  const route = ROUTES[operation]
  const body = { accountId, ...(route.action ? { action: route.action } : {}), ...(view?.generation ? { generation: view.generation } : {}), ...(view?.revision && operation !== 'status' ? { revision: view.revision } : {}), ...(event ? { event } : {}) }
  try {
    const answer = await consoleRequest(target, { local: `/api/console/browserCheck/${route.path}`, hosted: `/console/browser/${route.path}`, method: 'POST' }, { body, signal })
    return parseView((answer as { view?: unknown } | null)?.view)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new BrowserRequestError(codeOf(error))
  }
}

export type StreamPart = { headers: Record<string, string>; data: Uint8Array }

const MAX_PART_BYTES = 10_000_000

function indexOf(buffer: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let index = from; index <= buffer.length - needle.length; index++) {
    for (let offset = 0; offset < needle.length; offset++) if (buffer[index + offset] !== needle[offset]) continue outer
    return index
  }
  return -1
}

export function partReader(boundary: string) {
  const encoder = new TextEncoder()
  const open = encoder.encode(`--${boundary}`)
  const blank = encoder.encode('\r\n\r\n')
  let buffer = new Uint8Array(0)
  const state = { ended: false }
  const push = (chunk: Uint8Array): StreamPart[] => {
    const joined = new Uint8Array(buffer.length + chunk.length)
    joined.set(buffer)
    joined.set(chunk, buffer.length)
    buffer = joined
    const parts: StreamPart[] = []
    while (!state.ended) {
      const start = indexOf(buffer, open, 0)
      if (start < 0 || buffer.length < start + open.length + 2) break
      const after = start + open.length
      if (buffer[after] === 45 && buffer[after + 1] === 45) { state.ended = true; buffer = new Uint8Array(0); break }
      const end = indexOf(buffer, blank, after)
      if (end < 0) { if (buffer.length - start > 4096) throw new BrowserRequestError('browserStreamInvalid'); break }
      const headers = Object.fromEntries(new TextDecoder().decode(buffer.slice(after, end)).split('\r\n').filter((line) => line.includes(':')).map((line) => [line.slice(0, line.indexOf(':')).trim().toLowerCase(), line.slice(line.indexOf(':') + 1).trim()]))
      const length = Number(headers['content-length'])
      if (!Number.isSafeInteger(length) || length < 0 || length > MAX_PART_BYTES) throw new BrowserRequestError('browserStreamInvalid')
      const body = end + blank.length
      if (buffer.length < body + length) break
      parts.push({ headers, data: buffer.slice(body, body + length) })
      buffer = buffer.slice(body + length)
    }
    if (buffer.length > MAX_PART_BYTES + 8192) throw new BrowserRequestError('browserStreamInvalid')
    return parts
  }
  return { push, get ended() { return state.ended } }
}

export async function browserStream(accountId: string, generation: string, signal: AbortSignal, onFrame: (blob: Blob) => Promise<void>): Promise<number> {
  const response = await fetch(`/api/console/browserCheck/stream?accountId=${encodeURIComponent(accountId)}&generation=${encodeURIComponent(generation)}`, { headers: { 'x-log-console': '1' }, credentials: 'same-origin', cache: 'no-store', signal })
  const type = response.headers.get('content-type') ?? ''
  const boundary = /boundary=([A-Za-z0-9]{1,64})/.exec(type)?.[1]
  if (!response.ok || !response.body || !type.startsWith('multipart/x-mixed-replace') || !boundary || response.headers.get('X-Log-Browser-Generation') !== generation) { await response.body?.cancel().catch(() => {}); throw new BrowserRequestError('browserStreamUnavailable') }
  const reader = response.body.getReader()
  const parts = partReader(boundary)
  let latest: Blob | null = null
  let drawing: Promise<void> | null = null
  let failure: unknown = null
  let frames = 0
  const draw = async () => { try { while (latest && !signal.aborted) { const blob: Blob = latest; latest = null; await onFrame(blob); frames++ } } catch (error) { failure = error } finally { drawing = null } }
  try {
    while (!signal.aborted && !failure) {
      const { done, value } = await reader.read()
      if (done) break
      for (const part of parts.push(value)) {
        if (part.headers['content-type'] !== 'image/jpeg' || part.headers['x-log-browser-generation'] !== generation) throw new BrowserRequestError('browserGenerationChanged')
        latest = new Blob([part.data], { type: 'image/jpeg' })
      }
      if (latest && !drawing) drawing = draw()
      if (parts.ended) break
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  await drawing
  if (failure) throw failure
  return frames
}

export async function castBrowser(accountId: string, generation: string, signal: AbortSignal, onFrame: (blob: Blob) => Promise<void>, onLost: () => void, wait = 1000): Promise<void> {
  let misses = 0
  while (!signal.aborted && misses < 3) {
    let frames = 0
    let changed = false
    try { frames = await browserStream(accountId, generation, signal, onFrame) } catch (error) { changed = error instanceof BrowserRequestError && error.message === 'browserGenerationChanged' }
    if (signal.aborted) return
    onLost()
    misses = changed ? 3 : frames > 0 ? 0 : misses + 1
    if (misses < 3) await new Promise<void>((resolve) => { const timer = setTimeout(resolve, wait); signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true }) })
  }
}

export async function browserFrame(target: ConsoleTarget, accountId: string, generation: string, signal: AbortSignal): Promise<Blob> {
  try {
    const answer = await consoleRequest(target, { local: '/api/console/browserCheck/frame', hosted: '/console/browser/frame', method: 'POST' }, { body: { accountId, generation }, signal })
    const frame = (answer as { frame?: { mimeType?: unknown; data?: unknown } } | null)?.frame
    if (frame?.mimeType !== 'image/jpeg' || typeof frame.data !== 'string') throw new BrowserRequestError('browserViewerUnavailable')
    const bytes = Uint8Array.from(atob(frame.data), (character) => character.charCodeAt(0))
    return new Blob([bytes], { type: 'image/jpeg' })
  } catch (error) {
    if (signal.aborted) throw error
    throw new BrowserRequestError(codeOf(error))
  }
}
