import { useEffect, useState, type ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faArrowRight, faCheck, faEnvelope, faFileLines, faXmark } from '@fortawesome/free-solid-svg-icons'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { ClayClouds } from '../ClayClouds'
import { DitherFade } from '../useCases/DitherFade'
import { StoryFaq } from '../story/StorySections'
import { ApplyDemo } from './ApplyDemo'
import { InstallCard } from './InstallCard'
import {
  APPLY_COMPARE,
  APPLY_FAQ,
  APPLY_GITHUB_URL,
  APPLY_LEDGER_DAYS,
  APPLY_LEDGER_FROM,
  APPLY_LEDGER_TO,
  APPLY_LEDGER_URL,
  APPLY_NUMBERS,
  APPLY_STEPS,
  APPLY_TITLE,
} from './applyContent'

const STICKER = 'sticker-word inline-block px-[0.08em] text-[1.18em] leading-none'
const HAND = { fontFamily: "'Schoolbell', 'Cabin Sketch', cursive" }
const INK = '#0D2A4C'
const CARD = 'rounded-3xl bg-white shadow-[0_0_0_1px_#DCE8F5,0_4px_0_#DCE8F5]'
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const SECTION = 'w-full scroll-mt-24 px-4 py-20 md:px-6 md:py-28'
const INNER = 'mx-auto flex w-full max-w-5xl flex-col items-center'

const OUTLINE = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2
  return `${(Math.cos(angle) * 5).toFixed(2)}px ${(Math.sin(angle) * 5).toFixed(2)}px 0 ${INK}`
})
  .concat(`0 8px 0 ${INK}`)
  .join(',')

const CLOUD_MASK = {
  maskImage: 'radial-gradient(ellipse 34% 42% at 50% 40%, transparent 45%, black 95%)',
  WebkitMaskImage: 'radial-gradient(ellipse 34% 42% at 50% 40%, transparent 45%, black 95%)',
}

function SectionHead({ title, lede }: { title: ReactNode; lede: string }) {
  return (
    <div className="mb-12 flex max-w-3xl flex-col items-center gap-4 text-center md:mb-14">
      <h2 className="text-title text-[#0D2A4C]">{title}</h2>
      <p className="text-lede max-w-2xl text-[#0D2A4C]/65">{lede}</p>
    </div>
  )
}

