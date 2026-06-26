import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Check, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { trackUxAction } from '../lib/uxMetrics'
import { api } from '../lib/api'
import { AuthSplit, AuthField, DISPLAY, BODY } from '../components/auth/AuthSplit'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '/api'

export function Login() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [remember, setRemember] = useState(true)
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  useEffect(() => useSettingsStore.subscribe((s) => setBranding(s.settings.branding)), [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('sso_error')) setError(t.auth.ssoError)
    api
      .get<{ enabled: boolean }>('/auth/sso/status')
      .then((r) => setSsoEnabled(r.enabled))
      .catch(() => setSsoEnabled(false))
  }, [t.auth.ssoError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackUxAction('auth_login_attempt')

    const result = mfaRequired ? await login(email, password, totp.trim()) : await login(email, password)
    setLoading(false)

    if (result.mfaRequired) {
      setMfaRequired(true)
      setError(mfaRequired && totp ? t.mfa.invalidCode : '')
      return
    }
    if (!result.success) {
      trackUxAction('auth_login_error', { reason: (result.error ?? 'unknown').slice(0, 120) })
      setError(result.error ?? t.errors.generic)
      return
    }
    trackUxAction('auth_login_success')
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
    navigate(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/')
  }

  return (
    <AuthSplit
      appName={branding.appName}
      headline={t.auth.landingTagline}
      subtext="Sign in to your pipeline, your sequences, and an AI assistant that already knows your deals."
    >
      <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#0C1F1A' }}>
        Welcome back
      </h2>
      <p style={{ ...BODY, fontSize: 15, fontWeight: 300, color: '#8A938E', margin: '0 0 30px' }}>
        {t.auth.login}
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            style={{ ...BODY, fontSize: 14, color: '#B23A2E', background: '#FDECE9', border: '1px solid #F6C9C1', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}
          >
            {error}
          </div>
        )}

        <AuthField
          label={t.auth.email}
          icon={<Mail size={17} aria-hidden />}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="username"
          autoFocus
          required
        />

        <AuthField
          label={t.auth.password}
          icon={<Lock size={17} aria-hidden />}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder={t.auth.password}
          autoComplete="current-password"
          required
          accentIcon
        />

        {mfaRequired && (
          <AuthField
            label={t.mfa.codeLabel}
            icon={<Lock size={17} aria-hidden />}
            value={totp}
            onChange={setTotp}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#5E6B66', background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...BODY }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                background: remember ? '#0C8A68' : '#fff',
                border: remember ? 'none' : '1px solid #D8D4CA',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {remember && <Check size={11} color="#fff" strokeWidth={3.5} />}
            </span>
            Remember me
          </button>
          <Link to="/forgot-password" style={{ ...DISPLAY, fontSize: 13.5, fontWeight: 600, color: '#0C8A68' }}>
            {t.auth.forgotPassword}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password || (mfaRequired && totp.trim().length < 6)}
          style={{
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            width: '100%',
            ...DISPLAY,
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: '#0C8A68',
            padding: 14,
            borderRadius: 10,
            marginBottom: 14,
            opacity: loading || !email || !password ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          className="transition-colors hover:enabled:!bg-[#0A6E54]"
        >
          {t.auth.loginButton}
          {!loading && <ArrowRight size={16} aria-hidden />}
        </button>

        {ssoEnabled && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 16px', color: '#B7BBB3', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#E8E5DD' }} />
              OR
              <div style={{ flex: 1, height: 1, background: '#E8E5DD' }} />
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_BASE}/auth/sso/start`
              }}
              style={{
                width: '100%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                border: '1px solid #E0DCD2',
                background: '#fff',
                borderRadius: 10,
                padding: 12,
                ...DISPLAY,
                fontSize: 14,
                fontWeight: 600,
                color: '#0C1F1A',
              }}
              className="transition-colors hover:!border-[#0C8A68]"
            >
              <Lock size={16} color="#0C8A68" aria-hidden />
              {t.auth.ssoSignIn}
            </button>
          </>
        )}
      </form>

      <p style={{ textAlign: 'center', fontSize: 13.5, color: '#8A938E', margin: '26px 0 0', ...BODY }}>
        {t.auth.noAccount}{' '}
        <Link to="/register" style={{ ...DISPLAY, fontWeight: 600, color: '#0C8A68' }}>
          {t.auth.register}
        </Link>
      </p>
    </AuthSplit>
  )
}
