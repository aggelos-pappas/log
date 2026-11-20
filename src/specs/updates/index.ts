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
const HARNESSES = 'src/release/harnesses/client.ts'
const HERMES = 'src/agentHooks/hermes/client.ts'
const SESSIONS = 'src/agentHooks/sessionOffsets/client.ts'
const HARNESS = 'src/agentHooks/harness/client.ts'
const MANIFEST = 'src/models/manifest/types.ts'
const MANIFEST_CLIENT = 'src/models/manifest/client.ts'
const STORE = 'src/models/store/client.ts'
const STORE_EFFECTS = 'src/models/store/helpers/effects.ts'
const MODELS_CLI = 'src/cli/models/index.ts'
const EMBED_WORKER = 'src/search/conversations/helpers/embedWorker.ts'
const DESCRIBER = 'src/media/describer/helpers/model.ts'
const JUDGE = 'python/judge/server.py'
const POST_INSTALL = 'src/release/postInstall/client.ts'
const POST_INSTALL_EFFECTS = 'src/release/postInstall/helpers/effects.ts'
const POST_INSTALL_SCRIPT = 'scripts/update/postInstall.ts'
const INSTALL_SH = 'site/apps/web/public/install.sh'
const INSTALL_PS1 = 'site/apps/web/public/install.ps1'
const TABLE = 'src/release/table/client.ts'
const TABLE_SCRIPT = 'scripts/docs/releasesTable.ts'

