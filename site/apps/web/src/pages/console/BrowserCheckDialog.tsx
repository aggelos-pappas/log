import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { toast } from '@listeningkit/ui'
import { CONSOLE_MESSAGES, type ConsoleTarget } from './consoleClient'
import { browserCheckMachine } from './browserCheckMachine'
import { castBrowser } from './browserCheckData'
import type { BrowserInput } from './browserCheckTypes'
import type { LocalConnection } from './connectionsData'
import { ERROR_TITLES, frameModel, ICONS, mountBrowserFrame, PHASE_NOTES, phaseLabel } from '../../../../../../src/mcp/apps/browserView/widget/view'
import type { BrowserFrame, FrameAction } from '../../../../../../src/mcp/apps/browserView/widget/view'

export function BrowserCheckDialog({ account, target, autoSignIn = false, onClose, onResolved, onConfigureProvider }: { account: LocalConnection; target: ConsoleTarget; autoSignIn?: boolean; onClose: () => void; onResolved: () => void; onConfigureProvider: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const frame = useRef<BrowserFrame | null>(null)
  const titleId = useId()
  const queued = useRef<BrowserInput[]>([])
  const lastAddress = useRef<{ generation: string | null; address: string | null }>({ generation: null, address: null })
  const [inputVersion, setInputVersion] = useState(0)
  const [hasControl, setHasControl] = useState(false)
  const casting = useRef(false)
  const drawFrame = useCallback(async (blob: Blob) => {
    const bitmap = await createImageBitmap(blob)
    try { const element = frame.current?.canvas; if (!element) return; const context = element.getContext('2d'); if (!context) throw new Error('browserCanvasUnavailable'); if (element.width !== bitmap.width || element.height !== bitmap.height) { element.width = bitmap.width; element.height = bitmap.height } context.drawImage(bitmap, 0, 0) } finally { bitmap.close() }
  }, [])
  const [snapshot, send] = useMachine(browserCheckMachine, { input: { target, accountId: account.id, drawFrame, autoSignIn, casting: () => casting.current } })
  const { view, hasFrame, pending, error } = snapshot.context
  const disconnected = snapshot.matches('disconnected')
  const failed = snapshot.matches('failure') || snapshot.matches('closeFailed') || disconnected
  const phase = view?.phase
  const stream = view?.stream ?? null
  const local = view?.location !== 'remote'
  const reconnecting = snapshot.matches('reconnecting') || snapshot.matches('unavailable')
  const starting = snapshot.matches('connecting') || snapshot.matches('opening') || snapshot.matches('linking')
  const active = snapshot.matches({ session: 'viewing' })
  const connected = hasFrame && snapshot.matches('session') && !failed && !starting && !reconnecting
  const navigationAllowed = active && connected && view?.canNavigate === true && !pending
  const inputAllowed = active && hasFrame && view?.canInteract === true
  const keyboardAllowed = !snapshot.context.closeRequested && hasFrame && view?.canInteract === true && !failed
  const checking = snapshot.matches({ session: 'checking' })
  const resolving = snapshot.matches({ session: 'resolving' })
  const completing = snapshot.matches({ session: 'completing' })
  const navigating = snapshot.matches({ session: 'navigating' })
  const closing = snapshot.matches('closing') || (snapshot.context.closeRequested && pending)
  const label = closing ? 'Closing browser…' : snapshot.matches('closeFailed') ? 'Browser closure could not be confirmed' : disconnected ? 'Browser viewer could not connect' : reconnecting ? 'Connecting to browser…' : failed ? ERROR_TITLES[error ?? ''] ?? 'Browser operation failed' : snapshot.matches('opening') ? 'Opening account browser…' : snapshot.matches('linking') ? 'Preparing browser profile…' : navigating ? 'Loading page…' : checking ? 'Verifying session…' : resolving ? 'Signing in with the saved login…' : completing ? 'Saving confirmed session…' : starting || (!hasFrame && view?.generation) ? 'Connecting to browser…' : phase ? phaseLabel(phase, view?.canInteract === true) : 'Connecting to browser…'
  const busy = reconnecting || starting || (pending && !snapshot.matches({ session: 'interacting' })) || (!failed && !!view?.generation && !hasFrame)
  const note = failed ? (error ? CONSOLE_MESSAGES[error] ?? view?.reason?.message ?? 'The check has not been confirmed.' : 'The check has not been confirmed.') : view?.reason?.message ?? (phase ? PHASE_NOTES[phase] : null)
  if (view?.generation !== lastAddress.current.generation) lastAddress.current = { generation: view?.generation ?? null, address: null }
  if (view?.address) lastAddress.current.address = view.address
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'; dialog.current?.showModal()
    return () => { document.body.style.overflow = previous; trigger?.focus() }
  }, [])
  useEffect(() => { if (snapshot.status === 'done') { if (snapshot.matches('closed')) onClose(); else { toast.success('Session saved', `${account.name} is signed in. Its session stays in your workspace.`); onResolved() } } }, [snapshot.status, snapshot.value, onClose, onResolved, account.name])
  useEffect(() => { if (error && failed) toast.error(ERROR_TITLES[error] ?? 'The browser operation failed', CONSOLE_MESSAGES[error] ?? undefined) }, [error, failed])
  const enqueue = (input: BrowserInput) => {
    if (!keyboardAllowed || queued.current.length >= 100) return
    const last = queued.current.at(-1)
    if (input.type === 'text' && last?.type === 'text' && last.text.length + input.text.length <= 2048) last.text += input.text
    else queued.current.push(input)
    setInputVersion((version) => version + 1)
  }
  useEffect(() => {
    if (failed || !view?.canInteract) { queued.current = []; return }
    if (!inputAllowed || !queued.current.length) return
    const timer = setTimeout(() => { const input = queued.current.shift(); if (input) send({ type: 'INPUT', input }) }, queued.current[0].type === 'text' ? 120 : 0)
    return () => clearTimeout(timer)
  }, [inputAllowed, inputVersion, failed, view?.canInteract, send])
  useEffect(() => () => { queued.current = [] }, [])
  useEffect(() => { setHasControl(false) }, [view?.generation])
  const generation = view?.generation ?? null
  const castable = target.kind === 'local' && local && !stream && Boolean(generation)
  useEffect(() => {
    if (!castable || !generation) return
    const controller = new AbortController()
    void castBrowser(account.id, generation, controller.signal, async (blob) => { await drawFrame(blob); if (!casting.current && !controller.signal.aborted) { casting.current = true; send({ type: 'FRAME_READY' }) } }, () => { casting.current = false })
    return () => { controller.abort(); casting.current = false }
  }, [castable, generation, account.id, drawFrame, send])
  const size = () => stream ? { width: stream.page.width, height: stream.page.height } : view?.width && view?.height ? { width: view.width, height: view.height } : { width: frame.current?.canvas.width ?? 1, height: frame.current?.canvas.height ?? 1 }
  const actions: Record<string, () => void> = {
    close: () => send({ type: 'CLOSE' }),
    back: () => { if (navigationAllowed && view?.canGoBack) { setHasControl(true); send({ type: 'NAVIGATE', action: 'back' }) } },
    reload: () => { if (navigationAllowed) { setHasControl(true); send({ type: 'NAVIGATE', action: 'reload' }) } },
    open: () => send({ type: 'OPEN' }),
    link: () => send({ type: 'LINK_PROFILE' }),
    configure: onConfigureProvider,
    retry: () => send({ type: 'RECONNECT' }),
    resolve: () => send({ type: 'RESOLVE' }),
    verify: () => send({ type: 'VERIFY' }),
    complete: () => send({ type: 'COMPLETE' }),
  }
  const handlers = useRef({ actions, enqueue, inputAllowed, keyboardAllowed, size })
  handlers.current = { actions, enqueue, inputAllowed, keyboardAllowed, size }
  useLayoutEffect(() => {
    if (!host.current) return
    const mounted = mountBrowserFrame(host.current, {
      onAction: (id) => handlers.current.actions[id]?.(),
      onPoint: (fx, fy) => { if (!handlers.current.inputAllowed) return; const { width, height } = handlers.current.size(); setHasControl(true); handlers.current.enqueue({ type: 'click', x: fx * width, y: fy * height }) },
      onText: (text) => { if (handlers.current.keyboardAllowed) { setHasControl(true); handlers.current.enqueue({ type: 'text', text }) } },
      onKey: (key) => { if (handlers.current.keyboardAllowed) { setHasControl(true); handlers.current.enqueue({ type: 'key', key }) } },
      onScroll: (deltaY) => { if (handlers.current.inputAllowed) handlers.current.enqueue({ type: 'scroll', deltaY }) },
      onTake: () => setHasControl(true),
    })
    mounted.canvas.setAttribute('aria-label', `${account.name} browser. Click and type directly into the browser.`)
    frame.current = mounted
    return () => { mounted.destroy(); frame.current = null }
  }, [account.name])
  const showRecovery = !busy && (failed || snapshot.matches('uncertain') || snapshot.matches('setupBlocked') || snapshot.matches('setupRequired'))
  const coverActions: FrameAction[] = showRecovery ? [
    ...(snapshot.matches('uncertain') && phase === 'browserMissing' ? [{ id: 'open', label: 'Open browser', icon: 'open' as const }] : []),
    ...(snapshot.matches('setupBlocked') ? [{ id: 'link', label: 'Link browser profile' }] : []),
    ...(snapshot.matches('setupRequired') ? [{ id: 'configure', label: 'Configure AdsPower' }] : []),
    { id: 'retry', label: 'Try again' },
  ] : []
  const footer: FrameAction[] = [
    ...(view?.canResolve ? [{ id: 'resolve', label: 'Sign in with saved login', icon: 'user' as const, busy: resolving, disabled: !active || !hasFrame || pending }] : []),
    { id: 'verify', label: 'Verify session', icon: 'check', busy: checking, disabled: !active || !hasFrame || pending || !['ready', 'verified'].includes(phase ?? '') },
    { id: 'complete', label: 'Save session', icon: 'save', primary: true, busy: completing, disabled: !active || !hasFrame || pending || view?.canComplete !== true },
  ]
  const model = frameModel({
    platform: view?.platform ?? null,
    account: account.name,
    pageState: view?.pageState ?? null,
    browser: view?.browser ?? null,
    phase: phase ?? null,
    live: hasFrame,
    connecting: busy,
    failed,
    label,
    note,
    address: view?.address ?? lastAddress.current.address,
    generation,
    canNavigate: navigationAllowed,
    canGoBack: view?.canGoBack === true,
    navigating,
    canInteract: inputAllowed,
    hasControl,
    actions: footer,
    coverActions,
    streamUrl: stream?.url ?? null,
  })
  useLayoutEffect(() => {
    const mounted = frame.current
    if (!mounted) return
    mounted.paint(model)
    mounted.tools.innerHTML = `<button class="lbvIcon" type="button" data-action="close" aria-label="Close browser check" title="Close"${closing ? ' disabled data-spin="true"' : ''}>${closing ? ICONS.spinner : ICONS.close}</button>`
  })

  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); send({ type: 'CLOSE' }) }} className="m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto rounded-2xl border-0 bg-transparent p-0 shadow-xl backdrop:bg-[#0D2A4C]/45 backdrop:backdrop-blur-[2px]">
    <h2 id={titleId} className="sr-only">{view?.platform ?? 'Account'} browser for {account.name}</h2>
    <div ref={host} data-browser-check="" />
  </dialog>
}
