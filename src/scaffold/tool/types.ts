export interface NewToolOptions {
  name: string
  summary: string
  acts?: boolean
  flags?: string[]
  area?: string
  asks?: string[]
  guide?: string
}

export interface ToolNames {
  name: string
  pascal: string
  constant: string
  command: string
  usage: string
  input: string
  rows: string
  inputType: string
  summary: string
  title: string
  acts: boolean
  flags: string[]
  area: string
  asks: string[]
  guide: string
  tools: string[]
}

export const TOOL_NAME = /^[a-z][a-zA-Z0-9]*$/

export const DEFAULT_TOOL_AREA = 'inbox'

export const DEFAULT_TOOL_GUIDE = 'knowledgeAndSearch'

export const NEW_TOOL_RULES: readonly number[] = [30, 163]
