import { TOKEN_MIN } from '../types'

const COMMON = new Set(['that', 'this', 'with', 'from', 'have', 'what', 'when', 'where', 'which', 'there', 'their', 'then', 'them', 'they', 'were', 'will', 'would', 'could', 'should', 'about', 'into', 'just', 'like', 'make', 'need', 'want', 'look', 'know', 'some', 'more', 'than', 'your', 'yours', 'here', 'also', 'only', 'over', 'very', 'been', 'being', 'does', 'done', 'going', 'reply', 'message', 'messages', 'post', 'posts', 'people', 'person', 'account', 'twitter', 'discord', 'slack', 'instagram', 'reddit', 'linkedin', 'facebook'])

export function mentionedTokens(prompt: string): { tagged: string[]; bare: string[] } {
  const tagged = [...new Set([...prompt.matchAll(/@([A-Za-z0-9_.]{2,40})/g)].map((m) => m[1].replace(/\.+$/, '').toLowerCase()))]
  const bare = [...new Set((prompt.match(/[A-Za-z0-9_]{4,40}/g) ?? []).map((w) => w.toLowerCase()))].filter((w) => w.length >= TOKEN_MIN && !COMMON.has(w) && !tagged.includes(w) && !/^\d+$/.test(w))
  return { tagged, bare }
}
