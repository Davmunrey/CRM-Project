import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, User, Mail, Lock, Building2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { supabase, isSupabaseConfigured, isOfflineDemoMode } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

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
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t.auth.password)
      return
    }

    setLoading(true)

    if (isSupabaseConfigured && supabase) {
      const { data, error: sbError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, org_name: orgName } },
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
        const result = register({ name, email, password, orgName })
        setLoading(false)
        if (result.success) {
          navigate('/')
        } else {
          setError(result.error || t.auth.register)
        }
      }, 400)
    } else {
      setLoading(false)
      setError('Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, or enable VITE_ALLOW_DEMO_MODE=true for local demo only.')
    }
  }

  return (
    <div className="auth-page-bg min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="auth-bg-blob absolute top-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
        <div className="auth-bg-blob absolute bottom-1/3 left-1/3 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl" />
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
          <h1 className="text-2xl font-bold text-fg">{t.auth.registerButton}</h1>
          <p className="text-sm text-fg-muted mt-1">{branding.appName}</p>
          {isSupabaseConfigured && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck size={11} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">{t.auth.realAuthEnabled}</span>
            </div>
          )}
        </div>

        <Card className="p-8">
          {success ? (
            <div className="text-center py-4">
              <ShieldCheck size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-fg font-semibold mb-1">{t.auth.checkEmailTitle}</p>
              <p className="text-sm text-fg-muted">{t.auth.checkEmailConfirmation} <span className="text-accent-400">{email}</span></p>
            </div>
          ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label={t.companies.title}
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={t.companies.title}
              required
              autoFocus
              leftIcon={<Building2 size={16} aria-hidden />}
            />

            <Input
              label={t.common.name}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.common.name}
              required
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
              disabled={loading || !name || !email || !password || !orgName}
              loading={loading}
              rightIcon={<ArrowRight size={16} aria-hidden />}
            >
              {t.auth.registerButton}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/6 text-center">
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
      </div>
    </div>
  )
}
