import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, Copy, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useTranslations } from '../../i18n'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/supabaseHelpers'
import { toast } from '../../store/toastStore'

type Phase = 'idle' | 'setup' | 'disabling'

export function SettingsMfaPanel() {
  const t = useTranslations()
  const [enabled, setEnabled] = useState<boolean | null>(null) // null = loading
  const [phase, setPhase] = useState<Phase>('idle')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api
      .get<{ user: { mfaEnabled?: boolean } }>('/auth/me')
      .then((r) => setEnabled(r.user.mfaEnabled === true))
      .catch(() => setEnabled(false))
  }, [])

  const startSetup = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup')
      setSecret(res.secret)
      setPhase('setup')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const confirmEnable = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/mfa/enable', { token: code.trim() })
      setEnabled(true)
      setPhase('idle')
      setSecret('')
      setCode('')
      toast.success(t.mfa.statusEnabled)
    } catch (e) {
      // Surface the real server message (e.g. "Run MFA setup first", a 500, or a
      // network error) instead of always blaming the code.
      setError(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const confirmDisable = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/mfa/disable', { password })
      setEnabled(false)
      setPhase('idle')
      setPassword('')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const copySecret = () => {
    void navigator.clipboard?.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex items-center gap-2">
        {enabled ? <ShieldCheck size={18} className="text-success" aria-hidden /> : <Shield size={18} className="text-fg-muted" aria-hidden />}
        <span className="text-sm font-semibold text-fg">{t.mfa.title}</span>
        {enabled !== null && (
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${enabled ? 'bg-success/15 text-success' : 'bg-surface-2 text-fg-subtle'}`}>
            {enabled ? t.mfa.enabled : t.mfa.disabled}
          </span>
        )}
      </div>
      <p className="text-sm text-fg-muted">{t.mfa.description}</p>

      {enabled === true && phase !== 'disabling' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-success flex items-center gap-1.5"><Check size={14} aria-hidden /> {t.mfa.statusEnabled}</p>
          <div>
            <Button variant="danger" size="sm" onClick={() => { setPhase('disabling'); setError('') }}>
              {t.mfa.disableButton}
            </Button>
          </div>
        </div>
      )}

      {enabled === false && phase === 'idle' && (
        <div>
          <Button variant="primary" size="sm" loading={busy} onClick={startSetup} leftIcon={<Shield size={14} aria-hidden />}>
            {t.mfa.enableButton}
          </Button>
        </div>
      )}

      {phase === 'setup' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-2 p-4">
          <p className="text-sm text-fg-muted">{t.mfa.setupInstructions}</p>
          <div>
            <span className="block text-xs text-fg-subtle mb-1">{t.mfa.secretLabel}</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-surface-1 border border-border-subtle px-3 py-2 text-sm font-mono text-fg">{secret}</code>
              <Button variant="ghost" size="sm" onClick={copySecret} leftIcon={copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}>
                {copied ? t.common.copied : t.common.copy}
              </Button>
            </div>
          </div>
          <Input
            label={t.mfa.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            error={error || undefined}
          />
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" loading={busy} disabled={code.trim().length < 6} onClick={confirmEnable}>
              {t.mfa.confirmEnable}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setPhase('idle'); setSecret(''); setCode(''); setError('') }}>
              {t.mfa.cancel}
            </Button>
          </div>
        </div>
      )}

      {phase === 'disabling' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-2 p-4">
          <p className="text-sm text-fg-muted">{t.mfa.disablePrompt}</p>
          <Input
            label={t.mfa.passwordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={error || undefined}
          />
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" loading={busy} disabled={!password} onClick={confirmDisable}>
              {t.mfa.confirmDisable}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setPhase('idle'); setPassword(''); setError('') }}>
              {t.mfa.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
