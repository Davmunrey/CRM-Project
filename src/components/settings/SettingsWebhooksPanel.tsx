import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, FlaskConical, Sparkles, Link2, HelpCircle, RotateCcw } from 'lucide-react'
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

function suggestSigningSecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function WebhookSigningSecretHelpBlock({
  toggle,
  p1,
  p2,
  p3,
}: {
  toggle: string
  p1: string
  p2: string
  p3: string
}) {
  return (
    <details className="rounded-lg border border-fg/8 bg-surface-2/30 px-3 py-2 group">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-fg-muted select-none hover:text-accent-400 [&::-webkit-details-marker]:hidden">
        <HelpCircle size={15} className="shrink-0 text-accent-400/90" aria-hidden />
        <span className="border-b border-dotted border-fg-subtle/50 group-open:border-transparent">{toggle}</span>
      </summary>
      <div className="mt-3 space-y-2 border-l-2 border-accent-500/25 pl-3 text-xs leading-relaxed text-fg-subtle">
        <p>{p1}</p>
        <p>{p2}</p>
        <p>{p3}</p>
      </div>
    </details>
  )
}

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

type FailedOutboxRow = {
  id: string
  created_at: string
  event_key: string
  entity_type: string
  entity_id: string
  attempts: number
  last_error: string | null
  status: string
}

