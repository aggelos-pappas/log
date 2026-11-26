import { noul } from 'jev-spec'
import type { RequirementAnchors } from '../anchors/types'
import { MET, NOT_VIOLATED } from '../types'

const types = 'src/inbox/pipeline/types.ts'
const client = 'src/inbox/pipeline/client.ts'
const features = 'src/inbox/pipeline/helpers/features.ts'
const model = 'src/inbox/pipeline/helpers/model.ts'
const store = 'src/inbox/pipeline/helpers/store.ts'
const teach = 'src/inbox/pipeline/helpers/teach.ts'
const emotion = 'src/inbox/pipeline/helpers/emotion.ts'
const fallback = 'src/inbox/pipeline/helpers/fallback.ts'
const bench = 'scripts/pipeline/benchFallback.ts'
const label = 'src/inbox/label/client.ts'
const labelTypes = 'src/inbox/label/types.ts'
const cli = 'src/cli/inbox/index.ts'
const push = 'src/inbox/push/client.ts'
const pushScript = 'scripts/hooks/push.ts'
const pending = 'src/inbox/pending/client.ts'
const trainer = 'scripts/pipeline/trainHead.py'
const manifest = 'src/models/manifest/types.ts'
const migrations = 'src/storage/schema/helpers/migrations.ts'
const outcomes = 'src/inbox/outcomes/client.ts'
const outcomeTypes = 'src/inbox/outcomes/types.ts'
const outcomeSources = 'src/inbox/outcomes/helpers/sources.ts'
const outcomeStats = 'src/inbox/outcomes/helpers/stats.ts'
const outcomeRender = 'src/inbox/outcomes/helpers/render.ts'

