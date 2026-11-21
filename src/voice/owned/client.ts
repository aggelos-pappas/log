import type { Database } from 'bun:sqlite'
import { NEAR_OWN, OWN_GRAM, OWN_LENGTH_SLACK, OWN_MIN_CHARS, OWN_RARE_WORDS } from './types'
import type { OwnIndex, OwnLine, OwnMatch } from './types'

export function ownKey(text: string): string {
  return text.toLowerCase().replace(/[’‘`']/g, '').replace(/https?:\/\/\S+/g, ' ').replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function partsOf(text: string): string[] {
  return text.split(/\n|(?<=[.!?])\s+/).map((p) => p.trim()).filter((p) => ownKey(p))
}

function gramsOf(key: string): Set<string> {
  const padded = ` ${key} `
  const grams = new Set<string>()
  for (let i = 0; i + OWN_GRAM <= padded.length; i++) grams.add(padded.slice(i, i + OWN_GRAM))
  return grams
}

export function charOverlap(a: string, b: string): number {
  const x = gramsOf(ownKey(a))
  const y = gramsOf(ownKey(b))
  if (!x.size || !y.size) return 0
  let shared = 0
  for (const g of x) if (y.has(g)) shared++
  return (2 * shared) / (x.size + y.size)
}

export function buildOwnIndex(texts: Iterable<string>): OwnIndex {
  const index: OwnIndex = { exact: new Map(), texts: [], keys: [], byWord: new Map() }
  for (const text of texts) {
    const key = ownKey(text)
    if (!key || index.exact.has(key)) continue
    index.exact.set(key, text.trim())
    const at = index.texts.length
    index.texts.push(text.trim())
    index.keys.push(key)
    for (const word of new Set(key.split(' '))) {
      const list = index.byWord.get(word)
      if (list) list.push(at)
      else index.byWord.set(word, [at])
    }
  }
  return index
}

export function ownLineIn(index: OwnIndex, line: string): OwnLine | null {
  const key = ownKey(line)
  if (!key) return null
  const exact = index.exact.get(key)
  if (exact !== undefined) return { line, his: exact, overlap: 1 }
  if (key.length < OWN_MIN_CHARS) return null
  const rare = [...new Set(key.split(' '))].map((w) => index.byWord.get(w)).filter((l): l is number[] => Boolean(l)).sort((a, b) => a.length - b.length).slice(0, OWN_RARE_WORDS)
  const low = key.length * (1 - OWN_LENGTH_SLACK)
  const high = key.length * (1 + OWN_LENGTH_SLACK)
  let best: OwnLine | null = null
  for (const at of new Set(rare.flat())) {
    const theirs = index.keys[at]
    if (theirs.length < low || theirs.length > high) continue
    const overlap = charOverlap(key, theirs)
    if (overlap >= NEAR_OWN && overlap > (best?.overlap ?? 0)) best = { line, his: index.texts[at], overlap: Number(overlap.toFixed(4)) }
  }
  return best
}

export function ownMatchIn(index: OwnIndex, text: string): OwnMatch | null {
  const parts = partsOf(text)
  if (!parts.length) return null
  const lines: OwnLine[] = []
  for (const part of parts) {
    const found = ownLineIn(index, part)
    if (!found) return null
    lines.push(found)
  }
  return { lines }
}

export function ownersSentIndex(handle: Database, texts: readonly string[], leaveOut = ''): OwnIndex {
  const lengths = texts.flatMap(partsOf).map((p) => p.length)
  if (!lengths.length) return buildOwnIndex([])
  const low = Math.max(1, Math.floor(Math.min(...lengths) * (1 - OWN_LENGTH_SLACK)) - 4)
  const high = Math.ceil(Math.max(...lengths) * (1 + OWN_LENGTH_SLACK)) + 12
  const rows = handle.prepare("SELECT DISTINCT text FROM messages WHERE fromOwner = 1 AND text <> '' AND length(text) BETWEEN ? AND ?").all(low, high) as { text: string }[]
  const left = ownKey(leaveOut)
  return buildOwnIndex(rows.map((r) => r.text).filter((t) => !left || ownKey(t) !== left))
}

export function ownersSentMatches(handle: Database, texts: readonly string[], leaveOut = ''): (OwnMatch | null)[] {
  const index = ownersSentIndex(handle, texts, leaveOut)
  return texts.map((t) => ownMatchIn(index, t))
}

export function ownLineSummary(match: OwnMatch): string {
  return match.lines.map((l) => (l.overlap >= 1 ? `"${l.his.slice(0, 80)}"` : `"${l.his.slice(0, 80)}" (${Math.round(l.overlap * 100)}% the same)`)).join(' / ')
}
