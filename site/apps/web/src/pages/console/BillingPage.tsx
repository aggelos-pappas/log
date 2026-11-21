import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons'
import { ConsoleLayout } from './ConsoleLayout'
import { TopUpDialog } from './TopUpDialog'

const FILTERS = ['All', 'Manual top-ups', 'Auto top-ups', 'Subscriptions'] as const

export function BillingPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [notice, setNotice] = useState('')

  return (
    <ConsoleLayout title="Billing" subtitle="Credits for the tools your workspace calls.">
      <section className="rounded-2xl border-2 border-slate-200 bg-white">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Balance</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <FontAwesomeIcon icon={faCoins} className="size-6 text-[#2A8CFF]" />
            <p className="text-4xl font-black tracking-tight tabular-nums">1000</p>
            <span className="text-sm font-semibold text-slate-500">credits</span>
          </div>
          <button type="button" onClick={() => setTopUpOpen(true)} className="mt-4 h-10 rounded-lg bg-[#2A8CFF] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1F6FE6]">
            Top up
          </button>
        </div>

        <div className="border-t-2 border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-200">
              <span className="absolute left-0.5 size-4 rounded-full bg-white shadow-sm" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Auto top-up</p>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Keeps agents running without watching the balance. Off for now — nothing is charged automatically.
          </p>
        </div>

        <div className="border-t-2 border-slate-200 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Payment history</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Top-ups add to your credit balance. Subscriptions are billed separately.</p>
          <div role="group" aria-label="Filter payments" className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${filter === value ? 'bg-[#0D2A4C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">No payments in this category yet.</p>
        </div>
      </section>
      <TopUpDialog open={topUpOpen} onClose={() => setTopUpOpen(false)} onPay={(credits) => setNotice(`${new Intl.NumberFormat().format(credits)} credits requested. Card payment is not connected yet, so nothing was charged.`)} />
      {notice ? <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</p> : null}
    </ConsoleLayout>
  )
}
