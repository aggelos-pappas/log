import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { APPLY_GITHUB_URL, APPLY_REPO } from './applyContent'

const CACHE_KEY = 'logApplyStars'
const SHOW_COUNT_FROM = 10

function readCache(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw === null ? null : Number(raw)
  } catch {
    return null
  }
}

function writeCache(stars: number) {
  try {
    sessionStorage.setItem(CACHE_KEY, String(stars))
  } catch {
    return
  }
}

export function useStars(): number | null {
  const [stars, setStars] = useState<number | null>(readCache)
  useEffect(() => {
    if (stars !== null) return
    let live = true
    fetch(`https://api.github.com/repos/${APPLY_REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d || typeof d.stargazers_count !== 'number') return
        writeCache(d.stargazers_count)
        setStars(d.stargazers_count)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [stars])
  return stars
}

export function StarButton({ tone = 'light', label = 'Star on GitHub' }: { tone?: 'light' | 'dark'; label?: string }) {
  const stars = useStars()
  const shell =
    tone === 'light'
      ? 'bg-white text-[#0D2A4C] shadow-[0_3px_0_#1A5FC8]'
      : 'bg-[#0D2A4C] text-white shadow-[0_3px_0_#061527]'
  return (
    <a
      href={APPLY_GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={stars === null ? label : `${label}, ${stars} stars`}
      className={`group inline-flex items-stretch overflow-hidden rounded-full text-[15px] font-bold transition-transform hover:-translate-y-px ${shell}`}
    >
      <span className="inline-flex items-center gap-2 py-2.5 pl-5 pr-4">
        <FontAwesomeIcon icon={faGithub} className="text-[17px]" />
        <FontAwesomeIcon icon={faStar} className="text-[14px] text-[#F5B301] transition-transform group-hover:scale-125" />
        {label}
      </span>
      {stars !== null && stars >= SHOW_COUNT_FROM && (
        <span className={`inline-flex items-center border-l px-4 tabular-nums ${tone === 'light' ? 'border-[#DCE8F5]' : 'border-white/15'}`}>
          {stars.toLocaleString()}
        </span>
      )}
    </a>
  )
}
