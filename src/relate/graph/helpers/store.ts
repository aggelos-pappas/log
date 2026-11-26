import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readdirSync } from 'node:fs'
import type { Connection, Database as GraphDatabase } from '@relate/relate'
import type { Ask, GraphStore } from '../types'

type Relate = typeof import('@relate/relate')

type Native = { disconnect: (handle: unknown) => number; close: (handle: unknown) => number }

let relate: Relate | null = null

let native: Native | null = null

export function relateLib(): Relate {
  relate ??= require('@relate/relate') as Relate
  return relate
}

function nativeLib(): Native {
  if (native) return native
  const from = createRequire(require.resolve('@relate/relate'))
  const koffi = from('koffi') as { load: (path: string) => { func: (signature: string) => (handle: unknown) => number } }
  const libPath = process.env.RELATE_LIB || (() => {
    const dir = join(dirname(from.resolve(`@relate/relate-${process.platform}-${process.arch}/package.json`)), 'lib')
    const name = readdirSync(dir).find((f) => /relate_ffi\.(dll|so|dylib)$/.test(f))
    return join(dir, name ?? '')
  })()
  const lib = koffi.load(libPath)
  native = { disconnect: lib.func('int relate_disconnect(void *conn)'), close: lib.func('int relate_database_close(void *db)') }
  return native
}

const handleOf = (value: GraphDatabase | Connection): unknown => (value as unknown as { handle: unknown }).handle

export function askOf(conn: Connection): Ask {
  return async (cypher, params = {}) => (await conn.queryAsync(cypher, params as never)).rows as Record<string, unknown>[]
}

export function openStore(file: string, options: { readOnly?: boolean } = {}): GraphStore {
  const db = relateLib().Database.open(file, options.readOnly ? { readOnly: true } : undefined)
  const conns: Connection[] = []
  let closed = false
  const connect = (): Connection => {
    const conn = db.connect()
    conns.push(conn)
    return conn
  }
  return {
    file,
    db,
    connect,
    release(conn) {
      const at = conns.indexOf(conn)
      if (at < 0) return
      conns.splice(at, 1)
      try {
        nativeLib().disconnect(handleOf(conn))
      } catch {}
    },
    close() {
      if (closed) return
      closed = true
      const lib = nativeLib()
      for (const conn of conns.splice(0)) {
        try {
          lib.disconnect(handleOf(conn))
        } catch {}
      }
      lib.close(handleOf(db))
    },
  }
}

export async function withReadOnlyStore<T>(file: string, work: (ask: Ask, conn: Connection) => Promise<T>): Promise<T> {
  const store = openStore(file, { readOnly: true })
  try {
    const conn = store.connect()
    return await work(askOf(conn), conn)
  } finally {
    store.close()
  }
}