function Hero() {
  return (
    <section aria-label="Hero" className="relative isolate w-full overflow-hidden bg-[#2A8CFF] text-[#0D2A4C]">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(ellipse_130%_100%_at_50%_0%,rgba(92,167,255,0.8)_0%,transparent_80%)]" />
        <div className="absolute inset-x-0 top-16 h-[22rem] opacity-70 md:h-[28rem]" style={CLOUD_MASK}>
          <ClayClouds className="h-full w-full [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" />
        </div>
        <DitherFade stops={['#2A8CFF', '#9CCBFF', '#FFFFFF']} cell={5} className="absolute inset-x-0 bottom-0 h-[14rem] w-full md:h-[20rem]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-28 text-center md:px-6 md:pb-24 md:pt-36">
        <a
          href={APPLY_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 text-[13px] font-bold text-[#0D2A4C] shadow-[0_2px_0_#1A5FC8] transition-transform hover:-translate-y-px sm:text-[14px]"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          Open source
        </a>
        <h1
          className="mt-6 flex flex-col items-center gap-1 text-[clamp(2.1rem,0.5rem+6.6vw,6rem)] leading-[0.95] text-white [-webkit-text-stroke:2px_#fff]"
          style={{ ...HAND, textShadow: OUTLINE }}
        >
          <span className="-rotate-2">Apply to 200 jobs</span>
          <span className="rotate-1">while you’re at work.</span>
        </h1>
        <p className="text-lede relative z-30 mt-7 max-w-xl text-white [text-shadow:0_1px_3px_rgba(13,42,76,0.45)]">
          An open-source Claude Code plugin. Your agent writes a one-page resume and cover letter for each job, fills the form in your own browser, and submits when you say so.
        </p>
        <div className="relative z-30 mt-8 w-full max-w-2xl">
          <InstallCard id="installTop" />
        </div>
        <a
          href={APPLY_LEDGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-30 mt-5 inline-flex items-center gap-1.5 text-[15px] font-bold text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
        >
          See the live ledger
          <FontAwesomeIcon icon={faArrowRight} className="text-[12px]" />
        </a>
        <div className="mt-14 w-full md:mt-20">
          <ApplyDemo />
        </div>
      </div>
    </section>
  )
}

function ArtPanel({ children }: { children: ReactNode }) {
  return <div className="relative h-44 overflow-hidden rounded-2xl bg-[#EAF3FF]">{children}</div>
}

function ResumeArt() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute left-[14%] top-[12%] h-[82%] w-[46%] -rotate-3 rounded-lg bg-white p-3 shadow-[0_3px_0_#B5D6FF]">
        <div className="mx-auto h-1.5 w-1/2 rounded-full bg-[#0D2A4C]" />
        <div className="mx-auto mt-1.5 h-1 w-2/3 rounded-full bg-[#0D2A4C]/25" />
        {[0, 1, 2].map((block) => (
          <div key={block} className="mt-2.5">
            <div className="h-1.5 w-1/3 rounded-full bg-[#2A8CFF]" />
            <div className="mt-1 h-1 w-full rounded-full bg-[#0D2A4C]/[0.12]" />
            <div className="mt-1 h-1 w-5/6 rounded-full bg-[#0D2A4C]/[0.12]" />
          </div>
        ))}
      </div>
      <div className="absolute right-[12%] top-[22%] h-[64%] w-[38%] rotate-3 rounded-lg bg-white p-3 shadow-[0_3px_0_#B5D6FF]">
        {[0, 1, 2, 3, 4].map((line) => (
          <div key={line} className={`mt-1.5 h-1 rounded-full bg-[#0D2A4C]/[0.12] ${line % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
      <span className="absolute bottom-3 left-4 rounded-md bg-[#0D2A4C] px-2 py-0.5 text-[11px] font-bold text-white">resume.tex</span>
      <span className="absolute bottom-3 right-4 rounded-md bg-[#2A8CFF] px-2 py-0.5 text-[11px] font-bold text-white">cover letter</span>
    </div>
  )
}

function FillArt() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col justify-center gap-2.5 px-5">
      <div className="rounded-xl bg-white p-3 text-left shadow-[0_3px_0_#B5D6FF]">
        <div className="flex gap-1.5">
          <span className="rounded-md bg-[#EAF3FF] px-2 py-0.5 text-[10px] font-bold text-[#1A5FC8]">Workday</span>
          <span className="rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[10px] font-bold text-[#1E8E4F]">Greenhouse</span>
        </div>
        {['Name', 'Email', 'Resume'].map((field) => (
          <div key={field} className="mt-1.5 flex items-center gap-2">
            <span className="w-12 shrink-0 text-[10px] font-bold text-[#0D2A4C]/55">{field}</span>
            <span className="flex h-4 flex-1 items-center justify-end rounded border border-[#D6E8FF] px-1.5 text-[9px] text-[#1E8E4F]">
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 self-end rounded-xl bg-[#0D2A4C] px-3 py-1.5 text-left text-white">
        <FontAwesomeIcon icon={faEnvelope} className="text-[12px] text-[#5CA7FF]" />
        <span className="text-[11px] font-bold">Code read from your inbox</span>
      </div>
    </div>
  )
}

function TrackArt() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col justify-center px-5">
      <div className="overflow-hidden rounded-xl bg-white text-left shadow-[0_3px_0_#B5D6FF]">
        {['Global Relay', 'Workday', 'TMX Group', 'Amgen'].map((company) => (
          <div key={company} className="flex items-center gap-2 border-t border-[#0D2A4C]/[0.06] px-3 py-1.5 first:border-t-0">
            <span className="min-w-0 flex-1 truncate text-[11px] font-black text-[#0D2A4C]">{company}</span>
            <span className="inline-flex items-center gap-1 rounded bg-[#EAF3FF] px-1.5 py-0.5 text-[9px] font-bold text-[#1A5FC8]">
              <FontAwesomeIcon icon={faFileLines} />
              resume
            </span>
            <span className="rounded-full bg-[#E8F7EE] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#1E8E4F]">Applied</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STEP_ART = [ResumeArt, FillArt, TrackArt]

function Compare() {
  const [side, setSide] = useState<'with' | 'without'>('with')
  return (
    <div className={`${CARD} mt-5 w-full p-2`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <p className="text-[20px] font-black leading-tight text-[#0D2A4C] md:text-[22px]">The same night, two ways</p>
        <div role="tablist" aria-label="Compare" className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#F1F5FA] p-1 sm:w-auto">
          {(['without', 'with'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={side === key}
              onClick={() => setSide(key)}
              className={`rounded-[10px] px-4 py-1.5 text-[14px] font-bold transition-[background-color,color,box-shadow] duration-300 ${EASE} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A8CFF] ${side === key ? 'bg-white text-[#0D2A4C] shadow-[0_1px_2px_rgba(13,42,76,0.12),0_0_0_1px_rgba(13,42,76,0.06)]' : 'text-[#0D2A4C]/55 hover:text-[#0D2A4C]'}`}
            >
              {APPLY_COMPARE[key].label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="grid">
        {(['without', 'with'] as const).map((key) => {
          const panel = APPLY_COMPARE[key]
          const shown = side === key
          const positive = key === 'with'
          return (
            <div
              key={key}
              aria-hidden={!shown}
              className={`col-start-1 row-start-1 grid gap-5 rounded-2xl p-5 transition-[opacity,transform] duration-500 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:p-7 ${EASE} ${positive ? 'bg-[#2A8CFF] text-white' : 'bg-[#F1F5FA] text-[#0D2A4C]'} ${shown ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'}`}
            >
              <p className="text-[clamp(2.25rem,1.6rem+2.6vw,3.5rem)] leading-none" style={HAND}>
                {panel.headline}
              </p>
              <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
                {panel.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[15px] font-bold leading-snug">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${positive ? 'bg-white text-[#2A8CFF]' : 'bg-[#0D2A4C]/10 text-[#0D2A4C]/55'}`}>
                      <FontAwesomeIcon icon={positive ? faCheck : faXmark} />
                    </span>
                    <span className={positive ? 'text-white' : 'text-[#0D2A4C]/75'}>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Steps() {
  return (
    <section id="how" aria-label="How log apply works" className={`${SECTION} bg-white`}>
      <div className={INNER}>
        <SectionHead
          title={
            <>
              Three steps, <span className={STICKER}>every job.</span>
            </>
          }
          lede="Say what you’re after. Your agent does the rest, one application at a time."
        />
        <ol className="m-0 grid w-full list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
          {APPLY_STEPS.map((step, index) => {
            const Art = STEP_ART[index]
            return (
              <li key={step.number} className={`${CARD} flex flex-col gap-5 p-2`}>
                <ArtPanel>
                  <Art />
                </ArtPanel>
                <div className="flex flex-col gap-2 px-4 pb-5">
                  <span className="flex items-center gap-3">
                    <span className="rounded-lg bg-[#2A8CFF] px-2 py-0.5 text-[13px] font-black text-white">{step.number}</span>
                    <span className="text-[22px] font-black leading-tight text-[#0D2A4C]">{step.title}</span>
                  </span>
                  <p className="text-[15px] leading-relaxed text-[#0D2A4C]/70">{step.body}</p>
                </div>
              </li>
            )
          })}
        </ol>
        <Compare />
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

function Receipts() {
  const weeks = ledgerWeeks()
  const stats = [
    { value: `${APPLY_NUMBERS.applied}+`, label: 'applications' },
    { value: String(APPLY_NUMBERS.companies), label: 'companies' },
    { value: String(APPLY_NUMBERS.bestDay), label: 'in a single day' },
  ]
  return (
    <section id="receipts" aria-label="Receipts" className={`${SECTION} bg-[#F7FAFD]`}>
      <div className={INNER}>
        <SectionHead
          title={
            <>
              Receipts, not <span className={STICKER}>promises.</span>
            </>
          }
          lede={`Built for a real job search, by a builder with a full-time job. log apply went after every opening they qualified for: ${APPLY_NUMBERS.applied} applications so far, ${APPLY_NUMBERS.bestDay} in a single day, each with its own resume and cover letter. Every one is on a public ledger, with the exact documents that went out.`}
        />
        <div className="w-full overflow-hidden rounded-3xl bg-[#0B1626] p-2 text-white shadow-[0_4px_0_#061a33]">
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
            {stats.map((stat) => (
              <li key={stat.label} className="flex flex-col items-center rounded-2xl bg-white/[0.05] px-2 py-5 text-center md:py-7">
                <span className="text-[clamp(1.9rem,1.2rem+3vw,3.5rem)] font-black leading-none text-white">{stat.value}</span>
                <span className="mt-2 text-[12px] font-bold text-white/55 md:text-[15px]">{stat.label}</span>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-5 pt-6 md:px-8 md:pb-7">
            <p className="text-center text-[14px] font-bold text-white/70">Applications per day, from the public ledger</p>
            <div className="mx-auto mt-4 flex w-full max-w-[26rem] gap-[5px] sm:gap-1.5">
              {weeks.map((week) => (
                <div key={week[0].date} className="flex min-w-0 flex-1 flex-col gap-[5px] sm:gap-1.5">
                  {week.map((day) => (
                    <span key={day.date} title={`${labelOf(day.date)}: ${day.count} sent`} className={`block aspect-square w-full rounded-[4px] sm:rounded-md ${shade(day.count)}`} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mx-auto mt-3 flex w-full max-w-[26rem] justify-between text-[11px] font-bold text-white/45">
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
        </div>
        <a
          href={APPLY_LEDGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-1.5 text-[16px] font-bold text-[#2A8CFF] underline decoration-[#2A8CFF]/30 underline-offset-4 transition-colors hover:decoration-[#2A8CFF]"
        >
          Open the live ledger
          <FontAwesomeIcon icon={faArrowRight} className="text-[13px]" />
        </a>
      </div>
    </section>
  )
}

function FinalInstall() {
  return (
    <section id="install" aria-label="Install log apply" className={`${SECTION} bg-white pt-4 md:pt-6`}>
      <div
        className="mx-auto flex w-full max-w-5xl flex-col items-center rounded-[2rem] px-4 py-14 text-center md:px-12 md:py-20"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #5CB2FF 0%, #1F6FE6 100%)' }}
      >
        <h2 className="text-[clamp(2.5rem,1.4rem+4.6vw,5rem)] leading-[0.95] text-white" style={{ ...HAND, textShadow: OUTLINE }}>
          Let your agent apply.
        </h2>
        <p className="text-lede mt-5 max-w-xl text-white/90">Install it, fill your profile once, and do a dry run tonight. Nothing is submitted until you say so.</p>
        <div className="mt-9 w-full max-w-2xl">
          <InstallCard id="installBottom" />
        </div>
        <a
          href={APPLY_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
        >
          <FontAwesomeIcon icon={faGithub} className="text-[16px]" />
          Star it on GitHub, MIT licensed
        </a>
      </div>
    </section>
  )
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
      <SiteHeader cta={{ href: '#installTop', label: 'Install' }} />
      <Hero />
      <Steps />
      <Receipts />
      <div className="quick-answers w-full bg-white pt-8 md:pt-12">
        <StoryFaq title="log apply: quick answers" items={APPLY_FAQ} />
      </div>
      <FinalInstall />
      <SiteFooter />
    </div>
  )
}
