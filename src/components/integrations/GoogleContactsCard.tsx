import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { toast } from '../../store/toastStore'
import {
  fetchGoogleIntegrationStatus,
  fetchGoogleOAuthStartUrl,
  syncGoogleContacts,
  type GoogleIntegrationStatusResponse,
} from '../../services/googleIntegrationService'
import { useContactsStore } from '../../store/contactsStore'

export function GoogleContactsCard() {
  const [status, setStatus] = useState<GoogleIntegrationStatusResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number } | null>(null)

  const refresh = useCallback(async () => {
    const s = await fetchGoogleIntegrationStatus()
    setStatus(s)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const connect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const url = await fetchGoogleOAuthStartUrl('contacts')
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start Google authorization')
      setConnecting(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    setError(null)
    setLastResult(null)
    try {
      const result = await syncGoogleContacts()
      setLastResult({ imported: result.imported, skipped: result.skipped })
      toast.success(`Synced ${result.imported} contacts from Google`)
      await useContactsStore.getState().fetchContacts()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sync failed'
      if (msg.includes('contacts_scope_required')) {
        setError('Re-connect with Contacts permission to enable this feature.')
      } else {
        setError(msg)
      }
    } finally {
      setSyncing(false)
    }
  }

  if (!status) {
    return (
      <div className="crm-surface-section p-6 flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-5 w-5 animate-spin text-fg-muted" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  const hasContactsScope = status.contactsConnected
  const isGoogleConnected = status.gmailConnected

  return (
    <section className="crm-surface-section p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 shadow-sm">
            <Users className="h-5 w-5 text-[#4285F4]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">Google Contacts Sync</h2>
            <p className="text-sm text-fg-muted mt-0.5">
              Import your Google Contacts into the CRM. New contacts are added; existing emails are skipped.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex gap-2 items-center">
          {hasContactsScope ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Connected
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={syncing}
                onClick={() => void sync()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Sync Now
              </Button>
            </>
          ) : isGoogleConnected ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={connecting}
              onClick={() => void connect()}
            >
              Enable Contacts
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={connecting}
              onClick={() => void connect()}
            >
              Connect Google
            </Button>
          )}
        </div>
      </div>

      {lastResult && (
        <p className="text-sm text-success">
          Imported {lastResult.imported} new contacts ({lastResult.skipped} already existed).
        </p>
      )}

      {!hasContactsScope && isGoogleConnected && (
        <p className="text-xs text-fg-muted">
          Your Google account is connected but the Contacts permission is not enabled. Click "Enable Contacts" to re-authorize with the additional permission.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-fg" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-danger" aria-hidden />
          {error}
        </div>
      )}
    </section>
  )
}
