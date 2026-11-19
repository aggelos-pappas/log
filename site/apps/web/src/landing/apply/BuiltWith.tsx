import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useInView } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClaudeMark } from '../agentMarks'
import { APPLY_BUILT_WITH, type BuiltWithItem } from './applyContent'
import './applyFloat.css'

const TILE = 'grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl'
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const CENTER = { x: 500, y: 250 }
const SPOTS = [
  { x: 150, y: 140 },
  { x: 150, y: 360 },
  { x: 850, y: 90 },
  { x: 850, y: 250 },
  { x: 850, y: 410 },
]
const FLOATS = [
  { duration: '6.2s', delay: '0s' },
  { duration: '5.6s', delay: '-1.8s' },
  { duration: '6.8s', delay: '-3.1s' },
  { duration: '5.9s', delay: '-0.9s' },
  { duration: '6.5s', delay: '-2.4s' },
]

function floatStyle(index: number) {
  const float = FLOATS[index % FLOATS.length]
  return { '--floatDuration': float.duration, '--floatDelay': float.delay } as CSSProperties
}

function Mark({ item }: { item: BuiltWithItem }) {
  if (item.name === 'treg' && item.logo) {
    return (
      <span className={`${TILE} bg-[#111111] p-2`}>
        <img src={item.logo} alt="" className="size-full" />
      </span>
    )
  }
  if (!item.logo) {
    return (
      <span className={`${TILE} bg-white shadow-[inset_0_0_0_1px_#E6EDF5]`}>
        <FontAwesomeIcon icon={faClaudeMark} className="text-[24px] text-[#D97757]" />
      </span>
    )
  }
  if (item.name === 'AutoInternship') {
    return (
      <span className={`${TILE} bg-white p-1 shadow-[inset_0_0_0_1px_#E6EDF5]`}>
        <img src={item.logo} alt="" className="size-full object-contain" />
      </span>
    )
  }
  return (
    <span className={TILE}>
      <img src={item.logo} alt="" className="size-full object-cover" />
    </span>
  )
}

function Tile({ item, index }: { item: BuiltWithItem; index: number }) {
  return (
    <div className="applyFloat h-full" style={floatStyle(index)}>
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-full w-full items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 text-left shadow-[0_0_0_1px_rgba(13,42,76,0.06),0_12px_28px_-14px_rgba(13,42,76,0.35)] transition-[transform,box-shadow] duration-300 ${EASE} hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(13,42,76,0.08),0_18px_34px_-14px_rgba(13,42,76,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A8CFF]`}
      >
        <span aria-hidden>
          <Mark item={item} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="whitespace-nowrap text-[15px] font-black text-[#0D2A4C]">{item.name}</span>
          <span className="mt-0.5 text-[12.5px] text-[#0D2A4C]/55">{item.role}</span>
        </span>
      </a>
    </div>
  )
}

function Hub() {
  return (
    <div className="applyFloat flex flex-col items-center gap-2.5" style={floatStyle(2)}>
      <span className="grid size-24 place-items-center rounded-[28px] bg-white shadow-[0_0_0_1px_rgba(13,42,76,0.06),0_20px_40px_-16px_rgba(13,42,76,0.45)]">
        <img src="/logo.svg" alt="" className="size-16 rounded-[18px]" />
      </span>
      <span className="rounded-full bg-white px-3 py-1 text-[13px] font-black text-[#0D2A4C] shadow-[0_0_0_1px_rgba(13,42,76,0.06)]">log apply</span>
    </div>
  )
}

function curve(to: { x: number; y: number }) {
  const midX = (CENTER.x + to.x) / 2
  return `M ${CENTER.x} ${CENTER.y} C ${midX} ${CENTER.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
}

function Placed({ spot, hub = false, children }: { spot: { x: number; y: number }; hub?: boolean; children: ReactNode }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${hub ? '' : 'w-[15.5rem]'}`} style={{ left: `${spot.x / 10}%`, top: `${(spot.y / 500) * 100}%` }}>
      {children}
    </div>
  )
}

export function BuiltWithMap() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '120px' })
  return (
    <div ref={ref} className={`w-full ${inView ? 'applyFloatOn' : ''}`}>
      <div className="relative mx-auto hidden h-[30rem] w-full max-w-5xl lg:block">
        <svg aria-hidden viewBox="0 0 1000 500" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {SPOTS.map((spot) => (
            <path key={`${spot.x}-${spot.y}`} d={curve(spot)} fill="none" stroke="#B3CFEE" strokeWidth="1.5" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          ))}
          <circle cx={CENTER.x} cy={CENTER.y} r="3" fill="#9CC4F0" />
        </svg>
        <Placed spot={CENTER} hub>
          <Hub />
        </Placed>
        {APPLY_BUILT_WITH.map((item, index) => (
          <Placed key={item.name} spot={SPOTS[index]}>
            <Tile item={item} index={index} />
          </Placed>
        ))}
      </div>
      <div className="flex flex-col items-center gap-8 lg:hidden">
        <Hub />
        <ul className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0">
          {APPLY_BUILT_WITH.map((item, index) => (
            <li key={item.name} className={index === APPLY_BUILT_WITH.length - 1 && APPLY_BUILT_WITH.length % 2 === 1 ? 'col-span-2 mx-auto w-full max-w-[16rem]' : ''}>
              <Tile item={item} index={index} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
