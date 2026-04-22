import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Users } from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import type { AppSettings } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { supabase, isSupabaseConfigured, isOfflineDemoMode } from '../lib/supabase'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthSsoButtons } from '../components/auth/AuthSsoButtons'

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

function AuthChannelBadge({ t }: { t: ReturnType<typeof useTranslations> }) {
  if (isSupabaseConfigured) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
        <ShieldCheck size={11} className="text-success" aria-hidden />
        <span className="text-[10px] font-medium text-success">{t.auth.realAuthEnabled}</span>
      </div>
    )
  }
  if (isOfflineDemoMode) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20">
        <ShieldCheck size={11} className="text-warning" aria-hidden />
        <span className="text-[10px] font-medium text-warning">{t.auth.demoModeBadge}</span>
      </div>
    )
  }
  return null
}

export function Login() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const workspaceFromHost = useAuthStore((s) => s.workspaceFromHost)
  const workspaceHostSlugNotFound = useAuthStore((s) => s.workspaceHostSlugNotFound)
  const workspaceSlugFromHost = useAuthStore((s) => s.workspaceSlugFromHost)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSupabaseConfigured && supabase) {
      const { error: sbError } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (sbError) {
        setError(sbError.message)
      } else {
        navigate('/')
      }
    } else if (isOfflineDemoMode) {
      setTimeout(() => {
        const result = login(email, password)
        setLoading(false)
        if (result.success) {
          navigate('/')
        } else {
          setError(result.error || t.auth.login)
        }
      }, 400)
    } else {
      setLoading(false)
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
        <p className="text-sm text-fg-muted">{t.auth.login}</p>
        <AuthChannelBadge t={t} />
      </div>

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

        <Input
          label={t.auth.password}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.auth.password}
          required
          leftIcon={<Lock size={16} aria-hidden />}
          rightAction={(
            <IconButton
              type="button"
              variant="subtle"
              className="p-1.5"
              aria-label={showPassword ? t.auth.passwordHideAria : t.auth.passwordShowAria}
              icon={showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              onClick={() => setShowPassword((v) => !v)}
            />
          )}
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

      {isSupabaseConfigured && <AuthSsoButtons email={email} onError={setError} />}

      <div className="mt-6 pt-5 border-t border-fg/6 text-center">
        <p className="text-sm text-fg-muted">
          {t.auth.noAccount}{' '}
          <Link to="/register" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
            {t.auth.register}
          </Link>
        </p>
      </div>

      {/* Offline demo login remains available, but account hints are intentionally hidden. */}
    </Card>
  )

  return (
    <AuthLayout variant="split" splitPanel={<LoginHero branding={branding} t={t} />} footer={footerLinks}>
      <div className="hidden lg:block text-center mb-6">
        <p className="text-sm text-fg-muted">{t.auth.login}</p>
        <AuthChannelBadge t={t} />
      </div>
      {formCard}
    </AuthLayout>
  )
}
