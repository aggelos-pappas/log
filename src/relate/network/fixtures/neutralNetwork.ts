const at = (day: number): string => `2026-11-${String(day).padStart(2, '0')}T10:00:00+00:00`

const scored = (handle: string, ring: number, band: string, score: number, circles: string[], followsMe = false) => ({
  handle,
  name: handle,
  followers: 100 * ring,
  degree: 1,
  goGetterScore: score,
  components: { themeMatch: score },
  band,
  bandProbabilities: { [band]: 0.7 },
  workflowStage: 'building',
  passesGates: true,
  themes: { graphs: 0.9, agents: 0.6, outbound: 0.2, memes: 0.1 },
  signals: { proximityTier: ring, circles, followsMe },
})

export const NETWORK_FIXTURE = {
  scores: [
    scored('kai_new', 2, 'collaborator', 0.5, ['chart_lead', 'loop_lead', 'aff_lead']),
    scored('maya_ml', 2, 'member', 0.8, ['chart_lead', 'loop_lead', 'builderOwner'], true),
    scored('linus_k', 2, 'collaborator', 0.9, ['chart_lead']),
    scored('ada_codes', 1, 'member', 0.95, ['chart_lead', 'loop_lead']),
    scored('rio_far', 4, 'member', 0.99, ['chart_lead', 'loop_lead', 'aff_lead', 'aff_lead_two']),
    scored('zed_skip', 2, 'audience', 0.7, ['chart_lead']),
  ],
  map: {
    schemaVersion: '1.0.0',
    generatedAt: '2026-11-10T00:00:00+00:00',
    communities: [
      { id: 'commGraph', name: 'Graph Guild', url: 'https://example.com/graph', platform: 'whop', classification: { niche: { value: 'graphs' } } },
      { id: 'commLoop', name: 'Loop Lab', url: 'https://example.com/loop', platform: 'skool', classification: { niche: { value: 'agents' } } },
    ],
    creators: [
      { communityId: 'commGraph', communityName: 'Graph Guild', name: 'Chart Lead', x: { handle: 'chart_lead', name: 'Chart Lead', followers: 5000 } },
      { communityId: 'commLoop', communityName: 'Loop Lab', name: 'Loop Lead', x: { handle: 'loop_lead', name: 'Loop Lead', followers: 3000 } },
      { communityId: 'affWorld', communityName: 'affiliate world', world: 'affiliate', x: { handle: 'aff_lead', followers: 900 } },
      { communityId: 'affWorldTwo', communityName: 'affiliate world', world: 'affiliate', x: { handle: 'aff_lead_two', followers: 800 } },
      { communityId: 'commNobody', communityName: 'No Handle Club', name: 'Nobody', x: null },
    ],
    people: [
      { handle: 'maya_ml', name: 'Maya', bio: 'ships models', followers: 210, degree: 1, followsYou: true, tieStrength: 4, classification: { role: { value: 'builder' } }, ties: [{ creator: 'chart_lead' }] },
      { handle: 'bot_one', name: 'Bot', bio: 'beep', followers: 1, degree: 2, tieStrength: 1, classification: { role: { value: 'bot_or_spam' } }, ties: [] },
    ],
    mentions: {
      posts: [
        { author: 'ada_codes', createdAt: at(12), text: '@kai_new great graph thread', mentions: ['kai_new'] },
        { author: 'ada_codes', createdAt: at(14), text: '@kai_new and @chart_lead nice', mentions: ['kai_new', 'chart_lead'] },
        { author: 'kai_new', createdAt: at(15), text: 'my newest post about graphs', mentions: [] },
        { author: 'kai_new', createdAt: at(11), text: 'an older post', mentions: ['maya_ml'] },
      ],
    },
  },
}
