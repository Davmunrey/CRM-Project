import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Lock, ArrowRight } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

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
    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch)
      return
    }
    if (password.length < 6) {
      setError(t.auth.passwordMinLength)
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      navigate('/')
      return
    }
    setError('')
    setLoading(true)
    const { error: sbError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (sbError) {
      setError(sbError.message)
    } else {
      navigate('/')
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
          <p className="text-sm text-fg-muted mt-1">{t.auth.resetPasswordPageTitle}</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-fg-muted">{t.auth.checkEmailInstructions}</p>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label={t.auth.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.password}
              required
              minLength={6}
              autoFocus
              leftIcon={<Lock size={16} aria-hidden />}
            />

            <Input
              label={t.auth.confirmPassword}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.auth.confirmPassword}
              required
              minLength={6}
              leftIcon={<Lock size={16} aria-hidden />}
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
      </div>
    </div>
  )
}
