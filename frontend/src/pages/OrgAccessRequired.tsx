import { MailWarning, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useTranslations } from '../i18n'
import { AuthLayout } from '../components/auth/AuthLayout'

export function OrgAccessRequired() {
  const t = useTranslations()
  const message = useAuthStore((s) => s.tenantResolutionMessage)
  const logout = useAuthStore((s) => s.logout)

  return (
    <AuthLayout variant="centered" showBrandingHeader={false}>
      <div className="w-full text-center">
        <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mx-auto mb-4">
          <MailWarning size={28} className="text-warning" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-fg mb-2">{t.acceptInvite.invalidTitle}</h1>
        <p className="text-sm text-fg-muted mb-6">
          {message ?? t.errors.noPermissionDescription}
        </p>
        {/* No tokenless "Accept" link — an invite can only be opened from its emailed
            link (which carries ?token=). A bare /accept-invite always errored. */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-fg/12 text-fg-muted hover:text-fg hover:bg-fg/6 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <LogOut size={14} aria-hidden />
            {t.auth.logout}
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
