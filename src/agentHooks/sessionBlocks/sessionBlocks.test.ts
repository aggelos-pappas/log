import { describe, expect, test } from 'bun:test'
import { accountsFingerprint, freshBlock, memoryBlockStore, numbersOut } from './index'
import { enginesAnswer, storageAnswer } from '../answers/client'
import { handRolledText } from '../handRolled/client'

const raw = (session: string, extra: Record<string, unknown> = {}) => JSON.stringify({ session_id: session, ...extra })
const ACCOUNTS = [
  "log-cli accounts: each one's session (the platform's own answer) and what its governor allowed today:",
  "  twitter xAccount: session loggedIn (11/21 01:33 the owner's time), no requests today, its one session open (pid 17824 since 11/20 23:00 the owner's time, 14 calls)",
  "  reddit redditAccount: session unknown (11/20 15:45 the owner's time), 120/500 requests, 0/40 writes today",
].join('\n')

describe('a block is said once per session and again only when it changes', () => {
  test('the same text is said on the first turn of each session and not on the next', () => {
    const store = memoryBlockStore()
    expect(freshBlock('storage', 'a', 'disk low', 'disk low', store)).toBe('disk low')
    expect(freshBlock('storage', 'a', 'disk low', 'disk low', store)).toBe('')
    expect(freshBlock('storage', 'b', 'disk low', 'disk low', store)).toBe('disk low')
    expect(freshBlock('storage', 'a', 'disk full', 'disk full', store)).toBe('disk full')
    expect(freshBlock('storage', 'a', 'disk low', 'disk low', store, true)).toBe('disk low')
  })

  test('call counts, pids and clocks do not bring the accounts block back; a state or writes change does', () => {
    const busier = ACCOUNTS.replace('14 calls', '95 calls').replace('pid 17824', 'pid 17340').replace('01:33', '02:10').replace('120/500', '160/500')
    expect(accountsFingerprint(busier)).toBe(accountsFingerprint(ACCOUNTS))
    expect(accountsFingerprint(ACCOUNTS.replace('0/40 writes', '1/40 writes'))).not.toBe(accountsFingerprint(ACCOUNTS))
    expect(accountsFingerprint(ACCOUNTS.replace('loggedIn', 'loggedOut'))).not.toBe(accountsFingerprint(ACCOUNTS))
    expect(numbersOut('disk has 3.1 GB free')).toBe(numbersOut('disk has 2.9 GB free'))
  })

  test('the storage and engines answers stay quiet on a later turn of the same session, and speak after a compaction', () => {
    const store = memoryBlockStore()
    const verdict = () => 'disk has 3.1 GB free'
    expect(storageAnswer(raw('s1'), verdict, { event: 'UserPromptSubmit', store }).context).toContain('3.1 GB')
    expect(storageAnswer(raw('s1'), () => 'disk has 3.0 GB free', { event: 'UserPromptSubmit', store }).context ?? '').not.toContain('GB')
    expect(storageAnswer(raw('s1', { source: 'compact' }), verdict, { event: 'SessionStart', store }).context).toContain('3.1 GB')
    const repo = process.cwd()
    expect(enginesAnswer('UserPromptSubmit', repo, raw('s2'), () => ACCOUNTS, { store }).context).toContain('xAccount')
    expect(enginesAnswer('UserPromptSubmit', repo, raw('s2'), () => ACCOUNTS.replace('14 calls', '15 calls'), { store }).context ?? '').not.toContain('xAccount')
    expect(enginesAnswer('UserPromptSubmit', repo, raw('s2'), () => ACCOUNTS.replace('loggedIn', 'loggedOut'), { store }).context).toContain('loggedOut')
  })

  test('hand-rolled advice for one target is shown once per session, every call still counted', () => {
    const store = memoryBlockStore()
    let counted = 0
    const call = (session: string) => handRolledText(raw(session, { tool_name: 'Bash', tool_input: { command: 'curl -sSI https://t.co/AbCdEf1234 | grep -i location' } }), () => ++counted, store)
    expect(call('h1')).toContain('HAND-ROLLED')
    expect(call('h1')).toBe('')
    expect(call('h2')).toContain('HAND-ROLLED')
    expect(counted).toBe(3)
  })
})
