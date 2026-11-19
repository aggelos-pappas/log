import { PLACE_KINDS } from '../types'
import type { Chunk, Conversation, Place, PlaceKind } from '../types'

function namedAfter(box: string, word: string): string | undefined {
  const rest = box.slice(word.length).trim()
  return rest || undefined
}

export function placeFromBox(platform: string, box: string, conversationId = ''): Place {
  const first = box.split('+')[0].trim()
  const word = first.split(' ')[0]
  if (PLACE_KINDS.includes(word as PlaceKind) && word !== 'dm') return { kind: word as PlaceKind, ...(namedAfter(first, word) ? { channel: namedAfter(first, word) } : {}) }
  if (platform === 'twitter' && /^g\d/.test(conversationId)) return { kind: 'group' }
  return { kind: 'dm' }
}

export function placeOf(conversation: Conversation): Place {
  return conversation.place ?? placeFromBox(conversation.platform, conversation.box, conversation.conversationId)
}

export function chunkPlace(chunk: Chunk): Place | null {
  return chunk.place ?? null
}

export function whereSaid(platform: string, place: Place | null, people: string[], account = ''): string {
  const named = people.filter((p) => p && p !== account)
  if (!place) return `${platform} with @${named.join(', @')}`
  if (place.kind === 'dm') return `${platform} dm @${named[0] ?? 'them'}`
  if (place.kind === 'group') return `${platform} group ${place.channel ? `${place.channel} ` : ''}(${named.join(', ')})`
  if (place.kind === 'replies') return `${platform} replies${place.channel ? ` under "${place.channel}"` : ''}`
  if (place.kind === 'post') return `${platform} post${place.server ? ` in ${place.server}` : ''}${place.channel ? ` "${place.channel}"` : ''}`
  const server = place.server ?? (place.serverId ? `server ${place.serverId}` : '')
  return `${platform} ${place.kind}${server ? ` ${server}` : ''}${place.channel ? ` #${place.channel}` : ' (name not kept)'}`
}

export function placeMatches(place: Place | null, wanted: { kind?: string; server?: string; channel?: string }): boolean {
  if (!wanted.kind && !wanted.server && !wanted.channel) return true
  if (!place) return false
  const same = (have: string | undefined, want: string) => (have ?? '').toLowerCase().replace(/^#/, '') === want.toLowerCase().replace(/^#/, '')
  if (wanted.kind && place.kind !== wanted.kind) return false
  if (wanted.server && !same(place.server, wanted.server) && !same(place.serverId, wanted.server)) return false
  if (wanted.channel && !same(place.channel, wanted.channel)) return false
  return true
}
