import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { api } from '../lib/api'
import { trackUxAction } from '../lib/uxMetrics'
import { AuthSplit, AuthField, DISPLAY, BODY } from '../components/auth/AuthSplit'

export function ForgotPassword() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => useSettingsStore.subscribe((s) => setBranding(s.settings.branding)), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    trackUxAction('auth_password_reset_request_attempt')
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      trackUxAction('auth_password_reset_request_success')
      setSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      trackUxAction('auth_password_reset_request_error', { reason: msg.slice(0, 120) })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit
      appName={branding.appName}
      headline={t.auth.landingTagline}
      subtext="Reset your password and get back to your pipeline in seconds."
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <ShieldCheck size={42} style={{ color: '#0C8A68', margin: '0 auto 14px' }} aria-hidden />
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: '#0C1F1A', margin: '0 0 8px' }}>
            {t.auth.checkEmailTitle}
          </h2>
          <p style={{ ...BODY, fontSize: 14.5, fontWeight: 300, color: '#8A938E', margin: 0 }}>
            {t.auth.checkEmailSent}{' '}
            <span style={{ color: '#0C8A68', fontWeight: 600 }}>{email}</span>
          </p>
          <Link
            to="/login"
            style={{ ...DISPLAY, display: 'inline-block', marginTop: 20, fontSize: 13.5, fontWeight: 600, color: '#0C8A68' }}
          >
            {t.auth.backToLogin}
          </Link>
        </div>
      ) : (
        <>
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#0C1F1A' }}>
            {t.auth.forgotPasswordTitle}
          </h2>
          <p style={{ ...BODY, fontSize: 15, fontWeight: 300, color: '#8A938E', margin: '0 0 30px' }}>
            {t.auth.checkEmailInstructions}
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

            <button
              type="submit"
              disabled={loading || !email}
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
                marginTop: 4,
                marginBottom: 14,
                opacity: loading || !email ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              className="transition-colors hover:enabled:!bg-[#0A6E54]"
            >
              {t.auth.sendLink}
              {!loading && <ArrowRight size={16} aria-hidden />}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13.5, color: '#8A938E', margin: '12px 0 0', ...BODY }}>
              <Link to="/login" style={{ ...DISPLAY, fontWeight: 600, color: '#0C8A68' }}>
                {t.auth.backToLogin}
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthSplit>
  )
}
