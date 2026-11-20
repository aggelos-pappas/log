import { accountsFingerprint, freshBlock, memoryBlockStore, numbersOut } from '../../../src/agentHooks/sessionBlocks/index'
import { classifyCall, handRolledAdvice, handRolledText } from '../../../src/agentHooks/handRolled/index'
import { diskFree, runsBytes, storageVerdict } from '../../../src/browser/runStore/index'
import { engineContext } from '../../../src/directApi/engine/index'

export interface BenchTurn {
  session: string
  prompt: string
  at: number
  tools: { name: string; args: unknown }[]
}

export interface BlockTokens {
  turns: number
  handRolledCalls: number
  before: { storage: number; accounts: number; handRolled: number; perTurn: number }
  after: { storage: number; accounts: number; handRolled: number; perTurn: number }
}

const HERMES_HAND_ROLLED = /^(?:mcp__)?(?:terminal|execute_code|write_file|browser_exec|tool_call|patch)$/
const HERMES_HINT = /log\.db|\.logCli|https?:\/\/|sqlite|requests\.|urllib|httpx|fetch\(|curl|wget|\.(?:ts|py|js|mjs)\b/i

const tokens = (text: string) => Math.ceil(text.length / 4)

export async function blockTokens(turns: readonly BenchTurn[], storage: string = storageVerdict(runsBytes(), diskFree()) ?? '', accounts: string = engineContext()): Promise<BlockTokens> {
  const store = memoryBlockStore()
  const before = { storage: 0, accounts: 0, handRolled: 0 }
  const after = { storage: 0, accounts: 0, handRolled: 0 }
  let lastAccounts = ''
  let handRolledCalls = 0
  for (const [i, turn] of turns.entries()) {
    const live = accounts.replace(/(\d+) calls\)/g, (_, n: string) => `${Number(n) + i} calls)`)
    before.storage += tokens(storage)
    after.storage += tokens(freshBlock('storage', turn.session, storage, numbersOut(storage), store))
    if (live !== lastAccounts) before.accounts += tokens(live)
    lastAccounts = live
    after.accounts += tokens(freshBlock('engines', turn.session, live, accountsFingerprint(live), store))
    for (const tool of turn.tools) {
      const args = (tool.args ?? {}) as Record<string, unknown>
      if (!HERMES_HAND_ROLLED.test(tool.name ?? '') || !HERMES_HINT.test(JSON.stringify(args))) continue
      const verdict = classifyCall(tool.name, args)
      if (!verdict.handRolled) continue
      handRolledCalls++
      before.handRolled += tokens(handRolledAdvice(verdict, 2))
      after.handRolled += tokens(handRolledText(JSON.stringify({ session_id: turn.session, tool_name: tool.name, tool_input: args }), () => 2, store))
    }
  }
  const perTurn = (b: typeof before) => Math.round((b.storage + b.accounts + b.handRolled) / Math.max(1, turns.length))
  return { turns: turns.length, handRolledCalls, before: { ...before, perTurn: perTurn(before) }, after: { ...after, perTurn: perTurn(after) } }
}
