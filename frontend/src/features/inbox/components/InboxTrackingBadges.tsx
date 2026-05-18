import { Eye, MousePointerClick } from 'lucide-react'
import { useTranslations } from '../../../i18n'
import type { CRMEmail } from '../../../types'
import { formatRelativeDate } from '../../../utils/formatters'

export function InboxTrackingBadges({ email }: { email: CRMEmail }) {
  const t = useTranslations()
  if (!email.trackingEnabled && !email.openCount && !email.clickCount) return null

  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {(email.openCount ?? 0) > 0 ? (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
          <Eye size={9} />
          {t.common.view} {email.openCount}x &middot; {formatRelativeDate(email.lastOpenedAt!)}
        </span>
      ) : email.trackingEnabled ? (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-fg/8 text-fg-subtle border border-fg/10">
          <Eye size={9} />
          {t.common.noResults}
        </span>
      ) : null}
      {(email.clickCount ?? 0) > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info border border-info/20">
          <MousePointerClick size={9} />
          {t.inbox.clicks} {email.clickCount}x
        </span>
      )}
    </div>
  )
}
