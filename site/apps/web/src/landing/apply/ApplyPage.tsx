import { useEffect, useState, type ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faArrowRight, faCheck, faCopy, faEnvelope, faFileLines, faStar, faTableList, faXmark } from '@fortawesome/free-solid-svg-icons'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { ClayClouds } from '../ClayClouds'
import { DitherFade } from '../useCases/DitherFade'
import { StoryFaq } from '../story/StorySections'
import { ApplyDemo } from './ApplyDemo'
import {
  APPLY_AGENT_LINE,
  APPLY_COMPARE,
  APPLY_FAQ,
  APPLY_GITHUB_URL,
  APPLY_INSTALL,
  APPLY_LEDGER_DAYS,
  APPLY_LEDGER_FROM,
  APPLY_LEDGER_TO,
  APPLY_LEDGER_URL,
  APPLY_STATS,
  APPLY_STEPS,
  APPLY_TITLE,
  APPLY_USAGE,
} from './applyContent'

const STICKER = 'sticker-word inline-block px-[0.08em] text-[1.18em] leading-none'
const HAND = { fontFamily: "'Schoolbell', 'Cabin Sketch', cursive" }
const INK = '#0D2A4C'
const LIP = 'shadow-[0_3px_0_#1A5FC8]'

const OUTLINE = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2
  return `${(Math.cos(angle) * 5).toFixed(2)}px ${(Math.sin(angle) * 5).toFixed(2)}px 0 ${INK}`
})
  .concat(`0 8px 0 ${INK}`)
  .join(',')

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      })
      .catch(() => {})
  }
  return { copied, copy }
}

