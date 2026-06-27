import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { formatPasswordStrengthIssues, getPasswordStrengthIssues } from '../lib/securePassword'
import { api } from '../lib/api'
import { trackUxAction } from '../lib/uxMetrics'
import { AuthSplit, DISPLAY, BODY } from '../components/auth/AuthSplit'

export function ResetPassword() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => useSettingsStore.subscribe((s) => setBranding(s.settings.branding)), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    trackUxAction('auth_password_reset_complete_attempt')
    if (password !== confirmPassword) {
      trackUxAction('auth_password_reset_complete_error', { reason: 'password_mismatch' })
      setError(t.auth.passwordsDoNotMatch)
      return
    }
    const strengthIssues = getPasswordStrengthIssues(password)
    if (strengthIssues.length > 0) {
      trackUxAction('auth_password_reset_complete_error', { reason: 'password_strength' })
      setError(
        formatPasswordStrengthIssues(strengthIssues, {
          length: t.errors.passwordWeakLength,
          lower: t.errors.passwordWeakLower,
          upper: t.errors.passwordWeakUpper,
          digit: t.errors.passwordWeakDigit,
          symbol: t.errors.passwordWeakSymbol,
        }),
      )
      return
    }
    if (!token) {
      setError(t.errors.invalidResetToken ?? 'Invalid or missing reset token')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      trackUxAction('auth_password_reset_complete_success')
      navigate('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reset failed'
      trackUxAction('auth_password_reset_complete_error', { reason: msg.slice(0, 120) })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit
      appName={branding.appName}
      headline={t.auth.landingTagline}
      subtext="Choose a new password to secure your account."
    >
      <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#0C1F1A' }}>
        {t.auth.resetPasswordPageTitle}
      </h2>

      {!token ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ ...BODY, fontSize: 14.5, fontWeight: 300, color: '#8A938E', margin: '0 0 16px' }}>
            {t.errors.invalidResetToken ?? 'Invalid or missing reset token.'}
          </p>
          <Link to="/forgot-password" style={{ ...DISPLAY, fontSize: 13.5, fontWeight: 600, color: '#0C8A68' }}>
            {t.auth.sendLink}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          {error && (
            <div
              role="alert"
              style={{ ...BODY, fontSize: 14, color: '#B23A2E', background: '#FDECE9', border: '1px solid #F6C9C1', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <SecurePasswordField
              label={t.auth.password}
              value={password}
              onChange={setPassword}
              onGeneratedPassword={(p) => {
                setPassword(p)
                setConfirmPassword(p)
              }}
              placeholder={t.auth.password}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <SecurePasswordField
              label={t.auth.confirmPassword}
              value={confirmPassword}
              onChange={setConfirmPassword}
              showGenerator={false}
              showPolicyHint={false}
              showRequirementChecklist={false}
              placeholder={t.auth.confirmPassword}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
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
              opacity: loading || !password || !confirmPassword ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            className="transition-colors hover:enabled:!bg-[#0A6E54]"
          >
            {t.auth.savePassword}
            {!loading && <ArrowRight size={16} aria-hidden />}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: '#8A938E', margin: '16px 0 0', ...BODY }}>
            <Link to="/login" style={{ ...DISPLAY, fontWeight: 600, color: '#0C8A68' }}>
              {t.auth.backToLogin}
            </Link>
          </p>
        </form>
      )}
    </AuthSplit>
  )
}
