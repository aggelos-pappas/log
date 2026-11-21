import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useMediaQuery } from '@/landing/useMediaQuery'

const SLIDE = { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 } as const
const SETTLE = { duration: 0.26, ease: [0.22, 1, 0.36, 1] } as const

const PACKS = [
  { credits: 1000, bonus: 0, price: 10 },
  { credits: 5000, bonus: 250, price: 40 },
  { credits: 10000, bonus: 1000, price: 75 },
  { credits: 20000, bonus: 3000, price: 140 },
]

const format = (value: number) => new Intl.NumberFormat().format(value)
const money = (value: number) => `$${value.toFixed(2)}`

export function TopUpDialog({ open, onClose, onPay }: { open: boolean; onClose: () => void; onPay: (credits: number) => void }) {
  const [selected, setSelected] = useState(0)
  const [custom, setCustom] = useState('')
  const [auto, setAuto] = useState(false)
  const desktop = useMediaQuery('(min-width: 640px)')

  useEffect(() => {
    if (!open) return
    setSelected(0)
    setCustom('')
    setAuto(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  const customValue = Number(custom.replace(/[^0-9]/g, ''))
  const pack = PACKS[selected]
  const added = customValue > 0 ? customValue : pack.credits + pack.bonus
  const due = customValue > 0 ? Math.round(customValue / 100) : pack.price

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="topup" className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D2A4C]/45 backdrop-blur-[2px] sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SETTLE} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="topup-title"
            onMouseDown={(event) => event.stopPropagation()}
            initial={desktop ? { opacity: 0, scale: 0.94, filter: 'blur(12px)' } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, filter: 'blur(10px)' } : { y: '100%' }}
            transition={desktop ? SETTLE : SLIDE}
            className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_60px_-20px_rgba(13,42,76,0.35)] sm:rounded-3xl"
          >
            <div className="max-h-[88dvh] overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id="topup-title" className="text-lg font-bold leading-tight">Top up credits</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Choose an amount. Bigger top-ups earn bonus credit; you can always add more later.</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <FontAwesomeIcon icon={faXmark} className="size-4" />
                </button>
              </div>

              <div role="radiogroup" aria-label="Top up amount" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {PACKS.map((option, index) => {
                  const active = customValue === 0 && selected === index
                  return (
                    <button
                      key={option.credits}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setSelected(index); setCustom('') }}
                      className={`rounded-xl border-2 px-3 py-3 text-center transition-colors ${active ? 'border-[#2A8CFF] bg-[#2A8CFF] text-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <span className="block text-base font-bold">{format(option.credits)}</span>
                      <span className={`mt-0.5 block text-[11px] font-semibold ${active ? 'text-white/85' : 'text-slate-500'}`}>{money(option.price)}</span>
                      <span className={`mt-0.5 block text-[10px] font-semibold ${active ? 'text-white/80' : 'text-emerald-600'}`}>{option.bonus ? `+${format(option.bonus)} bonus` : 'credits'}</span>
                    </button>
                  )
                })}
                <label className={`flex cursor-text flex-col justify-center rounded-xl border-2 px-3 py-3 text-center transition-colors ${customValue > 0 ? 'border-[#2A8CFF] bg-[#2A8CFF] text-white' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-sm font-bold">Other</span>
                  <input
                    value={custom}
                    onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                    inputMode="numeric"
                    placeholder="Amount"
                    aria-label="Custom credit amount"
                    className={`mt-1 w-full bg-transparent text-center text-xs font-semibold outline-none ${customValue > 0 ? 'text-white placeholder:text-white/70' : 'text-slate-600 placeholder:text-slate-400'}`}
                  />
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <button type="button" role="switch" aria-checked={auto} onClick={() => setAuto(!auto)} className="flex items-center gap-3 text-left">
                  <span aria-hidden="true" className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${auto ? 'bg-[#2A8CFF]' : 'bg-slate-300'}`}>
                    <motion.span layout className={`absolute size-5 rounded-full bg-white shadow-sm ${auto ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                  <span className="text-base font-bold text-slate-900">Auto top-up {auto ? 'on' : 'off'}</span>
                </button>
                <p className="mt-2 pl-14 text-sm leading-6 text-slate-600">
                  I authorize log to charge my saved card <b className="font-semibold text-slate-800">{format(added)} credits</b> automatically whenever my balance drops below {format(Math.round(added / 5))}, up to 5 times per hour. Cancel any time from the billing page.
                </p>
                <p className="mt-2 pl-14 text-sm leading-6 text-slate-600">Auto top-ups earn the same bonus. Raise the refill amount on the billing page for up to +15% on every refill.</p>
              </div>

              <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Credit added</dt>
                  <dd className="font-semibold tabular-nums">{format(added)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                  <dt className="font-bold text-slate-900">Total due</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{money(due)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">You’ll pay on the payment page. The balance updates the moment the payment lands.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={() => { onPay(added); onClose() }} className="h-10 rounded-lg bg-[#0D2A4C] px-4 text-sm font-bold text-white transition-colors hover:bg-[#123a66]">Pay {money(due)}</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
