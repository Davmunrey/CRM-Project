import { Shield } from 'lucide-react'
import { useTranslations } from '../../i18n'

export function SettingsSsoScimPanel() {
  const t = useTranslations()
  return (
    <div className="rounded-xl border border-fg/10 bg-surface-1/60 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <Shield size={16} className="text-accent-400 shrink-0" aria-hidden />
        {t.settings.tabSecurity} — SSO / SCIM
      </div>
      <p className="text-xs text-fg-subtle leading-relaxed">
        SSO and SCIM provisioning are available on enterprise plans. Contact support to enable.
      </p>
    </div>
  )
}
