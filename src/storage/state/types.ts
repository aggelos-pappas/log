export type StateScope =
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

export interface StateRow<T> {
  body: T
  updatedAt: number
}
