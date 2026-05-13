import { Shield } from 'lucide-react'

export function SettingsMfaPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-fg-muted" />
        <span className="text-sm font-medium">Multi-Factor Authentication</span>
      </div>
      <p className="text-sm text-fg-muted">
        MFA is not available in this version.
      </p>
    </div>
  )
}
