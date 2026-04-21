import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'

export function OrgSetup() {
  const navigate = useNavigate()
  const t = useTranslations()
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser)
  const updateBranding = useSettingsStore((s) => s.updateBranding)

  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPhone, setBillingPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (value: string) => {
    setOrgName(value)
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
      const { data, error: rpcErr } = await (sb as any).rpc('create_org_self_service', {
        p_org_name: orgName.trim(),
        p_slug: slug.trim(),
      })
      if (rpcErr) throw new Error(rpcErr.message)
      if (!data || (Array.isArray(data) && data.length === 0)) throw new Error(t.errors.generic)

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
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      variant="centered"
      logo={(
        <div className="w-14 h-14 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4 border border-accent-500/25">
          <Building2 size={28} className="text-accent-400" aria-hidden />
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
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
