import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { useGoogleOAuthPopup } from '../../hooks/useGoogleOAuthPopup'
import {
  disconnectGoogleIntegration,
  fetchGoogleIntegrationStatus,
  type GoogleIntegrationStatusResponse,
  scopeLabelKeys,
} from '../../services/googleIntegrationService'
import { Button } from '../ui/Button'
import { toast } from '../../store/toastStore'

type StatusState = GoogleIntegrationStatusResponse | null

function friendlyError(
  t: ReturnType<typeof useTranslations>,
  code: string | undefined,
  raw?: string,
): string {
  if (code === 'popup_closed') return ''
  const r = (raw ?? '').toLowerCase()
  if (r.includes('email must match') || r.includes('misma cuenta') || code === 'email_mismatch') {
    return t.errors.googleOAuthEmailMismatch
  }
  if (code === 'access_denied' || r.includes('access_denied')) return t.errors.googleOAuthAccessDenied
  if (r.includes('state') || r.includes('expired') || r.includes('invalid_state')) {
    return t.errors.googleOAuthStateInvalid
  }
  if (raw && raw.length > 0 && raw.length < 200) return raw
  return t.errors.gmailConnectionError
}

export function GoogleIntegrationCard() {
  const t = useTranslations()
  const [status, setStatus] = useState<StatusState>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const popupOpts = useMemo(
    () => ({
      friendlyError: (code?: string, raw?: string) => friendlyError(t, code, raw),
      edgeUnreachableMessage: t.errors.googleEdgeFunctionUnreachable,
    }),
    [t],
  )
  const { launch, loading, error, clearError } = useGoogleOAuthPopup(popupOpts)

  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchGoogleIntegrationStatus()
      setStatus(data)
    } catch {
      setStatus({
        connected: false,
        gmailConnected: false,
        calendarConnected: false,
        account: null,
      })
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const connect = useCallback(async () => {
    clearError()
    const result = await launch('primary')
    if (result.ok) {
      await refreshStatus()
      toast.success(t.settings.gmailConnectionActive)
    }
  }, [clearError, launch, refreshStatus, t.settings.gmailConnectionActive])

  const disconnect = useCallback(async () => {
    if (!window.confirm(t.settings.googleDisconnectConfirm)) return
    setDisconnecting(true)
    try {
      await disconnectGoogleIntegration()
      await refreshStatus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.errors.gmailConnectionError)
    } finally {
      setDisconnecting(false)
    }
  }, [refreshStatus, t])

  if (!status) {
    return (
      <div className="crm-surface-section p-6 flex items-center justify-center min-h-[120px]">
        <Loader2 className="h-5 w-5 animate-spin text-fg-muted" aria-hidden />
        <span className="sr-only">{t.common.loading}</span>
      </div>
    )
  }

  const account = status.connected && status.account ? status.account : null
  const permKeys = account ? scopeLabelKeys(account.scopes) : []

  return (
    <section className="crm-surface-section p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 shadow-sm">
            <GoogleIcon />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{t.settings.googleCardTitle}</h2>
            <p className="text-sm text-fg-muted mt-0.5">{t.settings.googleCardBlurb}</p>
            {account ? (
              <p className="text-xs text-fg-subtle mt-2 inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {t.settings.googleGmailStatus} · {t.settings.googleCardFeatures}
                </span>
              </p>
            ) : (
              <p className="text-xs text-fg-subtle mt-2 inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{t.settings.googleCardFeatures}</span>
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {account ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {t.settings.googleConnected}
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={loading}
              onClick={() => void connect()}
            >
              {loading ? t.settings.googleOpening : t.settings.googleConnect}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-fg" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-danger" aria-hidden />
          {error}
        </div>
      )}

      {account && (
        <div className="mt-5 pt-5 border-t border-border space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-fg truncate">{account.email}</div>
              {account.name ? (
                <div className="text-xs text-fg-muted">{account.name}</div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={disconnecting}
              onClick={() => void disconnect()}
            >
              {t.settings.googleDisconnect}
            </Button>
          </div>

          {permKeys.length > 0 && (
            <details className="text-xs text-fg-muted group">
              <summary className="cursor-pointer list-none flex items-center gap-1 text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
                {t.settings.googlePermissionsHeading}
              </summary>
              <ul className="mt-2 list-disc pl-5 space-y-0.5">
                {permKeys.map(({ key }) => (
                  <li key={key}>{t.settings[key]}</li>
                ))}
              </ul>
              <p className="mt-2">
                {t.settings.googlePermissionsRevokeHint}{' '}
                <a
                  className="text-accent-500 hover:underline"
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                >
                  myaccount.google.com/permissions
                </a>
              </p>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
