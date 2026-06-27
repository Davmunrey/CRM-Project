import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useTranslations } from '../../i18n'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { api } from '../../lib/api'
import { uploadOrgLogo } from '../../lib/supabase/storage'

export function BrandingSection() {
  const t = useTranslations()
  const { settings, updateBranding } = useSettingsStore()
  const organizationId = useAuthStore((s) => s.organizationId)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [brandingDraft, setBrandingDraft] = useState(settings.branding)
  // Reset the local draft when the stored branding changes. Adjust-state-during-render
  // (React's documented pattern) instead of a setState-in-effect cascade.
  const [syncedBranding, setSyncedBranding] = useState(settings.branding)
  if (settings.branding !== syncedBranding) {
    setSyncedBranding(settings.branding)
    setBrandingDraft(settings.branding)
  }

  const handleSaveBranding = () => {
    const merged = {
      appName: brandingDraft.appName.trim() || t.brand.defaultAppName,
      primaryColor: brandingDraft.primaryColor || '#7c3aed',
      logoUrl: brandingDraft.logoUrl?.trim() || undefined,
      customDomain: brandingDraft.customDomain?.trim() || undefined,
      privacyUrl: brandingDraft.privacyUrl?.trim() || undefined,
      termsUrl: brandingDraft.termsUrl?.trim() || undefined,
      legalName: brandingDraft.legalName?.trim() || undefined,
      taxId: brandingDraft.taxId?.trim() || undefined,
      addressLine1: brandingDraft.addressLine1?.trim() || undefined,
      postalCode: brandingDraft.postalCode?.trim() || undefined,
      city: brandingDraft.city?.trim() || undefined,
      country: brandingDraft.country?.trim() || undefined,
      billingEmail: brandingDraft.billingEmail?.trim() || undefined,
      billingPhone: brandingDraft.billingPhone?.trim() || undefined,
      quoteFooter: brandingDraft.quoteFooter?.trim() || undefined,
    }
    updateBranding(merged)
    void api.patch('/orgs/me/branding', {
      name: merged.appName,
      logoUrl: merged.logoUrl ?? null,
      primaryColor: merged.primaryColor,
      customDomain: merged.customDomain ?? null,
      privacyUrl: merged.privacyUrl ?? null,
      termsUrl: merged.termsUrl ?? null,
      quoteFooter: merged.quoteFooter ?? null,
    }).catch(() => {/* silent — local state already saved */})
    toast.success(t.common.save + ' ✓')
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!organizationId) {
      toast.error('No organization')
      return
    }
    setUploadingLogo(true)
    try {
      const url = await uploadOrgLogo(organizationId, file)
      setBrandingDraft((prev) => ({ ...prev, logoUrl: url }))
      toast.success(t.common.save + ' ✓')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleResetBranding = () => {
    setBrandingDraft({ appName: t.brand.defaultAppName, primaryColor: '#4f46e5' })
    updateBranding({
      appName: t.brand.defaultAppName,
      primaryColor: '#4f46e5',
      logoUrl: undefined,
      customDomain: undefined,
      privacyUrl: undefined,
      termsUrl: undefined,
      legalName: undefined,
      taxId: undefined,
      addressLine1: undefined,
      postalCode: undefined,
      city: undefined,
      country: undefined,
      billingEmail: undefined,
      billingPhone: undefined,
      quoteFooter: undefined,
    })
    toast.success(t.settings.resetBranding)
  }

  return (
    <section className="crm-surface-section p-6">
      <h2 className="text-base font-semibold text-fg mb-4">{t.settings.branding}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label={t.settings.appName}
          value={brandingDraft.appName}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, appName: e.target.value }))}
        />
        <Input
          label={t.settings.primaryColor}
          type="color"
          value={brandingDraft.primaryColor}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
        />
        <Input
          label={t.settings.logoUrl}
          value={brandingDraft.logoUrl ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, logoUrl: e.target.value }))}
        />
        <Input
          label={t.settings.customDomain}
          value={brandingDraft.customDomain ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, customDomain: e.target.value }))}
          placeholder={t.settings.placeholderBrandingDomain}
        />
        <Input
          label={t.settings.privacyUrl}
          value={brandingDraft.privacyUrl ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, privacyUrl: e.target.value }))}
          placeholder={t.settings.placeholderPrivacyPolicyUrl}
        />
        <Input
          label={t.settings.termsUrl}
          value={brandingDraft.termsUrl ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, termsUrl: e.target.value }))}
          placeholder={t.settings.placeholderTermsUrl}
        />
        <Input
          label={t.settings.legalCompanyName}
          value={brandingDraft.legalName ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, legalName: e.target.value }))}
        />
        <Input
          label={t.settings.taxIdVat}
          value={brandingDraft.taxId ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, taxId: e.target.value }))}
        />
        <Input
          label={t.settings.addressLine1}
          value={brandingDraft.addressLine1 ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, addressLine1: e.target.value }))}
        />
        <Input
          label={t.settings.postalCode}
          value={brandingDraft.postalCode ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, postalCode: e.target.value }))}
        />
        <Input
          label={t.companies.city}
          value={brandingDraft.city ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, city: e.target.value }))}
        />
        <Input
          label={t.companies.country}
          value={brandingDraft.country ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, country: e.target.value }))}
        />
        <Input
          label={t.settings.billingEmail}
          value={brandingDraft.billingEmail ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, billingEmail: e.target.value }))}
        />
        <Input
          label={t.settings.billingPhone}
          value={brandingDraft.billingPhone ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, billingPhone: e.target.value }))}
        />
        <Input
          label={t.settings.quoteFooter}
          value={brandingDraft.quoteFooter ?? ''}
          onChange={(e) => setBrandingDraft((prev) => ({ ...prev, quoteFooter: e.target.value }))}
          placeholder={t.settings.quoteFooterPlaceholder}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        {brandingDraft.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandingDraft.logoUrl}
            alt="Logo"
            className="h-12 w-12 rounded-lg border border-border object-contain bg-white"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-2xs text-fg-muted">
            Logo
          </div>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <Button size="sm" variant="ghost" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
          {uploadingLogo ? '…' : 'Upload logo'}
        </Button>
        <span className="text-2xs text-fg-muted">PNG/JPG/SVG · max 5 MB</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleSaveBranding}>{t.common.save}</Button>
        <Button size="sm" variant="ghost" onClick={handleResetBranding}>{t.settings.resetBranding}</Button>
      </div>
    </section>
  )
}
