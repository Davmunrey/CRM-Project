import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Trash2, Video } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { toast } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'

interface ZoomStatus {
  configured: boolean
}

export function ZoomIntegrationCard() {
  const [status, setStatus] = useState<ZoomStatus | null>(null)
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgId = useAuthStore((s) => s.organizationId)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<ZoomStatus>('/zoom')
      setStatus(data)
    } catch {
      setStatus({ configured: false })
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const save = async () => {
    if (secret.length < 8) {
      setError('Webhook secret must be at least 8 characters')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.post('/zoom', { webhookSecret: secret })
      toast.success('Zoom integration saved')
      setShowForm(false)
      setSecret('')
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    setError(null)
    try {
      await api.delete('/zoom')
      toast.success('Zoom integration removed')
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove')
    } finally {
      setRemoving(false)
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

  const webhookUrl = orgId
    ? `${window.location.origin.replace(':5173', ':3001')}/api/zoom/webhook/${orgId}`
    : null

  return (
    <section className="crm-surface-section p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 shadow-sm">
            <Video className="h-5 w-5 text-info" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">Zoom Meetings</h2>
            <p className="text-sm text-fg-muted mt-0.5">
              Automatically log Zoom meetings as activities in the CRM when they end.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex gap-2 items-center">
          {status.configured ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Connected
              </span>
              <Button type="button" variant="ghost" size="sm" loading={removing} onClick={() => void remove()}>
                <Trash2 className="h-4 w-4 text-danger" aria-hidden />
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'Connect Zoom'}
            </Button>
          )}
        </div>
      </div>

      {status.configured && webhookUrl && (
        <p className="text-xs text-fg-muted">
          Webhook URL:{' '}
          <span className="font-mono text-fg bg-surface-2 px-1.5 py-0.5 rounded text-[11px]">{webhookUrl}</span>
        </p>
      )}

      {showForm && !status.configured && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-fg-muted">
            In your Zoom App dashboard, go to <strong>Feature → Event Subscriptions</strong>, add a subscription,
            and copy the <strong>Secret Token</strong>. Set the event notification endpoint URL to:
            {webhookUrl && (
              <span className="block font-mono text-[11px] mt-1 bg-surface-2 px-2 py-1 rounded text-fg">
                {webhookUrl}
              </span>
            )}
            Enable the <strong>meeting.ended</strong> event.
          </p>
          <Input
            label="Zoom Webhook Secret Token"
            placeholder="Paste your Zoom Secret Token here"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <Button type="button" variant="primary" size="sm" loading={saving} onClick={() => void save()}>
            Save
          </Button>
        </div>
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
