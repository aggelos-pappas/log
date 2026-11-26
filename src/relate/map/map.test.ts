import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index.ts'
import { buildGraph } from '../graph/index.ts'
import { seedMachineWorld, MACHINE_NOW, MACHINE_PEOPLE } from '../machine/fixtures/machineWorld.ts'
import { mapFrom } from './mapFrom.ts'

function world() {
  const dir = mkdtempSync(join(process.env.TMPDIR ?? '.', 'mapTest'))
  const db = join(dir, 'log.db')
  const handle = openDatabase(db)
  seedMachineWorld(handle)
  buildGraph(db, new Date(MACHINE_NOW))
  return db
}

describe('the network map from the Relate graph', () => {
  test('draws real people in rings with the rooms and edges that exist', async () => {
    const db = world()
    const { pointerOf, readFromFile, readOffset } = await import('../graph/index.ts')
    const handle = openDatabase(db)
    const pointer = pointerOf(db, handle)!
    const answer = await readFromFile(pointer.file, async (ask) => mapFrom(ask, { person: MACHINE_PEOPLE.walker.handle }, (await readOffset(ask))?.throughSeq ?? pointer.throughSeq, handle, MACHINE_NOW))
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    const block = answer.block
    expect(block.type).toBe('networkMap')
    expect(block.rings.map((r) => r.id)).toEqual([1, 2, 3, 4])
    expect(block.nodes.length).toBeGreaterThan(2)
    const handles = block.nodes.map((n) => n.handle.replace(/^@/, ''))
    expect(handles).toContain(MACHINE_PEOPLE.walker.handle)
    expect(handles).toContain(MACHINE_PEOPLE.waiting.handle)
    for (const node of block.nodes) {
      expect(node.why.length).toBeGreaterThan(4)
      expect(node.machine.type).toBe('stateMachine')
      expect(node.machine.states.length).toBeGreaterThan(0)
      expect(new Set(node.machine.states.map((s) => s.id)).size).toBe(node.machine.states.length)
      expect(node.facts.length).toBeLessThanOrEqual(3)
    }
    const ivy = block.nodes.find((n) => n.handle.includes(MACHINE_PEOPLE.walker.handle))!
    expect(ivy.rooms.length).toBeGreaterThan(0)
    expect(ivy.rooms.some((r) => r.name.toLowerCase().includes('agent') || r.kind === 'dm')).toBe(true)
    expect(ivy.why).toMatch(/ring|reply|group|direct|wrote|follow/i)
    const direct = block.edges.find((e) => e.kind === 'direct' && (e.a === 'owner' || e.b === 'owner') && (e.a === ivy.key || e.b === ivy.key))
    expect(direct).toBeDefined()
    expect(block.edges.some((e) => e.kind === 'shared')).toBe(true)
    for (const e of block.edges) {
      for (const end of [e.a, e.b]) if (end !== 'owner') expect(block.nodes.map((n) => n.key)).toContain(end)
    }
    expect(block.path.length).toBeGreaterThan(1)
    expect(block.path[0].handle).toBe('You')
    expect(block.path.at(-1)!.handle).toContain(MACHINE_PEOPLE.walker.handle)
    expect(block.path[1].room).toBeTruthy()
    expect(answer.text).toContain('@' + MACHINE_PEOPLE.walker.handle)
  })

  test('keeps bots out and pages through a cursor for the next slice', async () => {
    const db = world()
    const { pointerOf, readFromFile } = await import('../graph/index.ts')
    const handle = openDatabase(db)
    const pointer = pointerOf(db, handle)!
    const first = await readFromFile(pointer.file, async (ask) => mapFrom(ask, { limit: 2 }, pointer.throughSeq, handle, MACHINE_NOW))
    const second = await readFromFile(pointer.file, async (ask) => mapFrom(ask, { limit: 2, cursor: 2 }, pointer.throughSeq, handle, MACHINE_NOW))
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.block.nodes.length).toBeLessThanOrEqual(2)
    expect(first.block.nextCursor).toBe(2)
    expect(second.block.cursor).toBe(2)
    const all = [...first.block.nodes, ...second.block.nodes].map((n) => n.handle.toLowerCase())
    expect(all.some((h) => /(^|[^a-z])bot([^a-z]|$)/.test(h))).toBe(false)
  })
})
