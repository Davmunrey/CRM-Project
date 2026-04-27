import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { useGoogleOAuthPopup } from '../../hooks/useGoogleOAuthPopup'
import { fetchGoogleIntegrationStatus, type GoogleIntegrationStatusResponse } from '../../services/googleIntegrationService'
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
  if (r.includes('email must match') || r.includes('misma cuenta')) return t.errors.googleOAuthEmailMismatch
  if (code === 'access_denied' || r.includes('access_denied')) return t.errors.googleOAuthAccessDenied
  if (r.includes('state') || r.includes('expired')) return t.errors.googleOAuthStateInvalid
  if (raw && raw.length > 0 && raw.length < 200) return raw
  return t.errors.gmailConnectionError
}

export function CalendarIntegrationCard() {
  const t = useTranslations()
  const [status, setStatus] = useState<StatusState>(null)

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
    const result = await launch('calendar')
    if (result.ok) {
      await refreshStatus()
      toast.success(t.settings.googleCalendarActive)
    }
  }, [clearError, launch, refreshStatus, t.settings.googleCalendarActive])

  if (!status) {
    return (
      <div className="crm-surface-section p-6 flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-5 w-5 animate-spin text-fg-muted" aria-hidden />
        <span className="sr-only">{t.common.loading}</span>
      </div>
    )
  }

  const locked = !status.gmailConnected

  return (
    <section
      className={`crm-surface-section p-6 ${locked ? 'opacity-95 bg-surface-0/80' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 shadow-sm">
            <Calendar className={`h-5 w-5 ${locked ? 'text-fg-muted' : 'text-accent-500'}`} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className={`text-base font-semibold ${locked ? 'text-fg-muted' : 'text-fg'}`}>
              {t.settings.googleCalendarCardTitle}
            </h2>
            <p className="text-sm text-fg-muted mt-0.5">
              {locked ? t.settings.googleCalendarCardBlurbLocked : t.settings.googleCalendarCardBlurb}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {locked ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              {t.settings.googleCalendarLocked}
            </span>
          ) : status.calendarConnected ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {t.settings.googleCalendarActive}
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={loading}
              onClick={() => void connect()}
            >
              {loading ? t.settings.googleCalendarOpening : t.settings.googleCalendarConnect}
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
    </section>
  )
}
