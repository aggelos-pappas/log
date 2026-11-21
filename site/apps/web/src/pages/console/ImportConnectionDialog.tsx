import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudArrowUp, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useMediaQuery } from '@/landing/useMediaQuery'

const SLIDE = { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 } as const
const SETTLE = { duration: 0.26, ease: [0.22, 1, 0.36, 1] } as const

export function ImportConnectionDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (file: File) => Promise<void> }) {
  const picker = useRef<HTMLInputElement>(null)
  const [hovering, setHovering] = useState(false)
  const [pending, setPending] = useState(false)
  const desktop = useMediaQuery('(min-width: 640px)')

  useEffect(() => {
    if (!open) return
    setHovering(false)
    setPending(false)
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

  async function take(file: File | undefined) {
    if (!file || pending) return
    setPending(true)
    try {
      await onImport(file)
      onClose()
    } finally {
      setPending(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="import" className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D2A4C]/45 backdrop-blur-[2px] sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SETTLE} onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            onMouseDown={(event) => event.stopPropagation()}
            initial={desktop ? { opacity: 0, scale: 0.94, filter: 'blur(12px)' } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, filter: 'blur(10px)' } : { y: '100%' }}
            transition={desktop ? SETTLE : SLIDE}
            className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_60px_-20px_rgba(13,42,76,0.35)] sm:rounded-3xl"
          >
            <div className="flex items-start gap-3 px-5 pb-4 pt-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                <FontAwesomeIcon icon={faCloudArrowUp} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="import-title" className="text-base font-bold leading-tight text-slate-900">Import accounts</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">One row per account, the same columns your spreadsheet already has.<code className="rounded bg-slate-100 px-1 font-mono text-xs">platform</code> and <code className="rounded bg-slate-100 px-1 font-mono text-xs">accountName</code> are required; <code className="rounded bg-slate-100 px-1 font-mono text-xs">homeCountry</code> and <code className="rounded bg-slate-100 px-1 font-mono text-xs">proxy</code> are optional.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <FontAwesomeIcon icon={faXmark} className="size-4" />
              </button>
            </div>

            <div className="px-5">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">platform</th>
                      <th scope="col" className="px-3 py-2 font-semibold">accountName</th>
                      <th scope="col" className="px-3 py-2 font-semibold">homeCountry</th>
                      <th scope="col" className="px-3 py-2 font-semibold">proxy</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <motion.tr
                      className="border-t border-slate-200"
                      animate={{ backgroundColor: ['rgba(42,140,255,0)', 'rgba(42,140,255,0.14)', 'rgba(42,140,255,0)'] }}
                      transition={{ duration: 2.4, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
                    >
                      <td className="px-3 py-2 font-mono">twitter</td>
                      <td className="px-3 py-2 font-mono">@handle</td>
                      <td className="px-3 py-2 font-mono">US</td>
                      <td className="px-3 py-2 font-mono text-slate-500">http://user:pass@host:port</td>
                    </motion.tr>
                    <motion.tr
                      className="border-t border-slate-200"
                      animate={{ backgroundColor: ['rgba(42,140,255,0)', 'rgba(42,140,255,0.14)', 'rgba(42,140,255,0)'] }}
                      transition={{ duration: 2.4, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut', delay: 0.45 }}
                    >
                      <td className="px-3 py-2 font-mono">discord</td>
                      <td className="px-3 py-2 font-mono">myaccount</td>
                      <td className="px-3 py-2 font-mono">CA</td>
                      <td className="px-3 py-2 font-mono text-slate-500" />
                    </motion.tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">One row per account. <span className="font-semibold text-slate-700">platform</span> and <span className="font-semibold text-slate-700">accountName</span> are required; the other two columns can be left empty. A spreadsheet saved as CSV, or the same rows as JSON, both work.</p>
            </div>

            <div className="p-5">
              <button
                type="button"
                onClick={() => picker.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setHovering(true) }}
                onDragLeave={() => setHovering(false)}
                onDrop={(event) => { event.preventDefault(); setHovering(false); void take(event.dataTransfer.files?.[0]) }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${hovering ? 'border-[#2A8CFF] bg-[#EFF6FF]' : 'border-slate-300 bg-white hover:border-[#2A8CFF] hover:bg-[#F8FBFF]'}`}
              >
                <FontAwesomeIcon icon={faCloudArrowUp} className="size-6 text-[#2A8CFF]" />
                <span className="text-sm font-bold text-slate-900">{pending ? 'Importing…' : 'Drop the file here, or click to choose'}</span>
                <span className="text-xs text-slate-500">CSV or JSON, up to 2 MB</span>
              </button>
              <input ref={picker} type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void take(file) }} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
