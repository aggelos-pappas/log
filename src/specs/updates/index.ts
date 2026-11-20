import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const VERSION = 'src/release/version/client.ts'
const CHECK = 'src/release/check/client.ts'
const APPLY = 'src/release/apply/client.ts'
const EFFECTS = 'src/release/apply/helpers/effects.ts'
const VERSION_CLI = 'src/cli/version/index.ts'
const UPDATE_CLI = 'src/cli/update/index.ts'
const ANSWERS = 'src/agentHooks/answers/client.ts'
const STORAGE_HOOK = 'scripts/hooks/storage.ts'
const BIN = 'bin/log.ts'

export const updates = {
  description: 'log knows its version, checks for a newer release at most once a day in the background, tells the CLI, the agent once per session and the console, and updates only with the owner\'s yes, rolling back on failure and resuming what ran',
  specPath: 'docs/specs/updates.md',
  codePaths: [VERSION, CHECK, APPLY, EFFECTS, VERSION_CLI, UPDATE_CLI, ANSWERS, STORAGE_HOOK, BIN],
  anchors: {
    'REQ-UPDATE-01': [
      { kind: 'symbol', file: VERSION, name: 'packageFacts' },
      { kind: 'symbol', file: VERSION, name: 'gitCommit' },
      { kind: 'symbol', file: VERSION, name: 'installKindOf' },
      { kind: 'symbol', file: VERSION_CLI, name: 'versionInfo' },
      { kind: 'uses', file: VERSION_CLI, name: 'installKindOf' },
    ],
    'REQ-UPDATE-02': [
      { kind: 'symbol', file: CHECK, name: 'fetchLatest' },
      { kind: 'symbol', file: CHECK, name: 'checkDue' },
      { kind: 'symbol', file: CHECK, name: 'checkForUpdate' },
      { kind: 'symbol', file: CHECK, name: 'claimBackgroundCheck' },
      { kind: 'symbol', file: CHECK, name: 'refreshInBackground' },
      { kind: 'symbol', file: VERSION, name: 'compareVersions' },
      { kind: 'uses', file: BIN, name: 'afterCommand' },
    ],
    'REQ-UPDATE-03': [
      { kind: 'symbol', file: CHECK, name: 'cliNotice' },
      { kind: 'symbol', file: CHECK, name: 'agentNotice' },
      { kind: 'symbol', file: CHECK, name: 'consoleNotice' },
      { kind: 'symbol', file: CHECK, name: 'updateSettings' },
      { kind: 'uses', file: ANSWERS, name: 'agentNotice' },
      { kind: 'uses', file: STORAGE_HOOK, name: 'agentNotice' },
    ],
    'REQ-UPDATE-04': [
      { kind: 'symbol', file: APPLY, name: 'runUpdate' },
      { kind: 'symbol', file: APPLY, name: 'planText' },
      { kind: 'symbol', file: APPLY, name: 'writeResumeFile' },
      { kind: 'symbol', file: EFFECTS, name: 'liveUpdateDeps' },
      { kind: 'uses', file: UPDATE_CLI, name: 'runUpdate' },
      { kind: 'string', file: UPDATE_CLI, includes: 'update.auto' },
    ],
  },
  rubrics: {
    'REQ-UPDATE-01': noul('Does log version answer the package version, the git commit only in a clone, the install kind (gitClone with .git, bunGlobal under bun\'s global node_modules, else other) and the newest known release with checkedAt, as text or --json, and is --version an alias of it?'),
    'REQ-UPDATE-02': noul('Does fetchLatest read the GitHub Release first and npm dist-tags as the fallback with a 2 s timeout and null offline; does checkForUpdate ask only when checkDue (24 h or a channel change) or forced and keep the answer in update.json; and do afterCommand and the prompt hook start the check detached through refreshInBackground, claimed once, so no command waits on it?'),
    'REQ-UPDATE-03': noul('Is cliNotice one stderr line only when a newer release is known and stderr is a terminal; does agentNotice add its line once per session per release (toldSessions) and the updated line once, through the storage hook; does consoleNotice end console start; and do update.check, update.auto (default ask) and update.channel come from settings.json with the LOG_UPDATE_* variables winning?'),
    'REQ-UPDATE-04': noul('Does log update without --apply only plan; does --apply refuse without --approvedBy and refuse the update.auto approver unless update.auto is auto; and does runUpdate refuse with updateBusy before stopping anything while a job or send stays busy, write resume.json before stopping, roll back and restart what ran on an install, after-install or verify failure, and otherwise restart what ran, reload the Hermes plugin and record the updated line?'),
    unspecifiedBehavior: noul('Does any path install a new version without the owner\'s approval, block a command on the network check, stop running services while a send is in flight, or leave what was running stopped after a failed update, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-UPDATE-01': MET,
    'REQ-UPDATE-02': MET,
    'REQ-UPDATE-03': MET,
    'REQ-UPDATE-04': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
