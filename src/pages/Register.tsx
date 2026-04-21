import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { supabase, isSupabaseConfigured, isOfflineDemoMode } from '../lib/supabase'
import { workspaceNameFromEmail } from '../lib/workspaceFromEmail'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Tooltip } from '../components/ui/Tooltip'
import { AuthLayout } from '../components/auth/AuthLayout'

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
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t.auth.passwordMinLength)
      return
    }

    setLoading(true)

    if (isSupabaseConfigured && supabase) {
      const { data, error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, org_name: workspaceNameFromEmail(email) } },
      })
      setLoading(false)
      if (sbError) {
        setError(sbError.message)
      } else if (data.session) {
        await useAuthStore.getState().ensureTenantForCurrentUser()
        navigate('/')
      } else {
        setSuccess(true)
      }
    } else if (isOfflineDemoMode) {
      setTimeout(() => {
        const result = register({ name, email, password })
        setLoading(false)
        if (result.success) {
          navigate('/')
        } else {
          setError(result.error || t.auth.register)
        }
      }, 400)
    } else {
      setLoading(false)
      setError(t.errors.supabaseNotConfiguredDetail)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      title={(
        <>
          <h1 className="text-2xl font-bold text-fg">{t.auth.registerButton}</h1>
          <p className="text-sm text-fg-muted mt-1">{branding.appName}</p>
          {isSupabaseConfigured ? (
            <Tooltip content={t.auth.realAuthEnabled} side="bottom">
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 cursor-default">
                <ShieldCheck size={11} className="text-success" aria-hidden />
                <span className="text-[10px] font-medium text-success">{t.auth.realAuthEnabled}</span>
              </div>
            </Tooltip>
          ) : isOfflineDemoMode ? (
            <Tooltip content={t.auth.demoModeBadge} side="bottom">
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 cursor-default">
                <ShieldCheck size={11} className="text-warning" aria-hidden />
                <span className="text-[10px] font-medium text-warning">{t.auth.demoModeBadge}</span>
              </div>
            </Tooltip>
          ) : null}
        </>
      )}
    >
      <Card className="p-8">
        {success ? (
          <div className="text-center py-4">
            <ShieldCheck size={40} className="text-success mx-auto mb-3" aria-hidden />
            <p className="text-fg font-semibold mb-1">{t.auth.checkEmailTitle}</p>
            <p className="text-sm text-fg-muted">
              {t.auth.checkEmailConfirmation} <span className="text-accent-400">{email}</span>
            </p>
          </div>
        ) : (
          <>
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

              <Input
                label={t.auth.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.password}
                required
                minLength={6}
                leftIcon={<Lock size={16} aria-hidden />}
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
          </>
        )}
      </Card>
    </AuthLayout>
  )
}