function AgentBox() {
  const { copied, copy } = useCopy(APPLY_AGENT_LINE)
  return (
    <div className="w-full max-w-xl rounded-2xl bg-black p-4 text-left text-white shadow-[0_4px_0_#061a33]">
      <p className="text-[11px] font-bold uppercase text-white/50">Give this to your agent</p>
      <div className="mt-2 flex items-center gap-3">
        <code className="min-w-0 flex-1 text-[13px] text-white [overflow-wrap:anywhere] sm:text-[14px]">{APPLY_AGENT_LINE}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy the line for your agent'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-white/20"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[12px]" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section aria-label="Hero" className="relative isolate w-full overflow-hidden bg-[#2A8CFF] text-[#0D2A4C]">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(ellipse_130%_100%_at_50%_0%,rgba(92,167,255,0.8)_0%,transparent_80%)]" />
        <ClayClouds className="absolute inset-x-0 top-10 h-[30rem] [mask-image:linear-gradient(to_bottom,black_80%,transparent)] md:h-[40rem]" />
        <DitherFade stops={['#2A8CFF', '#9CCBFF', '#FFFFFF']} cell={5} className="absolute inset-x-0 bottom-0 h-[16rem] w-full md:h-[22rem]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-28 text-center md:px-6 md:pb-28 md:pt-36">
        <a
          href={APPLY_LEDGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#0D2A4C] shadow-[0_3px_0_#1A5FC8] transition-transform hover:-translate-y-px sm:text-[15px]"
        >
          {APPLY_STATS.map((stat, index) => (
            <span key={stat} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden className="text-[#2A8CFF]">·</span> : null}
              <span className={index === 0 ? 'text-[#2A8CFF]' : undefined}>{stat}</span>
            </span>
          ))}
        </a>
        <h1
          className="mt-7 flex flex-col items-center gap-1 text-[clamp(2.1rem,0.5rem+6.6vw,6.5rem)] leading-[0.95] text-white [-webkit-text-stroke:2px_#fff]"
          style={{ ...HAND, textShadow: OUTLINE }}
        >
          <span className="-rotate-2">Apply to 200 jobs</span>
          <span className="rotate-1">while you’re at work.</span>
        </h1>
        <p className="text-lede mt-8 max-w-2xl text-white [text-shadow:0_1px_3px_rgba(13,42,76,0.45)]">
          <strong className="font-black text-white">log apply</strong> is an open-source Claude Code plugin. Your agent finds the postings, writes a{' '}
          <span className="font-black text-white underline decoration-dashed underline-offset-4">one-page resume and cover letter for each job</span>, fills the form in your own browser,
          and submits only when you say so.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href={APPLY_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-[17px] font-black text-[#0D2A4C] shadow-[0_4px_0_#1A5FC8] transition-transform hover:-translate-y-px"
          >
            <FontAwesomeIcon icon={faGithub} className="text-[20px]" />
            Get log apply
          </a>
          <a
            href={APPLY_LEDGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 px-5 py-2.5 text-[17px] font-bold text-white transition-colors hover:bg-white/10"
          >
            See the live ledger
            <FontAwesomeIcon icon={faArrowRight} className="text-[14px]" />
          </a>
        </div>
        <div className="mt-6 flex w-full justify-center">
          <AgentBox />
        </div>
        <div className="mt-14 w-full md:mt-16">
          <ApplyDemo />
        </div>
      </div>
    </section>
  )
}

function ResumeArt() {
  return (
    <div aria-hidden className="relative h-full w-full">
      <div className="absolute left-[12%] top-[8%] h-[84%] w-[50%] -rotate-3 rounded-lg bg-white p-3 shadow-[0_4px_0_#1A5FC8]">
        <div className="mx-auto h-2 w-1/2 rounded-full bg-[#0D2A4C]" />
        <div className="mx-auto mt-1.5 h-1 w-2/3 rounded-full bg-[#0D2A4C]/30" />
        {[0, 1, 2].map((block) => (
          <div key={block} className="mt-3">
            <div className="h-1.5 w-1/3 rounded-full bg-[#2A8CFF]" />
            <div className="mt-1.5 h-[1px] w-full bg-[#0D2A4C]/20" />
            <div className="mt-1.5 h-1 w-full rounded-full bg-[#0D2A4C]/15" />
            <div className="mt-1 h-1 w-5/6 rounded-full bg-[#0D2A4C]/15" />
          </div>
        ))}
        <span className="absolute -bottom-2 left-2 rounded-md bg-[#0D2A4C] px-1.5 py-0.5 text-[10px] text-white">resume.tex</span>
      </div>
      <div className="absolute right-[10%] top-[18%] h-[70%] w-[40%] rotate-3 rounded-lg bg-white p-3 shadow-[0_4px_0_#1A5FC8]">
        {[0, 1, 2, 3, 4, 5].map((line) => (
          <div key={line} className={`mt-1.5 h-1 rounded-full bg-[#0D2A4C]/15 ${line % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
        <span className="absolute -bottom-2 right-2 rounded-md bg-[#2A8CFF] px-1.5 py-0.5 text-[10px] text-white">cover letter</span>
      </div>
    </div>
  )
}

function FillArt() {
  return (
    <div aria-hidden className="flex h-full w-full flex-col justify-center gap-2.5 px-2">
      <div className="rounded-xl bg-white p-3 text-left shadow-[0_4px_0_#1A5FC8]">
        <div className="flex gap-1.5">
          <span className="rounded-md bg-[#EAF3FF] px-2 py-0.5 text-[10px] font-bold text-[#1A5FC8]">Workday</span>
          <span className="rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[10px] font-bold text-[#1E8E4F]">Greenhouse</span>
        </div>
        {['First name', 'Email', 'Resume'].map((field) => (
          <div key={field} className="mt-2 flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-bold text-[#0D2A4C]/55">{field}</span>
            <span className="flex h-5 flex-1 items-center justify-end rounded-md border border-[#D6E8FF] px-1.5 text-[10px] text-[#1E8E4F]">
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 self-end rounded-xl bg-[#0D2A4C] px-3 py-2 text-left text-white shadow-[0_4px_0_#061a33]">
        <FontAwesomeIcon icon={faEnvelope} className="text-[14px] text-[#5CA7FF]" />
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] text-white/60">from your inbox</span>
          <span className="text-[12px] font-bold">Security code, read and typed</span>
        </span>
      </div>
    </div>
  )
}

function TrackArt() {
  return (
    <div aria-hidden className="flex h-full w-full flex-col justify-center px-2">
      <div className="overflow-hidden rounded-xl bg-white text-left shadow-[0_4px_0_#1A5FC8]">
        {['Global Relay', 'Workday', 'TMX Group', 'Amgen'].map((company) => (
          <div key={company} className="flex items-center gap-2 border-t border-dashed border-[#D6E8FF] px-3 py-2 first:border-t-0">
            <span className="min-w-0 flex-1 truncate text-[12px] font-black text-[#0D2A4C]">{company}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF3FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1A5FC8]">
              <FontAwesomeIcon icon={faFileLines} />
              resume
            </span>
            <span className="rounded-full bg-[#E8F7EE] px-2 py-0.5 text-[9px] font-black uppercase text-[#1E8E4F]">Applied</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STEP_ART = [ResumeArt, FillArt, TrackArt]

function Steps() {
  return (
    <section id="how" aria-label="How log apply works" className="w-full scroll-mt-24 bg-white px-4 pb-20 pt-6 md:px-6 md:pb-28">
      <div className="mx-auto mb-12 flex max-w-4xl flex-col items-center gap-4 text-center">
        <h2 className="text-title text-[#0D2A4C]">
          Three steps, every job,
          <br className="hidden sm:block" /> <span className={STICKER}>no copy and paste.</span>
        </h2>
        <p className="text-lede max-w-2xl text-[#0D2A4C]/70">Say what you’re after. Your agent does the rest, one application at a time.</p>
      </div>
      <ol className="mx-auto grid max-w-6xl list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
        {APPLY_STEPS.map((step, index) => {
          const Art = STEP_ART[index]
          return (
            <li
              key={step.number}
              className="flex flex-col gap-6 rounded-3xl px-6 pb-7 pt-7 text-white shadow-[0_6px_0_#1A5FC8]"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, #4FA6FF 0%, #2A8CFF 55%, #1F78F0 100%)' }}
            >
              <div className="h-[13rem]">
                <Art />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-5xl font-black leading-none">{step.number}</p>
                <p className="mt-1 text-xl font-bold">{step.title}</p>
                <p className="text-[15px] leading-relaxed text-white/85">{step.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Compare() {
  const [side, setSide] = useState<'with' | 'without'>('with')
  const panel = APPLY_COMPARE[side]
  const isWith = side === 'with'
  return (
    <section id="compare" aria-label="With log apply and without" className="w-full scroll-mt-24 bg-[#F7FAFD] px-4 py-20 md:px-6 md:py-24">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
        <h2 className="text-title text-[#0D2A4C]">
          The same night,
          <br className="hidden sm:block" /> <span className={STICKER}>two ways.</span>
        </h2>
        <div role="tablist" aria-label="Compare" className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_0_0_1px_#E1E8F0,0_3px_0_#E1E8F0]">
          {(['without', 'with'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={side === key}
              onClick={() => setSide(key)}
              className={`rounded-xl px-4 py-2 text-[15px] font-black transition-colors sm:px-5 ${side === key ? (key === 'with' ? `bg-[#2A8CFF] text-white ${LIP}` : 'bg-[#0D2A4C] text-white') : 'text-[#0D2A4C]/60 hover:text-[#0D2A4C]'}`}
            >
              {APPLY_COMPARE[key].label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          className={`w-full rounded-[2rem] p-6 text-left transition-colors md:p-10 ${isWith ? 'bg-[#2A8CFF] text-white shadow-[0_6px_0_#1A5FC8]' : 'bg-white text-[#0D2A4C] shadow-[0_0_0_1px_#E1E8F0,0_6px_0_#E1E8F0]'}`}
        >
          <p className={`text-[13px] font-bold uppercase ${isWith ? 'text-white/70' : 'text-[#0D2A4C]/50'}`}>{panel.label}</p>
          <p className="mt-2 text-[clamp(2.5rem,1.6rem+3.6vw,4.5rem)] leading-none" style={HAND}>
            {panel.headline}
          </p>
          <ul className="mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
            {panel.points.map((point) => (
              <li key={point} className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-[16px] font-bold leading-snug ${isWith ? 'bg-white/15' : 'bg-[#F3F6FA]'}`}>
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] ${isWith ? 'bg-white text-[#2A8CFF]' : 'bg-[#0D2A4C]/10 text-[#0D2A4C]/60'}`}>
                  <FontAwesomeIcon icon={isWith ? faCheck : faXmark} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ledgerWeeks() {
  const start = Date.parse(`${APPLY_LEDGER_FROM}T00:00:00Z`)
  const end = Date.parse(`${APPLY_LEDGER_TO}T00:00:00Z`)
  const weeks: { date: string; count: number }[][] = []
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10)
    const index = Math.floor((time - start) / DAY_MS)
    if (index % 7 === 0) weeks.push([])
    weeks[weeks.length - 1].push({ date, count: APPLY_LEDGER_DAYS[date] ?? 0 })
  }
  return weeks
}

function shade(count: number) {
  if (count === 0) return 'bg-white/[0.06]'
  if (count < 3) return 'bg-[#2A8CFF]/35'
  if (count < 8) return 'bg-[#2A8CFF]/60'
  if (count < 20) return 'bg-[#2A8CFF]/85'
  return 'bg-[#7BE3A4]'
}

function labelOf(date: string) {
  const [, month, day] = date.split('-')
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`
}

function Heatmap() {
  const weeks = ledgerWeeks()
  return (
    <div className="w-full overflow-hidden rounded-[1.75rem] bg-[#0B1626] p-5 text-left text-white shadow-[0_6px_0_#061a33] md:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FontAwesomeIcon icon={faTableList} className="text-[#5CA7FF]" />
        <p className="text-[16px] font-black">Applications per day</p>
        <p className="text-[13px] text-white/50">from the public ledger</p>
      </div>
      <div className="mx-auto mt-5 flex w-full max-w-[34rem] gap-[5px] sm:gap-1.5">
        {weeks.map((week) => (
          <div key={week[0].date} className="flex min-w-0 flex-1 flex-col gap-[5px] sm:gap-1.5">
            {week.map((day) => (
              <span
                key={day.date}
                title={`${labelOf(day.date)}: ${day.count} sent`}
                className={`block aspect-square w-full rounded-[4px] sm:rounded-md ${shade(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-[34rem] justify-between text-[11px] font-bold text-white/45">
        <span>{labelOf(APPLY_LEDGER_FROM)}</span>
        <span className="flex items-center gap-1.5">
          less
          {[0, 1, 5, 10, 40].map((count) => (
            <i key={count} className={`size-2.5 rounded-[3px] ${shade(count)}`} />
          ))}
          more
        </span>
        <span>{labelOf(APPLY_LEDGER_TO)}</span>
      </div>
    </div>
  )
}

function Receipts() {
  return (
    <section id="receipts" aria-label="Receipts" className="w-full scroll-mt-24 bg-white px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-title text-[#0D2A4C]">
            Receipts, not
            <span className={`${STICKER} ml-3`}>promises.</span>
          </h2>
          <p className="text-lede max-w-2xl text-[#0D2A4C]/70">
            Built during a real co-op search and run on it every day. Every application is on a public ledger, with the exact resume and cover letter that went out.
          </p>
        </div>
        <ul className="grid w-full list-none grid-cols-3 gap-3 p-0 md:gap-5">
          {[
            { value: '196+', label: 'applications' },
            { value: '152', label: 'companies' },
            { value: '58', label: 'in a single day' },
          ].map((stat) => (
            <li key={stat.label} className="flex flex-col items-center rounded-3xl bg-[#EAF3FF] px-2 py-5 text-center shadow-[0_4px_0_#B5D6FF] md:py-7">
              <span className="text-[clamp(2rem,1.2rem+3.4vw,3.75rem)] font-black leading-none text-[#2A8CFF]">{stat.value}</span>
              <span className="mt-2 text-[13px] font-bold text-[#0D2A4C]/70 md:text-[16px]">{stat.label}</span>
            </li>
          ))}
        </ul>
        <Heatmap />
        <a
          href={APPLY_LEDGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`button-glow inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[16px] font-bold text-white ${LIP}`}
        >
          Open the live ledger
          <FontAwesomeIcon icon={faArrowRight} className="text-[13px]" />
        </a>
      </div>
    </section>
  )
}

function Terminal({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="w-full rounded-2xl bg-[#0D2A4C] p-5 text-left text-[13px] shadow-[0_4px_0_#061a33] sm:text-[14px]">
      <p className="mb-3 text-[11px] font-bold uppercase text-white/50">{label}</p>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-white [overflow-wrap:anywhere]">
          <span className="text-[#5CA7FF]">&gt; </span>
          {line}
        </p>
      ))}
    </div>
  )
}

function FinalCta() {
  const { copied, copy } = useCopy(APPLY_INSTALL.join('\n'))
  return (
    <section id="install" aria-label="Get log apply" className="w-full scroll-mt-24 bg-white px-4 pb-20 pt-10 md:px-6 md:pb-28">
      <div
        className="mx-auto flex max-w-6xl flex-col items-center gap-7 rounded-[2rem] px-5 py-12 text-center text-white md:px-12 md:py-16"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #5CB2FF 0%, #1F6FE6 100%)' }}
      >
        <h2 className="text-[clamp(2.6rem,1.4rem+5vw,5.5rem)] leading-[0.95] text-white" style={{ ...HAND, textShadow: OUTLINE }}>
          Let your agent apply.
        </h2>
        <p className="text-lede max-w-2xl text-white/90">Install it in Claude Code, fill your profile once, and run your first dry run tonight.</p>
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          <Terminal label="Install, in Claude Code" lines={APPLY_INSTALL} />
          <Terminal label="Then ask for jobs" lines={APPLY_USAGE} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={APPLY_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-[17px] font-black text-[#2A8CFF] shadow-[0_4px_0_#1A5FC8] transition-transform hover:-translate-y-px"
          >
            <FontAwesomeIcon icon={faStar} className="text-[16px]" />
            Star on GitHub
          </a>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 px-5 py-2.5 text-[17px] font-bold text-white transition-colors hover:bg-white/10"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[14px]" />
            {copied ? 'Copied' : 'Copy install commands'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Faq({ children }: { children: ReactNode }) {
  return <div className="quick-answers w-full bg-white">{children}</div>
}

export function ApplyPage() {
  useEffect(() => {
    const previous = document.title
    document.title = APPLY_TITLE
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white" style={{ fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif" }}>
      <SiteHeader cta={{ href: '#install', label: 'Get log apply' }} />
      <Hero />
      <Steps />
      <Compare />
      <Receipts />
      <Faq>
        <StoryFaq title="log apply: quick answers" items={APPLY_FAQ} />
      </Faq>
      <FinalCta />
      <SiteFooter />
    </div>
  )
}
