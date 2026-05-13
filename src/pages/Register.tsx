import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { formatPasswordStrengthIssues, getPasswordStrengthIssues } from '../lib/securePassword'

export function Register() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])
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
    <AuthLayout
      variant="centered"
      title={(
        <>
          <h1 className="text-2xl font-bold text-fg">{t.auth.registerButton}</h1>
          <p className="text-sm text-fg-muted mt-1">{branding.appName}</p>
        </>
      )}
    >
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <Input
            label={t.common.name}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.common.name}
            required
            autoFocus
            leftIcon={<User size={16} aria-hidden />}
          />

          <Input
            label={t.auth.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            required
            leftIcon={<Mail size={16} aria-hidden />}
          />

          <SecurePasswordField
            label={t.auth.password}
            value={password}
            onChange={setPassword}
            placeholder={t.auth.password}
            required
          />

          <Button
            type="submit"
            className="w-full rounded-xl"
            size="lg"
            disabled={loading || !name || !email || !password}
            loading={loading}
            rightIcon={<ArrowRight size={16} aria-hidden />}
          >
            {t.auth.registerButton}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-fg/6 text-center">
          <p className="text-sm text-fg-muted">
            {t.auth.hasAccount}{' '}
            <Link to="/login" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
              {t.auth.login}
            </Link>
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <ShieldCheck size={14} className="text-fg-subtle mr-1.5 mt-0.5 shrink-0" aria-hidden />
          <p className="text-[11px] text-fg-subtle">{'Your data is encrypted and never shared.'}</p>
        </div>
      </Card>
    </AuthLayout>
  )
}
