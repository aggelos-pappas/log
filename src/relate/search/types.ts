import type { SearchHit } from '../../search/conversations/index'
import type { PersonFound } from '../graph/index'

export const SEARCHED_HITS = 3

export const SEARCH_DEPTH_HOOK = 50

export const MIN_LIKELIHOOD = 0.6

export const SEARCH_BUDGET_MS = 6000

export const SEARCH_CHARS = 1500

export const HIT_CHARS = 280

export interface ConnectedSearch {
  people: PersonFound[]
  hits: SearchHit[]
  text: string
  ms: number
}
