import { noul } from 'jev-spec'
import type { RequirementAnchors } from '../anchors/types'
import { MET, NOT_VIOLATED } from '../types'

const client = 'src/relate/graph/client.ts'
const types = 'src/relate/graph/types.ts'
const project = 'src/relate/graph/helpers/project.ts'
const mentions = 'src/relate/graph/helpers/mentions.ts'
const cli = 'src/cli/relate/index.ts'
const answers = 'src/agentHooks/answers/client.ts'
const registry = 'src/agentHooks/registry/index.ts'
const searched = 'src/relate/search/client.ts'
const searchedTypes = 'src/relate/search/types.ts'

const anchors: RequirementAnchors = {
  'REQ-RELATE-01': [
    { kind: 'symbol', file: project, name: 'projectionOf' },
    { kind: 'symbol', file: project, name: 'readOnce' },
    { kind: 'string', file: project, includes: 'FROM handleAliases' },
    { kind: 'uses', file: project, name: 'ownerHandles' },
  ],
  'REQ-RELATE-02': [
    { kind: 'symbol', file: client, name: 'buildGraph' },
    { kind: 'symbol', file: client, name: 'writeProjection' },
    { kind: 'symbol', file: client, name: 'prune' },
    { kind: 'value', file: types, name: 'KEPT_SNAPSHOTS', equals: 3 },
    { kind: 'string', file: client, includes: 'relateGraphBuilding' },
    { kind: 'uses', file: client, name: 'readOnly' },
  ],
  'REQ-RELATE-03': [
    { kind: 'symbol', file: client, name: 'verifyGraph' },
    { kind: 'symbol', file: client, name: 'countsIn' },
    { kind: 'symbol', file: client, name: 'expectedCounts' },
  ],
  'REQ-RELATE-04': [
    { kind: 'symbol', file: client, name: 'workspaceOf' },
    { kind: 'symbol', file: client, name: 'graphDir' },
    { kind: 'symbol', file: client, name: 'pointerOf' },
    { kind: 'value', file: types, name: 'PROJECTOR_VERSION', equals: 2 },
  ],
  'REQ-RELATE-05': [
    { kind: 'symbol', file: mentions, name: 'mentionedTokens' },
    { kind: 'symbol', file: client, name: 'findPeople' },
    { kind: 'symbol', file: answers, name: 'relateAnswer' },
    { kind: 'value', file: types, name: 'MENTIONED_PEOPLE', equals: 3 },
    { kind: 'value', file: types, name: 'TOKEN_MIN', equals: 4 },
    { kind: 'string', file: registry, includes: 'scripts/hooks/relate.ts' },
  ],
  'REQ-RELATE-06': [
    { kind: 'symbol', file: client, name: 'connectedContext' },
    { kind: 'symbol', file: client, name: 'renderContext' },
    { kind: 'value', file: types, name: 'CONTEXT_CHARS', equals: 2000 },
  ],
  'REQ-RELATE-07': [
    { kind: 'symbol', file: client, name: 'refreshGraph' },
    { kind: 'symbol', file: client, name: 'wantsRebuild' },
    { kind: 'value', file: types, name: 'REFRESH_AFTER_MS', equals: 60000 },
    { kind: 'uses', file: client, name: 'windowsHide' },
  ],
  'REQ-RELATE-08': [
    { kind: 'symbol', file: client, name: 'queryGraph' },
    { kind: 'symbol', file: cli, name: 'relateCommand' },
    { kind: 'value', file: types, name: 'QUERY_ROWS', equals: 100 },
  ],
  'REQ-RELATE-09': [
    { kind: 'symbol', file: searched, name: 'connectedSearch' },
    { kind: 'symbol', file: searched, name: 'renderSearched' },
    { kind: 'value', file: searchedTypes, name: 'SEARCHED_HITS', equals: 3 },
    { kind: 'value', file: searchedTypes, name: 'MIN_LIKELIHOOD', equals: 0.6 },
    { kind: 'value', file: searchedTypes, name: 'SEARCH_BUDGET_MS', equals: 6000 },
    { kind: 'value', file: searchedTypes, name: 'SEARCH_CHARS', equals: 1500 },
    { kind: 'uses', file: answers, name: 'connectedSearch' },
  ],
}

export const relateGraph = {
  description: "The Relate graph projected from log.db and the connected context its hook injects for the people a prompt names",
  specPath: 'docs/specs/relateGraph.md',
  codePaths: [client, types, project, mentions, cli, answers],
  anchors,
  rubrics: {
    'REQ-RELATE-01': noul('Does projectionOf run every read inside one read transaction (readOnce), take throughSeq as the highest events seq in that same transaction, and mark as owner the identities that are an account\'s own id, a self: id or an account\'s own handle?'),
    'REQ-RELATE-02': noul('Does buildGraph write a new graph-<throughSeq>-<ms>.rl file in one Relate transaction and checkpoint it before putState stores the relateGraph pointer, take the relateGraphBuilding claim first and release it after, and does prune keep the newest KEPT_SNAPSHOTS files and every file this process holds open?'),
    'REQ-RELATE-03': noul('Does verifyGraph compare every count of expectedCounts(projectionOf) with countsIn of the current graph, and report a graph behind log.db as behind instead of comparing it?'),
    'REQ-RELATE-04': noul('Does pointerOf return null when the stored pointer\'s workspace differs from workspaceOf(dbPath), its projector version differs from PROJECTOR_VERSION, or its file does not exist?'),
    'REQ-RELATE-05': noul('Does relateAnswer return nothing for an empty prompt or one starting with <, and does findPeople skip owner identities, merge identities of one platform with the same handle into one person, and keep at most MENTIONED_PEOPLE people?'),
    'REQ-RELATE-06': noul('Does renderContext say, for each person, the talks, engagement, groups, introducers and same-orbit people from connectedContext, name throughSeq and how far behind log.db the graph is, and cut the text to CONTEXT_CHARS?'),
    'REQ-RELATE-07': noul('Does refreshGraph start log relate build as a detached hidden process only when a graph already exists and wantsRebuild says so (behind and built at least REFRESH_AFTER_MS ago), never when there is no pointer, and no build claim is fresh?'),
    'REQ-RELATE-08': noul('Does queryGraph run the statement on the current graph and return at most QUERY_ROWS rows with whether more were cut?'),
    'REQ-RELATE-09': noul('When the prompt names someone the graph knows, does relateAnswer also run connectedSearch (keyword, meaning and relationship fused) and add up to SEARCHED_HITS hits with likelihood at least MIN_LIKELIHOOD that a text retriever found, under FROM THE CONVERSATIONS within SEARCH_CHARS, running nothing when no one is named, the index or graph is missing, and dropping a search past SEARCH_BUDGET_MS?'),
    unspecifiedBehavior: noul('Does the Relate graph code write to log.db anything other than its relateGraph pointer and its build claim, read a platform, or send anything off the machine?'),
  },
  assertions: {
    'REQ-RELATE-01': MET,
    'REQ-RELATE-02': MET,
    'REQ-RELATE-03': MET,
    'REQ-RELATE-04': MET,
    'REQ-RELATE-05': MET,
    'REQ-RELATE-06': MET,
    'REQ-RELATE-07': MET,
    'REQ-RELATE-08': MET,
    'REQ-RELATE-09': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