export function SettingsWebhooksPanel() {
  const t = useTranslations()
  const organizationId = useAuthStore((s) => s.organizationId)
  const currentUser = useAuthStore((s) => s.currentUser)
  const canManage = !!currentUser && hasPermission(currentUser.role, 'settings:update')

  const [rows, setRows] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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
  const [failedRows, setFailedRows] = useState<FailedOutboxRow[]>([])
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const loadGenerationRef = useRef(0)

  const load = useCallback(async () => {
    const snapshot = (loadGenerationRef.current += 1)
    if (!supabase || !organizationId) {
      if (snapshot === loadGenerationRef.current) {
        setRows([])
        setFailedRows([])
        setLoading(false)
      }
      return
    }
    setLoading(true)
    setLoadError(null)
    const [subsRes, failedRes] = await Promise.all([
      supabase
        .from('webhook_subscriptions')
        .select(
          'id, name, target_url, enabled, event_filters, custom_headers, last_http_status, last_delivery_error, last_delivery_at',
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase.functions.invoke('webhook-subscriptions', {
        body: { action: 'listFailedOutbox', organizationId, limit: 25 },
      }),
    ])
    if (snapshot !== loadGenerationRef.current) return
    if (subsRes.error) {
      setLoadError(t.settings.webhooksLoadErrorInline)
      setRows([])
    } else {
      setLoadError(null)
      setRows((subsRes.data ?? []) as WebhookRow[])
    }
    const fd = failedRes.data as { rows?: FailedOutboxRow[]; error?: string } | null
    if (failedRes.error || fd?.error) {
      setFailedRows([])
    } else {
      setFailedRows(fd?.rows ?? [])
    }
    setLoading(false)
  }, [organizationId, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: loads webhook list on mount; setState inside async `load` is the standard data-fetching pattern
    void load()
    return () => {
      loadGenerationRef.current += 1
    }
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

  const handleReplayFailed = async (outboxId: string) => {
    if (!supabase || !organizationId || !canManage) return
    setReplayingId(outboxId)
    const { data, error } = await supabase.functions.invoke('webhook-subscriptions', {
      body: { action: 'replayOutbox', organizationId, outboxId },
    })
    setReplayingId(null)
    if (error) {
      toast.error(error.message ?? t.settings.webhooksLoadFailed)
      return
    }
    const d = data as { error?: string }
    if (d.error) {
      toast.error(d.error)
      return
    }
    toast.success(t.settings.webhooksReplayed)
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
        <p className="text-sm text-fg-muted mt-2 leading-relaxed max-w-2xl">{t.settings.webhooksIntro}</p>
        <p className="text-xs text-fg-subtle mt-2 max-w-2xl">{t.settings.webhooksTagline}</p>
        <details className="mt-4 group rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2">
          <summary className="text-xs font-medium text-fg-muted cursor-pointer list-none flex items-center gap-2 select-none hover:text-accent-400 [&::-webkit-details-marker]:hidden">
            <span className="border-b border-dotted border-fg-subtle/60 group-open:border-transparent">
              {t.settings.webhooksCronHintTitle}
            </span>
          </summary>
          <p className="text-xs text-fg-subtle mt-2 leading-relaxed pl-0.5 border-l-2 border-accent-500/25 pl-2.5">
            {t.settings.webhooksCronHint}
          </p>
        </details>
      </div>

      {!canManage && (
        <div className="space-y-3">
          <div
            className="rounded-xl border border-info/25 bg-info/8 px-4 py-3 text-sm text-fg-muted leading-relaxed"
            role="status"
          >
            {t.settings.webhooksReadOnlyHint}
          </div>
          <WebhookSigningSecretHelpBlock
            toggle={t.settings.webhooksSigningSecretHelpToggle}
            p1={t.settings.webhooksSigningSecretHelpP1}
            p2={t.settings.webhooksSigningSecretHelpP2}
            p3={t.settings.webhooksSigningSecretHelpP3}
          />
        </div>
      )}

      {loadError && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-fg-muted leading-relaxed">{loadError}</p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
              {t.settings.webhooksRetryLoad}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setLoadError(null)}>
              {t.common.close}
            </Button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-1 p-4 shadow-sm">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label={t.settings.webhooksSigningSecret}
                type="password"
                autoComplete="new-password"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              leftIcon={<Sparkles size={14} aria-hidden />}
              onClick={() => setSigningSecret(suggestSigningSecret())}
            >
              {t.settings.webhooksGenerateSecret}
            </Button>
          </div>
          <WebhookSigningSecretHelpBlock
            toggle={t.settings.webhooksSigningSecretHelpToggle}
            p1={t.settings.webhooksSigningSecretHelpP1}
            p2={t.settings.webhooksSigningSecretHelpP2}
            p3={t.settings.webhooksSigningSecretHelpP3}
          />
          <details className="rounded-lg border border-fg/8 bg-surface-2/40 px-3 py-2 group">
            <summary className="text-xs font-medium text-fg-muted cursor-pointer list-none select-none hover:text-accent-400 [&::-webkit-details-marker]:hidden">
              <span className="border-b border-dotted border-fg-subtle/50 group-open:border-transparent">
                {t.settings.webhooksOptionalFieldsTitle}
              </span>
            </summary>
            <p className="text-[11px] text-fg-subtle mt-2 mb-2 leading-relaxed">{t.settings.webhooksOptionalFieldsHint}</p>
            <div className="space-y-3 pt-1">
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
            </div>
          </details>
          <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={saving}>
            {t.settings.webhooksCreate}
          </Button>
        </div>
      )}

      {canManage && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm font-medium text-fg">{t.settings.webhooksFailedTitle}</p>
          {loading ? (
            <p className="text-xs text-fg-muted">{t.common.loading}</p>
          ) : failedRows.length === 0 ? (
            <p className="text-xs text-fg-subtle">{t.settings.webhooksFailedEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {failedRows.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-fg/8 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-mono text-fg truncate">{f.event_key}</p>
                    <p className="text-fg-subtle">
                      {t.settings.webhooksFailedEvent}: {f.entity_type} {f.entity_id.slice(0, 8)}… ·{' '}
                      {t.settings.webhooksFailedAttempts}: {f.attempts}
                    </p>
                    {f.last_error ? (
                      <p className="text-danger/90 line-clamp-2">{t.settings.webhooksFailedError}: {f.last_error}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={replayingId === f.id}
                    leftIcon={<RotateCcw size={14} aria-hidden />}
                    onClick={() => void handleReplayFailed(f.id)}
                  >
                    {t.settings.webhooksReplay}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-fg mb-2">{t.settings.webhooksListTitle}</p>
        {loading ? (
          <p className="text-xs text-fg-muted">{t.common.loading}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-fg/15 bg-fg/[0.02] px-5 py-8 text-center max-w-md">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/10 text-accent-400">
              <Link2 size={20} aria-hidden />
            </div>
            <p className="text-sm font-medium text-fg">{t.settings.webhooksListEmpty}</p>
            <p className="text-xs text-fg-subtle mt-2 leading-relaxed">{t.settings.webhooksListEmptyHint}</p>
          </div>
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
                    <WebhookSigningSecretHelpBlock
                      toggle={t.settings.webhooksSigningSecretHelpToggle}
                      p1={t.settings.webhooksSigningSecretHelpP1}
                      p2={t.settings.webhooksSigningSecretHelpP2}
                      p3={t.settings.webhooksSigningSecretHelpP3}
                    />
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
