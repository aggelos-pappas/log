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

export const NOT_NAMES: ReadonlySet<string> = new Set(
  'about above after again also always another answer anyone anything around because been before being between both cant chat chats check could convo conversation conversations current daily dont down draft each email every everyone find from give going good group groups have here inbox into just know last latest like list look make many message messages more most much need never next only open opportunities opportunity other over people person please post posts read recent reply replies said same say says search send sent should show since some something stat stats still summarise summarize summary tell than that their them then there these they thing things this those through today told turn under until want waiting week were what when where which while who whole will with within without would write wrote your yours yesterday discord slack instagram twitter reddit linkedin facebook telegram whatsapp server servers channel channels thread threads'.split(' '),
)
