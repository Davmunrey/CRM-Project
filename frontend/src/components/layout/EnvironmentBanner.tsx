import { appChannel } from '@/lib/envChannel'
import { useTranslations } from '../../i18n'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

export async function enterImpersonation(orgId: string): Promise<void> {
  await api.post(`/admin/orgs/${orgId}/impersonate`)
  window.location.href = '/'
}

export async function exitImpersonation(): Promise<void> {
  await api.post('/admin/impersonate/exit')
  window.location.href = '/admin'
}

export function EnvironmentBanner() {
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const impersonatedBy = currentUser?.impersonatedBy ?? null
  const orgId = currentUser?.organizationId ?? null

  if (impersonatedBy) {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-accent-500/40 bg-accent-500/15 px-4 py-2 flex items-center justify-center gap-4 text-xs font-medium text-accent-400"
      >
        <span>
          Modo impersonación — org: <span className="font-mono">{orgId}</span>
        </span>
        <button
          type="button"
          onClick={() => void exitImpersonation()}
          className="px-3 py-1 rounded-lg bg-accent-500/20 hover:bg-accent-500/30 transition-colors text-accent-300 font-semibold"
        >
          Salir → volver al admin
        </button>
      </div>
    )
  }

  if (appChannel === 'staging') {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-xs font-medium text-warning"
      >
        {t.common.envBannerStaging}
      </div>
    )
  }
  return null
}
