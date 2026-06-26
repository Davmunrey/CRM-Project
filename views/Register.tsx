import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { formatPasswordStrengthIssues, getPasswordStrengthIssues } from '../lib/securePassword'
import { AuthSplit, AuthField, DISPLAY, BODY } from '../components/auth/AuthSplit'

export function Register() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => useSettingsStore.subscribe((s) => setBranding(s.settings.branding)), [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const strengthIssues = getPasswordStrengthIssues(password)
    if (strengthIssues.length > 0) {
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

    setLoading(true)
    const result = await register({ name, email, password })
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? t.errors.generic)
      return
    }
    navigate('/')
  }

  return (
    <AuthSplit
      appName={branding.appName}
      headline={t.auth.landingTagline}
      subtext="Create your workspace and let an AI assistant start surfacing your next best move from day one."
    >
      <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#0C1F1A' }}>
        Create your account
      </h2>
      <p style={{ ...BODY, fontSize: 15, fontWeight: 300, color: '#8A938E', margin: '0 0 30px' }}>{branding.appName}</p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            style={{ ...BODY, fontSize: 14, color: '#B23A2E', background: '#FDECE9', border: '1px solid #F6C9C1', borderRadius: 10, padding: '11px 14px', marginBottom: 18 }}
          >
            {error}
          </div>
        )}

        <AuthField label={t.common.name} icon={<User size={17} aria-hidden />} value={name} onChange={setName} placeholder={t.common.name} autoComplete="name" autoFocus required />
        <AuthField label={t.auth.email} icon={<Mail size={17} aria-hidden />} type="email" value={email} onChange={setEmail} placeholder={t.auth.emailPlaceholder} autoComplete="email" required />
        <AuthField label={t.auth.password} icon={<Lock size={17} aria-hidden />} type="password" value={password} onChange={setPassword} placeholder={t.auth.password} autoComplete="new-password" required accentIcon />

        <button
          type="submit"
          disabled={loading || !name || !email || !password}
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
            opacity: loading || !name || !email || !password ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          className="transition-colors hover:enabled:!bg-[#0A6E54]"
        >
          {t.auth.registerButton}
          {!loading && <ArrowRight size={16} aria-hidden />}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13.5, color: '#8A938E', margin: '26px 0 0', ...BODY }}>
        {t.auth.hasAccount}{' '}
        <Link to="/login" style={{ ...DISPLAY, fontWeight: 600, color: '#0C8A68' }}>
          {t.auth.login}
        </Link>
      </p>
    </AuthSplit>
  )
}
