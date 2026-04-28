import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'
import { SecurePasswordField } from '../components/auth/SecurePasswordField'
import { formatPasswordStrengthIssues, getPasswordStrengthIssues } from '../lib/securePassword'
import { trackUxAction } from '../lib/uxMetrics'

export function ResetPassword() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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
    if (!isSupabaseConfigured || !supabase) {
      trackUxAction('auth_password_reset_complete_success', { mode: 'unconfigured_runtime' })
      navigate('/')
      return
    }
    setError('')
    setLoading(true)
    const { error: sbError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (sbError) {
      trackUxAction('auth_password_reset_complete_error', { reason: sbError.message.slice(0, 120) })
      setError(sbError.message)
    } else {
      trackUxAction('auth_password_reset_complete_success')
      navigate('/')
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title={(
        <>
          <h1 className="text-2xl font-bold text-fg">{branding.appName}</h1>
          <p className="text-sm text-fg-muted mt-1">{t.auth.resetPasswordPageTitle}</p>
        </>
      )}
    >
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-fg-muted">{t.auth.checkEmailInstructions}</p>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

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

          <Button
            type="submit"
            className="w-full rounded-xl"
            size="lg"
            disabled={loading || !password || !confirmPassword}
            loading={loading}
            rightIcon={<ArrowRight size={16} aria-hidden />}
          >
            {t.auth.savePassword}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}
