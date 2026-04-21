import { useCallback, useEffect, useState } from 'react'
import { Trash2, FlaskConical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useTranslations } from '../../i18n'
import { hasPermission } from '../../utils/permissions'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Switch } from '../ui/Switch'
import { ConfirmDialog } from '../ui/Modal'
import { toast } from '../../store/toastStore'

type WebhookRow = {
  id: string
  name: string
  target_url: string
  enabled: boolean
  event_filters: string[]
  custom_headers: Record<string, unknown>
  last_http_status: number | null
  last_delivery_error: string | null
  last_delivery_at: string | null
}

export function SettingsWebhooksPanel() {
  const t = useTranslations()
  const organizationId = useAuthStore((s) => s.organizationId)
  const currentUser = useAuthStore((s) => s.currentUser)
  const canManage = !!currentUser && hasPermission(currentUser.role, 'settings:update')

  const [rows, setRows] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [signingSecret, setSigningSecret] = useState('')
  const [eventFilters, setEventFilters] = useState('*')
  const [customHeadersJson, setCustomHeadersJson] = useState('{}')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [rotateId, setRotateId] = useState<string | null>(null)
  const [rotateSecret, setRotateSecret] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !organizationId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, name, target_url, enabled, event_filters, custom_headers, last_http_status, last_delivery_error, last_delivery_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(t.settings.webhooksLoadError)
      setRows([])
    } else {
      setRows((data ?? []) as WebhookRow[])
    }
    setLoading(false)
  }, [organizationId, t.settings.webhooksLoadError])

  useEffect(() => {
    void load()
  }, [load])

  const parseFilters = (): string[] => {
    const parts = eventFilters.split(',').map((s) => s.trim()).filter(Boolean)
    return parts.length ? parts : ['*']
  }

  const parseHeaders = (): Record<string, string> | null => {
    const raw = customHeadersJson.trim() || '{}'
    try {
      const o = JSON.parse(raw) as unknown
      if (o === null || typeof o !== 'object' || Array.isArray(o)) return null
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v
        else return null
      }
      return out
    } catch {
      return null
    }
  }

  const handleCreate = async () => {
    if (!supabase || !organizationId || !canManage) return
    const headers = parseHeaders()
    if (headers === null) {
      toast.error(t.settings.webhooksInvalidHeadersJson)
      return
    }
    if (signingSecret.trim().length < 16) {
      toast.error(t.settings.webhooksSecretMin)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('webhook-subscriptions', {
      body: {
        action: 'create',
        organizationId,
        name: name.trim(),
        targetUrl: targetUrl.trim(),
        signingSecret: signingSecret.trim(),
        eventFilters: parseFilters(),
        customHeaders: headers,
      },
    })
    setSaving(false)
    if (error) {
      toast.error(error.message ?? t.settings.webhooksLoadError)
      return
    }
    const errMsg = (data as { error?: string })?.error
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    toast.success(t.settings.webhooksCreated)
    setName('')
    setTargetUrl('')
    setSigningSecret('')
    setEventFilters('*')
    setCustomHeadersJson('{}')
    void load()
  }

  const toggleEnabled = async (row: WebhookRow, next: boolean) => {
    if (!supabase || !canManage) return
    const { error } = await supabase.from('webhook_subscriptions').update({ enabled: next }).eq('id', row.id)
    if (error) {
      toast.error(error.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: next } : r)))
  }

  const handleDelete = async () => {
    if (!supabase || !deleteId) return
    const id = deleteId
    setDeleteId(null)
    const { error } = await supabase.from('webhook_subscriptions').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(t.common.delete)
    void load()
  }

  const handleTest = async (id: string) => {
    if (!supabase || !organizationId || !canManage) return
    setTestingId(id)
    const { data, error } = await supabase.functions.invoke('webhook-subscriptions', {
      body: { action: 'test', organizationId, subscriptionId: id },
    })
    setTestingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    const d = data as { success?: boolean; error?: string | null }
    if (d.success) toast.success(t.settings.webhooksTestOk)
    else toast.error(d.error || t.settings.webhooksTestFail)
    void load()
  }

  const handleRotate = async () => {
    if (!supabase || !organizationId || !rotateId || !canManage) return
    if (rotateSecret.trim().length < 16) {
      toast.error(t.settings.webhooksSecretMin)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('webhook-subscriptions', {
      body: {
        action: 'rotateSecret',
        organizationId,
        subscriptionId: rotateId,
        signingSecret: rotateSecret.trim(),
      },
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    const errMsg = (data as { error?: string })?.error
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    toast.success(t.settings.webhooksRotated)
    setRotateId(null)
    setRotateSecret('')
    void load()
  }

  if (!supabase) {
    return <p className="text-sm text-fg-muted">{t.settings.webhooksRequiresSupabase}</p>
  }

  if (!organizationId) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-fg">{t.settings.webhooksTitle}</h2>
        <p className="text-xs text-fg-subtle mt-1">{t.settings.webhooksIntro}</p>
        <p className="text-xs text-fg-muted mt-2">{t.settings.webhooksCronHint}</p>
      </div>

      {canManage && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm font-medium text-fg">{t.settings.webhooksCreateSection}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t.settings.webhooksName} value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label={t.settings.webhooksTargetUrl}
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <Input
            label={t.settings.webhooksSigningSecret}
            type="password"
            autoComplete="new-password"
            value={signingSecret}
            onChange={(e) => setSigningSecret(e.target.value)}
          />
          <Input
            label={t.settings.webhooksEventFilters}
            value={eventFilters}
            onChange={(e) => setEventFilters(e.target.value)}
            helpText={t.settings.webhooksEventFiltersHint}
          />
          <div>
            <Textarea
              label={t.settings.webhooksCustomHeadersJson}
              value={customHeadersJson}
              onChange={(e) => setCustomHeadersJson(e.target.value)}
              spellCheck={false}
              rows={4}
              className="min-h-[72px] font-mono text-sm"
            />
            <p className="text-xs text-fg-subtle mt-1">{t.settings.webhooksCustomHeadersHint}</p>
          </div>
          <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={saving}>
            {t.settings.webhooksCreate}
          </Button>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-fg mb-2">{t.settings.webhooksListTitle}</p>
        {loading ? (
          <p className="text-xs text-fg-muted">{t.common.loading}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-fg-muted">{t.settings.webhooksListEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{row.name}</p>
                    <p className="text-xs text-fg-muted font-mono truncate">{row.target_url}</p>
                    <p className="text-xs text-fg-subtle mt-1">
                      {t.settings.webhooksEventFilters}: {(row.event_filters ?? []).join(', ')}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {t.settings.webhooksLastStatus}:{' '}
                      {row.last_http_status != null ? String(row.last_http_status) : '-'}
                      {row.last_delivery_error ? ` - ${row.last_delivery_error.slice(0, 120)}` : ''}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{t.settings.webhooksEnabled}</span>
                        <Switch checked={row.enabled} onChange={(v) => void toggleEnabled(row, v)} />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={testingId === row.id}
                        onClick={() => void handleTest(row.id)}
                      >
                        <FlaskConical size={14} className="mr-1 inline" aria-hidden />
                        {t.settings.webhooksTest}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRotateId(row.id)
                          setRotateSecret('')
                        }}
                      >
                        {t.settings.webhooksRotateTitle}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(row.id)}>
                        <Trash2 size={14} className="text-danger" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
                {canManage && rotateId === row.id && (
                  <div className="border-t border-fg/8 pt-3 space-y-2">
                    <p className="text-xs text-fg-muted">{t.settings.webhooksRotateIntro}</p>
                    <Input
                      label={t.settings.webhooksNewSecret}
                      type="password"
                      autoComplete="new-password"
                      value={rotateSecret}
                      onChange={(e) => setRotateSecret(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void handleRotate()} disabled={saving}>
                        {t.settings.webhooksRotateSubmit}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRotateId(null)
                          setRotateSecret('')
                        }}
                      >
                        {t.common.cancel}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
        title={t.settings.webhooksDelete}
        message={t.settings.webhooksDeleteConfirm}
        confirmLabel={t.common.delete}
        danger
      />
    </div>
  )
}
