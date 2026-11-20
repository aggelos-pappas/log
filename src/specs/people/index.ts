import { noul } from 'jev-spec'
import type { RequirementAnchors } from '../anchors/types'
import { MET, NOT_VIOLATED } from '../types'

const client = 'src/people/client.ts'
const types = 'src/people/types.ts'
const match = 'src/people/helpers/match.ts'
const card = 'src/people/helpers/card.ts'
const events = 'src/storage/platform/helpers/derivedEvents.ts'
const storage = 'src/storage/platform/client.ts'
const migrations = 'src/storage/schema/helpers/migrations.ts'
const cli = 'src/cli/people/index.ts'
const graph = 'src/relate/graph/client.ts'
const project = 'src/relate/graph/helpers/project.ts'
const answers = 'src/agentHooks/answers/client.ts'

const anchors: RequirementAnchors = {
  'REQ-PEOPLE-01': [
    { kind: 'symbol', file: events, name: 'identityLinkedEvent' },
    { kind: 'symbol', file: events, name: 'identityUnlinkedEvent' },
    { kind: 'symbol', file: events, name: 'personNamedEvent' },
    { kind: 'symbol', file: events, name: 'identityNotLinkedEvent' },
    { kind: 'string', file: storage, includes: 'identityLinked' },
    { kind: 'symbol', file: client, name: 'linkIdentities' },
    { kind: 'symbol', file: client, name: 'unlinkIdentity' },
  ],
  'REQ-PEOPLE-02': [
    { kind: 'string', file: migrations, includes: 'identityLinksActive' },
    { kind: 'string', file: migrations, includes: 'WHERE revokedAt IS NULL' },
  ],
  'REQ-PEOPLE-03': [
    { kind: 'symbol', file: storage, name: 'rekeyIdentity' },
    { kind: 'string', file: storage, includes: 'rekeyConflict' },
  ],
  'REQ-PEOPLE-04': [
    { kind: 'symbol', file: match, name: 'suggestLinks' },
    { kind: 'symbol', file: match, name: 'linksIn' },
    { kind: 'symbol', file: types, name: 'M_PROBABILITIES' },
    { kind: 'value', file: types, name: 'PRIOR_MATCH_SHARE', equals: 0.04 },
    { kind: 'value', file: types, name: 'STRONG_BITS', equals: 4 },
    { kind: 'value', file: types, name: 'REVIEW_BITS', equals: 0 },
    { kind: 'value', file: types, name: 'SOURCES_KEPT', equals: 3 },
  ],
  'REQ-PEOPLE-05': [
    { kind: 'symbol', file: types, name: 'BOT_NAMES' },
    { kind: 'symbol', file: types, name: 'RECOMMENDS' },
    { kind: 'string', file: match, includes: 'identityNotLinked' },
    { kind: 'string', file: cli, includes: 'approvedBy' },
  ],
  'REQ-PEOPLE-06': [
    { kind: 'symbol', file: card, name: 'personCardOf' },
    { kind: 'symbol', file: card, name: 'renderCard' },
    { kind: 'symbol', file: client, name: 'resolveWho' },
    { kind: 'value', file: types, name: 'ONE_TO_ONE_SHARE', equals: 0.95 },
    { kind: 'value', file: types, name: 'CARD_LINES', equals: 8 },
  ],
  'REQ-PEOPLE-07': [
    { kind: 'symbol', file: client, name: 'cardsNamedIn' },
    { kind: 'uses', file: answers, name: 'cardsNamedIn' },
    { kind: 'value', file: types, name: 'PEOPLE_IN_PROMPT', equals: 2 },
    { kind: 'string', file: project, includes: 'identityLinks' },
    { kind: 'symbol', file: graph, name: 'findPeople' },
  ],
}

export const people = {
  description: "One person across platforms: links as events, Fellegi-Sunter suggestions, the person card, and the hook and graph seeing a person",
  specPath: 'docs/specs/people.md',
  codePaths: [client, types, match, card, events, storage, migrations, cli, graph, project, answers],
  anchors,
  rubrics: {
    'REQ-PEOPLE-01': noul('Does log people link append personNamed and identityLinked events (unlink identityUnlinked, different identityNotLinked) through insertEventRow, do deriveInternal write persons, identityLinks and identityNotLinked from them, are those tables in DERIVED_TABLES and the fingerprint, and does an unlink only set revokedAt?'),
    'REQ-PEOPLE-02': noul('Is one active link per identity enforced by the identityLinksActive partial unique index, does linkIdentities refuse identities of two different people, and does a replayed link to an already linked identity get ignored?'),
    'REQ-PEOPLE-03': noul('Does rekeyIdentity move identityLinks rows to the new id and revoke with rekeyConflict a handle link that could not move because the id was linked already?'),
    'REQ-PEOPLE-04': noul('Does suggestLinks score candidate pairs (loose handle matches and cross-platform post links) on sharesOwnPosts, handle and displayName levels, with u measured from log.db and smoothed, m from M_PROBABILITIES, the handle factor divided by the distinct handles that reduce to the same letters, the prior from PRIOR_MATCH_SHARE, bands at STRONG_BITS and REVIEW_BITS, and up to SOURCES_KEPT sources per comparison?'),
    'REQ-PEOPLE-05': noul('Does suggestLinks skip bots, recommending messages, account pairs without a handle match, identityNotLinked pairs, already linked pairs and handle-keyed duplicates, and does every people write require --approvedBy?'),
    'REQ-PEOPLE-06': noul('Does personCardOf cover every linked identity, treat a chat as one-to-one when no other sender wrote twice or the two wrote ONE_TO_ONE_SHARE of it, leave out chats on an account log runs for that person, dedupe repeated lines, show empty lines as [attachment], flag chats never read from the start, and keep CARD_LINES lines in time order tagged by platform?'),
    'REQ-PEOPLE-07': noul('Does relateAnswer add cardsNamedIn cards (by any linked handle or a word of the name, at most PEOPLE_IN_PROMPT), does the projection set personId and personNames on linked identities, and does findPeople group by person, expand to every identity of the person and match by name?'),
    unspecifiedBehavior: noul('Does any people code send anything off the machine, call a model, or write a link without the owner\'s approval?'),
  },
  assertions: {
    'REQ-PEOPLE-01': MET,
    'REQ-PEOPLE-02': MET,
    'REQ-PEOPLE-03': MET,
    'REQ-PEOPLE-04': MET,
    'REQ-PEOPLE-05': MET,
    'REQ-PEOPLE-06': MET,
    'REQ-PEOPLE-07': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
