import { MAP_BLOCK } from './types.ts'

export const MAP_GENUI_FILE = ['hermesPlugin', 'genuiNetwork.json'] as const

export const MAP_GENUI_CATALOG = {
  kind: MAP_BLOCK,
  for: 'The owner’s people drawn as cards on a ring map, from the live Relate graph: a coloured ring banner for how they know the owner, their linked-platform icons, the rooms you share with member avatars, dated durable facts with the quoted message they came from, and a next move naming the log tool. Edges are only real connections (a shared room, a direct chat, a reply, mention, quote or reacted-to post). Click a card to open that person’s state machine in the same page; the machine links back to the map.',
  use_when: 'Showing the shape of the owner’s network, who connects to whom, who to talk to, or the shortest bridge to someone. Get the block from the log tool relateMap with form "genui" and pass it unchanged; mix it with text or callouts.',
  fields: 'title, summary, view: overview | person, platform, cursor, nextCursor, total. rings: [{id, label, tone, count, nodes:[key]}]. nodes: [{key, handle, name, initials, platform, platforms, ring, tone, why, rooms:[{key,name,server,kind,platform,meaning,at}], facts:[{slot,text,quote,at}], next:{text,tool}, lanes:[{platform,state}], quiet, talk, at, machine: stateMachine block}]. edges: [{a,b,kind,room,at}]. rooms: [room]. path: [{key,handle,room,at}]. target.',
  example: {
    type: MAP_BLOCK,
    title: 'Your network, drawn',
    summary: '938 people · 3 rings · shown 24',
    view: 'overview',
    cursor: 0,
    nextCursor: 24,
    total: 938,
    rings: [{ id: 1, label: 'engaged with you', tone: 'orange', count: 12, nodes: ['discord:42'] }],
    nodes: [{
      key: 'discord:42', handle: '@someone', initials: 'SO', platform: 'discord', platforms: ['discord', 'twitter'],
      ring: 1, tone: 'orange', why: 'Ring 1 — engaged; they replied in #hermes-agent',
      rooms: [{ key: 'room:1', name: 'Nous Research · #hermes-agent', server: 'Nous Research', kind: 'channel', platform: 'discord', meaning: 'You both wrote here', at: '2026-11-20T00:00:00.000Z', members: ['grace_ships'] }],
      facts: [{ slot: 'asked', text: 'for a demo', quote: 'send me the demo', at: '2026-11-20' }],
      next: { text: 'Answer their DM', tool: 'discordSend' }, lanes: [{ platform: 'discord', state: 'Engaged with you' }],
      quiet: false, talk: false, at: 1763000000000, machine: { type: 'stateMachine', states: [], transitions: [] },
    }],
    edges: [{ a: 'owner', b: 'discord:42', kind: 'direct', room: 'Direct chat', at: '2026-11-20T00:00:00.000Z' }],
    rooms: [], path: [{ key: 'owner', handle: 'You' }, { key: 'discord:42', handle: '@someone', room: 'Direct chat' }],
  },
}

export function networkMapGenuiBlock(block: Record<string, unknown>): Record<string, unknown> {
  return block
}