const anchors: RequirementAnchors = {
  'REQ-PIPELINE-01': [
    { kind: 'symbol', file: types, name: 'WHO_LABELS' },
    { kind: 'symbol', file: types, name: 'WHERE_LABELS' },
    { kind: 'symbol', file: types, name: 'SALES_WHO' },
    { kind: 'symbol', file: client, name: 'pipelineLabels' },
    { kind: 'uses', file: label, name: 'SALES_WHO' },
    { kind: 'uses', file: cli, name: 'SALES_WHO' },
  ],
  'REQ-PIPELINE-02': [
    { kind: 'symbol', file: label, name: 'oldLabelOf' },
    { kind: 'symbol', file: labelTypes, name: 'OLD_LABEL_FIELDS' },
    { kind: 'uses', file: label, name: 'OLD_LABEL_FIELDS' },
  ],
  'REQ-PIPELINE-03': [
    { kind: 'symbol', file: client, name: 'labelChats' },
    { kind: 'symbol', file: features, name: 'windowText' },
    { kind: 'symbol', file: features, name: 'featuresOf' },
    { kind: 'symbol', file: features, name: 'botSignal' },
    { kind: 'uses', file: features, name: 'BOT_NAMES' },
    { kind: 'symbol', file: model, name: 'buildPrototypes' },
    { kind: 'symbol', file: model, name: 'withExemplars' },
    { kind: 'symbol', file: model, name: 'guessOf' },
    { kind: 'value', file: types, name: 'WINDOW_MESSAGES', equals: 20 },
    { kind: 'value', file: types, name: 'BOT_THRESHOLD', equals: 0.7 },
  ],
  'REQ-PIPELINE-04': [
    { kind: 'symbol', file: model, name: 'applyLayer' },
    { kind: 'symbol', file: teach, name: 'trainingSet' },
    { kind: 'symbol', file: teach, name: 'uvTrainer' },
    { kind: 'symbol', file: store, name: 'saveHead' },
    { kind: 'string', file: trainer, includes: 'LogisticRegression' },
    { kind: 'string', file: migrations, includes: 'pipelineHeads' },
  ],
  'REQ-PIPELINE-05': [
    { kind: 'string', file: migrations, includes: 'chatPipeline' },
    { kind: 'symbol', file: client, name: 'pushLabeller' },
    { kind: 'symbol', file: client, name: 'modelTag' },
    { kind: 'symbol', file: client, name: 'pipelineLine' },
    { kind: 'symbol', file: emotion, name: 'localEmotions' },
    { kind: 'string', file: manifest, includes: 'SamLowe/roberta-base-go_emotions-onnx' },
    { kind: 'uses', file: push, name: 'PUSH_LABEL_WAIT_MS' },
    { kind: 'uses', file: pushScript, name: 'pushLabeller' },
    { kind: 'uses', file: pending, name: 'pipelineLine' },
  ],
  'REQ-PIPELINE-06': [
    { kind: 'symbol', file: client, name: 'labelQueue' },
    { kind: 'value', file: types, name: 'QUEUE_SIZE', equals: 35 },
    { kind: 'uses', file: cli, name: 'labelQueue' },
  ],
  'REQ-PIPELINE-07': [
    { kind: 'symbol', file: teach, name: 'teachPlan' },
    { kind: 'symbol', file: teach, name: 'teach' },
    { kind: 'value', file: types, name: 'SUBQ_USD_PER_MILLION_INPUT', equals: 0.04 },
    { kind: 'uses', file: cli, name: 'teachPlan' },
    { kind: 'uses', file: label, name: 'TEACHER_BY' },
  ],
  'REQ-PIPELINE-08': [
    { kind: 'symbol', file: outcomes, name: 'sendsOfPerson' },
    { kind: 'symbol', file: outcomes, name: 'stageAt' },
    { kind: 'symbol', file: outcomes, name: 'reportOf' },
    { kind: 'symbol', file: outcomes, name: 'sinceOf' },
    { kind: 'symbol', file: outcomeSources, name: 'sendRecordIds' },
    { kind: 'symbol', file: outcomeSources, name: 'playOfQueue' },
    { kind: 'symbol', file: outcomeSources, name: 'agentSends' },
    { kind: 'symbol', file: outcomeStats, name: 'matchedWindow' },
    { kind: 'symbol', file: outcomeStats, name: 'wilson' },
    { kind: 'symbol', file: outcomeRender, name: 'outcomeBlocks' },
    { kind: 'value', file: outcomeTypes, name: 'ONE_TO_ONE_SHARE', equals: 0.95 },
    { kind: 'value', file: outcomeTypes, name: 'POSITIVE_AT', equals: 0.5 },
    { kind: 'uses', file: cli, name: 'outcomesOf' },
  ],
  'REQ-PIPELINE-09': [
    { kind: 'symbol', file: fallback, name: 'fallbackReason' },
    { kind: 'symbol', file: fallback, name: 'queueForTeacher' },
    { kind: 'symbol', file: fallback, name: 'drainTeacher' },
    { kind: 'symbol', file: fallback, name: 'startTeacher' },
    { kind: 'symbol', file: fallback, name: 'subqDailyUsd' },
    { kind: 'uses', file: client, name: 'queueForTeacher' },
    { kind: 'uses', file: pushScript, name: 'startTeacher' },
    { kind: 'value', file: types, name: 'FALLBACK_BELOW', equals: 0.5 },
    { kind: 'value', file: types, name: 'SUBQ_DAILY_USD', equals: 0.05 },
    { kind: 'value', file: types, name: 'RETRAIN_AFTER', equals: 50 },
    { kind: 'symbol', file: bench, name: 'BARS' },
  ],
  'REQ-PIPELINE-10': [
    { kind: 'symbol', file: model, name: 'botVerdict' },
    { kind: 'symbol', file: fallback, name: 'humanTalk' },
    { kind: 'symbol', file: fallback, name: 'withoutFalseBot' },
    { kind: 'uses', file: label, name: 'withoutFalseBot' },
    { kind: 'uses', file: client, name: 'humanTalk' },
  ],
}