export const updates = {
  description: 'log knows its version, checks for a newer release at most once a day in the background, tells the CLI, the agent once per session and the console, and updates only with the owner\'s yes, rolling back on failure and resuming what ran',
  specPath: 'docs/specs/updates.md',
  codePaths: [VERSION, CHECK, APPLY, EFFECTS, VERSION_CLI, UPDATE_CLI, ANSWERS, STORAGE_HOOK, BIN, HARNESSES, HERMES, SESSIONS, HARNESS, MANIFEST, MANIFEST_CLIENT, STORE, STORE_EFFECTS, MODELS_CLI, EMBED_WORKER, DESCRIBER, JUDGE, POST_INSTALL, POST_INSTALL_EFFECTS, POST_INSTALL_SCRIPT, INSTALL_SH, INSTALL_PS1, TABLE, TABLE_SCRIPT],
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
    'REQ-UPDATE-05': [
      { kind: 'symbol', file: HARNESSES, name: 'refreshHarnesses' },
      { kind: 'symbol', file: HARNESSES, name: 'harnessesText' },
      { kind: 'symbol', file: HERMES, name: 'installHermesDesktop' },
      { kind: 'uses', file: HARNESSES, name: 'installOpenCode' },
      { kind: 'uses', file: APPLY, name: 'harnessesText' },
      { kind: 'symbol', file: SESSIONS, name: 'SESSION_KEYS' },
      { kind: 'symbol', file: HARNESS, name: 'antigravityPromptPayload' },
    ],
    'REQ-UPDATE-06': [
      { kind: 'symbol', file: MANIFEST, name: 'LOCAL_MODELS' },
      { kind: 'symbol', file: MANIFEST_CLIENT, name: 'revisionOf' },
      { kind: 'symbol', file: MANIFEST_CLIENT, name: 'pipSpecs' },
      { kind: 'symbol', file: STORE, name: 'checkModels' },
      { kind: 'symbol', file: STORE, name: 'fetchModels' },
      { kind: 'symbol', file: STORE, name: 'hfCacheDir' },
      { kind: 'symbol', file: STORE_EFFECTS, name: 'liveModelsDeps' },
      { kind: 'uses', file: MODELS_CLI, name: 'fetchModels' },
      { kind: 'uses', file: EMBED_WORKER, name: 'revisionOf' },
      { kind: 'symbol', file: STORE, name: 'readyPinned' },
      { kind: 'uses', file: EMBED_WORKER, name: 'pinnedModelReady' },
      { kind: 'uses', file: DESCRIBER, name: 'pinnedModelReady' },
      { kind: 'uses', file: DESCRIBER, name: 'revisionOf' },
      { kind: 'symbol', file: JUDGE, name: 'on_pinned_revision' },
      { kind: 'value', file: JUDGE, name: 'MODEL_REVISION', equals: '2484cc9a13550aa4f2c29b577ff3ef331dc6ba07' },
      { kind: 'uses', file: VERSION_CLI, name: 'LOCAL_MODELS' },
    ],
    'REQ-UPDATE-07': [
      { kind: 'symbol', file: POST_INSTALL, name: 'runPostInstall' },
      { kind: 'symbol', file: POST_INSTALL, name: 'parsePostInstall' },
      { kind: 'symbol', file: POST_INSTALL_EFFECTS, name: 'PYTHON_VENDORS' },
      { kind: 'symbol', file: POST_INSTALL_EFFECTS, name: 'livePostInstallDeps' },
      { kind: 'uses', file: POST_INSTALL_SCRIPT, name: 'runPostInstall' },
      { kind: 'uses', file: EFFECTS, name: 'parsePostInstall' },
      { kind: 'string', file: INSTALL_SH, includes: 'scripts/update/postInstall.ts' },
      { kind: 'string', file: INSTALL_SH, includes: 'LOG_VERSION' },
      { kind: 'string', file: INSTALL_PS1, includes: 'LOG_VERSION' },
    ],
    'REQ-UPDATE-08': [
      { kind: 'symbol', file: TABLE, name: 'parseChangelog' },
      { kind: 'symbol', file: TABLE, name: 'recordModels' },
      { kind: 'symbol', file: TABLE, name: 'modelsCell' },
      { kind: 'symbol', file: TABLE, name: 'renderReleases' },
      { kind: 'symbol', file: TABLE, name: 'releaseProblems' },
      { kind: 'uses', file: TABLE_SCRIPT, name: 'withReleases' },
      { kind: 'uses', file: TABLE_SCRIPT, name: 'modelPins' },
    ],
  },
  rubrics: {
    'REQ-UPDATE-01': noul('Does log version answer the package version, the git commit only in a clone, the install kind (gitClone with .git, bunGlobal under bun\'s global node_modules, else other) and the newest known release with checkedAt, as text or --json, and is --version an alias of it?'),
    'REQ-UPDATE-02': noul('Does fetchLatest read the GitHub Release first and npm dist-tags as the fallback with a 2 s timeout and null offline; does checkForUpdate ask only when checkDue (24 h or a channel change) or forced and keep the answer in update.json; and do afterCommand and the prompt hook start the check detached through refreshInBackground, claimed once, so no command waits on it?'),
    'REQ-UPDATE-03': noul('Is cliNotice one stderr line only when a newer release is known and stderr is a terminal; does agentNotice add its line once per session per release (toldSessions) and the updated line once, through the storage hook; does consoleNotice end console start; and do update.check, update.auto (default ask) and update.channel come from settings.json with the LOG_UPDATE_* variables winning?'),
    'REQ-UPDATE-04': noul('Does log update without --apply only plan; does --apply refuse without --approvedBy and refuse the update.auto approver unless update.auto is auto; and does runUpdate refuse with updateBusy before stopping anything while a job or send stays busy, write resume.json before stopping, roll back and restart what ran on an install, after-install or verify failure, and otherwise restart what ran, reload the Hermes plugin and record the updated line?'),
    'REQ-UPDATE-05': noul('After an install or a rollback, does refreshHarnesses run with the new code over every hook host, re-running installHermes (which copies the Desktop plugin to <HERMES_HOME>/desktop-plugins/log/plugin.js only when it changed) and reloading the Hermes plugin, re-running installOpenCode, and checking the other harnesses by their hook file, leaving absent harnesses alone; are the results in the resume record and the answer; and does each harness hook reach the storage hook with its own session id so its agent is told once per session?'),
    'REQ-UPDATE-06': noul('Does LOCAL_MODELS list every local model with an exact revision and its files with size and hash; do the embed worker and media describer pass revisionOf(model) to transformers.js with the cache under hfCacheDir, and the judge server pass revision=MODEL_REVISION and re-download when its recorded commit differs; does log models report each model as ready, missing, mismatched, notInstalled or wrongVersion without changing anything; and does --fetch, only with --approvedBy, keep matching files, move a matching old copy, else download the pinned file, check its hash, remove a mismatch and refuse with modelFetchFailed, with every effect through ModelsDeps?'),
    'REQ-UPDATE-07': noul('Do install.ps1 and install.sh install LOG_VERSION, else the newest GitHub Release, else npm latest, refuse a different installed version than LOG_VERSION, run scripts/update/postInstall.ts (vendors with the pinned pip models, migrations, skills, models, harnesses through runPostInstall) and end with the installed version; and does log update run the new version postInstall.ts without harnesses, fail and roll back only on a vendor, migration or skills failure, and report the models in its answer and resume.json?'),
    'REQ-UPDATE-08': noul('Does every CHANGELOG.md release carry a Models line written by recordModels from the manifest; does releasesTable render the README Releases table newest first by semver with version, date, a one-line summary and modelsCell (not pinned, first pinned, same, changed, added, removed); does check:docs fail when the table is stale, a release lacks its Models line or the newest section is not the release manifest version; and does the release workflow run it on the release PR branch?'),
    unspecifiedBehavior: noul('Does any path install a new version without the owner\'s approval, block a command on the network check, stop running services while a send is in flight, or leave what was running stopped after a failed update, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-UPDATE-01': MET,
    'REQ-UPDATE-02': MET,
    'REQ-UPDATE-03': MET,
    'REQ-UPDATE-04': MET,
    'REQ-UPDATE-05': MET,
    'REQ-UPDATE-06': MET,
    'REQ-UPDATE-07': MET,
    'REQ-UPDATE-08': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
