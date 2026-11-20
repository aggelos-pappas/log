import { afterAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../../storage/schema/index'
import { classifyCall, handRolledAdvice, handRolledText, listHandRolled, normaliseCall, recordHandRolled } from './index'

const REPO = join(import.meta.dir, '..', '..', '..')
const SCRATCH = 'C:/Users/someone/AppData/Local/hermes/cache/scratch'
const DB = 'C:/Users/someone/.logCli/log.db'

const ONE_OFF_TS = [
  "import { Database } from 'bun:sqlite'",
  `const db = new Database('${DB}', { readonly: true })`,
  "const rows = db.query(`SELECT c.platform, m.senderLabel, m.text, m.sentAt FROM messages m JOIN chats c ON c.chatId = m.chatId WHERE m.senderLabel LIKE '%grace%' ORDER BY m.sentAt DESC LIMIT 60`).all()",
  'console.log(JSON.stringify(rows, null, 2))',
].join('\n')

const HEREDOC_RUN = [`S=${SCRATCH}`, "cat > $S/oneOff.ts << 'EOF'", ONE_OFF_TS, 'EOF', 'bun $S/oneOff.ts'].join('\n')

const EXECUTE_CODE_WRITE_AND_RUN = [
  'from hermes_tools import write_file, terminal',
  `S = "${SCRATCH}"`,
  `src = """${ONE_OFF_TS}"""`,
  'write_file(f"{S}/oneOff.ts", src)',
  'out = terminal(f"bun {S}/oneOff.ts")',
  'print(out["output"][:4000])',
].join('\n')

const EXECUTE_CODE_HEREDOC = ['from hermes_tools import terminal', `r = terminal("""${HEREDOC_RUN}""")`, 'print(r)'].join('\n')

const LINK = 'curl -sSI https://t.co/AbCdEf1234 | grep -i location'

const readings = (verdict: ReturnType<typeof classifyCall>) => verdict.hits.map((h) => `${h.kind} ${h.target}`)

describe('normalising each host tool into commands, written files and code', () => {
  test('a heredoc that writes a scratch script and runs it in the same command', () => {
    const call = normaliseCall('Bash', { command: HEREDOC_RUN })
    expect(call.writtenFiles).toEqual([{ path: `${SCRATCH}/oneOff.ts`, content: ONE_OFF_TS }])
    expect(call.effectiveCommands).toEqual([`bun ${SCRATCH}/oneOff.ts`])
  })

  test('Hermes execute_code: terminal() and write_file() inside the Python are unwrapped', () => {
    const call = normaliseCall('execute_code', { code: EXECUTE_CODE_WRITE_AND_RUN })
    expect(call.writtenFiles.map((f) => f.path)).toEqual([`${SCRATCH}/oneOff.ts`])
    expect(call.writtenFiles[0].content).toContain('bun:sqlite')
    expect(call.effectiveCommands).toEqual([`bun ${SCRATCH}/oneOff.ts`])
    const nested = normaliseCall('mcp__execute_code', { code: EXECUTE_CODE_HEREDOC })
    expect(nested.writtenFiles.map((f) => f.path)).toEqual([`${SCRATCH}/oneOff.ts`])
  })

  test('Codex: a shell argv and an apply_patch that adds a file', () => {
    expect(normaliseCall('shell', { command: ['bash', '-lc', 'echo hi && ls'] }).effectiveCommands).toEqual(['echo hi', 'ls'])
    const patch = ['*** Begin Patch', '*** Add File: probe.py', '+import sqlite3', '+print(1)', '*** End Patch'].join('\n')
    expect(normaliseCall('apply_patch', { input: patch }).writtenFiles).toEqual([{ path: 'probe.py', content: 'import sqlite3\nprint(1)\n' }])
  })

  test('a tool_call wrapper is opened, a log tool inside it is kept apart, delegate_task is out of scope', () => {
    const wrapped = normaliseCall('mcp__tool_call', { calls: [{ name: 'terminal', arguments: { command: LINK } }, { name: 'mcp__log__twitterDms', arguments: { account: 'xAccount' } }] })
    expect(wrapped.effectiveCommands).toEqual([LINK])
    expect(wrapped.logTools).toEqual(['mcp__log__twitterDms'])
    expect(normaliseCall('delegate_task', { context: ONE_OFF_TS }).skipped).toEqual(['delegate_task'])
  })
})

describe('what is labelled hand-rolled', () => {
  test('the scratch script over log.db, written and run in one heredoc', () => {
    const verdict = classifyCall('Bash', { command: HEREDOC_RUN })
    expect(verdict.handRolled).toBe(true)
    expect(verdict.kinds).toEqual(['readsData'])
    expect(verdict.target).toBe('log.db (messages, chats)')
    expect(verdict.why).toContain(`${SCRATCH}/oneOff.ts`)
  })

  test('the same one-off through Hermes execute_code, written with write_file and run with terminal()', () => {
    expect(readings(classifyCall('execute_code', { code: EXECUTE_CODE_WRITE_AND_RUN }))).toEqual(['readsData log.db (messages, chats)'])
    expect(readings(classifyCall('mcp__execute_code', { code: EXECUTE_CODE_HEREDOC }))).toEqual(['readsData log.db (messages, chats)'])
  })

  test('a scratch script written by a write tool, then run in a later call', () => {
    expect(readings(classifyCall('write_file', { path: `${SCRATCH}/oneOff.ts`, content: ONE_OFF_TS }))).toEqual(['readsData log.db (messages, chats)'])
    expect(readings(classifyCall('Write', { file_path: 'oneOff.ts', content: ONE_OFF_TS }))).toEqual(['readsData log.db (messages, chats)'])
    const later = classifyCall('terminal', { command: 'cd /c/Users/someone && bun oneOff.ts' }, { readScript: (p) => (p === 'oneOff.ts' ? ONE_OFF_TS : null) })
    expect(readings(later)).toEqual(['readsData log.db (messages, chats)'])
    expect(later.why).toContain('runs the scratch script oneOff.ts')
  })

  test('resolving a link with curl', () => {
    const verdict = classifyCall('Bash', { command: LINK })
    expect(readings(verdict)).toEqual(['readsData a link (t.co)'])
    expect(readings(classifyCall('mcp__tool_call', { calls: [{ name: 'terminal', arguments: JSON.stringify({ command: LINK }) }] }))).toEqual(['readsData a link (t.co)'])
  })

  test('Python straight at log.db, a one-off -c and sqlite3 on the shell', () => {
    const code = ['import sqlite3, os', "db = sqlite3.connect(os.path.expanduser('~/.logCli/log.db'))", "print(db.execute('SELECT kind, count(*) FROM chats GROUP BY kind').fetchall())"].join('\n')
    expect(readings(classifyCall('execute_code', { code }))).toEqual(['readsData log.db (chats)'])
    expect(readings(classifyCall('Bash', { command: `python -c "import sqlite3;print(sqlite3.connect('${DB}').execute('select count(*) from events').fetchone())"` }))).toEqual(['readsData log.db (events)'])
    expect(readings(classifyCall('shell', { command: ['bash', '-lc', 'sqlite3 ~/.logCli/log.db "SELECT count(*) FROM messages"'] }))).toEqual(['readsData log.db (messages)'])
  })

  test('acting on data: an UPDATE on log.db, a POST to a platform API, a write into log state', () => {
    expect(readings(classifyCall('Bash', { command: `sqlite3 ~/.logCli/log.db "UPDATE chats SET name = 'grace_ships' WHERE chatId = 'x'"` }))).toEqual(['actsOnData log.db (chats)'])
    const post = ['import requests', "requests.post('https://discord.com/api/v9/channels/1/messages', json={'content': 'hi'}, headers=h)"].join('\n')
    expect(readings(classifyCall('execute_code', { code: post }))).toEqual(['actsOnData discord API (discord.com)'])
    expect(readings(classifyCall('write_file', { path: 'C:/Users/someone/.logCli/inbox/hermesPush.json', content: '{}' }))).toEqual(['actsOnData ~/.logCli/inbox/hermesPush.json'])
  })

  test('reading log state files and a platform page from the browser', () => {
    expect(readings(classifyCall('PowerShell', { command: 'Get-Content ~/.logCli/twitter/xAccount/session.json' }))).toEqual(['readsData ~/.logCli/twitter/xAccount'])
    const page = ['new_tab("https://x.com/grace_ships")', 'wait_for_load()', `print(js("document.querySelector('article').innerText"))`].join('\n')
    expect(readings(classifyCall('browser_exec', { code: page }))).toEqual(['readsData twitter web page (x.com)'])
    const api = `print(js("fetch('https://x.com/i/api/graphql/abc/UserTweets').then(r => r.json())"))`
    expect(readings(classifyCall('mcp__browser_exec', { code: api }))).toEqual(['readsData twitter API (x.com)'])
  })
})

describe('what is never labelled', () => {
  const quiet: [string, Record<string, unknown>][] = [
    ['Bash', { command: 'git add -A && git commit -q -F C:/tmp/msg.txt' }],
    ['Bash', { command: 'gh api repos/owner/log/commits?sha=main' }],
    ['Bash', { command: 'bun test src/agentHooks && bunx tsc --noEmit -p .' }],
    ['Bash', { command: 'LOG_DB=C:/scratch/log.db bun bin/log.ts people show grace_ships' }],
    ['Bash', { command: `bun -e "new (require('bun:sqlite').Database)('${DB}',{readonly:true}).exec(\\"VACUUM INTO 'C:/scratch/log.db'\\")"` }],
    ['Bash', { command: 'tail -n 40 ~/.logCli/mcp/2026-11-19.log' }],
    ['Bash', { command: 'ls -la ~/.logCli/log.db && df -h' }],
    ['Bash', { command: 'curl -s http://127.0.0.1:4317/health' }],
    ['Write', { file_path: 'C:/repo/src/people/client.ts', content: "import { openDatabase } from '../storage/schema/index'\nexport const rows = () => openDatabase().query('SELECT * FROM messages').all()" }],
    ['execute_code', { code: "p = 'C:/Users/someone/.logCli/devlog/2026-11-19.md'\ns = open(p, encoding='utf-8').read()\nopen(p, 'w', encoding='utf-8').write(s.replace('<fill in>', 'done'))" }],
    ['mcp__log__people', { who: 'grace_ships' }],
    ['mcp__tool_call', { calls: [{ name: 'mcp__log__twitterDms', arguments: { account: 'xAccount' } }] }],
    ['delegate_task', { context: HEREDOC_RUN }],
    ['Bash', { command: 'git commit -m "read log.db with SELECT * FROM messages"' }],
  ]
  for (const [tool, input] of quiet) {
    test(`${tool}: ${JSON.stringify(input).slice(0, 80)}`, () => {
      const verdict = classifyCall(tool, input, { readScript: () => null })
      expect(verdict.hits).toEqual([])
      expect(verdict.handRolled).toBe(false)
    })
  }
})

describe('the advice and the record', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handRolled-'))
  const dbPath = join(dir, 'log.db')
  afterAll(() => {
    openDatabase(dbPath).close()
    Bun.gc(true)
  })

  test('the advice names the label, the target and the guide, and never blocks', () => {
    const text = handRolledAdvice(classifyCall('Bash', { command: HEREDOC_RUN }), 3)
    expect(text).toContain('HAND-ROLLED (readsData)')
    expect(text).toContain('log.db (messages, chats)')
    expect(text).toContain('getGuide({ useCase: "log/toolFromOneOff" })')
    expect(text).toContain('toolScaffold')
    expect(text).toContain('advice, not a block')
    expect(text).toContain('come up 3 times')
    expect(handRolledAdvice(classifyCall('Bash', { command: 'git status' }))).toBe('')
  })

  test('each hit is counted in log.db so a recurring one-off shows', () => {
    const handle = openDatabase(dbPath)
    const verdict = classifyCall('Bash', { command: HEREDOC_RUN })
    expect(recordHandRolled(verdict, 1000, handle)).toBe(1)
    expect(recordHandRolled(classifyCall('execute_code', { code: EXECUTE_CODE_WRITE_AND_RUN }), 2000, handle)).toBe(2)
    recordHandRolled(classifyCall('Bash', { command: LINK }), 3000, handle)
    const listed = listHandRolled(handle)
    expect(listed.map((r) => [r.target, r.count])).toEqual([['log.db (messages, chats)', 2], ['a link (t.co)', 1]])
    expect(listed[0].tools.sort()).toEqual(['Bash', 'execute_code'])
    expect(listed[0].firstAt).toBe(1000)
  })

  test('the warm service answers the same advice in process, counting each hit, and nothing for a quiet call', () => {
    const counted: string[] = []
    const record = (verdict: { target: string }) => (counted.push(verdict.target), 4)
    const text = handRolledText(JSON.stringify({ tool_name: 'Bash', tool_input: { command: LINK } }), record)
    expect(text).toContain('a link (t.co)')
    expect(text).toContain('come up 4 times')
    expect(counted).toEqual(['a link (t.co)'])
    expect(handRolledText(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }), record)).toBe('')
    expect(handRolledText('not json', record)).toBe('')
    expect(counted).toHaveLength(1)
  })

  test('the hook script answers each host in its own shape and exits 0', () => {
    const env = { ...process.env, LOG_DB: dbPath }
    const run = (argv: string[], input: unknown) => spawnSync('bun', [join(REPO, 'scripts/hooks/handRolled.ts'), ...argv], { input: JSON.stringify(input), encoding: 'utf8', env, windowsHide: true })
    const claude = run([], { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: LINK } })
    expect(claude.status).toBe(0)
    const body = JSON.parse(claude.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } }
    expect(body.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(body.hookSpecificOutput.additionalContext).toContain('a link (t.co)')
    const hermes = run(['--host', 'hermes'], { tool_name: 'terminal', tool_input: { command: LINK } })
    expect(Object.keys(JSON.parse(hermes.stdout))).toEqual(['context'])
    const quietRun = run([], { tool_name: 'Bash', tool_input: { command: 'git status' } })
    expect(quietRun.status).toBe(0)
    expect(quietRun.stdout).toBe('')
  })
})
