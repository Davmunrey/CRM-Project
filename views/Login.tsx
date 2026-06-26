import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, ArrowRight, ShieldCheck, Users } from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import type { AppSettings } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { AuthLayout } from '../components/auth/AuthLayout'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { trackUxAction } from '../lib/uxMetrics'
import { api } from '../lib/api'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '/api'

function LoginHero({ branding, t }: { branding: AppSettings['branding']; t: ReturnType<typeof useTranslations> }) {
  const items = [
    { Icon: ShieldCheck, text: t.auth.landingFeature1 },
    { Icon: Zap, text: t.auth.landingFeature2 },
    { Icon: Users, text: t.auth.landingFeature3 },
  ] as const
  return (
    <div className="flex flex-col justify-center gap-6 lg:gap-8 text-left max-w-lg mx-auto lg:mx-0">
      <div className="landing-float shrink-0 self-start text-fg" style={{ ['--float-dur' as string]: '8s' }}>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.appName} className="h-12 lg:h-14 w-auto object-contain" />
        ) : (
          <Logo variant="icon" theme="mono" size={44} />
        )}
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-fg tracking-tight">{branding.appName}</h2>
        {branding.customDomain ? <p className="text-xs text-fg-subtle mt-1">{branding.customDomain}</p> : null}
        <p className="text-base lg:text-lg text-fg-muted mt-3 leading-relaxed">{t.auth.landingTagline}</p>
      </div>
      <ul className="space-y-3 lg:space-y-4">
        {items.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-accent-500/15 p-2 text-accent-400 shrink-0">
              <Icon size={18} aria-hidden />
            </span>
            <span className="text-sm lg:text-base text-fg-muted leading-snug">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Login() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])

  useEffect(() => {
    // Surface a failed SSO round-trip (callback redirects to /login?sso_error=…).
    if (new URLSearchParams(window.location.search).has('sso_error')) setError(t.auth.ssoError)
    // Show the SSO button only when the backend has an IdP configured.
    api.get<{ enabled: boolean }>('/auth/sso/status').then((r) => setSsoEnabled(r.enabled)).catch(() => setSsoEnabled(false))
  }, [t.auth.ssoError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackUxAction('auth_login_attempt')

    const result = mfaRequired ? await login(email, password, totp.trim()) : await login(email, password)
    setLoading(false)

    if (result.mfaRequired) {
      // Correct password, but a TOTP code is needed — reveal the code field.
      setMfaRequired(true)
      // Only show an error once the user has actually submitted a (wrong) code.
      setError(mfaRequired && totp ? t.mfa.invalidCode : '')
      return
    }

    if (!result.success) {
      trackUxAction('auth_login_error', { reason: (result.error ?? 'unknown').slice(0, 120) })
      setError(result.error ?? t.errors.generic)
      return
    }

    trackUxAction('auth_login_success')
    // Honor a returnUrl (e.g. an invite-accept page that bounced here when logged
    // out). Only same-site relative paths, to avoid an open redirect.
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
    navigate(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/')
  }

  const footerLinks =
    branding.privacyUrl || branding.termsUrl ? (
      <div className="text-center text-[11px] text-fg-subtle">
        {branding.privacyUrl && (
          <a href={branding.privacyUrl} target="_blank" rel="noreferrer" className="hover:text-fg-muted transition-colors">
            {t.settings.privacyUrl}
          </a>
        )}
        {branding.privacyUrl && branding.termsUrl && <span className="mx-2">·</span>}
        {branding.termsUrl && (
          <a href={branding.termsUrl} target="_blank" rel="noreferrer" className="hover:text-fg-muted transition-colors">
            {t.settings.termsUrl}
          </a>
        )}
      </div>
    ) : null

  const formCard = (
    <Card className="p-8">
      <div className="text-center mb-6 lg:hidden">
        <p className="text-sm text-fg-muted">{t.auth.login}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
        )}

        <Input
          label={t.auth.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.emailPlaceholder}
          required
          autoFocus
          leftIcon={<Mail size={16} aria-hidden />}
        />

        <SecurePasswordField
          label={t.auth.password}
          value={password}
          onChange={setPassword}
          placeholder={t.auth.password}
          required
          showGenerator={false}
          autoComplete="current-password"
          enforceStrongPasswordMinLength={false}
        />

        {mfaRequired && (
          <Input
            label={t.mfa.codeLabel}
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            helpText={t.mfa.loginPrompt}
          />
        )}

        <div className="text-right -mt-2">
          <Link to="/forgot-password" className="text-xs text-fg-muted hover:text-accent-400 transition-colors">
            {t.auth.forgotPassword}
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl"
          size="lg"
          disabled={loading || !email || !password || (mfaRequired && totp.trim().length < 6)}
          loading={loading}
          rightIcon={<ArrowRight size={16} aria-hidden />}
        >
          {t.auth.loginButton}
        </Button>

        {ssoEnabled && (
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-xl"
            size="lg"
            leftIcon={<ShieldCheck size={16} aria-hidden />}
            onClick={() => { window.location.href = `${API_BASE}/auth/sso/start` }}
          >
            {t.auth.ssoSignIn}
          </Button>
        )}
      </form>

      <div className="mt-6 pt-5 border-t border-fg/6 text-center">
        <p className="text-sm text-fg-muted">
          {t.auth.noAccount}{' '}
          <Link to="/register" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
            {t.auth.register}
          </Link>
        </p>
      </div>
    </Card>
  )

  return (
    <AuthLayout variant="split" splitPanel={<LoginHero branding={branding} t={t} />} footer={footerLinks}>
      <div className="hidden lg:block text-center mb-6">
        <p className="text-sm text-fg-muted">{t.auth.login}</p>
      </div>
      {formCard}
    </AuthLayout>
  )
}
