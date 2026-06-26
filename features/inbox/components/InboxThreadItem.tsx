import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useTranslations } from '../../../i18n'
import type { GmailThread } from '../../../types'
import { formatRelativeDate } from '../../../utils/formatters'
import { extractEmail } from '../emailParsing'

export function InboxThreadItem({
  thread,
  selected,
  bulkSelected,
  onClick,
  onToggleBulk,
  contactByEmail,
}: {
  thread: GmailThread
  selected: boolean
  bulkSelected: boolean
  onClick: () => void
  onToggleBulk: () => void
  contactByEmail: Map<string, { id: string; name: string }>
}) {
  const t = useTranslations()
  const lastMsg = thread.messages[thread.messages.length - 1]
  const isUnread = lastMsg?.labelIds?.includes('UNREAD')
  const senderEmail = extractEmail(lastMsg?.from ?? '')
  const matchedContact = contactByEmail.get(senderEmail)

  return (
    <div
      onClick={onClick}
      className={`group px-3 py-2.5 border-b border-fg/[0.06] cursor-pointer transition-colors motion-reduce:transition-none ${
        selected ? 'bg-accent-600/[0.12] border-l-[3px] border-l-accent-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]' : 'hover:bg-fg/[0.04]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={bulkSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleBulk()
          }}
          onClick={(e) => e.stopPropagation()}
          className={`mt-1 rounded border-fg/12 bg-fg/6 text-accent-500 focus:ring-accent-500 transition-opacity ${
            bulkSelected ? 'opacity-100' : 'opacity-35 group-hover:opacity-100'
          }`}
          aria-label={t.inbox.selectThread}
          title={t.inbox.selectThread}
        />
        <div className="w-9 h-9 rounded-full bg-accent-600/18 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-accent-400">
          {(lastMsg?.from?.charAt(0) ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <p className={`text-sm leading-tight truncate ${isUnread ? 'font-semibold text-fg' : 'font-medium text-fg-muted'}`}>
              {lastMsg?.from?.replace(/<.*>/, '').trim() || t.inbox.unknownSender}
            </p>
            <span className="text-xs text-fg-subtle tabular-nums flex-shrink-0">
              {lastMsg?.date ? formatRelativeDate(lastMsg.date) : ''}
            </span>
          </div>
          <p className={`text-sm truncate leading-snug ${isUnread ? 'text-fg font-medium' : 'text-fg-muted'}`}>{lastMsg?.subject ?? ''}</p>
          <p className="text-xs text-fg-subtle truncate mt-0.5 leading-snug">{thread.snippet}</p>
          {matchedContact && (
            <Link
              to={`/contacts/${matchedContact.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-300 border border-accent-500/30 hover:bg-accent-600/30 transition-colors mt-1"
            >
              <User size={12} />
              {matchedContact.name}
            </Link>
          )}
        </div>
        {isUnread && <div className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0 mt-1" />}
      </div>
    </div>
  )
}
