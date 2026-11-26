import { noul } from 'jev-spec'
import { MET, NOT_VIOLATED } from '../types'

const SESSION = 'src/tiktok/account/session/client.ts'
const COMMAND = 'src/cli/tiktok/index.ts'
const PLATFORMS = 'src/cli/runner/helpers/platforms.ts'
const ROUTES = 'src/directApi/engine/client.ts'
const SEARCH = 'src/cli/tiktok/search.ts'
const EXTRACTOR = 'src/tiktok/search/client.ts'
const SCRAPE = 'src/cli/tiktok/scrape.ts'
const DETAILS = 'src/tiktok/details/client.ts'

export const tiktok = {
  description: 'TikTok: the account session, its engine, its own answer recorded, and its wiring',
  specPath: 'docs/specs/tiktok.md',
  codePaths: [SESSION, COMMAND, PLATFORMS, ROUTES, SEARCH, EXTRACTOR, SCRAPE, DETAILS],
  anchors: {
    'REQ-TIKTOK-07': [
      { kind: 'symbol', file: SCRAPE, name: 'tiktokScrapeCommand' },
      { kind: 'symbol', file: DETAILS, name: 'fetchDetails' },
      { kind: 'symbol', file: DETAILS, name: 'saveExport' },
    ],
    'REQ-TIKTOK-05': [
      { kind: 'symbol', file: SEARCH, name: 'tiktokSearchCommand' },
      { kind: 'symbol', file: EXTRACTOR, name: 'searchUrl' },
    ],
    'REQ-TIKTOK-06': [
      { kind: 'symbol', file: EXTRACTOR, name: 'readSearchStep' },
      { kind: 'symbol', file: EXTRACTOR, name: 'videosOfSnapshot' },
    ],
    'REQ-TIKTOK-01': [
      { kind: 'symbol', file: SESSION, name: 'TIKTOK_PLATFORM' },
      { kind: 'symbol', file: SESSION, name: 'findTiktokAccount' },
      { kind: 'symbol', file: SESSION, name: 'tiktokGate' },
      { kind: 'string', file: SESSION, includes: 'TIKTOK' },
    ],
    'REQ-TIKTOK-02': [
      { kind: 'symbol', file: SESSION, name: 'runTiktokEngine' },
      { kind: 'string', file: SESSION, includes: 'tiktokApi' },
    ],
    'REQ-TIKTOK-03': [
      { kind: 'symbol', file: SESSION, name: 'recordTiktokSession' },
      { kind: 'symbol', file: COMMAND, name: 'tiktokSessionCommand' },
    ],
    'REQ-TIKTOK-04': [
      { kind: 'string', file: PLATFORMS, includes: 'tiktok' },
      { kind: 'string', file: ROUTES, includes: 'tiktok' },
    ],
  },
  rubrics: {
    'REQ-TIKTOK-07': noul('Does the query or video-link export retain the bundled upstream parser objects unchanged, checkpoint results atomically, report pending and failed links, and stop on engine failures or refusals?'),
    'REQ-TIKTOK-05': noul('Does TikTok search use the existing account inspect browser for text and hashtag queries, refusing absent sessions and preserving shared recording?'),
    'REQ-TIKTOK-06': noul('Are results deduplicated by string video ID, bounded by validated limits, and returned with source metadata and explicit stopping reasons including failures?'),
    'REQ-TIKTOK-01': noul('Does findTiktokAccount find the account through findPlatformAccount with TIKTOK_PLATFORM, whose accountPlatform is TIKTOK, and does tiktokGate check it with platformGate before the engine runs?'),
    'REQ-TIKTOK-02': noul('Does runTiktokEngine run the account through runPlatformEngine with TIKTOK_PLATFORM, whose engine is python/tiktokApi/engine.py?'),
    'REQ-TIKTOK-03': noul('Does the tiktok session check command send nothing to TikTok beyond the check, and record the answer TikTok gave through recordTiktokSession, which merges refreshed cookies for TIKTOK_COOKIE_DOMAIN back into the row?'),
    'REQ-TIKTOK-04': noul('Is tiktok listed in PLATFORMS and PLATFORM_SITES, and does DIRECT_ROUTES have a tiktokSession route for platform tiktok?'),
    unspecifiedBehavior: noul('Does the TikTok code call TikTok outside the engine and its governor, or record anything but the answer TikTok gave, by a route the specification does not describe?'),
  },
  assertions: {
    'REQ-TIKTOK-07': MET,
    'REQ-TIKTOK-05': MET,
    'REQ-TIKTOK-06': MET,
    'REQ-TIKTOK-01': MET,
    'REQ-TIKTOK-02': MET,
    'REQ-TIKTOK-03': MET,
    'REQ-TIKTOK-04': MET,
    unspecifiedBehavior: NOT_VIOLATED,
  },
}
