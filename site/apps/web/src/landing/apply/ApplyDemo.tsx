import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useInView } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { APPLY_ASK, APPLY_DEMO_ROWS, APPLY_DONE } from './applyContent'

const TICK_MS = 1400
const HOLD_TICKS = 3
const LEAD_TICKS = 1
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const CLAUDE_MASK = {
  maskImage: 'url(/logos/tools/claude-desktop.svg)',
  WebkitMaskImage: 'url(/logos/tools/claude-desktop.svg)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function useTick(running: boolean, reduced: boolean) {
  const total = APPLY_DEMO_ROWS.length + LEAD_TICKS + HOLD_TICKS
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (reduced || !running) return
    const id = window.setInterval(() => setTick((value) => (value + 1) % total), TICK_MS)
    return () => window.clearInterval(id)
  }, [running, reduced, total])
  return reduced ? total - 1 : tick
}

function Reveal({ shown, children, className = '' }: { shown: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={`transition-[opacity,transform] duration-700 ${EASE} ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}

function StatusPill({ applied }: { applied: boolean }) {
  return (
    <span className="relative inline-grid h-6 w-[5.75rem] shrink-0 text-[11px] font-black uppercase">
      <span
        className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#FFF4DB] text-[#A86A00] transition-opacity duration-500 ${EASE} ${applied ? 'opacity-0' : 'opacity-100'}`}
      >
        <i className="size-1.5 rounded-full bg-[#E0A21A]" />
        Prepared
      </span>
      <span
        className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#E8F7EE] text-[#1E8E4F] transition-[opacity,transform] duration-500 ${EASE} ${applied ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >
        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
        Applied
      </span>
    </span>
  )
}

function Chat({ tick }: { tick: number }) {
  const finished = tick >= APPLY_DEMO_ROWS.length + LEAD_TICKS
  return (
    <div className="flex min-w-0 flex-col border-b border-[#0D2A4C]/10 lg:border-b-0 lg:border-r">
      <div className="flex h-12 items-center gap-2.5 border-b border-[#0D2A4C]/10 bg-white px-4 text-[14px] font-black">
        <span aria-hidden className="block size-[18px] bg-[#c96442]" style={CLAUDE_MASK} />
        Claude Code
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <p className="ml-auto max-w-[92%] rounded-[18px] rounded-br-md bg-[#2A8CFF] px-4 py-2.5 text-[15px] font-bold leading-snug text-white">{APPLY_ASK}</p>
        <Reveal shown className="self-start">
          <p className="rounded-[18px] rounded-bl-md bg-white px-4 py-2 text-[13px] leading-snug text-[#0D2A4C]/65 shadow-[0_0_0_1px_rgba(13,42,76,0.08)]">
            Running <span className="font-bold text-[#0D2A4C]">/apply software jobs</span>, one at a time
          </p>
        </Reveal>
        <Reveal shown={tick >= 1} className="self-start">
          <div className="grid max-w-[18rem] rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 text-[15px] font-bold leading-snug text-[#0D2A4C] shadow-[0_0_0_1px_rgba(13,42,76,0.08)]">
            <span className={`col-start-1 row-start-1 transition-opacity duration-500 ${EASE} ${finished ? 'opacity-0' : 'opacity-100'}`}>Tailoring a resume and cover letter for each one…</span>
            <span className={`col-start-1 row-start-1 transition-opacity duration-500 ${EASE} ${finished ? 'opacity-100' : 'opacity-0'}`}>{APPLY_DONE}</span>
          </div>
        </Reveal>
        <div aria-hidden className="mt-auto flex h-10 items-center rounded-xl bg-white px-3.5 text-[13px] text-[#0D2A4C]/35 shadow-[0_0_0_1px_rgba(13,42,76,0.08)]">
          Ask Claude to apply…
        </div>
      </div>
    </div>
  )
}

function Ledger({ applied, reduced }: { applied: number; reduced: boolean }) {
  const total = APPLY_DEMO_ROWS.length
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex h-12 items-center gap-2.5 border-b border-[#0D2A4C]/10 bg-white px-4 text-[14px] font-black">
        <img src="/logo.svg" alt="" className="size-[18px] rounded-md" />
        Ledger
        <span className="ml-auto flex items-center gap-2.5 text-[12px] font-bold text-[#0D2A4C]/50">
          <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#0D2A4C]/10 sm:block">
            <span className={`block h-full rounded-full bg-[#1E8E4F] transition-[width] duration-700 ${EASE}`} style={{ width: `${(applied / total) * 100}%` }} />
          </span>
          <span className="w-[4.5rem] text-right tabular-nums">
            {applied}/{total} applied
          </span>
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {APPLY_DEMO_ROWS.map((row, index) => {
          const done = index < applied
          return (
            <li
              key={row.company + row.role}
              className={`grid h-[3.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[#0D2A4C]/[0.06] px-4 text-[13px] transition-colors duration-700 first:border-t-0 sm:h-11 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] ${EASE} ${done ? 'bg-white' : 'bg-transparent'}`}
            >
              <span className="flex min-w-0 flex-col sm:contents">
                <span className="truncate font-black text-[#0D2A4C]">{row.company}</span>
                <span className="truncate text-[12px] text-[#0D2A4C]/60 sm:text-[13px] sm:text-[#0D2A4C]/70">{row.role}</span>
              </span>
              <span className="hidden truncate text-[#0D2A4C]/50 sm:block">{row.city}</span>
              <StatusPill applied={done} />
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex h-10 items-center gap-2 border-t border-[#0D2A4C]/10 bg-white px-4 text-[12px] font-bold text-[#0D2A4C]/70">
        <span className="relative flex size-2">
          {reduced ? null : <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#1E8E4F] opacity-50" />}
          <span className="relative inline-flex size-2 rounded-full bg-[#1E8E4F]" />
        </span>
        Live
        <span className="truncate font-medium text-[#0D2A4C]/45">· in your own browser, submitted only when you allow it</span>
      </div>
    </div>
  )
}

export function ApplyDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' })
  const reduced = useReducedMotion()
  const tick = useTick(inView, reduced)
  const applied = Math.max(0, Math.min(APPLY_DEMO_ROWS.length, tick - LEAD_TICKS + 1))
  return (
    <div
      ref={ref}
      className="mx-auto grid w-full overflow-hidden rounded-[22px] bg-[#F7F9FC] text-left text-[#0D2A4C] shadow-[0_0_0_1px_rgba(13,42,76,0.08),0_24px_60px_-24px_rgba(13,42,76,0.5)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <Chat tick={tick} />
      <Ledger applied={applied} reduced={reduced} />
    </div>
  )
}
