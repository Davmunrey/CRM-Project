export { extractEmail, emailDomain, parseEmails } from './emailParsing'
export {
  type ThreadMatch,
  buildAutoThreadMatchMap,
  buildPersistedThreadMatchMap,
  pickBestDealForThread,
} from './threadMatch'
export { resolveSendContextFromTo, type ResolvedSendContext } from './resolveSendContext'
export { buildReplySubject } from './replySubject'
export { enqueueBulkEmailJobs, type BulkEnqueuePayload } from './enqueueBulkSends'
