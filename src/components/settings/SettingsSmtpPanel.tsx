import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, ServerCog, ShieldCheck, ShieldAlert, Send } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { toast } from '../../store/toastStore'
import { resolveEmailProviderName } from '../../services/emailProviders'

const SMTP_FUNCTION = 'smtp-send-email'

type SmtpSecurity = 'starttls' | 'ssl' | 'none'

interface SmtpSettingsRow {
  id: string
  organization_id: string
  host: string
  port: number
  username: string
  from_address: string
  from_name: string | null
  reply_to: string | null
  secure: SmtpSecurity
  is_active: boolean
  last_test_at: string | null
  last_test_ok: boolean | null
  last_test_error: string | null
  created_at: string
  updated_at: string
}

interface FormState {
  host: string
  port: string
  username: string
  password: string
  fromAddress: string
  fromName: string
  replyTo: string
  secure: SmtpSecurity
  testRecipient: string
}

const DEFAULT_FORM: FormState = {
  host: '',
  port: '587',
  username: '',
  password: '',
  fromAddress: '',
  fromName: '',
  replyTo: '',
  secure: 'starttls',
  testRecipient: '',
}

async function callSmtpFunction(action: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new Error('Not authenticated.')
  }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${SMTP_FUNCTION}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `Edge function error ${res.status}`)
  }
  return data
}

