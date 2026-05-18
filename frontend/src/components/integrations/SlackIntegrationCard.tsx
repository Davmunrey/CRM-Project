import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { toast } from '../../store/toastStore'

interface SlackStatus {
  configured: boolean
  channel: string | null
}

const ERR_SLACK_WEBHOOK_URL = 'Must be a valid Slack incoming webhook URL (https://hooks.slack.com/services/...)'

export function SlackIntegrationCard() {
  const [status, setStatus] = useState<SlackStatus | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [channel, setChannel] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<SlackStatus>('/slack')
      setStatus(data)
    } catch {
      setStatus({ configured: false, channel: null })
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const save = async () => {
    if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
      setError(ERR_SLACK_WEBHOOK_URL)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.post('/slack', { webhookUrl, channel: channel || undefined })
      toast.success('Slack integration saved')
      setShowForm(false)
      setWebhookUrl('')
      setChannel('')
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setError(null)
    try {
      await api.post('/slack/test', {})
      toast.success('Test message sent to Slack!')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send test message')
    } finally {
      setTesting(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    setError(null)
    try {
      await api.delete('/slack')
      toast.success('Slack integration removed')
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

  return (
    <section className="crm-surface-section p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 shadow-sm">
            <MessageSquare className="h-5 w-5 text-fg" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">Slack Notifications</h2>
            <p className="text-sm text-fg-muted mt-0.5">
              Receive deal and contact alerts in your Slack workspace via an incoming webhook.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex gap-2">
          {status.configured ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Connected
              </span>
              <Button type="button" variant="ghost" size="sm" loading={testing} onClick={() => void test()}>
                Test
              </Button>
              <Button type="button" variant="ghost" size="sm" loading={removing} onClick={() => void remove()}>
                <Trash2 className="h-4 w-4 text-danger" aria-hidden />
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'Connect Slack'}
            </Button>
          )}
        </div>
      </div>

      {status.configured && status.channel && (
        <p className="text-xs text-fg-muted">Posting to channel: <span className="font-mono">{status.channel}</span></p>
      )}

      {showForm && !status.configured && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-fg-muted">
            Create an <strong>Incoming Webhook</strong> in your Slack workspace at
            <span className="font-mono text-accent-400"> api.slack.com/apps</span>, then paste the webhook URL below.
          </p>
          <Input
            label="Webhook URL"
            placeholder="https://hooks.slack.com/services/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <Input
            label="Channel (optional)"
            placeholder="#deals (leave blank to use webhook default)"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
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
