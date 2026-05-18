import { User, Clock } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { InboxTrackingBadges } from '../../features/inbox'
import { formatDateTime, formatRelativeDate } from '../../utils/formatters'
import type { CRMEmail, Contact } from '../../types'

export function LocalEmailItem({
  email,
  selected,
  bulkSelected,
  onClick,
  onToggleBulk,
  contacts,
  onTrackOpen,
  onTrackClick,
}: {
  email: CRMEmail
  selected: boolean
  bulkSelected: boolean
  onClick: () => void
  onToggleBulk: () => void
  contacts: Contact[]
  onTrackOpen: (id: string) => void
  onTrackClick: (id: string) => void
}) {
  const t = useTranslations()
  const contact = email.contactId ? contacts.find((c) => c.id === email.contactId) : undefined

  const unread = email.isRead === false

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
          aria-label={t.inbox.selectMessage}
          title={t.inbox.selectMessage}
        />
        <div className="w-9 h-9 rounded-full bg-fg/8 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-fg-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <p className={`text-sm leading-tight truncate ${unread ? 'text-fg font-semibold' : 'font-medium text-fg-muted'}`}>
              {contact ? `${contact.firstName} ${contact.lastName}` : email.to.join(', ')}
            </p>
            <span className="text-xs text-fg-subtle tabular-nums flex-shrink-0">
              {formatRelativeDate(email.sentAt ?? email.createdAt)}
            </span>
          </div>
          <p className={`text-sm truncate leading-snug ${unread ? 'text-fg font-semibold' : 'text-fg'}`}>{email.subject || ''}</p>
          <p className="text-xs text-fg-subtle truncate mt-0.5 leading-snug">{email.body.slice(0, 80)}</p>
          {email.status === 'scheduled' && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/25">
              <Clock size={9} />
              {email.scheduledFor ? formatDateTime(email.scheduledFor) : t.inbox.scheduled}
            </span>
          )}
          <InboxTrackingBadges email={email} />
          {email.trackingEnabled && (
            <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
              <button type="button"
                onClick={() => onTrackOpen(email.id)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-success/15 text-fg-subtle hover:text-success border border-fg/8 transition-colors"
              >
                {t.common.view}
              </button>
              <button type="button"
                onClick={() => onTrackClick(email.id)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-fg/5 hover:bg-info/15 text-fg-subtle hover:text-info border border-fg/8 transition-colors"
              >
                {t.inbox.clicks}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
