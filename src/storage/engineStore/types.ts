export type EngineStoreName = 'xInbox' | 'xNotifications' | 'xLastCall' | 'discordServers' | 'discordThreads' | 'linkedinConnects'

export interface EngineStoreSpec {
  platform: string
  file: string
  splits: readonly string[]
}

export const ENGINE_STORES: Record<EngineStoreName, EngineStoreSpec> = {
  xInbox: { platform: 'twitter', file: 'inboxSync.json', splits: ['xchat'] },
  xNotifications: { platform: 'twitter', file: 'notifications.json', splits: ['rows', 'engagements'] },
  xLastCall: { platform: 'twitter', file: 'lastCall.json', splits: [] },
  discordServers: { platform: 'discord', file: 'servers.json', splits: [] },
  discordThreads: { platform: 'discord', file: 'threads.json', splits: [] },
  linkedinConnects: { platform: 'linkedin', file: 'connects.json', splits: [] },
}

export const ENGINE_HEAD_PART = 'head'
