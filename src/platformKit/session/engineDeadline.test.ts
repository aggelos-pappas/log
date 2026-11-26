import { describe, expect, test } from 'bun:test'
import { ENGINE_CALL_MS, ENGINE_CATCH_UP_MS, engineCallMs } from './index'

describe('every engine call that only reads has a deadline', () => {
  test('a watcher catch-up read gets the short deadline, other reads the long one, and a live write none', () => {
    expect(engineCallMs({ action: 'read', catchUp: true })).toBe(ENGINE_CATCH_UP_MS)
    expect(engineCallMs({ action: 'chats' })).toBe(ENGINE_CALL_MS)
    expect(engineCallMs({ action: 'send', live: true })).toBeNull()
    expect(engineCallMs({ action: 'watch', streamProgress: true })).toBeNull()
  })
})