export const pipeline = {
  description: 'Who each person is and where they are: two owner-editable fields per chat, labelled on the CPU by the shipped MiniLM with a trained head, emotion as a feature, an active-learning queue and a one-off SubQ pass',
  specPath: 'docs/specs/pipeline.md',
  codePaths: [types, client, features, model, store, teach, emotion, label, labelTypes, cli, push, pushScript, pending, trainer, manifest, migrations, fallback, bench, outcomes, outcomeTypes, outcomeSources, outcomeStats, outcomeRender],
  anchors,
  rubrics: {
    'REQ-PIPELINE-01': noul('Are who and where two lists with a one-line meaning per label that the owner can replace under pipelineLabels in settings.json, and do guessOf, setLabel, labelOfChat and log inbox label keep a where only for a lead or a client?'),
    'REQ-PIPELINE-02': noul('Does labelOfChat map who and where back to the seven old labels (bot skip, friend or partner friend, client client, won lead client, lost or quiet lead cold, community never readyToAsk, otherwise the counting rules), and do old friend and client entries read as who friend and client?'),
    'REQ-PIPELINE-03': noul('Does labelChats embed the last WINDOW_MESSAGES said messages marked me and them, score them against prototypes from each label meaning and its seed phrases (plus owner-labelled chats once every who has one), add the counting features, call a chat a bot only through botVerdict (botSignal at BOT_THRESHOLD and the teacher) with no stage, apply goneQuiet and new from the counting rules, and keep groups as community without embedding them?'),
    'REQ-PIPELINE-04': noul('Does trainHead.py fit a logistic regression on the stored vectors and scaled features from owner labels and confident SubQ labels, is the head stored in pipelineHeads, and does guessOf apply the newest head on the CPU when its labels match the owner lists and fall back to prototypes otherwise?'),
    'REQ-PIPELINE-05': noul('Is each chat stored in chatPipeline with who, where, confidence, margin, scores, features, vector, the message that last moved it and the top emotions of the latest inbound message, relabelled only when the last message or the labeller changed, does the push run pushLabeller before each batch waiting at most PUSH_LABEL_WAIT_MS, and does the conversation block show pipelineLine?'),
    'REQ-PIPELINE-06': noul('Does labelQueue return up to QUEUE_SIZE chats by uncertainty, round by round across platforms, skipping groups and owner-labelled chats, and does log inbox label take who and where from the owner?'),
    'REQ-PIPELINE-07': noul('Does log inbox label teach print the chats, input tokens and dollars without sending anything unless --apply, store each SubQ answer by subq with its confidence and candidates when unsure, and never replace an owner label?'),
    'REQ-PIPELINE-08': noul('Does log inbox outcomes read log.db only, split one-to-one dm sends into log sends (send record ids, sent queue items by text, send-tool spans) and hand sends, take each log send play from the last guide or play skill of its agent session or its queue name, count both sides only since log first sent on the account and each window only once passed, and report raw Wilson rates, median reply time and moved-on rates per platform, who, stage and play next to a person-and-stage Mantel-Haenszel match with a bootstrap interval over people, warmth odds ratios with --feelings, and a block view with --json?'),
    'REQ-PIPELINE-09': noul('Does labelChats queue a chat for SubQ through fallbackReason (no teacher label, a stale label, a likely stage change, a bot signal the teacher has not confirmed, or confidence under FALLBACK_BELOW after UNSURE_MIN_NEW new messages), never for an owner-labelled chat, and does drainTeacher run off the push path in batches of TEACH_BATCH, keep to the subqDailyUsd cap, log each run in log.db, store answers by subq with throughSeq and retrain the head after RETRAIN_AFTER new teacher labels?'),
    'REQ-PIPELINE-10': noul('Does a chat become a bot only when botVerdict holds (the bot signal at BOT_THRESHOLD and the teacher or owner saying bot) and never when humanTalk finds a two-way conversation or the chat is with an account the owner runs, in guessOf, labelOfChat and pipelineLine?'),
    unspecifiedBehavior: noul('Does any pipeline code send a platform message, call SubQ other than through teach --apply or the capped background drain, or overwrite a label the owner set, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-PIPELINE-01': MET,
    'REQ-PIPELINE-02': MET,
    'REQ-PIPELINE-03': MET,
    'REQ-PIPELINE-04': MET,
    'REQ-PIPELINE-05': MET,
    'REQ-PIPELINE-06': MET,
    'REQ-PIPELINE-07': MET,
    'REQ-PIPELINE-08': MET,
    'REQ-PIPELINE-09': MET,
    'REQ-PIPELINE-10': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
