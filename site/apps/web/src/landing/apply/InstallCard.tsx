import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy, faRobot, faTerminal } from '@fortawesome/free-solid-svg-icons'
import { APPLY_AGENT_LINE, APPLY_INSTALL, APPLY_TERMINAL } from './applyContent'

type InstallTab = { id: string; label: string; prompt: string; hint: string; lines: string[] }

const TABS: InstallTab[] = [
  { id: 'claudeCode', label: 'Claude Code', prompt: '>', hint: 'Paste into Claude Code. The setup asks for your profile once.', lines: APPLY_INSTALL },
  { id: 'anyAgent', label: 'Any agent', prompt: '', hint: 'Paste into any agent chat. It reads the steps and sets you up.', lines: [APPLY_AGENT_LINE] },
  { id: 'terminal', label: 'Terminal', prompt: '$', hint: 'Run in your terminal, then follow the setup.', lines: APPLY_TERMINAL },
]

const CLAUDE_MASK = {
  maskImage: 'url(/logos/tools/claude-desktop.svg)',
  WebkitMaskImage: 'url(/logos/tools/claude-desktop.svg)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
}

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

function TabIcon({ id, active }: { id: string; active: boolean }) {
  if (id === 'claudeCode') return <span aria-hidden className={`hidden size-4 sm:block ${active ? 'bg-[#c96442]' : 'bg-[#0D2A4C]/45'}`} style={CLAUDE_MASK} />
  return <FontAwesomeIcon icon={id === 'anyAgent' ? faRobot : faTerminal} className="hidden text-[13px] sm:inline" />
}

export function InstallCard({ id }: { id: string }) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState<number | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const timer = useRef<number | undefined>(undefined)
  const uid = useId()
  const tab = TABS[active]

  const copy = () => {
    const index = active
    navigator.clipboard
      ?.writeText(tab.lines.join('\n'))
      .then(() => {
        setCopied(index)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(null), 1800)
      })
      .catch(() => {})
  }

  const select = (index: number) => {
    setActive(index)
    tabRefs.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = TABS.length - 1
    const moves: Record<string, number> = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last }
    if (!(event.key in moves)) return
    event.preventDefault()
    select(moves[event.key])
  }

  const isCopied = copied === active

  return (
    <div id={id} className="w-full scroll-mt-28 rounded-[22px] bg-white p-2 text-left text-[#0D2A4C] shadow-[0_0_0_1px_rgba(13,42,76,0.08),0_10px_30px_-12px_rgba(13,42,76,0.45)]">
      <div role="tablist" aria-label="How to install log apply" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-[16px] bg-[#F1F5FA] p-1">
        {TABS.map((item, index) => {
          const selected = index === active
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={`${uid}${item.id}Tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${uid}Panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-[13px] font-bold transition-[background-color,color,box-shadow] duration-300 sm:text-[15px] ${EASE} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A8CFF] ${selected ? 'bg-white text-[#0D2A4C] shadow-[0_1px_2px_rgba(13,42,76,0.12),0_0_0_1px_rgba(13,42,76,0.06)]' : 'text-[#0D2A4C]/55 hover:text-[#0D2A4C]'}`}
            >
              <TabIcon id={item.id} active={selected} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
      <div id={`${uid}Panel`} role="tabpanel" aria-labelledby={`${uid}${tab.id}Tab`} className="px-2 pb-2 pt-3 sm:px-3">
        <div className="grid min-h-[8.5rem] content-center sm:min-h-[6.75rem] rounded-2xl bg-[#0D2A4C] px-4 py-3.5 text-[13px] leading-relaxed text-white sm:text-[14.5px]">
          {tab.lines.map((line) => (
            <p key={line} className="flex gap-2.5 [overflow-wrap:anywhere]">
              {tab.prompt ? (
                <span aria-hidden className="shrink-0 select-none text-[#5CA7FF]">
                  {tab.prompt}
                </span>
              ) : null}
              <span className="min-w-0">{line}</span>
            </p>
          ))}
        </div>
        <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[13px] leading-snug text-[#0D2A4C]/60 sm:text-[14px]">{tab.hint}</p>
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-[16px] font-black text-white transition-[background-color,transform] duration-300 ${EASE} hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A8CFF] ${isCopied ? 'bg-[#1E8E4F] shadow-[0_3px_0_#14663A]' : 'bg-[#2A8CFF] shadow-[0_3px_0_#1A5FC8]'}`}
          >
            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} className="text-[14px]" />
            {isCopied ? 'Copied' : tab.lines.length > 1 ? `Copy all ${tab.lines.length} lines` : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
