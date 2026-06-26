import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { AuthLayout } from '../components/auth/AuthLayout'
import { api } from '../lib/api'
import { supabaseAuthEnabled, supabaseCreateOrg } from '../lib/supabase/auth'
import { trackUxAction } from '../lib/uxMetrics'

interface OrgCreateResponse {
  id: string
  name: string
  slug: string
  expiresAt: number
}

export function OrgSetup() {
  const navigate = useNavigate()
  const t = useTranslations()
  const currentUser = useAuthStore((s) => s.currentUser)
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser)
  const workspaceSlugFromHost = useAuthStore((s) => s.workspaceSlugFromHost)
  const updateBranding = useSettingsStore((s) => s.updateBranding)

  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
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

    setIsLoading(true)
    setError(null)

    try {
      // With Supabase, the tenant is bootstrapped through a SECURITY DEFINER RPC
      // that also refreshes the JWT so the org_id claim is present for RLS. The
      // legacy REST path posts to the Propel API which sets an HttpOnly cookie.
      const orgId = supabaseAuthEnabled()
        ? (await supabaseCreateOrg(orgName.trim(), slug.trim())).id
        : (await api.post<OrgCreateResponse>('/orgs', { name: orgName.trim(), slug: slug.trim() })).id

      // Save billing/legal info to settings (client-side branding store)
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

      // Update auth store with org
      if (currentUser) {
        setCurrentUser({ ...currentUser, organizationId: orgId })
      }
      useAuthStore.setState({ organizationId: orgId, tenantResolutionStatus: 'ready', tenantResolutionMessage: null })

      trackUxAction('onboarding_org_setup_submit_success')
      navigate('/', { replace: true })
    } catch (err) {
      const message = (err as Error).message
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
        <div className="flex items-center justify-center mx-auto mb-4 text-fg">
          <Logo variant="icon" theme="mono" size={34} />
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
