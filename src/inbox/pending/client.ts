import { inboxTextWithVoiceNotes } from '../../media/voiceNotes/index'
import { claimContext } from '../claims/index'
import { judgedMessages } from '../judge/index'
import { inboxContext, storedInboxContext, takeAlerts, takePending, twitterAccounts } from '../watch/index'
import type { PendingRead } from './types'

export const ONE_PROCESS_LINE = '>>> ONE PROCESS PER ACCOUNT, NEVER TWO (rule 105): a second watcher tried to start and was refused. Every session shares the one watcher per account through the inbox; another is never started. The owner is told now.'

export const READER_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

export function readPending(reader: string, options: { stored?: boolean } = {}): PendingRead {
  const alerts = takeAlerts(reader)
  const judged = judgedMessages(takePending(reader).map((m) => ({ ...m, text: inboxTextWithVoiceNotes(m) })))
  const messages = judged.messages
  const loud = alerts.length ? [ONE_PROCESS_LINE, ...alerts].join('\n') : ''
  const text = [loud, judged.alerts.join('\n'), inboxContext(messages), claimContext(messages), options.stored ? storedInboxContext(twitterAccounts()) : null].filter(Boolean).join('\n\n')
  return { reader, messages, alerts, text: text || null }
}
