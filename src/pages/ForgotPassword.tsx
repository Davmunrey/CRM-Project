import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'

export function ForgotPassword() {
  const t = useTranslations()
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
    return unsub
  }, [])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured || !supabase) {
      setSuccess(true) // Demo mode: pretend it works
      return
    }
    setError('')
    setLoading(true)
    const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (sbError) {
      setError(sbError.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title={(
        <>
          <h1 className="text-2xl font-bold text-fg">{branding.appName}</h1>
          <p className="text-sm text-fg-muted mt-1">{t.auth.forgotPasswordTitle}</p>
        </>
      )}
    >
      <Card className="p-8">
        {success ? (
          <div className="text-center py-4">
            <ShieldCheck size={40} className="text-success mx-auto mb-3" aria-hidden />
            <p className="text-fg font-semibold mb-1">{t.auth.checkEmailTitle}</p>
            <p className="text-sm text-fg-muted">
              {t.auth.checkEmailSent}{' '}
              <span className="text-accent-400">{email}</span>
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm text-accent-400 hover:text-accent-300 transition-colors">
              {t.auth.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-fg-muted">
              {t.auth.checkEmailInstructions}
            </p>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
                {error}
              </div>
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

            <Button
              type="submit"
              className="w-full rounded-xl"
              size="lg"
              disabled={loading || !email}
              loading={loading}
              rightIcon={<ArrowRight size={16} aria-hidden />}
            >
              {t.auth.sendLink}
            </Button>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-sm text-fg-muted hover:text-fg transition-colors">
                {t.auth.backToLogin}
              </Link>
            </div>
          </form>
        )}
      </Card>
    </AuthLayout>
  )
}
