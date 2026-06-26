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

// The API uses postgres.camel, so responses are camelCase (not the DB's snake_case).
type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  scopes?: string[] | null
}

// Scopes the UI offers when minting a key. Empty selection = full access (legacy default).
const SCOPE_OPTIONS = ['leads:write', 'scim'] as const

interface LeadFormConfig {
  title?: string
  description?: string
  fields?: string[]
  successMessage?: string
}

type LeadTokenRow = {
  id: string
  label: string
  createdAt: string
  enabled: boolean
  config?: LeadFormConfig | null
  submissionCount?: number
}

// Optional fields the form builder can toggle; `email` is always included by the API.
const FORM_FIELD_OPTIONS = ['firstName', 'lastName', 'company', 'phone', 'message'] as const

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
  const [keyScopes, setKeyScopes] = useState<string[]>([])
  const [tokenLabel, setTokenLabel] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [configToken, setConfigToken] = useState<LeadTokenRow | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSuccess, setDraftSuccess] = useState('')
  const [draftFields, setDraftFields] = useState<string[]>([])
  const [savingConfig, setSavingConfig] = useState(false)
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
      // Omit scopes entirely when none are selected → backend treats it as full access.
      const payload = keyScopes.length > 0 ? { name, scopes: keyScopes } : { name }
      const res = await api.post<{ apiKey?: string }>('/integrations/api-keys', payload)
      if (res?.apiKey) setLastShownApiKey(res.apiKey)
      setKeyName('')
      setKeyScopes([])
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

  const formUrl = (token: string) => `${window.location.origin}/forms/${token}`
  const embedSnippet = (token: string) =>
    `<iframe src="${formUrl(token)}" width="100%" height="520" style="border:0" title="Contact form"></iframe>`

  const fieldLabels: Record<string, string> = {
    firstName: t.contacts.firstName,
    lastName: t.contacts.lastName,
    company: t.contacts.company,
    phone: t.common.phone,
    message: t.leadForm.fieldMessage,
  }

  const openConfig = (tok: LeadTokenRow) => {
    setConfigToken(tok)
    setDraftTitle(tok.config?.title ?? '')
    setDraftSuccess(tok.config?.successMessage ?? '')
    setDraftFields(tok.config?.fields ?? ['firstName', 'lastName', 'email', 'company', 'message'])
  }

  const saveConfig = async () => {
    if (!configToken) return
    setSavingConfig(true)
    try {
      await api.patch(`/integrations/lead-capture-tokens/${configToken.id}`, {
        config: {
          title: draftTitle.trim() || undefined,
          successMessage: draftSuccess.trim() || undefined,
          // email is always included server-side; keep the user's optional picks.
          fields: Array.from(new Set(['email', ...draftFields])),
        },
      })
      toast.success(t.common.save)
      setConfigToken(null)
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.integrationsLoadError)
    } finally {
      setSavingConfig(false)
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
          <p className="text-xs font-medium text-fg-muted pt-1">{t.leadForm.formUrl}</p>
          <code className="block text-xs font-mono break-all text-fg-muted bg-surface-1 p-2 rounded-lg border border-border-subtle">
            {formUrl(lastShownToken)}
          </code>
          <p className="text-xs font-medium text-fg-muted pt-1">{t.leadForm.embedCode}</p>
          <code className="block text-[11px] font-mono break-all text-fg-muted bg-surface-1 p-2 rounded-lg border border-border-subtle">
            {embedSnippet(lastShownToken)}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" leftIcon={<Copy size={14} />} onClick={() => void copyText(formUrl(lastShownToken))}>
              {t.leadForm.formUrl}
            </Button>
            <Button type="button" size="sm" variant="secondary" leftIcon={<Copy size={14} />} onClick={() => void copyText(embedSnippet(lastShownToken))}>
              {t.leadForm.embedCode}
            </Button>
          </div>
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
          <div className="flex flex-col gap-3">
            <div className="min-w-0 flex-1">
              <Input
                label={t.settings.integrationsApiKeyName}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-fg-muted mb-1">{t.settings.integrationsApiKeyScopes}</legend>
              {SCOPE_OPTIONS.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-fg/20 text-accent-500 focus:ring-accent-500/40"
                    checked={keyScopes.includes(scope)}
                    onChange={(e) =>
                      setKeyScopes((prev) =>
                        e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                      )
                    }
                  />
                  {scope === 'scim' ? t.settings.integrationsScopeScim : t.settings.integrationsScopeLeads}
                </label>
              ))}
            </fieldset>
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
                    {t.settings.integrationsKeyPrefix}: {k.keyPrefix}
                    {k.revokedAt ? ` · ${t.settings.integrationsRevokedBadge}` : ''}
                    {k.lastUsedAt ? ` · ${t.settings.integrationsLastUsed}: ${new Date(k.lastUsedAt).toLocaleString()}` : ''}
                  </p>
                  {k.scopes && k.scopes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-accent-500/12 text-accent-300 px-1.5 py-0.5 text-[10px] font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
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
              <li key={tok.id} className="rounded-lg border border-fg/8 px-3 py-2 space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-fg">{tok.label}</p>
                    <p className="text-xs text-fg-subtle">
                      {new Date(tok.createdAt).toLocaleString()}
                      {typeof tok.submissionCount === 'number' ? ` · ${tok.submissionCount}` : ''}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => (configToken?.id === tok.id ? setConfigToken(null) : openConfig(tok))}
                      >
                        {t.leadForm.configure}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTokenId(tok.id)}
                        disabled={deletingTokenId === tok.id}
                      >
                        {deletingTokenId === tok.id ? 'Deleting...' : <Trash2 size={14} className="text-danger" aria-hidden />}
                      </Button>
                    </div>
                  )}
                </div>

                {configToken?.id === tok.id && (
                  <div className="space-y-3 rounded-lg bg-fg/[0.03] p-3">
                    <Input label={t.leadForm.formTitle} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                    <Input label={t.leadForm.successMessage} value={draftSuccess} onChange={(e) => setDraftSuccess(e.target.value)} />
                    <div>
                      <p className="text-sm font-medium text-fg-muted mb-1.5">{t.leadForm.fields}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {FORM_FIELD_OPTIONS.map((f) => (
                          <label key={f} className="flex items-center gap-1.5 text-sm text-fg-muted">
                            <input
                              type="checkbox"
                              className="rounded border-fg/20 text-accent-500 focus:ring-accent-500/40"
                              checked={draftFields.includes(f)}
                              onChange={(e) =>
                                setDraftFields((prev) => (e.target.checked ? [...prev, f] : prev.filter((x) => x !== f)))
                              }
                            />
                            {fieldLabels[f] ?? f}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void saveConfig()} loading={savingConfig}>
                        {t.common.save}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfigToken(null)}>
                        {t.common.cancel}
                      </Button>
                    </div>
                  </div>
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
