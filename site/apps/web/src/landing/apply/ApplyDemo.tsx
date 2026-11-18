import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { APPLY_ASK, APPLY_DEMO_ROWS, APPLY_DONE } from './applyContent'

const TICK_MS = 1100
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

function useApplied(running: boolean, reduced: boolean) {
  const total = APPLY_DEMO_ROWS.length
  const [applied, setApplied] = useState(0)
  useEffect(() => {
    if (reduced) {
      setApplied(total)
      return
    }
    if (!running) return
    const id = window.setInterval(() => setApplied((count) => (count >= total + 2 ? 0 : count + 1)), TICK_MS)
    return () => window.clearInterval(id)
  }, [running, reduced, total])
  return Math.min(applied, total)
}

function StatusPill({ applied }: { applied: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase transition-colors duration-500 ${applied ? 'bg-[#E8F7EE] text-[#1E8E4F]' : 'bg-[#FFF4DB] text-[#A86A00]'}`}
    >
      <i className={`size-1.5 rounded-full ${applied ? 'bg-[#1E8E4F]' : 'bg-[#E0A21A]'}`} />
      {applied ? 'Applied' : 'Prepared'}
    </span>
  )
}

function Chat({ finished }: { finished: boolean }) {
  return (
    <div className="flex min-w-0 flex-col border-b-2 border-[#0D2A4C]/10 lg:border-b-0 lg:border-r-2">
      <div className="flex items-center gap-2.5 border-b-2 border-[#0D2A4C]/10 bg-white px-4 py-3 text-[15px] font-black">
        <span aria-hidden className="block size-5 bg-[#c96442]" style={CLAUDE_MASK} />
        Claude Code
        <span className="ml-auto flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <i key={dot} className="size-2.5 rounded-full bg-[#0D2A4C]/15" />
          ))}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="ml-auto max-w-[92%] rounded-[18px] rounded-br-md bg-[#2A8CFF] px-4 py-2.5 text-[16px] font-bold leading-snug text-white">{APPLY_ASK}</p>
        <p className="max-w-[92%] self-start rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 text-[13px] leading-snug text-[#0D2A4C]/70 shadow-[0_0_0_2px_rgba(13,42,76,0.08)]">
          /apply co-op software · this week
        </p>
        <p className="max-w-[92%] self-start rounded-[18px] rounded-bl-md bg-white px-4 py-2.5 text-[16px] font-bold leading-snug text-[#0D2A4C] shadow-[0_0_0_2px_rgba(13,42,76,0.08)]">
          {finished ? APPLY_DONE : 'Tailoring a resume and cover letter for each one…'}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {['one-page resume.tex', 'cover letter', 'code from inbox'].map((chip) => (
            <span key={chip} className="rounded-lg bg-[#EAF3FF] px-2.5 py-1 text-[11px] text-[#1A5FC8]">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Ledger({ applied }: { applied: number }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b-2 border-[#0D2A4C]/10 bg-white px-4 py-3 text-[15px] font-black">
        <img src="/logo.svg" alt="" className="size-5 rounded-md" />
        Ledger
        <span className="ml-auto text-[12px] font-bold text-[#0D2A4C]/50">
          {applied}/{APPLY_DEMO_ROWS.length} applied
        </span>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_auto] gap-3 px-4 pb-1 pt-3 text-[11px] font-bold uppercase text-[#0D2A4C]/45 sm:grid">
        <span>Company</span>
        <span>Role</span>
        <span>City</span>
        <span className="w-[5.5rem]">Status</span>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {APPLY_DEMO_ROWS.map((row, index) => {
          const done = index < applied
          return (
            <li
              key={row.company + row.role}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-dashed border-[#D6E8FF] px-4 py-2.5 text-[13px] transition-colors duration-500 first:border-t-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_auto] ${done ? 'bg-white' : 'bg-transparent'}`}
            >
              <span className="truncate font-black text-[#0D2A4C]">{row.company}</span>
              <span className="col-start-1 row-start-2 truncate text-[#0D2A4C]/70 sm:col-start-auto sm:row-start-auto">{row.role}</span>
              <span className="hidden truncate text-[#0D2A4C]/55 sm:block">{row.city}</span>
              <span className="col-start-2 row-span-2 row-start-1 flex w-[5.5rem] justify-end sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                <StatusPill applied={done} />
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto flex items-center gap-2 border-t-2 border-[#0D2A4C]/10 bg-white px-4 py-2.5 text-[12px] font-bold text-[#0D2A4C]/70">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#1E8E4F] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#1E8E4F]" />
        </span>
        Live
        <span className="text-[#0D2A4C]/45">· one at a time, in your own browser</span>
      </div>
    </div>
  )
}

export function ApplyDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '100px' })
  const reduced = useReducedMotion()
  const applied = useApplied(inView, reduced)
  return (
    <div
      ref={ref}
      className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[24px] bg-[#F7F9FC] text-left text-[#0D2A4C] shadow-[0_0_0_4px_#0D2A4C,0_11px_0_4px_#0D2A4C] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <Chat finished={applied === APPLY_DEMO_ROWS.length} />
      <Ledger applied={applied} />
    </div>
  )
}