export function SettingsSmtpPanel() {
  const t = useTranslations()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [existing, setExisting] = useState<SmtpSettingsRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disabling, setDisabling] = useState(false)

  const activeProvider = resolveEmailProviderName()
  const isActiveProvider = activeProvider === 'smtp'

  const isConfigured = existing !== null && existing.is_active

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_smtp_settings_public')
        .select(
          'id, organization_id, host, port, username, from_address, from_name, reply_to, secure, is_active, last_test_at, last_test_ok, last_test_error, created_at, updated_at',
        )
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        setExisting(null)
        return
      }
      const row = data as SmtpSettingsRow | null
      setExisting(row)
      if (row) {
        setForm({
          host: row.host,
          port: String(row.port),
          username: row.username,
          password: '',
          fromAddress: row.from_address,
          fromName: row.from_name ?? '',
          replyTo: row.reply_to ?? '',
          secure: row.secure,
          testRecipient: '',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const portNumber = useMemo(() => {
    const n = Number.parseInt(form.port, 10)
    return Number.isFinite(n) && n > 0 ? n : 587
  }, [form.port])

  const handleSave = async () => {
    if (!form.host.trim() || !form.username.trim() || !form.fromAddress.trim()) {
      toast.error(t.settings.smtpToastMissingFields)
      return
    }
    if (!isConfigured && !form.password.trim()) {
      toast.error(t.settings.smtpToastMissingFields)
      return
    }
    setSaving(true)
    try {
      // Edge function reuses the existing encrypted password when `password` is empty
      // on a row that is already active; first-time setup requires a value, which we
      // already validated above.
      await callSmtpFunction('save_settings', {
        host: form.host.trim(),
        port: portNumber,
        username: form.username.trim(),
        password: form.password,
        fromAddress: form.fromAddress.trim(),
        fromName: form.fromName.trim() || undefined,
        replyTo: form.replyTo.trim() || undefined,
        secure: form.secure,
      })
      toast.success(t.settings.smtpToastSaved)
      setForm((prev) => ({ ...prev, password: '' }))
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('admin')) {
        toast.error(t.settings.smtpToastNeedAdmin)
      } else if (msg.toLowerCase().includes('required')) {
        toast.error(t.settings.smtpToastMissingFields)
      } else {
        toast.error(`${t.settings.smtpToastSaveFailed}: ${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!form.testRecipient.trim()) {
      toast.error(t.settings.smtpTestRecipient)
      return
    }
    setTesting(true)
    try {
      const inlinePayload =
        form.password.trim().length > 0
          ? {
              host: form.host.trim(),
              port: portNumber,
              username: form.username.trim(),
              password: form.password,
              fromAddress: form.fromAddress.trim(),
              fromName: form.fromName.trim() || undefined,
              secure: form.secure,
            }
          : {}
      await callSmtpFunction('test', {
        to: form.testRecipient.trim(),
        ...inlinePayload,
      })
      toast.success(t.settings.smtpToastTestSent)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`${t.settings.smtpToastTestFailed}: ${msg}`)
      await load()
    } finally {
      setTesting(false)
    }
  }

  const handleDisable = async () => {
    setDisabling(true)
    try {
      await callSmtpFunction('delete_settings', {})
      toast.success(t.settings.smtpToastDisabled)
      setExisting(null)
      setForm(DEFAULT_FORM)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setDisabling(false)
    }
  }

  if (!supabase) {
    return <p className="text-sm text-fg-muted">{t.errors.supabaseNotConfiguredDetail}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
          <ServerCog size={16} className="text-accent-400" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-fg">{t.settings.smtpTitle}</h2>
          <p className="text-sm text-fg-muted mt-1 max-w-3xl leading-relaxed">
            {t.settings.smtpBlurb}
          </p>
        </div>
        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isConfigured
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-fg/5 border-border-subtle text-fg-muted'
          }`}
        >
          {isConfigured ? <ShieldCheck size={12} aria-hidden /> : <ShieldAlert size={12} aria-hidden />}
          {isConfigured ? t.settings.smtpStatusConfigured : t.settings.smtpStatusNotConfigured}
        </div>
      </div>

      {isConfigured ? (
        <div
          className={`text-xs px-3 py-2 rounded-lg border ${
            isActiveProvider
              ? 'bg-accent-500/10 border-accent-500/30 text-accent-300'
              : 'bg-warning/10 border-warning/30 text-warning'
          }`}
        >
          {isActiveProvider ? t.settings.smtpProviderActiveHint : t.settings.smtpProviderInactiveHint}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label={t.settings.smtpHost}
          placeholder={t.settings.smtpHostPlaceholder}
          value={form.host}
          onChange={(e) => setField('host', e.target.value)}
          leftIcon={<ServerCog size={14} />}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpPort}
          type="number"
          value={form.port}
          onChange={(e) => setField('port', e.target.value)}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpUsername}
          placeholder={t.settings.smtpUsernamePlaceholder}
          value={form.username}
          onChange={(e) => setField('username', e.target.value)}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpPassword}
          type="password"
          autoComplete="new-password"
          placeholder={t.settings.smtpPasswordPlaceholder}
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          helpText={isConfigured ? t.settings.smtpPasswordSavedHint : undefined}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpFromAddress}
          placeholder={t.settings.smtpFromAddressPlaceholder}
          value={form.fromAddress}
          onChange={(e) => setField('fromAddress', e.target.value)}
          leftIcon={<Mail size={14} />}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpFromName}
          placeholder={t.settings.smtpFromNamePlaceholder}
          value={form.fromName}
          onChange={(e) => setField('fromName', e.target.value)}
          disabled={loading}
        />
        <Input
          label={t.settings.smtpReplyTo}
          placeholder={t.settings.smtpReplyToPlaceholder}
          value={form.replyTo}
          onChange={(e) => setField('replyTo', e.target.value)}
          disabled={loading}
        />
        <Select
          label={t.settings.smtpSecurity}
          value={form.secure}
          onChange={(e) => setField('secure', e.target.value as SmtpSecurity)}
          hint={t.settings.smtpSecurityHelp}
          options={[
            { value: 'starttls', label: t.settings.smtpSecurityStarttls },
            { value: 'ssl', label: t.settings.smtpSecuritySsl },
            { value: 'none', label: t.settings.smtpSecurityNone },
          ]}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
        <div className="flex-1 max-w-sm">
          <Input
            label={t.settings.smtpTestRecipient}
            placeholder={t.settings.smtpTestRecipientPlaceholder}
            type="email"
            value={form.testRecipient}
            onChange={(e) => setField('testRecipient', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={handleSave}
            disabled={loading}
            leftIcon={<ShieldCheck size={14} />}
          >
            {t.settings.smtpButtonSave}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={testing}
            onClick={handleTest}
            disabled={loading || !form.testRecipient.trim()}
            leftIcon={<Send size={14} />}
          >
            {t.settings.smtpButtonTest}
          </Button>
          {isConfigured ? (
            <Button
              variant="danger"
              size="sm"
              loading={disabling}
              onClick={handleDisable}
              disabled={loading}
            >
              {t.settings.smtpButtonDisable}
            </Button>
          ) : null}
        </div>
      </div>

      {existing?.last_test_at ? (
        <div className="text-xs text-fg-muted pt-1">
          <span className="font-medium text-fg-muted">{t.settings.smtpLastTest}:</span>{' '}
          <span>
            {new Date(existing.last_test_at).toLocaleString()} —{' '}
            {existing.last_test_ok ? (
              <span className="text-success">{t.settings.smtpLastTestOk}</span>
            ) : (
              <span className="text-danger">
                {t.settings.smtpLastTestError}
                {existing.last_test_error ? `: ${existing.last_test_error}` : ''}
              </span>
            )}
          </span>
        </div>
      ) : null}
    </div>
  )
}
