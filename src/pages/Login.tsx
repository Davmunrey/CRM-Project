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
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthLayout } from '../components/auth/AuthLayout'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { trackUxAction } from '../lib/uxMetrics'

function LoginHero({ branding, t }: { branding: AppSettings['branding']; t: ReturnType<typeof useTranslations> }) {
  const items = [
    { Icon: ShieldCheck, text: t.auth.landingFeature1 },
    { Icon: Zap, text: t.auth.landingFeature2 },
    { Icon: Users, text: t.auth.landingFeature3 },
  ] as const
  return (
    <div className="flex flex-col justify-center gap-6 lg:gap-8 text-left max-w-lg mx-auto lg:mx-0">
      <div
        className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shadow-brand-sm overflow-hidden shrink-0 ring-1 ring-fg/10 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:shadow-md motion-safe:hover:ring-fg/18 motion-safe:hover:scale-[1.02]"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/35 via-white/8 to-transparent opacity-90"
          aria-hidden
        />
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="relative z-[1] w-full h-full object-cover" />
        ) : (
          <Logo variant="icon" theme="onAccent" size={28} className="relative z-[1]" />
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  const navigate = useNavigate()
  const workspaceFromHost = useAuthStore((s) => s.workspaceFromHost)
  const workspaceHostSlugNotFound = useAuthStore((s) => s.workspaceHostSlugNotFound)
  const workspaceSlugFromHost = useAuthStore((s) => s.workspaceSlugFromHost)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !mfaFactorId) return
    const mfa = supabase.auth.mfa
    if (!mfa) {
      setError(t.errors.supabaseNotConfiguredDetail)
      return
    }
    setError('')
    setLoading(true)
    const { data: chall, error: cErr } = await mfa.challenge({ factorId: mfaFactorId })
    if (cErr || !chall) {
      setLoading(false)
      setError(cErr?.message ?? t.auth.mfaInvalidCode)
      return
    }
    const { error: vErr } = await mfa.verify({
      factorId: mfaFactorId,
      challengeId: chall.id,
      code: mfaCode.replace(/\s/g, ''),
    })
    setLoading(false)
    if (vErr) {
      setError(t.auth.mfaInvalidCode)
      return
    }
    trackUxAction('auth_login_success')
    navigate('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackUxAction('auth_login_attempt')

    if (isSupabaseConfigured && supabase) {
      const { error: sbError } = await supabase.auth.signInWithPassword({ email, password })
      if (sbError) {
        setLoading(false)
        trackUxAction('auth_login_error', { reason: sbError.message.slice(0, 120) })
        setError(sbError.message)
        return
      }
      const mfa = supabase.auth.mfa
      if (!mfa) {
        setLoading(false)
        trackUxAction('auth_login_success')
        navigate('/')
        return
      }
      const { data: aal } = await mfa.getAuthenticatorAssuranceLevel()
      if (
        aal
        && aal.currentLevel === 'aal1'
        && aal.nextLevel === 'aal2'
      ) {
        const { data: factors, error: fErr } = await mfa.listFactors()
        if (fErr || !factors) {
          setLoading(false)
          setError(fErr?.message ?? t.auth.mfaInvalidCode)
          return
        }
        const totp = factors.totp.find((f) => f.status === 'verified')
        if (totp) {
          setMfaFactorId(totp.id)
          setMfaCode('')
          setLoading(false)
          return
        }
      }
      setLoading(false)
      trackUxAction('auth_login_success')
      navigate('/')
    } else {
      setLoading(false)
      trackUxAction('auth_login_error', { reason: 'supabase_not_configured' })
      setError(t.errors.supabaseNotConfiguredDetail)
    }
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
        <p className="text-sm text-fg-muted">{mfaFactorId ? t.auth.mfaRequiredTitle : t.auth.login}</p>
      </div>

      {mfaFactorId ? (
        <form onSubmit={handleMfaSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
          )}
          <p className="text-sm text-fg-muted">{t.auth.mfaRequiredTitle}</p>
          <Input
            label={t.auth.mfaCodeLabel}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            leftIcon={<ShieldCheck size={16} aria-hidden />}
          />
          <Button
            type="submit"
            className="w-full rounded-xl"
            size="lg"
            disabled={loading || mfaCode.replace(/\s/g, '').length < 6}
            loading={loading}
            rightIcon={<ArrowRight size={16} aria-hidden />}
          >
            {t.auth.mfaVerify}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setMfaFactorId(null)
              setMfaCode('')
              setError('')
            }}
          >
            {t.auth.backToLogin}
          </Button>
        </form>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">
        {isSupabaseConfigured && workspaceFromHost ? (
          <div className="px-4 py-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-sm text-fg-muted">
            {t.errors.workspaceUrlSigningInTo.replace('{name}', workspaceFromHost.name)}
          </div>
        ) : null}
        {isSupabaseConfigured && workspaceHostSlugNotFound && workspaceSlugFromHost ? (
          <div className="px-4 py-3 rounded-xl bg-warning/10 border border-warning/25 text-sm text-warning">
            {t.errors.workspaceUrlUnknownSlug}
          </div>
        ) : null}
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

        <div className="text-right -mt-2">
          <Link to="/forgot-password" className="text-xs text-fg-muted hover:text-accent-400 transition-colors">
            {t.auth.forgotPassword}
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl"
          size="lg"
          disabled={loading || !email || !password}
          loading={loading}
          rightIcon={<ArrowRight size={16} aria-hidden />}
        >
          {t.auth.loginButton}
        </Button>
      </form>
      )}

      {!mfaFactorId ? (
      <div className="mt-6 pt-5 border-t border-fg/6 text-center">
        <p className="text-sm text-fg-muted">
          {t.auth.noAccount}{' '}
          <Link to="/register" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
            {t.auth.register}
          </Link>
        </p>
      </div>
      ) : null}

    </Card>
  )

  return (
    <AuthLayout variant="split" splitPanel={<LoginHero branding={branding} t={t} />} footer={footerLinks}>
      <div className="hidden lg:block text-center mb-6">
        <p className="text-sm text-fg-muted">{mfaFactorId ? t.auth.mfaRequiredTitle : t.auth.login}</p>
      </div>
      {formCard}
    </AuthLayout>
  )
}
