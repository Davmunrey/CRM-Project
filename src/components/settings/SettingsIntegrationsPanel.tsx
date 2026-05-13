import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyRound, Link2, Trash2, Copy } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslations } from '../../i18n'
import { hasPermission } from '../../utils/permissions'
import { api } from '../../lib/api'
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

  const load = useCallback(async () => {
    const snap = (loadGen.current += 1)
    if (!organizationId) {
      setApiKeys([])
      setTokens([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const [kRes, tRes] = await Promise.all([
        api.get<{ keys: ApiKeyRow[] }>('/integrations/api-keys'),
        api.get<{ tokens: LeadTokenRow[] }>('/integrations/lead-capture-tokens'),
      ])
      if (snap !== loadGen.current) return
      setApiKeys(kRes?.keys ?? [])
      setTokens(tRes?.tokens ?? [])
    } catch (err) {
      if (snap !== loadGen.current) return
      setLoadError(err instanceof Error ? err.message : t.settings.integrationsLoadError)
      setApiKeys([])
      setTokens([])
    } finally {
      if (snap === loadGen.current) setLoading(false)
    }
  }, [organizationId, t.settings.integrationsLoadError])

  useEffect(() => {
    void load()
    return () => { loadGen.current += 1 }
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
    if (!organizationId || !canManage) return
    const name = keyName.trim()
    if (!name) return
    setSavingKey(true)
    try {
      const res = await api.post<{ apiKey?: string }>('/integrations/api-keys', { name })
      if (res?.apiKey) setLastShownApiKey(res.apiKey)
      setKeyName('')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.integrationsLoadError)
    } finally {
      setSavingKey(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!organizationId || !deleteKeyId) return
    const id = deleteKeyId
    setDeleteKeyId(null)
    setDeletingKeyId(id)
    try {
      await api.delete(`/integrations/api-keys/${id}`)
      toast.success(t.settings.integrationsDeleted)
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.integrationsLoadError)
    } finally {
      setDeletingKeyId(null)
    }
  }

  const handleCreateToken = async () => {
    if (!organizationId || !canManage) return
    setSavingToken(true)
    try {
      const res = await api.post<{ token?: string }>('/integrations/lead-capture-tokens', {
        label: tokenLabel.trim() || undefined,
      })
      if (res?.token) setLastShownToken(res.token)
      setTokenLabel('')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.integrationsLoadError)
    } finally {
      setSavingToken(false)
    }
  }

  const handleDeleteToken = async () => {
    if (!organizationId || !deleteTokenId) return
    const id = deleteTokenId
    setDeleteTokenId(null)
    setDeletingTokenId(id)
    try {
      await api.delete(`/integrations/lead-capture-tokens/${id}`)
      toast.success('Token deleted')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.integrationsLoadError)
    } finally {
      setDeletingTokenId(null)
    }
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
