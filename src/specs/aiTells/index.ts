import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const WM = 'src/twitter/copy/watermark/client.ts'
const SEND = 'src/twitter/post/send/client.ts'
const TELLS = 'src/voice/aiTells/client.ts'
const TYPES = 'src/voice/aiTells/types.ts'
const VOICE = 'src/cli/twitter/helpers/voice.ts'
const DISCORD = 'src/cli/discord/index.ts'
const CONV = 'src/voice/conventions/client.ts'
const CONV_TYPES = 'src/voice/conventions/types.ts'
const CORPUS = 'src/voice/conventions/helpers/corpus.ts'
const FRESH = 'src/voice/conventions/helpers/fresh.ts'
const PROFILE = 'src/voice/conventions/helpers/profile.ts'
const TRAIN = 'src/voice/conventions/helpers/train.ts'
const TRAIN_CLI = 'src/cli/twitter/helpers/voiceTrain.ts'

export const aiTells = {
  description: 'The watermark reading of every X and Discord send and the AI tells reading of every gated draft',
  specPath: 'docs/specs/aiTells.md',
  codePaths: [
    'src/twitter/copy/watermark/client.ts',
    'src/twitter/copy/watermark/types.ts',
    'src/twitter/post/send/client.ts',
    'src/voice/aiTells/client.ts',
    'src/voice/aiTells/types.ts',
    'src/voice/aiTells/helpers/jina.ts',
    'src/cli/twitter/helpers/voice.ts',
    'src/cli/twitter/helpers/send.ts',
    'src/cli/twitter/helpers/queue.ts',
    'src/cli/discord/index.ts',
    'src/voice/conventions/client.ts',
    'src/voice/conventions/types.ts',
    'src/voice/conventions/helpers/corpus.ts',
    'src/voice/conventions/helpers/fresh.ts',
    'src/voice/conventions/helpers/profile.ts',
    'src/voice/conventions/helpers/train.ts',
    'src/cli/twitter/helpers/voiceTrain.ts',
    'python/voiceConventions/train.py',
  ],
  anchors: {
    'REQ-AITELLS-01': [
      { kind: 'symbol', file: WM, name: 'watermarkReadingOf' },
      { kind: 'string', file: WM, includes: 'unknown' },
    ],
    'REQ-AITELLS-02': [
      { kind: 'symbol', file: SEND, name: 'planSend' },
      { kind: 'string', file: SEND, includes: 'aiArtifacts' },
    ],
    'REQ-AITELLS-03': [{ kind: 'symbol', file: WM, name: 'watermarkLine' }],
    'REQ-AITELLS-04': [
      { kind: 'symbol', file: TELLS, name: 'valeRules' },
      { kind: 'symbol', file: TELLS, name: 'ruleHits' },
      { kind: 'string', file: TELLS, includes: 'valeAiTells' },
    ],
    'REQ-AITELLS-05': [
      { kind: 'symbol', file: TELLS, name: 'aiPhrases' },
      { kind: 'symbol', file: TELLS, name: 'buildAiIndex' },
      { kind: 'value', file: TYPES, name: 'JINA_EMBED_MODEL', equals: 'jina-embeddings-v5-omni-small' },
      { kind: 'symbol', file: 'src/voice/aiTells/helpers/jina.ts', name: 'jinaEmbedder' },
      { kind: 'string', file: TELLS, includes: 'feedHive' },
      { kind: 'string', file: TELLS, includes: 'sanderFrentz' },
      { kind: 'string', file: TELLS, includes: 'sicarius' },
      { kind: 'string', file: TELLS, includes: 'aiExamples' },
      { kind: 'string', file: TELLS, includes: 'xComplaints' },
    ],
    'REQ-AITELLS-06': [{ kind: 'value', file: TYPES, name: 'X_COMPLAINT_KEEP', equals: 0.6 }],
    'REQ-AITELLS-07': [{ kind: 'symbol', file: TELLS, name: 'percentile' }],
    'REQ-AITELLS-08': [
      { kind: 'value', file: TYPES, name: 'MUTE_IF_OWNER_USES', equals: 0.02 },
      { kind: 'symbol', file: TELLS, name: 'mutedRules' },
    ],
    'REQ-AITELLS-09': [
      { kind: 'value', file: TYPES, name: 'OWNER_SAYS_IT_TIMES', equals: 5 },
      { kind: 'symbol', file: TELLS, name: 'ownersOwnPhrases' },
    ],
    'REQ-AITELLS-10': [
      { kind: 'symbol', file: TELLS, name: 'chunksOf' },
      { kind: 'value', file: TYPES, name: 'JINA_RERANK_MODEL', equals: 'jina-reranker-v3.5' },
    ],
    'REQ-AITELLS-11': [{ kind: 'symbol', file: TELLS, name: 'readAiTells' }],
    'REQ-AITELLS-12': [
      { kind: 'symbol', file: VOICE, name: 'ensureAiIndex' },
      { kind: 'symbol', file: VOICE, name: 'aiIndexStale' },
      { kind: 'symbol', file: TRAIN_CLI, name: 'aiTellsMode' },
    ],
    'REQ-AITELLS-14': [
      { kind: 'symbol', file: CORPUS, name: 'agentSessionDrafts' },
      { kind: 'symbol', file: CORPUS, name: 'ownerMessages' },
      { kind: 'symbol', file: CORPUS, name: 'saveCorpus' },
      { kind: 'symbol', file: TRAIN, name: 'ownerSample' },
      { kind: 'symbol', file: TRAIN_CLI, name: 'recordDrafts' },
      { kind: 'string', file: 'src/storage/schema/helpers/migrations.ts', includes: 'conventionCorpus' },
    ],
    'REQ-AITELLS-15': [
      { kind: 'symbol', file: FRESH, name: 'freshMoments' },
      { kind: 'symbol', file: FRESH, name: 'freshPrompt' },
      { kind: 'symbol', file: FRESH, name: 'runFresh' },
      { kind: 'value', file: CONV_TYPES, name: 'SPEND_CAP_USD', equals: 3 },
      { kind: 'string', file: TRAIN, includes: 'spendOverCap' },
    ],
    'REQ-AITELLS-16': [
      { kind: 'symbol', file: PROFILE, name: 'buildProfile' },
      { kind: 'symbol', file: PROFILE, name: 'habitsOf' },
      { kind: 'symbol', file: PROFILE, name: 'repeatedOpeners' },
      { kind: 'value', file: CONV_TYPES, name: 'NGRAM_MIN_RATIO', equals: 8 },
    ],
    'REQ-AITELLS-17': [
      { kind: 'symbol', file: CONV, name: 'probabilityOf' },
      { kind: 'symbol', file: CONV, name: 'charGramsOf' },
      { kind: 'symbol', file: TRAIN, name: 'pythonFit' },
      { kind: 'string', file: 'python/voiceConventions/train.py', includes: 'gramWeights' },
    ],
    'REQ-AITELLS-18': [
      { kind: 'symbol', file: TRAIN, name: 'calibrateBands' },
      { kind: 'symbol', file: TRAIN, name: 'bandThreshold' },
      { kind: 'symbol', file: TRAIN, name: 'gramCutoff' },
      { kind: 'symbol', file: TRAIN, name: 'bandMutedRules' },
      { kind: 'value', file: CONV_TYPES, name: 'OWNER_PASS', equals: 0.95 },
      { kind: 'value', file: CONV_TYPES, name: 'ABSTAIN_BELOW_WORDS', equals: 3 },
      { kind: 'symbol', file: TRAIN, name: 'trainLines' },
    ],
    'REQ-AITELLS-19': [
      { kind: 'symbol', file: CONV, name: 'readConventions' },
      { kind: 'symbol', file: CONV, name: 'conventionsLine' },
      { kind: 'value', file: CONV_TYPES, name: 'RULE_MUTE_SHARE', equals: 0.005 },
      { kind: 'value', file: CONV_TYPES, name: 'GRAM_BUDGET', equals: 0.02 },
    ],
    'REQ-AITELLS-13': [
      { kind: 'symbol', file: DISCORD, name: 'discordSendCommand' },
      { kind: 'string', file: DISCORD, includes: 'aiArtifacts' },
    ],
  },
  rubrics: {
    'REQ-AITELLS-01': noul('Does watermarkReadingOf set level to artifacts when any finding is deterministic, stylistic when there are only non-deterministic findings, clean when there are none, and always set statistical to unknown?'),
    'REQ-AITELLS-02': noul('Does planSend return ok false, naming what was found, when watermarkReadingOf gives level artifacts for the text?'),
    'REQ-AITELLS-03': noul('Does planSend put the watermark reading on an allowed plan, and do both the direct send command and the queue run send log watermarkLine(plan.watermark)?'),
    'REQ-AITELLS-04': noul('Does valeRules read the substitution and existence rules from the vale-ai-tells styles folder, and does readAiTells run ruleHits on the text and set pass to false when there is any hit?'),
    'REQ-AITELLS-05': noul('Does aiPhrases add the tokens of the vale-ai-tells rules before it reads feedHive and the other lists, does buildAiIndex call embedder.embed on the text of every phrase, and does voiceDeps in the voice command make aiEmbedder return jinaEmbedder()?'),
    'REQ-AITELLS-06': noul('Does buildAiIndex keep an X_COMPLAINT phrase only when its best cosine to a curated phrase is at least X_COMPLAINT_KEEP, and drop it otherwise?'),
    'REQ-AITELLS-07': noul("Does buildAiIndex measure the owner's own replies against the phrase vectors and store their p50 and p99 with percentile in the baseline?"),
    'REQ-AITELLS-08': noul('Does mutedRules mute a rule that hits in more than MUTE_IF_OWNER_USES of the replies, and does readAiTells skip the muted rules?'),
    'REQ-AITELLS-09': noul('Does ownersOwnPhrases count, for each vale rule match, how many of the replies contain it and keep the matches with at least OWNER_SAYS_IT_TIMES, does buildAiIndex store them as baseline.ownersPhrases, and does readAiTells put index.baseline.ownersPhrases into the muted set it passes to ruleHits?'),
    'REQ-AITELLS-10': noul('Does readAiTells cut the text with chunksOf into lines and word windows, find each chunk\'s best phrase by cosine, and rerank the closest with embedder.rerank?'),
    'REQ-AITELLS-11': noul("Does readAiTells set flagged when the closest cosine score is above the baseline p99, and pass only when there are no hits and it is not flagged?"),
    'REQ-AITELLS-12': noul('Does gateReadings call ensureAiIndex and openAiIndex only when aiTellsMode() is jina, and otherwise read the frontier-conventions detector instead?'),
    'REQ-AITELLS-14': noul('Is the AI side of the corpus stored in conventionCorpus by saveCorpus from agentSessionDrafts, recordDrafts, draftsFromFile and runFresh, and does ownerMessages leave out texts in the AI set and messages within SEND_WINDOW_MS of a send span, with ownerSample weighting recent messages more?'),
    'REQ-AITELLS-15': noul('Does trainConventions print the planFresh estimate before any model call, refuse with spendOverCap when it is over the spend cap, and does runFresh stop before a call that would pass the cap and store each option with its model and family beside the real reply for the same moment?'),
    'REQ-AITELLS-16': noul('Does buildProfile keep only n-grams with ratio at least NGRAM_MIN_RATIO, seen in NGRAM_MIN_CHATS chats and in at most GRAM_MAX_OWNER_SHARE of his messages, with his nearest real message, and does a habit flag only under HABIT_MAX_OWNER_SHARE for him and at HABIT_MIN_RATIO or more?'),
    'REQ-AITELLS-17': noul('Does train.py fit char 2-4 gram tf-idf plus the embedding with GroupKFold by chat for out-of-fold probabilities, and does probabilityOf apply the exported vocabulary, idf, weights and bias the same way as scikit-learn?'),
    'REQ-AITELLS-18': noul('Does calibrateBands set each band line so at most 1 - OWNER_PASS of his held-out messages in the band are flagged with the fold habit flags counted, keep n-grams above gramCutoff and mute rules with bandMutedRules per band, abstain under ABSTAIN_BELOW_WORDS words or below BAND_MIN_AUC, and does trainLines print his flagged and the AI caught per band and per family and the latency?'),
    'REQ-AITELLS-19': noul('Does readConventions flag only on the band line or a band habit, name each over-used n-gram with his nearest phrasing, each habit with both rates and each unmuted rule hit, and give a value from 1 at his band median to 0 at the line less FLAG_COST and RULE_COST per flag?'),
    'REQ-AITELLS-13': noul('Does discordSendCommand call watermarkReadingOf on the text before the dry run or any send, refuse without calling directDiscord when the level is artifacts, and otherwise log watermarkLine(watermark) and put watermark in its dry run and --json output?'),
    unspecifiedBehavior: noul('Does a draft or send pass the watermark or AI tells reading by a route the specification does not describe, such as planSend allowing artifacts or readAiTells passing despite a vale hit?'),
  },
  assertions: {
    'REQ-AITELLS-01': MET,
    'REQ-AITELLS-02': MET,
    'REQ-AITELLS-03': MET,
    'REQ-AITELLS-04': MET,
    'REQ-AITELLS-05': MET,
    'REQ-AITELLS-06': MET,
    'REQ-AITELLS-07': MET,
    'REQ-AITELLS-08': MET,
    'REQ-AITELLS-09': MET,
    'REQ-AITELLS-10': MET,
    'REQ-AITELLS-11': MET,
    'REQ-AITELLS-12': MET,
    'REQ-AITELLS-13': MET,
    'REQ-AITELLS-14': MET,
    'REQ-AITELLS-15': MET,
    'REQ-AITELLS-16': MET,
    'REQ-AITELLS-17': MET,
    'REQ-AITELLS-18': MET,
    'REQ-AITELLS-19': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
