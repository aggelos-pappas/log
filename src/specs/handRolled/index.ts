import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const NORMALISE = 'src/agentHooks/handRolled/helpers/normalise.ts'
const DETECT = 'src/agentHooks/handRolled/helpers/detect.ts'
const STORE = 'src/agentHooks/handRolled/helpers/store.ts'
const CLIENT = 'src/agentHooks/handRolled/client.ts'
const SCRIPT = 'scripts/hooks/handRolled.ts'
const REGISTRY = 'src/agentHooks/registry/index.ts'
const HERMES = 'hermesPlugin/native/__init__.py'
const SCAFFOLD = 'src/scaffold/tool/client.ts'
const AST = 'src/scaffold/platform/helpers/astEdits.ts'
const NEW = 'src/cli/tool/index.ts'

export const handRolled = {
  description: 'A hand-rolled data read or action is unwrapped from every host, labelled readsData or actsOnData with its target, counted in log.db and advised, never blocked, to become a log tool, which log tool scaffold writes through the syntax tree',
  specPath: 'docs/specs/handRolled.md',
  codePaths: [NORMALISE, DETECT, STORE, CLIENT, SCRIPT, REGISTRY, HERMES, SCAFFOLD, AST, NEW],
  anchors: {
    'REQ-HANDROLLED-01': [
      { kind: 'symbol', file: NORMALISE, name: 'normaliseCall' },
      { kind: 'symbol', file: NORMALISE, name: 'shellParts' },
      { kind: 'symbol', file: NORMALISE, name: 'pythonParts' },
      { kind: 'symbol', file: NORMALISE, name: 'patchFiles' },
    ],
    'REQ-HANDROLLED-02': [
      { kind: 'symbol', file: CLIENT, name: 'classifyCall' },
      { kind: 'symbol', file: CLIENT, name: 'isScratchScript' },
      { kind: 'symbol', file: CLIENT, name: 'excludedCommand' },
      { kind: 'symbol', file: DETECT, name: 'logDbHits' },
      { kind: 'symbol', file: DETECT, name: 'stateFileHits' },
      { kind: 'symbol', file: DETECT, name: 'httpHits' },
    ],
    'REQ-HANDROLLED-03': [
      { kind: 'symbol', file: STORE, name: 'recordHandRolled' },
      { kind: 'symbol', file: STORE, name: 'listHandRolled' },
      { kind: 'uses', file: NEW, name: 'listHandRolled' },
    ],
    'REQ-HANDROLLED-04': [
      { kind: 'uses', file: SCRIPT, name: 'classifyCall' },
      { kind: 'uses', file: SCRIPT, name: 'handRolledAdvice' },
      { kind: 'uses', file: REGISTRY, name: 'HAND_ROLLED_MATCHER' },
      { kind: 'string', file: CLIENT, includes: 'advice, not a block' },
    ],
    'REQ-HANDROLLED-05': [
      { kind: 'symbol', file: SCAFFOLD, name: 'planNewTool' },
      { kind: 'symbol', file: AST, name: 'addToPropertyArray' },
      { kind: 'uses', file: NEW, name: 'planNewTool' },
      { kind: 'uses', file: NEW, name: 'applyPlan' },
    ],
  },
  rubrics: {
    'REQ-HANDROLLED-01': noul('Does normaliseCall turn shell, write, apply_patch, execute_code, browser_exec and tool_call calls from Claude Code, Codex and Hermes into effectiveCommands, writtenFiles and code, with heredocs that cat into a file becoming written files, terminal(), subprocess, write_file, open().write and Path().write_text unwrapped from execute_code, wrapper calls normalised one by one, log MCP tools kept apart and delegate_task skipped?'),
    'REQ-HANDROLLED-02': noul('Does classifyCall label a call readsData and/or actsOnData with its target (log.db and its tables, ~/.logCli files, a platform API or page, a link), classify scratch scripts by their content whether written in the call or read from disk, and never label git, gh, bun test, tsc, log itself, a VACUUM INTO copy, the devlog, ~/.logCli/mcp logs, files inside the repo source, or log MCP tools?'),
    'REQ-HANDROLLED-03': noul('Does recordHandRolled keep one state row per label and target in log.db (scope handRolled) with a count, first and last time, tools and a sample, and does log tool scaffold with no name list them most frequent first?'),
    'REQ-HANDROLLED-04': noul('Is handRolled.ts a PreToolUse hook for Claude Code and Codex, run by the OpenCode plugin and the Antigravity adapter, and by the Hermes plugin after the call in transform_tool_result because pre_tool_call cannot advise; does it answer with advice naming the label, target and getGuide log/toolFromOneOff, and always let the call go on?'),
    'REQ-HANDROLLED-05': noul('Does planNewTool plan a command file with a rows function, a test and a use case page with asks and a steps table, plus syntax-tree edits for the import, COMMANDS, SOURCE_COMMAND_RULES and a GUIDE_TOPICS group, refusing an existing command, a bad name, a missing summary or an unknown guide before writing, and does --apply check each edit landed, write, run the docs and skills builds and touch the server so it reloads?'),
    unspecifiedBehavior: noul('Does the hand-rolled hook ever block or fail a tool call, ask the owner, or write anything other than its counted state row, or does log tool scaffold overwrite an existing file, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-HANDROLLED-01': MET,
    'REQ-HANDROLLED-02': MET,
    'REQ-HANDROLLED-03': MET,
    'REQ-HANDROLLED-04': MET,
    'REQ-HANDROLLED-05': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
