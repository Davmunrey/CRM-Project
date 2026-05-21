import { appChannel } from '@/lib/envChannel'
import { useTranslations } from '../../i18n'
import { getToken, decodeToken, setToken, clearToken } from '../../lib/api'

const SUPERADMIN_TOKEN_KEY = 'n0crm_superadmin_token'

export function getImpersonationInfo(): { orgId: string | null; impersonatedBy: string | null } {
  const token = getToken()
  if (!token) return { orgId: null, impersonatedBy: null }
  const payload = decodeToken(token)
  const impersonatedBy = payload?.['impersonated_by']
  return {
    orgId: (payload?.['org'] as string | null) ?? null,
    impersonatedBy: typeof impersonatedBy === 'string' ? impersonatedBy : null,
  }
}

export function enterImpersonation(token: string): void {
  const original = getToken()
  if (original) sessionStorage.setItem(SUPERADMIN_TOKEN_KEY, original)
  setToken(token)
  window.location.href = '/'
}

export function exitImpersonation(): void {
  const original = sessionStorage.getItem(SUPERADMIN_TOKEN_KEY)
  sessionStorage.removeItem(SUPERADMIN_TOKEN_KEY)
  if (original) {
    setToken(original)
  } else {
    clearToken()
  }
  window.location.href = '/admin'
}

export function EnvironmentBanner() {
  const t = useTranslations()
  const { impersonatedBy } = getImpersonationInfo()

  if (impersonatedBy) {
    const orgId = getImpersonationInfo().orgId
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
          onClick={exitImpersonation}
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
