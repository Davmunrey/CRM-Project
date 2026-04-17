import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

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
    <div className="auth-page-bg min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="auth-bg-blob absolute top-1/4 left-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
        <div className="auth-bg-blob absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-brand-sm mb-4 overflow-hidden"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Zap size={24} className="text-fg" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-fg">{branding.appName}</h1>
          <p className="text-sm text-fg-muted mt-1">{t.auth.forgotPasswordTitle}</p>
        </div>

        <Card className="p-8">
          {success ? (
            <div className="text-center py-4">
              <ShieldCheck size={40} className="text-success mx-auto mb-3" />
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
      </div>
    </div>
  )
}
