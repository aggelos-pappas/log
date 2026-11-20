import { compareVersions } from '../version/index'
import { shortRevision } from '../../models/manifest/index'
import { MODELS_PREFIX, NOT_PINNED, RELEASES_END, RELEASES_START } from './types'
import type { ReleaseSection } from './types'

const HEADER = /^## \[?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?(?:\(([^)\s]+)\))?\s+\((\d{4}-\d{2}-\d{2})\)\s*$/

const lf = (text: string) => text.replace(/\r\n/g, '\n')

export function cleanBullet(line: string): string {
  return line
    .replace(/^\s*[*-]\s+/, '')
    .replace(/^\*\*[^*]+:\*\*\s*/, '')
    .replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\|/g, '/')
    .trim()
}

export function parseChangelog(text: string): ReleaseSection[] {
  const sections: (ReleaseSection & { bullets: string[] })[] = []
  for (const line of lf(text).split('\n')) {
    const header = HEADER.exec(line)
    if (header) {
      sections.push({ version: header[1], link: header[2] ?? null, date: header[3], summary: '', models: null, pinned: false, bullets: [] })
      continue
    }
    const current = sections.at(-1)
    if (!current) continue
    if (line.startsWith(MODELS_PREFIX)) {
      const said = line.slice(MODELS_PREFIX.length).trim()
      current.pinned = said !== NOT_PINNED
      current.models = current.pinned ? said.split(/,\s*/).filter(Boolean) : []
    } else if (/^\s*[*-]\s+\S/.test(line) && !/^\s{2,}/.test(line)) current.bullets.push(cleanBullet(line))
  }
  return sections
    .map(({ bullets, ...section }) => ({ ...section, summary: bullets.length ? `${bullets[0]}${bullets.length > 1 ? ` (+${bullets.length - 1} more)` : ''}` : 'no notes' }))
    .sort((a, b) => compareVersions(b.version, a.version))
}

export function modelsLine(pins: readonly string[]): string {
  return `${MODELS_PREFIX}${pins.length ? pins.join(', ') : NOT_PINNED}`
}

function splitPin(pin: string): { id: string; revision: string } {
  const at = pin.lastIndexOf('@')
  return at > 0 ? { id: pin.slice(0, at), revision: pin.slice(at + 1) } : { id: pin, revision: '' }
}

const nameOf = (id: string) => id.split('/').pop() ?? id

const shortPin = (pin: string) => {
  const { id, revision } = splitPin(pin)
  return `${nameOf(id)}@${shortRevision(revision)}`
}

export function modelsCell(section: ReleaseSection, older: ReleaseSection | undefined): string {
  if (!section.models) return 'not recorded'
  if (!section.pinned) return 'not pinned (newest by name)'
  if (!older?.pinned || !older.models) return `first pinned: ${section.models.map(shortPin).join(', ')}`
  const before = new Map(older.models.map((pin) => [splitPin(pin).id, splitPin(pin).revision]))
  const after = new Map(section.models.map((pin) => [splitPin(pin).id, splitPin(pin).revision]))
  const changed = [...after].filter(([id, rev]) => before.has(id) && before.get(id) !== rev).map(([id, rev]) => `${nameOf(id)} ${shortRevision(before.get(id)!)} → ${shortRevision(rev)}`)
  const added = [...after].filter(([id]) => !before.has(id)).map(([id, rev]) => `${nameOf(id)}@${shortRevision(rev)}`)
  const removed = [...before.keys()].filter((id) => !after.has(id)).map(nameOf)
  const parts = [...(changed.length ? [`changed: ${changed.join(', ')}`] : []), ...(added.length ? [`added: ${added.join(', ')}`] : []), ...(removed.length ? [`removed: ${removed.join(', ')}`] : [])]
  return parts.length ? parts.join('; ') : `same as ${older.version}`
}

export function renderReleases(sections: readonly ReleaseSection[]): string {
  const rows = sections.map((s, i) => `| ${s.link ? `[${s.version}](${s.link})` : s.version} | ${s.date} | ${s.summary} | ${modelsCell(s, sections[i + 1])} |`)
  return ['| Version | Date | What\'s in it | Models |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

export function withReleases(readme: string, table: string): string {
  const text = lf(readme)
  const start = text.indexOf('<!-- releases:start')
  const end = text.indexOf(RELEASES_END)
  if (start < 0 || end < start) return text
  return `${text.slice(0, start)}${RELEASES_START}\n${table}\n${text.slice(end)}`
}

export function recordModels(changelog: string, version: string, pins: readonly string[]): string {
  const lines = lf(changelog).split('\n')
  const at = lines.findIndex((line) => HEADER.exec(line)?.[1] === version)
  if (at < 0) return lf(changelog)
  const next = lines.findIndex((line, i) => i > at && HEADER.test(line))
  const block = lines.slice(at + 1, next < 0 ? undefined : next)
  if (block.some((line) => line.startsWith(MODELS_PREFIX))) return lf(changelog)
  return [...lines.slice(0, at + 1), '', modelsLine(pins), ...lines.slice(at + 1)].join('\n')
}

export function releaseProblems(changelog: string, released: string): string[] {
  const sections = parseChangelog(changelog)
  if (!sections.length) return ['CHANGELOG.md has no release sections']
  const problems: string[] = []
  if (sections[0].version !== released) problems.push(`CHANGELOG.md's newest release is ${sections[0].version}, but .release-please-manifest.json says ${released}`)
  for (const section of sections) if (!section.models) problems.push(`CHANGELOG.md's ${section.version} has no "${MODELS_PREFIX.trim()}" line: run \`bun run docs:releases\``)
  return problems
}
