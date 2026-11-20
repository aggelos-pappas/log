import type { HandRolledHit, HandRolledKind } from '../types'

const LOG_DB = /(?:\.logCli[\\/]+(?:[\w.-]+[\\/]+)*)?\blog\.db\b/i

const REPO_DB = /storage[\\/]schema|\bdefaultDbPath\s*\(|\bopenDatabase\s*\(/

const DB_ACCESS = /bun:sqlite|\bsqlite3\b|new\s+Database\s*\(|\bDatabase\s*\(|\.connect\s*\(|\.prepare\s*\(|\.query\s*\(|\.execute\s*\(|\bopenDatabase\s*\(|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/i

const SQL_WRITE = /\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|REPLACE\s+INTO|DROP\s+(?:TABLE|INDEX)|ALTER\s+TABLE|CREATE\s+(?:TABLE|INDEX))\b/i

const SQL_TABLE = /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([A-Za-z_]\w*)\b(?!\s+import\b|[:./-])/gi

const SQL_NOISE = new Set(['select', 'where', 'set', 'values', 'if', 'not', 'exists', 'or', 'the', 'a', 'json_each', 'pragma_table_info', 'sqlite_master', 'temp'])

const VACUUM_COPY = /VACUUM\s+INTO/i

const STATE_FILE = /\.logCli[\\/]+(?!devlog\b|mcp[\\/]|privacy\b|log\.db\b)([\w.-]+)(?:[\\/]+([\w.-]+))?/i

const FILE_READ = /\b(?:cat|head|tail|less|grep|rg|jq|strings|type|Get-Content|gc|Select-String)\b|readFileSync|readFile\s*\(|read_text\s*\(|json\.load|\bopen\s*\(|Bun\.file\s*\(/

const FILE_WRITE = /(?:^|\s)>{1,2}\s*\S*\.logCli|writeFileSync|appendFileSync|write_text\s*\(|\b(?:rm|del|mv|Remove-Item|Set-Content|Out-File)\b|open\s*\([^)]*,\s*['"][wa]/

const HTTP_CLIENT = /\b(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|requests\.\w+|httpx\.\w+|urllib\b|urlopen|http\.client|aiohttp|axios)\b|\bfetch\s*\(/i

const BROWSER_READ = /\b(?:new_tab|goto_url|navigate)\s*\(|Page\.navigate/

const BROWSER_EXTRACT = /\bjs\s*\(|Runtime\.evaluate|querySelector|innerText|textContent/

const WRITE_METHOD = /(?:-X|--request|-Method)\s*['"]?(?:POST|PUT|PATCH|DELETE)\b|\s(?:-d|--data(?:-raw|-binary|-urlencode)?|-F|--form|--json)\s|method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]|\b(?:requests|httpx|session|client)\.(?:post|put|patch|delete)\s*\(/i

const URL = /https?:\/\/[^\s'"`)<>\]]+/gi

const SHORTENERS: readonly string[] = ['t.co', 'bit.ly', 'tinyurl.com', 'lnkd.in', 'goo.gl', 'ow.ly', 'buff.ly', 'dlvr.it', 'rebrand.ly', 'is.gd', 'shorturl.at', 'redd.it', 'youtu.be', 'fb.me']

const PLATFORM_HOSTS: Readonly<Record<string, readonly string[]>> = {
  twitter: ['x.com', 'twitter.com', 'twimg.com'],
  discord: ['discord.com', 'discordapp.com'],
  slack: ['slack.com'],
  instagram: ['instagram.com', 'cdninstagram.com'],
  reddit: ['reddit.com'],
  facebook: ['facebook.com', 'messenger.com', 'fb.com'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
}

const API_PATH = /\/(?:i\/api|api|graphql|voyager|oauth)\b|\.json(?:\?|$)/i

function hostOf(url: string): string {
  try {
    return new globalThis.URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function within(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

export function platformOfHost(host: string): string | null {
  for (const [platform, domains] of Object.entries(PLATFORM_HOSTS)) if (domains.some((d) => within(host, d))) return platform
  return null
}

function tablesIn(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(SQL_TABLE)) if (!SQL_NOISE.has(m[1].toLowerCase())) out.add(m[1])
  return [...out]
}

function clip(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export function logDbHits(text: string): HandRolledHit[] {
  if (VACUUM_COPY.test(text)) return []
  if (!LOG_DB.test(text) && !REPO_DB.test(text)) return []
  if (!DB_ACCESS.test(text)) return []
  const tables = tablesIn(text)
  const target = `log.db${tables.length ? ` (${tables.join(', ')})` : ''}`
  const hits: HandRolledHit[] = []
  const write = SQL_WRITE.test(text)
  const read = /\bSELECT\b/i.test(text) || !write
  if (read) hits.push({ kind: 'readsData', target, why: `reads log.db directly: ${clip(text)}` })
  if (write) hits.push({ kind: 'actsOnData', target, why: `writes log.db directly: ${clip(text)}` })
  return hits
}

export function stateFileHits(text: string): HandRolledHit[] {
  const found = STATE_FILE.exec(text)
  if (!found) return []
  const target = `~/.logCli/${found[1]}${found[2] ? `/${found[2]}` : ''}`
  if (FILE_WRITE.test(text)) return [{ kind: 'actsOnData', target, why: `changes log's own files by hand: ${clip(text)}` }]
  if (FILE_READ.test(text)) return [{ kind: 'readsData', target, why: `reads log's own files by hand: ${clip(text)}` }]
  return []
}

export function httpHits(text: string, browser = false): HandRolledHit[] {
  const client = HTTP_CLIENT.test(text)
  const navigates = browser && BROWSER_READ.test(text) && BROWSER_EXTRACT.test(text)
  if (!client && !navigates) return []
  const kind: HandRolledKind = WRITE_METHOD.test(text) ? 'actsOnData' : 'readsData'
  const hits: HandRolledHit[] = []
  const seen = new Set<string>()
  for (const url of text.match(URL) ?? []) {
    const host = hostOf(url)
    if (!host || seen.has(host)) continue
    if (SHORTENERS.some((s) => within(host, s))) {
      seen.add(host)
      hits.push({ kind: 'readsData', target: `a link (${host})`, why: `resolves a link by hand: ${clip(text)}` })
      continue
    }
    const platform = platformOfHost(host)
    if (platform) {
      seen.add(host)
      const api = API_PATH.test(url) || /^api\./.test(host)
      const how = client ? (kind === 'actsOnData' ? 'sends to' : 'calls') : 'opens and reads'
      hits.push({ kind: client ? kind : 'readsData', target: `${platform} ${api ? 'API' : 'web page'} (${host})`, why: `${how} ${platform} by hand: ${clip(text)}` })
      continue
    }
    if (client && /(?:\s-\w*I\w*\s|--head\b|-Method\s+Head)/i.test(` ${text} `) && /\blocation\b/i.test(text)) {
      seen.add(host)
      hits.push({ kind: 'readsData', target: `a link (${host})`, why: `resolves a link by hand: ${clip(text)}` })
    }
  }
  return hits
}

export function textHits(text: string, browser = false): HandRolledHit[] {
  return [...logDbHits(text), ...stateFileHits(text), ...httpHits(text, browser)]
}
