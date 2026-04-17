import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'

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
    </AuthLayout>
  )
}
