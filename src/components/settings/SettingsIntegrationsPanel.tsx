import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyRound, Link2, Trash2, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useTranslations } from '../../i18n'
import { hasPermission } from '../../utils/permissions'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ConfirmDialog } from '../ui/Modal'
import { toast } from '../../store/toastStore'

type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
}

type LeadTokenRow = {
  id: string
  label: string
  created_at: string
  enabled: boolean
}

function edgeErrorMessage(error: unknown, fallback: string): string {
  const e = error as { message?: string; context?: Response }
  const status = edgeErrorStatus(error)
  const base = typeof e?.message === 'string' && e.message.trim() ? e.message : ''
  if (status === 401) return 'Your session is invalid or expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'This resource no longer exists. Refresh and try again.'
  if (status === 409 || status === 400) {
    return base || 'Validation failed. Please review your input and try again.'
  }
  return base || fallback
}

function edgeErrorStatus(error: unknown): number | null {
  const e = error as { context?: Response }
  if (e?.context && typeof e.context.status === 'number') return e.context.status
  return null
}

export function SettingsIntegrationsPanel() {
  const t = useTranslations()
  const organizationId = useAuthStore((s) => s.organizationId)
  const currentUser = useAuthStore((s) => s.currentUser)
  const canManage = !!currentUser && hasPermission(currentUser.role, 'settings:update')

  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([])
  const [tokens, setTokens] = useState<LeadTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('')
  const [tokenLabel, setTokenLabel] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [lastShownApiKey, setLastShownApiKey] = useState<string | null>(null)
  const [lastShownToken, setLastShownToken] = useState<string | null>(null)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null)
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null)
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null)
  const loadGen = useRef(0)

  const invokeWithSessionRetry = useCallback(
    async (fn: 'api-keys' | 'lead-capture-tokens', body: Record<string, unknown>) => {
      const client = supabase
      if (!client) return { data: null, error: new Error('Supabase not configured') as unknown }
      const invokeOnce = async () => {
        const { data: sessionData } = await client.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          return {
            data: null,
            error: {
              message: 'Your session is not available. Please sign in again.',
              context: { status: 401 },
            } as unknown,
          }
        }
        return client.functions.invoke(fn, {
          body,
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }

      let res = await invokeOnce()
      if (edgeErrorStatus(res.error) === 401) {
        await client.auth.refreshSession()
        res = await invokeOnce()
      }
      if (res.error && typeof (res.error as { context?: Response }).context?.clone === 'function') {
        try {
          const details = await (res.error as { context: Response }).context.clone().json() as { error?: string }
          if (details?.error && typeof details.error === 'string') {
            ;(res.error as { message?: string }).message = details.error
          }
        } catch {
          // Keep default SDK message when no JSON payload is available.
        }
      }
      return res
    },
    [],
  )

  const load = useCallback(async () => {
    const snap = (loadGen.current += 1)
    if (!supabase || !organizationId) {
      if (snap === loadGen.current) {
        setApiKeys([])
        setTokens([])
        setLoading(false)
      }
      return
    }
    setLoading(true)
    setLoadError(null)
    const [kRes, tRes] = await Promise.all([
      invokeWithSessionRetry('api-keys', { action: 'list', organizationId }),
      invokeWithSessionRetry('lead-capture-tokens', { action: 'list', organizationId }),
    ])
    if (snap !== loadGen.current) return
    if (kRes.error || tRes.error) {
      setLoadError(
        edgeErrorMessage(kRes.error ?? tRes.error, t.settings.integrationsLoadError),
      )
      setApiKeys([])
      setTokens([])
    } else {
      const kd = kRes.data as { keys?: ApiKeyRow[] }
      const td = tRes.data as { tokens?: LeadTokenRow[] }
      setApiKeys(kd.keys ?? [])
      setTokens(td.tokens ?? [])
    }
    setLoading(false)
  }, [invokeWithSessionRetry, organizationId, t.settings.integrationsLoadError])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: loads integration data on mount; setState inside async `load` is the standard data-fetching pattern
    void load()
    return () => {
      loadGen.current += 1
    }
  }, [load])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t.common.copied)
    } catch {
      toast.error(t.settings.integrationsLoadError)
    }
  }

  const handleCreateKey = async () => {
    if (!supabase || !organizationId || !canManage) return
    const name = keyName.trim()
    if (!name) return
    setSavingKey(true)
    const { data, error } = await invokeWithSessionRetry('api-keys', { action: 'create', organizationId, name })
    setSavingKey(false)
    if (error) {
      toast.error(edgeErrorMessage(error, t.settings.integrationsLoadError))
      return
    }
    const d = data as { error?: string; apiKey?: string }
    if (d.error) {
      toast.error(d.error)
      return
    }
    if (d.apiKey) {
      setLastShownApiKey(d.apiKey)
    }
    setKeyName('')
    void load()
  }

  const handleDeleteKey = async () => {
    if (!supabase || !organizationId || !deleteKeyId) return
    const id = deleteKeyId
    setDeleteKeyId(null)
    setDeletingKeyId(id)
    const { data, error } = await invokeWithSessionRetry('api-keys', {
      action: 'delete',
      organizationId,
      keyId: id,
    })
    setDeletingKeyId(null)
    if (error) {
      toast.error(edgeErrorMessage(error, t.settings.integrationsLoadError))
      return
    }
    const d = data as { error?: string }
    if (d.error) {
      toast.error(d.error)
      return
    }
    toast.success(t.settings.integrationsDeleted)
    void load()
  }

  const handleCreateToken = async () => {
    if (!supabase || !organizationId || !canManage) return
    setSavingToken(true)
    const { data, error } = await invokeWithSessionRetry('lead-capture-tokens', {
      action: 'create',
      organizationId,
      label: tokenLabel.trim() || undefined,
    })
    setSavingToken(false)
    if (error) {
      toast.error(edgeErrorMessage(error, t.settings.integrationsLoadError))
      return
    }
    const d = data as { error?: string; token?: string }
    if (d.error) {
      toast.error(d.error)
      return
    }
    if (d.token) {
      setLastShownToken(d.token)
    }
    setTokenLabel('')
    void load()
  }

  const handleDeleteToken = async () => {
    if (!supabase || !organizationId || !deleteTokenId) return
    const id = deleteTokenId
    setDeleteTokenId(null)
    setDeletingTokenId(id)
    const { data, error } = await invokeWithSessionRetry('lead-capture-tokens', {
      action: 'delete',
      organizationId,
      tokenId: id,
    })
    setDeletingTokenId(null)
    if (error) {
      toast.error(edgeErrorMessage(error, t.settings.integrationsLoadError))
      return
    }
    const d = data as { error?: string }
    if (d.error) {
      toast.error(d.error)
      return
    }
    toast.success('Token deleted')
    void load()
  }

  if (!supabase) {
    return <p className="text-sm text-fg-muted">{t.settings.webhooksRequiresSupabase}</p>
  }
  if (!organizationId) return null

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-base font-semibold text-fg">{t.settings.integrationsTitle}</h2>
        {!canManage && (
          <div
            className="mt-3 rounded-xl border border-info/25 bg-info/8 px-4 py-3 text-sm text-fg-muted leading-relaxed"
            role="status"
          >
            You have read-only access in this workspace.
          </div>
        )}
      </div>

      {loadError && (
        <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-fg-muted" role="alert">
          {loadError}
          <Button type="button" size="sm" variant="secondary" className="ml-2" onClick={() => void load()}>
            {t.settings.webhooksRetryLoad}
          </Button>
        </div>
      )}

      {lastShownApiKey && (
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/8 p-4 space-y-2">
          <p className="text-sm font-medium text-fg">{t.settings.integrationsCopyKeyOnce}</p>
          <code className="block text-xs font-mono break-all text-fg-muted bg-surface-1 p-2 rounded-lg border border-border-subtle">
            {lastShownApiKey}
          </code>
          <Button type="button" size="sm" variant="secondary" leftIcon={<Copy size={14} />} onClick={() => void copyText(lastShownApiKey)}>
            {t.common.copy}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setLastShownApiKey(null)}>
            {t.common.close}
          </Button>
        </div>
      )}

      {lastShownToken && (
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/8 p-4 space-y-2">
          <p className="text-sm font-medium text-fg">{t.settings.integrationsTokenCreated}</p>
          <code className="block text-xs font-mono break-all text-fg-muted bg-surface-1 p-2 rounded-lg border border-border-subtle">
            {lastShownToken}
          </code>
          <Button type="button" size="sm" variant="secondary" leftIcon={<Copy size={14} />} onClick={() => void copyText(lastShownToken)}>
            {t.common.copy}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setLastShownToken(null)}>
            {t.common.close}
          </Button>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-start gap-2">
          <KeyRound size={18} className="text-accent-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <h3 className="text-sm font-medium text-fg">{t.settings.integrationsPublicApiTitle}</h3>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-col gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label={t.settings.integrationsApiKeyName}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <Button type="button" size="sm" className="self-start" onClick={() => void handleCreateKey()} disabled={savingKey || !keyName.trim()}>
              {t.settings.integrationsCreateApiKey}
            </Button>
          </div>
        )}

        <p className="text-sm font-medium text-fg">{t.settings.integrationsApiKeysList}</p>
        {loading ? (
          <p className="text-xs text-fg-muted">{t.common.loading}</p>
        ) : apiKeys.length === 0 ? (
          <p className="text-xs text-fg-subtle">{t.settings.integrationsApiKeysEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {apiKeys.map((k) => (
              <li
                key={k.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-fg/8 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{k.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {t.settings.integrationsKeyPrefix}: {k.key_prefix}
                    {k.revoked_at ? ` · ${t.settings.integrationsRevokedBadge}` : ''}
                    {k.last_used_at ? ` · ${t.settings.integrationsLastUsed}: ${new Date(k.last_used_at).toLocaleString()}` : ''}
                  </p>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteKeyId(k.id)}
                    disabled={deletingKeyId === k.id}
                  >
                    {deletingKeyId === k.id ? 'Deleting...' : t.settings.integrationsDeleteApiKey}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-start gap-2">
          <Link2 size={18} className="text-accent-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <h3 className="text-sm font-medium text-fg">{t.settings.integrationsLeadCaptureTitle}</h3>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-col gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label={t.settings.integrationsTokenLabel}
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
              />
            </div>
            <Button type="button" size="sm" className="self-start" onClick={() => void handleCreateToken()} disabled={savingToken}>
              {t.settings.integrationsCreateToken}
            </Button>
          </div>
        )}

        <p className="text-sm font-medium text-fg">{t.settings.integrationsTokensList}</p>
        {loading ? (
          <p className="text-xs text-fg-muted">{t.common.loading}</p>
        ) : tokens.length === 0 ? (
          <p className="text-xs text-fg-subtle">{t.settings.integrationsTokensEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((tok) => (
              <li
                key={tok.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-fg/8 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{tok.label}</p>
                  <p className="text-xs text-fg-subtle">{new Date(tok.created_at).toLocaleString()}</p>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTokenId(tok.id)}
                    disabled={deletingTokenId === tok.id}
                  >
                    {deletingTokenId === tok.id ? (
                      'Deleting...'
                    ) : (
                      <Trash2 size={14} className="text-danger" aria-hidden />
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!deleteKeyId}
        onClose={() => setDeleteKeyId(null)}
        onConfirm={() => void handleDeleteKey()}
        title={t.settings.integrationsDeleteApiKey}
        message={t.settings.integrationsDeleteApiKeyConfirm}
        confirmLabel={t.common.delete}
        danger
      />

      <ConfirmDialog
        isOpen={!!deleteTokenId}
        onClose={() => setDeleteTokenId(null)}
        onConfirm={() => void handleDeleteToken()}
        title={t.settings.integrationsDeleteToken}
        message={t.settings.integrationsDeleteTokenConfirm}
        confirmLabel={t.common.delete}
        danger
      />
    </div>
  )
}
