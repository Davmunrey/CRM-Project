import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'
import { trackUxAction } from '../lib/uxMetrics'

export function OrgSetup() {
  const navigate = useNavigate()
  const t = useTranslations()
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser)
  const workspaceSlugFromHost = useAuthStore((s) => s.workspaceSlugFromHost)
  const updateBranding = useSettingsStore((s) => s.updateBranding)

  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  /** When true, org name typing does not overwrite slug (slug came from company subdomain). */
  const [slugTiedToSubdomain, setSlugTiedToSubdomain] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPhone, setBillingPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invokeCreateOrgWithFallback = async (orgNameValue: string, slugValue: string) => {
    if (!supabase) throw new Error(t.orgSetup.errorNotConfigured)
    const sb = supabase

    const primary = await sb.functions.invoke('create-org', {
      body: {
        orgName: orgNameValue,
        slug: slugValue,
      },
    })

    if (!primary.error) return primary.data as { org?: { id?: string } } | null

    // Browser-level fetch failures from supabase.functions.invoke can happen despite healthy backend.
    if (!/Failed to send a request to the Edge Function/i.test(primary.error.message)) {
      throw new Error(primary.error.message)
    }

    const { data: sessionData, error: sessionErr } = await sb.auth.getSession()
    if (sessionErr || !sessionData.session?.access_token) {
      throw new Error(sessionErr?.message ?? t.orgSetup.errorNotAuthenticated)
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const anonOrPublishableKey =
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
    if (!supabaseUrl || !anonOrPublishableKey) {
      throw new Error(t.orgSetup.errorNotConfigured)
    }

    const requestBody = {
      orgName: orgNameValue,
      slug: slugValue,
    }

    const directRes = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/create-org`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonOrPublishableKey,
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    }).catch(() => null)

    if (directRes) {
      const payload = (await directRes.json().catch(() => null)) as { error?: string; org?: { id?: string } } | null
      if (!directRes.ok) throw new Error(payload?.error ?? t.errors.generic)
      return payload
    }

    // Final fallback: same-origin Vercel API proxy to bypass browser/network blocks to supabase.co.
    const proxyRes = await fetch('/api/create-org', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    })
    const proxyPayload = (await proxyRes.json().catch(() => null)) as { error?: string; org?: { id?: string } } | null
    if (!proxyRes.ok) throw new Error(proxyPayload?.error ?? t.errors.generic)
    return proxyPayload
  }

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let cancelled = false

    const redirectIfAlreadyMember = async () => {
      const { data: authData, error: authError } = await sb.auth.getUser()
      if (cancelled || authError || !authData.user) return

      const existingOrgId =
        (authData.user.app_metadata?.organization_id as string | undefined) ??
        authData.user.user_metadata?.org_id

      if (!existingOrgId) return

      setCurrentUser({
        id: authData.user.id,
        name: authData.user.user_metadata?.full_name ?? authData.user.email?.split('@')[0] ?? t.auth.profile,
        email: authData.user.email ?? '',
        role: (authData.user.app_metadata?.user_role as 'admin' | 'manager' | 'sales_rep' | 'viewer') ?? 'admin',
        jobTitle: authData.user.user_metadata?.job_title ?? '',
        organizationId: existingOrgId,
        isActive: true,
        createdAt: authData.user.created_at,
        updatedAt: authData.user.updated_at ?? authData.user.created_at,
      })

      void useAuthStore.getState().fetchOrgUsers(existingOrgId).catch(() => {
        /* non-critical */
      })
      navigate('/', { replace: true })
    }

    void redirectIfAlreadyMember()

    return () => {
      cancelled = true
    }
  }, [navigate, setCurrentUser, t.auth.profile])

  useEffect(() => {
    if (!workspaceSlugFromHost) return
    setSlug((prev) => (prev ? prev : workspaceSlugFromHost))
    setSlugTiedToSubdomain(true)
  }, [workspaceSlugFromHost])

  const handleNameChange = (value: string) => {
    setOrgName(value)
    if (!slugTiedToSubdomain) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    trackUxAction('onboarding_org_setup_submit_attempt')
    if (!orgName.trim()) { setError(t.orgSetup.errorNameRequired); return }
    if (!slug.trim()) { setError(t.orgSetup.errorSlugRequired); return }
    if (!legalName.trim() || !taxId.trim() || !addressLine1.trim() || !city.trim() || !country.trim() || !billingEmail.trim()) {
      setError(t.orgSetup.errorCompleteLegalProfile)
      return
    }
    if (!supabase) { setError(t.orgSetup.errorNotConfigured); return }
    const sb = supabase
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) { setError(t.orgSetup.errorNotAuthenticated); return }

    setIsLoading(true)
    setError(null)

    try {
      const data = await invokeCreateOrgWithFallback(orgName.trim(), slug.trim())
      const createdOrgId = (data as { org?: { id?: string } } | null)?.org?.id
      if (!createdOrgId) throw new Error(t.errors.generic)

      const { error: refreshErr } = await sb.auth.refreshSession()
      if (refreshErr) throw new Error(refreshErr.message)

      const { data: refreshedUserData, error: refreshedUserError } = await sb.auth.getUser()
      if (refreshedUserError || !refreshedUserData.user) {
        throw new Error(refreshedUserError?.message ?? t.orgSetup.errorNotAuthenticated)
      }

      const u = refreshedUserData.user
      updateBranding({
        appName: orgName.trim(),
        legalName: legalName.trim(),
        taxId: taxId.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        country: country.trim(),
        billingEmail: billingEmail.trim(),
        billingPhone: billingPhone.trim() || undefined,
      })
      const newOrgId = (u.app_metadata?.organization_id as string | undefined) ?? u.user_metadata?.org_id
      setCurrentUser({
        id: u.id,
        name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? t.auth.profile,
        email: u.email ?? '',
        role: (u.app_metadata?.user_role as 'admin' | 'manager' | 'sales_rep' | 'viewer') ?? 'admin',
        jobTitle: u.user_metadata?.job_title ?? '',
        organizationId: newOrgId,
        isActive: true,
        createdAt: u.created_at,
        updatedAt: u.updated_at ?? u.created_at,
      })

      if (newOrgId) {
        void useAuthStore.getState().fetchOrgUsers(newOrgId).catch(() => {
          /* non-critical */
        })
      }

      navigate('/', { replace: true })
      trackUxAction('onboarding_org_setup_submit_success')
    } catch (err) {
      const message = (err as Error).message
      const isAlreadyMember = /already a member of an organization/i.test(message)
      if (isAlreadyMember) {
        const { data: refreshedUserData, error: refreshedUserError } = await sb.auth.getUser()
        const existingOrgId =
          !refreshedUserError && refreshedUserData.user
            ? ((refreshedUserData.user.app_metadata?.organization_id as string | undefined) ??
              refreshedUserData.user.user_metadata?.org_id)
            : undefined

        if (existingOrgId && refreshedUserData.user) {
          setCurrentUser({
            id: refreshedUserData.user.id,
            name: refreshedUserData.user.user_metadata?.full_name ?? refreshedUserData.user.email?.split('@')[0] ?? t.auth.profile,
            email: refreshedUserData.user.email ?? '',
            role: (refreshedUserData.user.app_metadata?.user_role as 'admin' | 'manager' | 'sales_rep' | 'viewer') ?? 'admin',
            jobTitle: refreshedUserData.user.user_metadata?.job_title ?? '',
            organizationId: existingOrgId,
            isActive: true,
            createdAt: refreshedUserData.user.created_at,
            updatedAt: refreshedUserData.user.updated_at ?? refreshedUserData.user.created_at,
          })
          void useAuthStore.getState().fetchOrgUsers(existingOrgId).catch(() => {
            /* non-critical */
          })
          navigate('/', { replace: true })
          trackUxAction('onboarding_org_setup_submit_success', { reason: 'already_member' })
          return
        }
      }
      trackUxAction('onboarding_org_setup_submit_error', { reason: message.slice(0, 120) })
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      logo={(
        <div className="relative w-14 h-14 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4 border border-accent-500/25 overflow-hidden shadow-brand-sm ring-1 ring-accent-500/20 motion-safe:transition motion-safe:duration-300 motion-safe:hover:scale-[1.02]">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-accent-500/10" aria-hidden />
          <span className="relative z-[1]">
            <Logo variant="icon" size={28} />
          </span>
        </div>
      )}
      title={<h1 className="text-2xl font-bold text-fg">{t.orgSetup.title}</h1>}
      subtitle={<p className="text-sm text-fg-muted mt-1 text-center">{t.orgSetup.subtitle}</p>}
    >
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t.orgSetup.orgNameLabel}
            type="text"
            value={orgName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t.orgSetup.orgNamePlaceholder}
            disabled={isLoading}
            required
            className="!px-3 !py-2.5"
          />

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1">
              {t.orgSetup.slugLabel}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-fg/10 rounded-xl focus-within:border-accent-500/50 focus-within:ring-2 focus-within:ring-accent-500/30">
              <span className="text-fg-muted text-sm select-none">{t.orgSetup.slugPrefix}</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTiedToSubdomain(false)
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
                placeholder={t.orgSetup.slugPlaceholder}
                className="flex-1 bg-transparent text-fg placeholder-fg-muted focus:outline-none text-sm"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-xs text-fg-muted mt-1">{t.orgSetup.slugHint}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label={t.orgSetup.legalCompanyName}
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={isLoading}
              required
              className="!px-3 !py-2.5"
            />
            <Input
              label={t.orgSetup.taxIdVat}
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              disabled={isLoading}
              required
              className="!px-3 !py-2.5"
            />
            <div className="md:col-span-2">
              <Input
                label={t.orgSetup.addressLine1}
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={isLoading}
                required
                className="!px-3 !py-2.5"
              />
            </div>
            <Input
              label={t.orgSetup.city}
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isLoading}
              required
              className="!px-3 !py-2.5"
            />
            <Input
              label={t.orgSetup.country}
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={isLoading}
              required
              className="!px-3 !py-2.5"
            />
            <Input
              label={t.orgSetup.billingEmail}
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              disabled={isLoading}
              required
              className="!px-3 !py-2.5"
            />
            <Input
              label={t.orgSetup.billingPhone}
              type="tel"
              value={billingPhone}
              onChange={(e) => setBillingPhone(e.target.value)}
              disabled={isLoading}
              className="!px-3 !py-2.5"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-danger/15 border border-danger/30 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-xl"
            size="lg"
            disabled={isLoading || !orgName.trim() || !slug.trim() || !legalName.trim() || !taxId.trim() || !addressLine1.trim() || !city.trim() || !country.trim() || !billingEmail.trim()}
            loading={isLoading}
            rightIcon={<ArrowRight size={18} aria-hidden />}
          >
            {t.orgSetup.createButton}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}
