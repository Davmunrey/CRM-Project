import { Mail, Reply } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { InboxTrackingBadges } from '../../features/inbox'
import { buildReplySubject } from '../../features/inbox'
import { formatDateTime } from '../../utils/formatters'
import { PanelEmpty } from '../../components/shared/PanelEmpty'
import type { CRMEmail, Contact } from '../../types'

export function LocalEmailView({
  email,
  contacts,
  onReply,
  onTrackOpen,
  onTrackClick,
}: {
  email: CRMEmail | null
  contacts: Contact[]
  onReply: (to: string, subject: string) => void
  onTrackOpen: (id: string) => void
  onTrackClick: (id: string) => void
}) {
  const t = useTranslations()

  if (!email) return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-4 bg-gradient-to-b from-surface-1/40 to-surface-0/20">
      <PanelEmpty
        icon={<Mail size={32} className="text-fg-muted opacity-80" />}
        title={t.inbox.readingPaneSelectTitle}
        primary={t.inbox.readingPaneSelectHint}
        density="compact"
      />
    </div>
  )

  const contact = email.contactId ? contacts.find((c) => c.id === email.contactId) : undefined

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <div className="px-4 py-3 border-b border-fg/8 flex-shrink-0 flex items-center justify-between bg-surface-1/40">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-fg truncate">{email.subject || ''}</h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            {t.common.to}: {contact ? `${contact.firstName} ${contact.lastName}` : email.to.join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onReply(email.to.join(', '), buildReplySubject(email.subject))}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-fg/6 hover:bg-accent-600/15 hover:text-accent-400 text-fg-muted transition-colors"
          >
            <Reply size={12} />
            {t.inbox.reply}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-fg/6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full btn-gradient flex items-center justify-center text-xs font-bold text-fg">
              {email.from.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-fg">{email.from}</p>
              <p className="text-[10px] text-fg-subtle">
                {email.sentAt ? formatDateTime(email.sentAt) : ''}
                {email.gmailMessageId && (
                  <span className="ml-2 text-success">{t.settings.connected} Gmail</span>
                )}
              </p>
              <InboxTrackingBadges email={email} />
              {email.trackingEnabled && (
                <div className="flex items-center gap-1.5 mt-1.5">
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
          <div className="px-4 py-4">
            <p className="text-sm text-fg-muted whitespace-pre-wrap leading-relaxed">{email.body}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
