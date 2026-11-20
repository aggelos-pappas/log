export type StateScope =
  | 'postInstallVendors'
  | 'hookMemory'
  | 'lastHook'
  | 'hookOffsets'
  | 'contextService'
  | 'contextServiceStarting'
  | 'memeTaste'
  | 'voiceClone'
  | 'chatList'
  | 'mcpServerStart'
  | 'mcpReload'
  | 'voicePasses'
  | 'consoleAccountCheck'
  | 'browserCheckProof'
  | 'signIn'
  | 'sessionSave'
  | 'signInLink'
  | 'watcherEnd'
  | 'watcherHold'
  | 'relateGraph'
  | 'relateGraphBuilding'
  | 'pushQuiet'
  | 'inboxIgnore'
  | 'inboxLabels'
  | 'hermesView'
  | 'handRolled'
  | 'turnStart'

export interface StateRow<T> {
  body: T
  updatedAt: number
}
