import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { defaultDbPath } from '../../storage/schema/index.ts'
import { GraphUnreadable, pointerOf, readFromFile, readOffset } from '../graph/index.ts'
import { ownerRequest } from '../owner/helpers/index.ts'
import { mapFrom } from './mapFrom.ts'
import { MAP_READ_MS } from './types.ts'
import type { MapAnswer, MapAsk } from './types.ts'

export async function relateMap(ask: MapAsk = {}, dbPath: string = defaultDbPath(), now: number = Date.now()): Promise<MapAnswer> {
  if (!existsSync(dbPath)) return { ok: false, code: 'relateMapNoGraph', problem: `no log.db at ${dbPath}` }
  const handle = new Database(dbPath, { readonly: true })
  try {
    const reply = await ownerRequest<MapAnswer>(handle, 'map', { ask, now }, MAP_READ_MS)
    if (reply?.ok) return reply.value
    if (reply) return { ok: false, code: 'graphUnreadable', problem: reply.error }
    const pointer = pointerOf(dbPath, handle)
    if (!pointer) return { ok: false, code: 'relateMapNoGraph', problem: 'no Relate graph for this log.db yet: `log relate build` makes one' }
    try {
      return await readFromFile(pointer.file, async (read) => mapFrom(read, ask, (await readOffset(read))?.throughSeq ?? pointer.throughSeq, handle, now))
    } catch (error) {
      if (error instanceof GraphUnreadable) return { ok: false, code: 'graphUnreadable', problem: error.message }
      throw error
    }
  } finally {
    handle.close()
  }
}
