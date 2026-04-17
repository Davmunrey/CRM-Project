import { Link } from 'react-router-dom'
import { MailWarning, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useTranslations } from '../i18n'

export function OrgAccessRequired() {
  const t = useTranslations()
  const message = useAuthStore((s) => s.tenantResolutionMessage)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="auth-page-bg min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-4">
          <MailWarning size={28} className="text-warning" />
        </div>
        <h1 className="text-xl font-bold text-fg mb-2">{t.acceptInvite.invalidTitle}</h1>
        <p className="text-sm text-fg-muted mb-6">
          {message ?? t.errors.noPermissionDescription}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link
            to="/accept-invite"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-fg text-sm font-medium transition-colors"
          >
            {t.acceptInvite.acceptCta}
          </Link>
          <button
            type="button"
            onClick={() => { logout() }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-fg/12 text-fg-muted hover:text-fg hover:bg-fg/6 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <LogOut size={14} />
            {t.auth.logout}
          </button>
        </div>
      </div>
    </div>
  )
}
