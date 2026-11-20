export interface NamedChat {
  platform: string
  account: string
  conversationId: string
  kind: string
  name: string
  messages: number
  lastMessageAt: string | null
}

export interface NameHint {
  said: string
  chat: NamedChat
  edits: number
  score: number
}

export const READ_TOOLS: Readonly<Record<string, { tool: string; key: string }>> = {
  discord: { tool: 'discordRead', key: 'channel' },
  slack: { tool: 'slackRead', key: 'chat' },
  instagram: { tool: 'instagramDms', key: 'with' },
  twitter: { tool: 'twitterDms', key: 'with' },
}

export const MAX_HINTS = 3

export const NAMES_BUDGET = 600

export const HINT_THRESHOLD = 0.5

export const FTS_BOOST = 0.1

export const TYPO_MAX_USES = 5

export const NOT_NAMES: ReadonlySet<string> = new Set(
  'about above after again also always another answer anyone anything around because been before being between both cant chat chats check could convo conversation conversations current daily dont down draft each email every everyone find from give going good group groups have here inbox into just know last latest like list look make many message messages more most much need never next only open opportunities opportunity other over people person please post posts read recent reply replies said same say says search send sent should show since some something stat stats still summarise summarize summary tell than that their them then there these they thing things this those through today told turn under until want waiting week were what when where which while who whole will with within without would write wrote your yours yesterday discord slack instagram twitter reddit linkedin facebook telegram whatsapp server servers channel channels thread threads'.split(' '),
)

export const EVERYDAY_WORDS: ReadonlySet<string> = new Set(
  'live life love team club crew gang squad family fam friends official support help hub lab labs dev devs community general main chill vibes talk talks news music games gaming game studio space room house home zone world network bot bots app apps tech code coding build builders builder agent agents money cash market crypto trade trading sales growth media social content creators creator video videos daily weekly time night day work jobs job group chat land city club academy school class project projects mastermind masterminds collective lounge cafe official real best free new old big top pro plus hq inc ltd'.split(' '),
)
